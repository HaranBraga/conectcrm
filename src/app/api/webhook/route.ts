import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/sse";

// Formatos reais de número BR:
//   55 + DDD(2) + 8 local (SEM 9º) = 12 dígitos  ← formato antigo
//   55 + DDD(2) + 9 + 8 local       = 13 dígitos  ← formato novo (com 9º)
// Contatos salvos manualmente muitas vezes não têm o prefixo 55:
//   DDD(2) + 8 local         = 10 dígitos
//   DDD(2) + 9 + 8 local     = 11 dígitos
//
// normalizePhone: 12→13 (adiciona 9º se faltar)
function normalizePhone(digits: string): string {
  if (digits.startsWith("55") && digits.length === 12) {
    return `${digits.slice(0, 4)}9${digits.slice(4)}`;
  }
  return digits;
}

// Gera todas as variantes plausíveis para busca no banco
function phoneVariants(raw: string): string[] {
  const s = new Set<string>();
  s.add(raw);

  if (raw.startsWith("55")) {
    const withoutPrefix = raw.slice(2);
    s.add(withoutPrefix);

    if (raw.length === 13) {
      // 55+DDD+9+8 → variante sem 9º: 55+DDD+8 (12 dígitos)
      s.add(`${raw.slice(0, 4)}${raw.slice(5)}`);
      // sem prefixo 55 com 9: DDD+9+8 (11 dígitos)
      s.add(withoutPrefix);
      // sem prefixo 55 sem 9: DDD+8 (10 dígitos)
      s.add(`${withoutPrefix.slice(0, 2)}${withoutPrefix.slice(3)}`);
    }
    if (raw.length === 12) {
      // 55+DDD+8 → variante com 9º: 55+DDD+9+8 (13 dígitos)
      s.add(`${raw.slice(0, 4)}9${raw.slice(4)}`);
      // sem prefixo sem 9: DDD+8 (10 dígitos)
      s.add(withoutPrefix);
      // sem prefixo com 9: DDD+9+8 (11 dígitos)
      s.add(`${withoutPrefix.slice(0, 2)}9${withoutPrefix.slice(2)}`);
    }
  } else {
    // Número sem prefixo 55 → tentar com prefixo também
    s.add(`55${raw}`);
    if (raw.length === 11 && raw[2] === "9") {
      // DDD+9+8 → sem 9: DDD+8
      s.add(`${raw.slice(0, 2)}${raw.slice(3)}`);
      s.add(`55${raw.slice(0, 2)}${raw.slice(3)}`);
    }
    if (raw.length === 10) {
      // DDD+8 → com 9: DDD+9+8
      s.add(`${raw.slice(0, 2)}9${raw.slice(2)}`);
      s.add(`55${raw.slice(0, 2)}9${raw.slice(2)}`);
    }
  }

  return Array.from(s);
}

function extractText(data: any): string {
  const msg = data?.message;
  if (!msg) return "";
  if (msg.conversation) return msg.conversation;
  if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text;
  if (msg.imageMessage?.caption) return `🖼️ ${msg.imageMessage.caption}`;
  if (msg.imageMessage) return "🖼️ Imagem";
  if (msg.videoMessage?.caption) return `🎥 ${msg.videoMessage.caption}`;
  if (msg.videoMessage) return "🎥 Vídeo";
  if (msg.audioMessage) return "🎵 Áudio";
  if (msg.documentMessage) return `📄 ${msg.documentMessage.fileName || "Documento"}`;
  if (msg.stickerMessage) return "🎨 Figurinha";
  if (msg.locationMessage) return "📍 Localização";
  if (msg.reactionMessage) return `${msg.reactionMessage.text || "👍"} reação`;
  if (msg.contactMessage) return `👤 ${msg.contactMessage.displayName || "Contato"}`;
  if (msg.listMessage) return `📋 ${msg.listMessage.description || "Lista"}`;
  if (msg.buttonsMessage) return msg.buttonsMessage.contentText || "📌 Botões";
  if (msg.templateMessage) return msg.templateMessage.hydratedTemplate?.hydratedContentText || "📌 Template";
  const keys = Object.keys(msg);
  if (keys.length > 0) return `[${keys[0]}]`;
  return "[mensagem]";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, data } = body;

    const isIncoming = event === "messages.upsert" || event === "MESSAGES_UPSERT";
    const isOutgoing = event === "send.message" || event === "SEND_MESSAGE";
    if (!isIncoming && !isOutgoing) {
      return NextResponse.json({ ok: true });
    }

    const remoteJid: string = data?.key?.remoteJid ?? "";
    if (!remoteJid || remoteJid.endsWith("@g.us")) {
      // Ignora grupos
      return NextResponse.json({ ok: true });
    }

    const fromMe: boolean = data?.key?.fromMe ?? false;
    const rawDigits = remoteJid.replace("@s.whatsapp.net", "").replace(/\D/g, "");
    const phone = normalizePhone(rawDigits); // formato canônico para criar contatos novos
    const pushName: string = data?.pushName ?? "";
    const text = extractText(data);
    const msgId: string = data?.key?.id ?? "";
    const ts = data?.messageTimestamp
      ? new Date(Number(data.messageTimestamp) * 1000)
      : new Date();

    if (!text) return NextResponse.json({ ok: true });

    // Busca contato em todas as variantes de formato (com/sem 55, com/sem 9º dígito)
    let contact = null;
    for (const variant of phoneVariants(rawDigits)) {
      contact = await prisma.contact.findUnique({ where: { phone: variant } });
      if (contact) break;
    }
    if (!contact) {
      const defaultStatus = await prisma.kanbanStatus.findFirst({ orderBy: { position: "asc" } });
      const defaultRole = await prisma.personRole.findFirst({ orderBy: { level: "desc" } });
      if (!defaultRole) return NextResponse.json({ ok: true });
      contact = await prisma.contact.create({
        data: { name: pushName || phone, phone, roleId: defaultRole.id, source: "message" },
      });
      if (defaultStatus) {
        await prisma.conversation.create({
          data: { contactId: contact.id, statusId: defaultStatus.id, whatsappChatId: remoteJid },
        });
      }
    } else if (contact.source === "manual" && !fromMe) {
      // Se contato manual recebe mensagem, marca como "message" para aparecer no kanban
      contact = await prisma.contact.update({
        where: { id: contact.id },
        data: { source: "message" },
      });
    }

    // Busca ou cria conversa
    let conversation = await prisma.conversation.findUnique({ where: { contactId: contact.id } });
    // Reabre conversa fechada quando nova mensagem chega
    if (conversation?.closedAt && !fromMe) {
      conversation = await prisma.conversation.update({ where: { id: conversation.id }, data: { closedAt: null } });
    }
    if (!conversation) {
      const defaultStatus = await prisma.kanbanStatus.findFirst({ orderBy: { position: "asc" } });
      if (defaultStatus) {
        conversation = await prisma.conversation.create({
          data: { contactId: contact.id, statusId: defaultStatus.id, whatsappChatId: remoteJid },
        });
      } else {
        return NextResponse.json({ ok: true });
      }
    }

    // Evita duplicatas
    if (msgId) {
      const existing = await prisma.message.findFirst({ where: { whatsappMsgId: msgId } });
      if (existing) return NextResponse.json({ ok: true });
    }

    // Detecta tipo de mídia para salvar rawData para download posterior
    const msg = data?.message ?? {};
    let mediaType: string | null = null;
    if (msg.imageMessage)    mediaType = "image";
    else if (msg.videoMessage)    mediaType = "video";
    else if (msg.audioMessage)    mediaType = "audio";
    else if (msg.documentMessage) mediaType = "document";
    else if (msg.stickerMessage)  mediaType = "sticker";

    const rawData = mediaType ? { key: data?.key, message: msg } : null;

    // Salva mensagem
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        content: text,
        direction: fromMe ? "OUT" : "IN",
        whatsappMsgId: msgId || null,
        mediaType,
        rawData: rawData as any,
        sentAt: ts,
      },
    });

    // Atualiza última mensagem
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: ts, lastMessageText: text, whatsappChatId: remoteJid },
    });

    if (!fromMe) {
      await prisma.contact.update({
        where: { id: contact.id },
        data: { lastContactAt: ts, lastMessage: text },
      });
    }

    broadcast("kanban", { action: "message" });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Webhook error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "Webhook ativo" });
}
