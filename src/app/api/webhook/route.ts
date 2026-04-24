import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function extractText(data: any): string {
  const msg = data?.message;
  if (!msg) return "";
  return (
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    msg.imageMessage?.caption ||
    msg.videoMessage?.caption ||
    msg.documentMessage?.caption ||
    msg.audioMessage ? "🎵 Áudio" :
    msg.stickerMessage ? "🎨 Figurinha" :
    msg.locationMessage ? "📍 Localização" :
    "[mensagem]"
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, data } = body;

    if (event !== "messages.upsert" && event !== "MESSAGES_UPSERT") {
      return NextResponse.json({ ok: true });
    }

    const remoteJid: string = data?.key?.remoteJid ?? "";
    if (!remoteJid || remoteJid.endsWith("@g.us")) {
      // Ignora grupos
      return NextResponse.json({ ok: true });
    }

    const fromMe: boolean = data?.key?.fromMe ?? false;
    const phone = remoteJid.replace("@s.whatsapp.net", "").replace(/\D/g, "");
    const pushName: string = data?.pushName ?? "";
    const text = extractText(data);
    const msgId: string = data?.key?.id ?? "";
    const ts = data?.messageTimestamp
      ? new Date(Number(data.messageTimestamp) * 1000)
      : new Date();

    if (!text) return NextResponse.json({ ok: true });

    // Busca ou cria contato
    let contact = await prisma.contact.findUnique({ where: { phone } });
    if (!contact) {
      const defaultStatus = await prisma.kanbanStatus.findFirst({ orderBy: { position: "asc" } });
      contact = await prisma.contact.create({
        data: { name: pushName || phone, phone },
      });
      if (defaultStatus) {
        await prisma.conversation.create({
          data: { contactId: contact.id, statusId: defaultStatus.id, whatsappChatId: remoteJid },
        });
      }
    }

    // Busca ou cria conversa
    let conversation = await prisma.conversation.findUnique({ where: { contactId: contact.id } });
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

    // Salva mensagem
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        content: text,
        direction: fromMe ? "OUT" : "IN",
        whatsappMsgId: msgId || null,
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
