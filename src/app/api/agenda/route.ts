import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const include = {
  solicitante: { select: { id: true, name: true, phone: true, role: true } },
  demanda:     { select: { id: true, titulo: true, status: true } },
  anfitrioes:  { include: { contact: { select: { id: true, name: true, phone: true, role: true } } } },
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end   = searchParams.get("end");

  const where: any = {};
  if (start && end) {
    where.inicio = { gte: new Date(start), lte: new Date(end) };
  }

  const eventos = await prisma.agendaEvento.findMany({
    where, include,
    orderBy: { inicio: "asc" },
  });
  return NextResponse.json(eventos);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    titulo, assunto, tipo, status, inicio, duracao,
    local, bairro, zona, quantidadePessoas, oQuePrecisa, notes,
    solicitanteId, solicitanteNome, solicitanteTel,
    demandaId, anfitriaoIds = [],
  } = body;

  if (!titulo?.trim() || !inicio) {
    return NextResponse.json({ error: "Título e início são obrigatórios" }, { status: 400 });
  }

  const evento = await prisma.agendaEvento.create({
    data: {
      titulo: titulo.trim(), assunto, tipo: tipo ?? "AGENDA", status: status ?? "PENDENTE",
      inicio: new Date(inicio), duracao,
      local, bairro, zona, quantidadePessoas, oQuePrecisa, notes,
      solicitanteId: solicitanteId || null,
      solicitanteNome: solicitanteNome || null,
      solicitanteTel: solicitanteTel || null,
      demandaId: demandaId || null,
      anfitrioes: {
        create: anfitriaoIds.map((id: string) => ({ contactId: id })),
      },
    },
    include,
  });
  return NextResponse.json(evento, { status: 201 });
}
