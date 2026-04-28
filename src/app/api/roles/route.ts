import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const roles = await prisma.personRole.findMany({ orderBy: { level: "asc" } });
  return NextResponse.json(roles);
}

export async function POST(req: NextRequest) {
  const { key, label, color, bgColor, level } = await req.json();
  if (!key || !label) return NextResponse.json({ error: "key e label são obrigatórios" }, { status: 400 });

  const existing = await prisma.personRole.findUnique({ where: { key } });
  if (existing) return NextResponse.json({ error: "Chave já existe" }, { status: 409 });

  const role = await prisma.personRole.create({
    data: { key, label, color: color ?? "#6366f1", bgColor: bgColor ?? "#eef2ff", level: level ?? 0 },
  });
  return NextResponse.json(role, { status: 201 });
}
