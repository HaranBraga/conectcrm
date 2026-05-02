import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/sse";

export const dynamic = "force-dynamic";

const DEFAULT_TAGS = [
  { label: "Não respondeu", color: "#6b7280", bgColor: "#f3f4f6", order: 0 },
  { label: "Receptivo",     color: "#059669", bgColor: "#d1fae5", order: 1 },
  { label: "Interessado",   color: "#2563eb", bgColor: "#dbeafe", order: 2 },
  { label: "Negou",         color: "#dc2626", bgColor: "#fee2e2", order: 3 },
];

const DEFAULT_TEMPLATE = "Oi {{primeiroNome}}, ";

/**
 * POST: cria uma campanha a partir de uma reunião + modo, e popula com os contatos.
 * Body: { reuniaoId, mode: "anfitrioes" | "presentes" | "all", customName? }
 * Retorna a Campaign criada (frontend redireciona para /campanhas/[id]).
 */
export async function POST(req: NextRequest) {
  const { reuniaoId, mode = "all", customName } = await req.json();
  if (!reuniaoId) return NextResponse.json({ error: "reuniaoId obrigatório" }, { status: 400 });

  const reuniao = await prisma.reuniao.findUnique({
    where: { id: reuniaoId },
    include: {
      anfitrioes: { select: { contactId: true } },
      presentes:  { select: { contactId: true } },
    },
  });
  if (!reuniao) return NextResponse.json({ error: "Reunião não encontrada" }, { status: 404 });

  // Resolve contactIds conforme modo
  const anfSet = new Set(reuniao.anfitrioes.map(a => a.contactId));
  let contactIds: string[] = [];
  if (mode === "anfitrioes") {
    contactIds = reuniao.anfitrioes.map(a => a.contactId);
  } else if (mode === "presentes") {
    contactIds = reuniao.presentes.filter(p => p.contactId && !anfSet.has(p.contactId)).map(p => p.contactId!);
  } else {
    contactIds = reuniao.presentes.filter(p => p.contactId).map(p => p.contactId!);
  }
  contactIds = Array.from(new Set(contactIds));

  if (contactIds.length === 0) {
    return NextResponse.json({ error: "Nenhum contato encontrado para o modo selecionado" }, { status: 400 });
  }

  const modeLabel = mode === "anfitrioes" ? "Anfitriões"
                  : mode === "presentes"  ? "Presentes"
                  : "Todos";

  const name = customName?.trim() || `Reunião: ${reuniao.titulo} — ${modeLabel}`;

  const campaign = await prisma.campaign.create({
    data: {
      name,
      messageTemplate: DEFAULT_TEMPLATE,
      reuniaoOriginId: reuniaoId,
      reuniaoMode: mode,
      responseTags: { create: DEFAULT_TAGS },
      contacts: {
        create: contactIds.map(id => ({ contactId: id })),
      },
    },
    include: { responseTags: true, _count: { select: { contacts: true } } },
  });

  broadcast("campaigns", { action: "created", id: campaign.id });

  return NextResponse.json({ ...campaign, addedContacts: contactIds.length }, { status: 201 });
}
