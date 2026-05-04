import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const roleSelect = { select: { id: true, key: true, label: true, color: true, bgColor: true, level: true } };

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const contact = await prisma.contact.findUnique({
    where: { id: params.id },
    include: {
      role: roleSelect,
      parent: { select: { id: true, name: true, role: roleSelect } },
      children: { select: { id: true, name: true, phone: true, role: roleSelect } },
      conversations: { include: { status: true, messages: { orderBy: { sentAt: "desc" }, take: 10 } } },
    },
  });
  if (!contact) return NextResponse.json({ error: "Contato não encontrado" }, { status: 404 });
  return NextResponse.json(contact);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { name, phone, email, roleId, parentId, notes, lastContactAt, lastMessage, dataNascimento, genero, rua, bairro, cidade, zona } = body;

  const contact = await prisma.contact.update({
    where: { id: params.id },
    data: {
      ...(name  && { name }),
      ...(phone && { phone }),
      ...(email     !== undefined && { email }),
      ...(roleId    && { roleId }),
      ...(parentId  !== undefined && { parentId }),
      ...(notes     !== undefined && { notes }),
      ...(lastContactAt !== undefined && { lastContactAt: lastContactAt ? new Date(lastContactAt) : null }),
      ...(lastMessage   !== undefined && { lastMessage }),
      ...(genero    !== undefined && { genero }),
      ...(rua       !== undefined && { rua }),
      ...(bairro    !== undefined && { bairro }),
      ...(cidade    !== undefined && { cidade }),
      ...(zona      !== undefined && { zona }),
      ...(dataNascimento !== undefined && {
        dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
      }),
    },
    include: { role: roleSelect },
  });
  return NextResponse.json(contact);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.contact.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
