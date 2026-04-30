import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/sse";

export const dynamic = "force-dynamic";

const include = {
  solicitante: { select: { id: true, name: true, phone: true, role: true } },
  demanda:     { select: { id: true, titulo: true, status: true } },
  anfitrioes:  { include: { contact: { select: { id: true, name: true, phone: true, role: true } } } },
  calendario:  { select: { id: true, nome: true, cor: true } },
};

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const evento = await prisma.agendaEvento.findUnique({ where: { id: params.id }, include });
  if (!evento) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json(evento);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const {
    titulo, assunto, tipo, status, inicio, duracao,
    local, bairro, zona, quantidadePessoas, oQuePrecisa, notes,
    solicitanteId, solicitanteNome, solicitanteTel,
    demandaId, anfitriaoIds, calendarioId,
  } = body;

  // Replace anfitrioes if provided
  if (anfitriaoIds !== undefined) {
    await prisma.agendaAnfitriao.deleteMany({ where: { eventoId: params.id } });
  }

  const evento = await prisma.agendaEvento.update({
    where: { id: params.id },
    data: {
      ...(titulo       !== undefined && { titulo }),
      ...(assunto      !== undefined && { assunto }),
      ...(tipo         !== undefined && { tipo }),
      ...(status       !== undefined && { status }),
      ...(inicio       !== undefined && { inicio: new Date(inicio) }),
      ...(duracao      !== undefined && { duracao }),
      ...(local        !== undefined && { local }),
      ...(bairro       !== undefined && { bairro }),
      ...(zona         !== undefined && { zona }),
      ...(quantidadePessoas !== undefined && { quantidadePessoas }),
      ...(oQuePrecisa  !== undefined && { oQuePrecisa }),
      ...(notes        !== undefined && { notes }),
      ...(solicitanteId  !== undefined && { solicitanteId: solicitanteId || null }),
      ...(solicitanteNome !== undefined && { solicitanteNome }),
      ...(solicitanteTel  !== undefined && { solicitanteTel }),
      ...(demandaId    !== undefined && { demandaId: demandaId || null }),
      ...(calendarioId !== undefined && { calendarioId: calendarioId || null }),
      ...(anfitriaoIds !== undefined && {
        anfitrioes: {
          create: anfitriaoIds.map((id: string) => ({ contactId: id })),
        },
      }),
    },
    include,
  });
  broadcast("agenda", { action: "updated", id: params.id });
  return NextResponse.json(evento);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { status } = body;
  const evento = await prisma.agendaEvento.update({
    where: { id: params.id },
    data: { ...(status !== undefined && { status }) },
    include,
  });
  broadcast("agenda", { action: "updated", id: params.id });
  return NextResponse.json(evento);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.agendaEvento.delete({ where: { id: params.id } });
  broadcast("agenda", { action: "deleted", id: params.id });
  return NextResponse.json({ ok: true });
}
