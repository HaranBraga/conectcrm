import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/sse";
import { sendText } from "@/lib/evolution";

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
    liderId, anfitriaoIds = [], presentes = [], avaliacoes = [],
  } = body;

  // Recria anfitriões, presentes, avaliações
  await prisma.reuniaoAnfitriao.deleteMany({ where: { reuniaoId: params.id } });
  await prisma.reuniaoPresente.deleteMany({ where: { reuniaoId: params.id } });
  await prisma.reuniaoAvaliacao.deleteMany({ where: { reuniaoId: params.id } });

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
            name: p.nome?.trim() || phone, phone,
            roleId: defaultRole.id, source: "reuniao",
            parentId: liderId || null,
          },
        });
      }
      return contact ? { contactId: contact.id } : { nome: p.nome, telefone: p.telefone };
    })
  );

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
  broadcast("reunioes", { action: "updated" });
  return NextResponse.json(reuniao);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.reuniao.delete({ where: { id: params.id } });
  broadcast("reunioes", { action: "deleted" });
  return NextResponse.json({ ok: true });
}

// POST /api/reunioes/[id]/iniciar-conversas — inicia WhatsApp com todos os presentes
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { action } = await req.json();
  if (action !== "iniciar-conversas") return NextResponse.json({ error: "Ação inválida" }, { status: 400 });

  const reuniao = await prisma.reuniao.findUnique({
    where: { id: params.id },
    include: { presentes: { include: { contact: true } } },
  });
  if (!reuniao) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });

  const firstStatus = await prisma.kanbanStatus.findFirst({ orderBy: { position: "asc" } });
  if (!firstStatus) return NextResponse.json({ error: "Nenhum status kanban" }, { status: 400 });

  let criadas = 0;
  for (const p of reuniao.presentes) {
    const contact = p.contact;
    if (!contact) continue;

    // Verifica ou cria conversa
    let conv = await prisma.conversation.findUnique({ where: { contactId: contact.id } });
    if (!conv) {
      conv = await prisma.conversation.create({
        data: { contactId: contact.id, statusId: firstStatus.id, reuniaoId: params.id },
      });
      criadas++;
    } else if (!conv.reuniaoId) {
      // Vincula à reunião se não estiver vinculada
      await prisma.conversation.update({
        where: { id: conv.id },
        data: { reuniaoId: params.id, closedAt: null },
      });
    }
  }

  broadcast("kanban", { action: "reuniao-conversas" });
  return NextResponse.json({ ok: true, criadas });
}
