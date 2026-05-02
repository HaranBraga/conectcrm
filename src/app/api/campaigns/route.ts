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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const reuniaoId = searchParams.get("reuniaoOriginId");
  const includeReuniao = searchParams.get("includeReuniaoDispatches") === "true";

  // Por padrão, esconde campanhas vindas de reunião (essas têm UI própria
  // em /campanhas/reunioes/[id]). Use ?reuniaoOriginId=X para listar
  // apenas as de uma reunião, ou ?includeReuniaoDispatches=true para tudo.
  const where: any = {};
  if (reuniaoId) where.reuniaoOriginId = reuniaoId;
  else if (!includeReuniao) where.reuniaoOriginId = null;

  const campaigns = await prisma.campaign.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { contacts: true } },
      reuniaoOrigin: { select: { id: true, titulo: true, dataHora: true } },
    },
  });
  // Computa contagens por status
  const ids = campaigns.map(c => c.id);
  const counts = await prisma.campaignContact.groupBy({
    by: ["campaignId", "status"],
    where: { campaignId: { in: ids } },
    _count: true,
  });
  const map: Record<string, Record<string, number>> = {};
  counts.forEach(c => {
    if (!map[c.campaignId]) map[c.campaignId] = {};
    map[c.campaignId][c.status] = c._count;
  });
  return NextResponse.json(campaigns.map(c => ({
    ...c,
    counts: map[c.id] ?? {},
  })));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, description, goal, messageTemplate, mediaUrl, mediaType, linkUrl } = body;
  if (!name?.trim()) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  if (!messageTemplate?.trim()) return NextResponse.json({ error: "Mensagem é obrigatória" }, { status: 400 });

  const campaign = await prisma.campaign.create({
    data: {
      name: name.trim(),
      description, goal,
      messageTemplate, mediaUrl, mediaType, linkUrl,
      responseTags: { create: DEFAULT_TAGS },
    },
    include: { responseTags: true },
  });
  broadcast("campaigns", { action: "created" });
  return NextResponse.json(campaign, { status: 201 });
}
