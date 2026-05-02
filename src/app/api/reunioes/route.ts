import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/sse";
import { resolveContactIds } from "@/lib/reunioes";

export const dynamic = "force-dynamic";

const include = {
  lider:     { select: { id: true, name: true, phone: true, role: true } },
  anfitrioes: { include: { contact: { select: { id: true, name: true, phone: true, role: true } } } },
  presentes:  { include: { contact: { select: { id: true, name: true, phone: true, role: true } } }, orderBy: { createdAt: "asc" as const } },
  avaliacoes: { include: { avaliador: { select: { id: true, name: true } } }, orderBy: { slot: "asc" as const } },
  _count:     { select: { presentes: true, conversas: true } },
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const where: any = {};
  if (search) where.titulo = { contains: search, mode: "insensitive" };

  const reunioes = await prisma.reuniao.findMany({
    where, include,
    orderBy: { dataHora: "desc" },
  });
  return NextResponse.json(reunioes);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    titulo, dataHora, local, bairro, zona, status, notes,
    liderId,
    anfitrioes = [],     // [{ contactId?, nome?, telefone? }]
    presentes  = [],     // [{ contactId?, nome?, telefone? }]
    avaliacoes = [],     // [{ slot, avaliadorId?, avaliadorNome?, atencao, interacao }]
  } = body;

  if (!titulo?.trim() || !dataHora) {
    return NextResponse.json({ error: "Título e data são obrigatórios" }, { status: 400 });
  }

  const defaultRole = await prisma.personRole.findFirst({ orderBy: { level: "desc" } });
  const defaultRoleId = defaultRole?.id ?? null;

  // Resolve anfitriões e presentes em contactIds (cria novos quando manuais)
  const anfIds  = await resolveContactIds(anfitrioes, liderId, defaultRoleId);
  const presIds = await resolveContactIds(presentes,  liderId, defaultRoleId);

  // Dedup anfitriões para evitar duplicatas
  const uniqAnfIds = Array.from(new Set(anfIds));
  // Dedup presentes
  const uniqPresIds = Array.from(new Set(presIds));

  const reuniao = await prisma.reuniao.create({
    data: {
      titulo: titulo.trim(), dataHora: new Date(dataHora), local, bairro, zona,
      status: status ?? "REALIZADA", notes,
      liderId: liderId || null,
      anfitrioes: { create: uniqAnfIds.map(id => ({ contactId: id })) },
      presentes:  { create: uniqPresIds.map(id => ({ contactId: id })) },
      avaliacoes: {
        create: avaliacoes.map((a: any) => ({
          slot: a.slot,
          atencao: a.atencao ?? 0,
          interacao: a.interacao ?? 0,
        })),
      },
    },
    include,
  });
  broadcast("reunioes", { action: "created" });
  return NextResponse.json(reuniao, { status: 201 });
}
