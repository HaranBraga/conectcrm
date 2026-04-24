import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const dispatch = await prisma.dispatch.findUnique({
    where: { id: params.id },
    include: {
      group: { select: { name: true } },
      results: { orderBy: { sentAt: "asc" } },
    },
  });
  if (!dispatch) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json(dispatch);
}
