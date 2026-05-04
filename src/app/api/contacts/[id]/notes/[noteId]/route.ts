import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/sse";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: { id: string; noteId: string } }) {
  const { body } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: "Texto obrigatório" }, { status: 400 });
  const note = await prisma.contactNote.update({
    where: { id: params.noteId },
    data: { body: String(body).trim() },
    include: { author: { select: { id: true, name: true, username: true } } },
  });
  broadcast("contacts", { action: "note-updated", id: params.id });
  return NextResponse.json(note);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string; noteId: string } }) {
  await prisma.contactNote.delete({ where: { id: params.noteId } });
  broadcast("contacts", { action: "note-deleted", id: params.id });
  return NextResponse.json({ ok: true });
}
