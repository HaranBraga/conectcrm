import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { contactIds } = await req.json();
  if (!Array.isArray(contactIds)) return NextResponse.json({ error: "contactIds array requerido" }, { status: 400 });

  await prisma.groupMember.createMany({
    data: contactIds.map((contactId: string) => ({ contactId, groupId: params.id })),
    skipDuplicates: true,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { contactId } = await req.json();
  await prisma.groupMember.delete({ where: { contactId_groupId: { contactId, groupId: params.id } } });
  return NextResponse.json({ ok: true });
}
