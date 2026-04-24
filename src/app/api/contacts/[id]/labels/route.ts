import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { labels } = await req.json();
  if (!Array.isArray(labels)) return NextResponse.json({ error: "labels deve ser array" }, { status: 400 });
  const contact = await prisma.contact.update({
    where: { id: params.id },
    data: { labels },
  });
  return NextResponse.json(contact);
}
