import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const labels = await prisma.label.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(labels);
}

export async function POST(req: NextRequest) {
  const { name, color, bgColor } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
  try {
    const label = await prisma.label.create({
      data: { name: name.trim(), color: color ?? "#6366f1", bgColor: bgColor ?? "#eef2ff" },
    });
    return NextResponse.json(label, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Etiqueta já existe" }, { status: 409 });
  }
}
