import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const group = await prisma.contactGroup.findUnique({
    where: { id: params.id },
    include: {
      members: { include: { contact: { select: { id: true, name: true, phone: true, role: true } } } },
      dispatches: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  if (!group) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json(group);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { name, description, date } = await req.json();
  const group = await prisma.contactGroup.update({
    where: { id: params.id },
    data: { ...(name && { name }), ...(description !== undefined && { description }), ...(date !== undefined && { date: date ? new Date(date) : null }) },
  });
  return NextResponse.json(group);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.contactGroup.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
