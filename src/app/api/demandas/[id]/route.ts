import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const include = {
  solicitante: { select: { id: true, name: true, phone: true, role: true } },
  conversa:    { select: { id: true, lastMessageText: true } },
};

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const demanda = await prisma.demanda.findUnique({ where: { id: params.id }, include });
  if (!demanda) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json(demanda);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { solicitanteId, titulo, descricao, status, segmento, prioridade, valor, obs, lembrete, prazo, conversaId, fechadaEm } = body;

  const demanda = await prisma.demanda.update({
    where: { id: params.id },
    data: {
      ...(solicitanteId !== undefined && { solicitanteId }),
      ...(titulo        !== undefined && { titulo }),
      ...(descricao     !== undefined && { descricao }),
      ...(status        !== undefined && { status }),
      ...(segmento      !== undefined && { segmento }),
      ...(prioridade    !== undefined && { prioridade }),
      ...(obs           !== undefined && { obs }),
      ...(conversaId    !== undefined && { conversaId: conversaId || null }),
      ...(valor         !== undefined && { valor: valor !== null && valor !== "" ? parseFloat(String(valor)) : null }),
      ...(lembrete      !== undefined && { lembrete: lembrete ? new Date(lembrete) : null }),
      ...(prazo         !== undefined && { prazo: prazo ? new Date(prazo) : null }),
      ...(fechadaEm     !== undefined && { fechadaEm: fechadaEm ? new Date(fechadaEm) : null }),
      ...(body.arquivadaEm !== undefined && { arquivadaEm: body.arquivadaEm ? new Date(body.arquivadaEm) : null }),
      // Ao arquivar, registra fechadaEm se ainda não tiver (para relatórios)
      ...(body.arquivadaEm && !body.fechadaEm && { fechadaEm: new Date(body.arquivadaEm) }),
    },
    include,
  });
  return NextResponse.json(demanda);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.demanda.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
