import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const groups = await prisma.contactGroup.findMany({
    include: { _count: { select: { members: true, dispatches: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(groups);
}

export async function POST(req: NextRequest) {
  const { name, description, date } = await req.json();
  if (!name) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
  const group = await prisma.contactGroup.create({
    data: { name, description, date: date ? new Date(date) : null },
  });
  return NextResponse.json(group, { status: 201 });
}
