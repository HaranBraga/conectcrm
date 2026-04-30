import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const cals = await prisma.agendaCalendario.findMany({ orderBy: [{ isPadrao: "desc" }, { createdAt: "asc" }] });
  return NextResponse.json(cals);
}

export async function POST(req: NextRequest) {
  const { nome, cor } = await req.json();
  if (!nome?.trim()) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
  const cal = await prisma.agendaCalendario.create({ data: { nome: nome.trim(), cor: cor ?? "#6366f1" } });
  return NextResponse.json(cal, { status: 201 });
}
