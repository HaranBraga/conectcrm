import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const notes = await prisma.contactNote.findMany({
    where: { contactId: params.id },
    include: { author: { select: { id: true, name: true, username: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(notes);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const me = await getCurrentUser();
  const { body } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: "Texto obrigatório" }, { status: 400 });

  const note = await prisma.contactNote.create({
    data: {
      contactId: params.id,
      body: String(body).trim(),
      authorId: me?.id ?? null,
    },
    include: { author: { select: { id: true, name: true, username: true } } },
  });
  return NextResponse.json(note, { status: 201 });
}
