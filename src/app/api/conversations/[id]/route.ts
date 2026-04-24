import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendText } from "@/lib/evolution";

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
  // Send message
  const { message } = await req.json();

  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: { contact: true },
  });
  if (!conversation) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  let whatsappMsgId: string | undefined;
  try {
    const result = await sendText(conversation.contact.phone, message);
    whatsappMsgId = result?.key?.id;
  } catch (err) {
    console.error("Evolution API error:", err);
  }

  const msg = await prisma.message.create({
    data: { conversationId: params.id, content: message, direction: "OUT", whatsappMsgId },
  });

  await prisma.conversation.update({
    where: { id: params.id },
    data: { lastMessageAt: new Date(), lastMessageText: message },
  });

  await prisma.contact.update({
    where: { id: conversation.contactId },
    data: { lastContactAt: new Date(), lastMessage: message },
  });

  return NextResponse.json(msg, { status: 201 });
}
