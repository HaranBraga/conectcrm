import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/sse";

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
    anfitriaoIds = [],
    presentes = [],      // [{ contactId?, nome?, telefone? }]
    avaliacoes = [],     // [{ slot, avaliadorId?, avaliadorNome?, atencao, interacao, obs? }]
  } = body;

  if (!titulo?.trim() || !dataHora) {
    return NextResponse.json({ error: "Título e data são obrigatórios" }, { status: 400 });
  }

  // Para entradas manuais sem contactId, cria o contato ligado ao líder
  const defaultRole = await prisma.personRole.findFirst({ orderBy: { level: "desc" } });
  const presenteData = await Promise.all(
    presentes.map(async (p: any) => {
      if (p.contactId) return { contactId: p.contactId };
      if (!p.telefone?.trim()) return null;
      const phone = p.telefone.replace(/\D/g, "");
      let contact = await prisma.contact.findFirst({ where: { phone } });
      if (!contact && defaultRole) {
        contact = await prisma.contact.create({
          data: {
            name: p.nome?.trim() || phone,
            phone,
            roleId: defaultRole.id,
            source: "reuniao",
            parentId: liderId || null,
          },
        });
      }
      return contact ? { contactId: contact.id } : { nome: p.nome, telefone: p.telefone };
    })
  );

  const reuniao = await prisma.reuniao.create({
    data: {
      titulo: titulo.trim(), dataHora: new Date(dataHora), local, bairro, zona,
      status: status ?? "REALIZADA", notes,
      liderId: liderId || null,
      anfitrioes: { create: anfitriaoIds.map((id: string) => ({ contactId: id })) },
      presentes:  { create: presenteData.filter(Boolean) as any[] },
      avaliacoes: {
        create: avaliacoes
          .filter((a: any) => a.avaliadorId || a.avaliadorNome)
          .map((a: any) => ({
            slot: a.slot, atencao: a.atencao ?? 0, interacao: a.interacao ?? 0,
            obs: a.obs || null,
            avaliadorId:   a.avaliadorId   || null,
            avaliadorNome: a.avaliadorNome || null,
          })),
      },
    },
    include,
  });
  broadcast("reunioes", { action: "created" });
  return NextResponse.json(reuniao, { status: 201 });
}
