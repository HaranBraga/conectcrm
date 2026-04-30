import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/sse";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { labels } = await req.json();
  if (!Array.isArray(labels)) return NextResponse.json({ error: "labels deve ser array" }, { status: 400 });
  const contact = await prisma.contact.update({
    where: { id: params.id },
    data: { labels },
  });
  broadcast("kanban", { action: "labels", contactId: params.id });
  return NextResponse.json(contact);
}
