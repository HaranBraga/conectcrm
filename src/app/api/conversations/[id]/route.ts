import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendText, sendMedia, sendMediaBase64, sendLink } from "@/lib/evolution";
import { broadcast } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { close } = await req.json();
  const conversation = await prisma.conversation.update({
    where: { id: params.id },
    data: { closedAt: close ? new Date() : null },
  });
  broadcast("kanban", { action: close ? "closed" : "reopened", id: params.id });
  return NextResponse.json(conversation);
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: {
      contact: true,
      status: true,
      messages: { orderBy: { sentAt: "asc" } },
    },
  });
  if (!conversation) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json(conversation);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { message, mediaUrl, mediaType, linkUrl, linkTitle, linkDescription, base64, mimeType, fileName } = body;

  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: { contact: true },
  });
  if (!conversation) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  let whatsappMsgId: string | undefined;
  let content = message || "";
  let savedMediaType: string | null = null;

  try {
    if (linkUrl) {
      const result = await sendLink(conversation.contact.phone, linkUrl, linkTitle, linkDescription);
      whatsappMsgId = result?.key?.id;
      content = linkTitle ? `${linkTitle}\n${linkUrl}` : `🔗 ${linkUrl}`;
    } else if (base64 && mimeType && fileName) {
      // Upload de arquivo real via base64
      const type: "image" | "video" | "audio" | "document" =
        mimeType.startsWith("image/") ? "image" :
        mimeType.startsWith("video/") ? "video" :
        mimeType.startsWith("audio/") ? "audio" : "document";
      const result = await sendMediaBase64(conversation.contact.phone, base64, mimeType, fileName, type, message || undefined);
      whatsappMsgId = result?.key?.id;
      const emoji = type === "image" ? "🖼️" : type === "video" ? "🎥" : type === "audio" ? "🎵" : "📄";
      content = message ? `${emoji} ${message}` : `${emoji} ${fileName}`;
      savedMediaType = type;
    } else if (mediaUrl && mediaType) {
      const result = await sendMedia(conversation.contact.phone, mediaUrl, mediaType, message);
      whatsappMsgId = result?.key?.id;
      const emoji = mediaType === "image" ? "🖼️" : mediaType === "video" ? "🎥" : "📄";
      content = message ? `${emoji} ${message}` : `${emoji} ${mediaType}`;
      savedMediaType = mediaType;
    } else if (message) {
      const result = await sendText(conversation.contact.phone, message);
      whatsappMsgId = result?.key?.id;
    }
  } catch (err: any) {
    console.error("Evolution API error:", err?.response?.data ?? err);
    const detail = err?.response?.data?.message ?? err?.response?.data?.error ?? err?.message ?? "erro desconhecido";
    return NextResponse.json({ error: `Falha no envio: ${detail}` }, { status: 502 });
  }

  const msg = await prisma.message.create({
    data: { conversationId: params.id, content, direction: "OUT", whatsappMsgId, mediaType: savedMediaType },
  });

  await prisma.conversation.update({
    where: { id: params.id },
    data: { lastMessageAt: new Date(), lastMessageText: content },
  });

  await prisma.contact.update({
    where: { id: conversation.contactId },
    data: { lastContactAt: new Date(), lastMessage: content },
  });

  broadcast("mensagem", { conversationId: params.id });
  broadcast("kanban", { action: "message", conversationId: params.id });
  return NextResponse.json(msg, { status: 201 });
}
