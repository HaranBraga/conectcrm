import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { nome, cor } = await req.json();
  const cal = await prisma.agendaCalendario.update({
    where: { id: params.id },
    data: { ...(nome !== undefined && { nome }), ...(cor !== undefined && { cor }) },
  });
  return NextResponse.json(cal);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const count = await prisma.agendaEvento.count({ where: { calendarioId: params.id } });
  if (count > 0) return NextResponse.json({ error: `Calendário possui ${count} evento(s)` }, { status: 400 });
  await prisma.agendaCalendario.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
