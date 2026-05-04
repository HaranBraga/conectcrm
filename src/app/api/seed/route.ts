import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  const u = await getCurrentUser();
  if (!u) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!u.isAdmin) return NextResponse.json({ error: "Apenas admin" }, { status: 403 });

  const existing = await prisma.kanbanStatus.count();
  if (existing > 0) return NextResponse.json({ message: "Já inicializado" });

  await prisma.kanbanStatus.createMany({
    data: [
      { name: "Novo Lead", color: "#6366f1", position: 0 },
      { name: "Em Contato", color: "#f59e0b", position: 1 },
      { name: "Aguardando", color: "#3b82f6", position: 2 },
      { name: "Reunião Marcada", color: "#8b5cf6", position: 3 },
      { name: "Convertido", color: "#10b981", position: 4 },
      { name: "Inativo", color: "#6b7280", position: 5 },
    ],
  });

  return NextResponse.json({ ok: true, message: "Kanban inicializado com 6 colunas padrão" });
}
