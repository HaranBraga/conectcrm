import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { name, color, bgColor } = await req.json();
  const label = await prisma.label.update({
    where: { id: params.id },
    data: {
      ...(name     !== undefined && { name }),
      ...(color    !== undefined && { color }),
      ...(bgColor  !== undefined && { bgColor }),
    },
  });
  return NextResponse.json(label);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.label.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
