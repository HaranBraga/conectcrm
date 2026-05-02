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

export async function GET() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { contacts: true } },
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
