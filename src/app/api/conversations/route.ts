import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/sse";

export const dynamic = "force-dynamic";

const contactSelect = {
  select: { id: true, name: true, phone: true, role: true, lastContactAt: true, lastMessage: true, profilePhotoUrl: true, labels: true },
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const closed = searchParams.get("closed") === "true";

  const conversations = await prisma.conversation.findMany({
    where: { closedAt: closed ? { not: null } : null },
    include: { contact: contactSelect, status: true },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(conversations);
}

export async function POST(req: NextRequest) {
  const { contactId } = await req.json();
  if (!contactId) return NextResponse.json({ error: "contactId obrigatório" }, { status: 400 });

  // Se já existe conversa aberta, retorna ela
  const existing = await prisma.conversation.findUnique({
    where: { contactId },
    include: { contact: contactSelect, status: true },
  });
  if (existing && !existing.closedAt) return NextResponse.json(existing);

  // Se existe mas está fechada, reabre
  if (existing?.closedAt) {
    const reopened = await prisma.conversation.update({
      where: { id: existing.id },
      data: { closedAt: null },
      include: { contact: contactSelect, status: true },
    });
    return NextResponse.json(reopened);
  }

  const firstStatus = await prisma.kanbanStatus.findFirst({ orderBy: { position: "asc" } });
  if (!firstStatus) return NextResponse.json({ error: "Nenhum status kanban configurado" }, { status: 400 });

  await prisma.contact.update({ where: { id: contactId }, data: { source: "message" } });

  const conversation = await prisma.conversation.create({
    data: { contactId, statusId: firstStatus.id },
    include: { contact: contactSelect, status: true },
  });
  broadcast("kanban", { action: "created" });
  return NextResponse.json(conversation, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { conversationId, statusId } = await req.json();
  const conversation = await prisma.conversation.update({
    where: { id: conversationId },
    data: { statusId },
  });
  broadcast("kanban", { action: "moved" });
  return NextResponse.json(conversation);
}
