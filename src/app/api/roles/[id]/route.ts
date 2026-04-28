import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { label, color, bgColor, level } = await req.json();
  const role = await prisma.personRole.update({
    where: { id: params.id },
    data: {
      ...(label !== undefined && { label }),
      ...(color !== undefined && { color }),
      ...(bgColor !== undefined && { bgColor }),
      ...(level !== undefined && { level }),
    },
  });
  return NextResponse.json(role);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const count = await prisma.contact.count({ where: { roleId: params.id } });
  if (count > 0) return NextResponse.json({ error: `Cargo em uso por ${count} contato(s)` }, { status: 409 });
  await prisma.personRole.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
