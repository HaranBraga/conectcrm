import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { name, color, position } = body;

  // Reorder: if positions array provided, update all at once
  if (body.reorder && Array.isArray(body.reorder)) {
    await Promise.all(
      body.reorder.map(({ id, position }: { id: string; position: number }) =>
        prisma.kanbanStatus.update({ where: { id }, data: { position } })
      )
    );
    return NextResponse.json({ ok: true });
  }

  const status = await prisma.kanbanStatus.update({
    where: { id: params.id },
    data: {
      ...(name && { name }),
      ...(color && { color }),
      ...(position !== undefined && { position }),
    },
  });
  return NextResponse.json(status);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const count = await prisma.conversation.count({ where: { statusId: params.id } });
  if (count > 0) return NextResponse.json({ error: "Mova as conversas antes de deletar este status" }, { status: 400 });
  await prisma.kanbanStatus.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
