import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Normaliza número BR: 55 + DDD(2) + 8 dígitos → adiciona o 9º dígito
function normalizePhone(digits: string): string {
  if (digits.startsWith("55") && digits.length === 13) {
    return `${digits.slice(0, 4)}9${digits.slice(4)}`;
  }
  return digits;
}

// Retorna o formato alternativo (com ↔ sem 9º dígito) para fallback de busca
function alternatePhone(phone: string): string | null {
  if (phone.startsWith("55") && phone.length === 14 && phone[4] === "9") {
    return `${phone.slice(0, 4)}${phone.slice(5)}`;
  }
  if (phone.startsWith("55") && phone.length === 13) {
    return `${phone.slice(0, 4)}9${phone.slice(4)}`;
  }
  return null;
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
    const phone = normalizePhone(remoteJid.replace("@s.whatsapp.net", "").replace(/\D/g, ""));
    const pushName: string = data?.pushName ?? "";
    const text = extractText(data);
    const msgId: string = data?.key?.id ?? "";
    const ts = data?.messageTimestamp
      ? new Date(Number(data.messageTimestamp) * 1000)
      : new Date();

    if (!text) return NextResponse.json({ ok: true });

    // Busca ou cria contato (tenta formato alternativo 9º dígito se não encontrar)
    let contact = await prisma.contact.findUnique({ where: { phone } });
    if (!contact) {
      const alt = alternatePhone(phone);
      if (alt) contact = await prisma.contact.findUnique({ where: { phone: alt } });
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

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Webhook error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "Webhook ativo" });
}
