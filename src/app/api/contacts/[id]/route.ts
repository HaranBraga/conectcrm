import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const contact = await prisma.contact.findUnique({
    where: { id: params.id },
    include: {
      parent: { select: { id: true, name: true, role: true } },
      children: { select: { id: true, name: true, phone: true, role: true } },
      conversations: { include: { status: true, messages: { orderBy: { sentAt: "desc" }, take: 10 } } },
    },
  });
  if (!contact) return NextResponse.json({ error: "Contato não encontrado" }, { status: 404 });
  return NextResponse.json(contact);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { name, phone, email, role, parentId, notes, lastContactAt, lastMessage } = body;

  const contact = await prisma.contact.update({
    where: { id: params.id },
    data: {
      ...(name && { name }),
      ...(phone && { phone }),
      ...(email !== undefined && { email }),
      ...(role && { role }),
      ...(parentId !== undefined && { parentId }),
      ...(notes !== undefined && { notes }),
      ...(lastContactAt !== undefined && { lastContactAt: lastContactAt ? new Date(lastContactAt) : null }),
      ...(lastMessage !== undefined && { lastMessage }),
    },
  });
  return NextResponse.json(contact);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.contact.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
