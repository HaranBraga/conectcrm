import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string; ccId: string } }) {
  const body = await req.json();
  const { status, responseTagId, assignedToId, notes } = body;

  const data: any = {};
  if (status !== undefined) {
    data.status = status;
    if ((status === "RESPONDEU" || status === "IGNOROU") && !data.respondedAt) {
      data.respondedAt = new Date();
    }
  }
  if (responseTagId !== undefined) {
    data.responseTagId = responseTagId || null;
    if (responseTagId && !data.respondedAt) data.respondedAt = new Date();
    // se etiquetou, considera que respondeu (a menos que a tag seja "Não respondeu")
  }
  if (assignedToId !== undefined) data.assignedToId = assignedToId || null;
  if (notes !== undefined) data.notes = notes;

  const updated = await prisma.campaignContact.update({
    where: { id: params.ccId },
    data,
    include: { responseTag: true, contact: { select: { id: true, name: true } } },
  });
  broadcast("campaigns", { action: "contact-updated", id: params.id });
  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string; ccId: string } }) {
  await prisma.campaignContact.delete({ where: { id: params.ccId } });
  broadcast("campaigns", { action: "contact-removed", id: params.id });
  return NextResponse.json({ ok: true });
}
