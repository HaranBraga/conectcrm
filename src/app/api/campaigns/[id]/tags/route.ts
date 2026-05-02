import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const tags = await prisma.campaignResponseTag.findMany({
    where: { campaignId: params.id },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(tags);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { label, color = "#6366f1", bgColor = "#eef2ff" } = await req.json();
  if (!label?.trim()) return NextResponse.json({ error: "Label obrigatório" }, { status: 400 });
  const last = await prisma.campaignResponseTag.findFirst({
    where: { campaignId: params.id }, orderBy: { order: "desc" },
  });
  const tag = await prisma.campaignResponseTag.create({
    data: { campaignId: params.id, label: label.trim(), color, bgColor, order: (last?.order ?? -1) + 1 },
  });
  broadcast("campaigns", { action: "tag-created", id: params.id });
  return NextResponse.json(tag, { status: 201 });
}
