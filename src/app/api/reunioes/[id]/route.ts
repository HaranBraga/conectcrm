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
  conversas:  { include: { contact: { select: { id: true, name: true, phone: true } }, status: true } },
  _count:     { select: { presentes: true, conversas: true } },
};

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const r = await prisma.reuniao.findUnique({ where: { id: params.id }, include });
  if (!r) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });
  return NextResponse.json(r);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const {
    titulo, dataHora, local, bairro, zona, status, notes,
    liderId,
    anfitrioes = [],
    presentes = [],
    avaliacoes = [],
  } = body;

  await prisma.reuniaoAnfitriao.deleteMany({ where: { reuniaoId: params.id } });
  await prisma.reuniaoPresente.deleteMany({ where: { reuniaoId: params.id } });
  await prisma.reuniaoAvaliacao.deleteMany({ where: { reuniaoId: params.id } });

  const defaultRole = await prisma.personRole.findFirst({ orderBy: { level: "desc" } });
  const defaultRoleId = defaultRole?.id ?? null;

  const anfIds  = await resolveContactIds(anfitrioes, liderId ?? null, defaultRoleId);
  const presIds = await resolveContactIds(presentes,  liderId ?? null, defaultRoleId);
  const uniqAnf  = Array.from(new Set(anfIds));
  const uniqPres = Array.from(new Set(presIds));

  const reuniao = await prisma.reuniao.update({
    where: { id: params.id },
    data: {
      ...(titulo    !== undefined && { titulo: titulo.trim() }),
      ...(dataHora  !== undefined && { dataHora: new Date(dataHora) }),
      ...(local     !== undefined && { local }),
      ...(bairro    !== undefined && { bairro }),
      ...(zona      !== undefined && { zona }),
      ...(status    !== undefined && { status }),
      ...(notes     !== undefined && { notes }),
      ...(liderId   !== undefined && { liderId: liderId || null }),
      anfitrioes: { create: uniqAnf.map(id => ({ contactId: id })) },
      presentes:  { create: uniqPres.map(id => ({ contactId: id })) },
      avaliacoes: {
        create: avaliacoes
          .filter((a: any) => a.avaliadorId || a.avaliadorNome)
          .map((a: any) => ({
            slot: a.slot, atencao: a.atencao ?? 0, interacao: a.interacao ?? 0,
            avaliadorId:   a.avaliadorId   || null,
            avaliadorNome: a.avaliadorNome || null,
          })),
      },
    },
    include,
  });
  broadcast("reunioes", { action: "updated" });
  return NextResponse.json(reuniao);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.reuniao.delete({ where: { id: params.id } });
  broadcast("reunioes", { action: "deleted" });
  return NextResponse.json({ ok: true });
}

