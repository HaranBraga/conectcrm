import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: { id: string; tagId: string } }) {
  const { label, color, bgColor, order } = await req.json();
  const tag = await prisma.campaignResponseTag.update({
    where: { id: params.tagId },
    data: {
      ...(label   !== undefined && { label: label.trim() }),
      ...(color   !== undefined && { color }),
      ...(bgColor !== undefined && { bgColor }),
      ...(order   !== undefined && { order }),
    },
  });
  broadcast("campaigns", { action: "tag-updated", id: params.id });
  return NextResponse.json(tag);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string; tagId: string } }) {
  await prisma.campaignResponseTag.delete({ where: { id: params.tagId } });
  broadcast("campaigns", { action: "tag-deleted", id: params.id });
  return NextResponse.json({ ok: true });
}
