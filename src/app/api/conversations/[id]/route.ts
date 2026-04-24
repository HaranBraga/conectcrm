import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendText, sendMedia, sendLink } from "@/lib/evolution";

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
  const { message, mediaUrl, mediaType, linkUrl } = body;

  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: { contact: true },
  });
  if (!conversation) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  let whatsappMsgId: string | undefined;
  let content = message;

  try {
    if (linkUrl) {
      await sendLink(conversation.contact.phone, linkUrl);
      content = `🔗 ${linkUrl}`;
    } else if (mediaUrl && mediaType) {
      await sendMedia(conversation.contact.phone, mediaUrl, mediaType, message);
      const emoji = mediaType === "image" ? "🖼️" : mediaType === "video" ? "🎥" : "📄";
      content = message ? `${emoji} ${message}` : `${emoji} ${mediaType}`;
    } else if (message) {
      const result = await sendText(conversation.contact.phone, message);
      whatsappMsgId = result?.key?.id;
    }
  } catch (err) {
    console.error("Evolution API error:", err);
  }

  const msg = await prisma.message.create({
    data: { conversationId: params.id, content, direction: "OUT", whatsappMsgId },
  });

  await prisma.conversation.update({
    where: { id: params.id },
    data: { lastMessageAt: new Date(), lastMessageText: content },
  });

  await prisma.contact.update({
    where: { id: conversation.contactId },
    data: { lastContactAt: new Date(), lastMessage: content },
  });

  return NextResponse.json(msg, { status: 201 });
}
