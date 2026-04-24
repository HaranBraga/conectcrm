import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const role = searchParams.get("role") ?? undefined;

  const contacts = await prisma.contact.findMany({
    where: {
      AND: [
        search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { phone: { contains: search } }] } : {},
        role ? { role: role as any } : {},
      ],
    },
    include: { parent: { select: { id: true, name: true, role: true } }, _count: { select: { children: true } } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(contacts);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, phone, email, role, parentId, notes } = body;

  if (!name || !phone) return NextResponse.json({ error: "Nome e telefone são obrigatórios" }, { status: 400 });

  const existing = await prisma.contact.findUnique({ where: { phone } });
  if (existing) return NextResponse.json({ error: "Telefone já cadastrado" }, { status: 409 });

  const defaultStatus = await prisma.kanbanStatus.findFirst({ orderBy: { position: "asc" } });
  if (!defaultStatus) return NextResponse.json({ error: "Crie ao menos um status no kanban primeiro" }, { status: 400 });

  const contact = await prisma.contact.create({
    data: { name, phone, email, role: role ?? "APOIADOR", parentId: parentId ?? null, notes },
  });

  await prisma.conversation.create({ data: { contactId: contact.id, statusId: defaultStatus.id } });

  return NextResponse.json(contact, { status: 201 });
}
