import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
    include: {
      responseTags: { orderBy: { order: "asc" } },
      _count: { select: { contacts: true } },
    },
  });
  if (!campaign) return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 });

  const counts = await prisma.campaignContact.groupBy({
    by: ["status"],
    where: { campaignId: params.id },
    _count: true,
  });
  const countsMap: Record<string, number> = {};
  counts.forEach(c => { countsMap[c.status] = c._count; });

  return NextResponse.json({ ...campaign, counts: countsMap });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { name, description, goal, status, messageTemplate, mediaUrl, mediaType, linkUrl, defaultDelayMs } = body;
  const campaign = await prisma.campaign.update({
    where: { id: params.id },
    data: {
      ...(name            !== undefined && { name: name.trim() }),
      ...(description     !== undefined && { description }),
      ...(goal            !== undefined && { goal }),
      ...(status          !== undefined && { status }),
      ...(messageTemplate !== undefined && { messageTemplate }),
      ...(mediaUrl        !== undefined && { mediaUrl }),
      ...(mediaType       !== undefined && { mediaType }),
      ...(linkUrl         !== undefined && { linkUrl }),
      ...(defaultDelayMs  !== undefined && { defaultDelayMs }),
    },
    include: { responseTags: { orderBy: { order: "asc" } } },
  });
  broadcast("campaigns", { action: "updated", id: params.id });
  return NextResponse.json(campaign);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.campaign.delete({ where: { id: params.id } });
  broadcast("campaigns", { action: "deleted", id: params.id });
  return NextResponse.json({ ok: true });
}
