import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const include = {
  solicitante: { select: { id: true, name: true, phone: true, role: true } },
  conversa:    { select: { id: true } },
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status    = searchParams.get("status")    ?? undefined;
  const segmento  = searchParams.get("segmento")  ?? undefined;
  const prioridade = searchParams.get("prioridade") ?? undefined;
  const search    = searchParams.get("search")    ?? "";
  const lembrete  = searchParams.get("lembrete") === "hoje";

  const arquivadas      = searchParams.get("arquivadas")      === "true";
  const hasLembrete     = searchParams.get("hasLembrete")     === "true";
  const solicitanteId   = searchParams.get("solicitanteId")   ?? undefined;
  const where: any = { arquivadaEm: arquivadas ? { not: null } : null };
  if (hasLembrete)   where.lembrete      = { not: null };
  if (solicitanteId) where.solicitanteId = solicitanteId;
  if (status)    where.status    = status;
  if (segmento)  where.segmento  = segmento;
  if (prioridade) where.prioridade = prioridade;
  if (search) where.OR = [
    { titulo: { contains: search, mode: "insensitive" } },
    { solicitante: { name: { contains: search, mode: "insensitive" } } },
  ];
  if (lembrete) where.lembrete = { lte: new Date() };

  const demandas = await prisma.demanda.findMany({
    where, include,
    orderBy: [{ createdAt: "desc" }],
  });
  return NextResponse.json(demandas);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { solicitanteId, titulo, descricao, status, segmento, prioridade, valor, obs, lembrete, prazo, conversaId } = body;

  if (!solicitanteId || !titulo?.trim()) {
    return NextResponse.json({ error: "Solicitante e título são obrigatórios" }, { status: 400 });
  }

  const demanda = await prisma.demanda.create({
    data: {
      solicitanteId,
      titulo: titulo.trim(),
      descricao: descricao || null,
      status: status ?? "ANALISAR",
      segmento: segmento || null,
      prioridade: prioridade ?? "NORMAL",
      valor: valor ? parseFloat(String(valor)) : null,
      obs: obs || null,
      lembrete: lembrete ? new Date(lembrete) : null,
      prazo: prazo ? new Date(prazo) : null,
      conversaId: conversaId || null,
    },
    include,
  });
  return NextResponse.json(demanda, { status: 201 });
}
