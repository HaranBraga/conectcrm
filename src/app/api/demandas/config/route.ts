import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DEFAULTS = {
  demanda_statuses: [
    { key: "ANALISAR",     label: "Analisar",     color: "#6366f1", isClosed: false, position: 0 },
    { key: "EM_ANDAMENTO", label: "Em Andamento", color: "#f59e0b", isClosed: false, position: 1 },
    { key: "PENDENTE",     label: "Pendente",     color: "#f97316", isClosed: false, position: 2 },
    { key: "ATENDIDA",     label: "Atendida",     color: "#10b981", isClosed: true,  position: 3 },
    { key: "NAO_ATENDIDA", label: "Não Atendida", color: "#ef4444", isClosed: true,  position: 4 },
  ],
  demanda_prioridades: [
    { key: "URGENTE",    label: "Urgente",    color: "#dc2626", bgColor: "#fee2e2", position: 0 },
    { key: "IMPORTANTE", label: "Importante", color: "#ea580c", bgColor: "#ffedd5", position: 1 },
    { key: "MEDIA",      label: "Média",      color: "#2563eb", bgColor: "#dbeafe", position: 2 },
    { key: "NORMAL",     label: "Normal",     color: "#6b7280", bgColor: "#f3f4f6", position: 3 },
  ],
  demanda_segmentos: ["Saúde", "Esporte", "Ação"],
};

async function read(key: string, fallback: any) {
  const row = await prisma.appConfig.findUnique({ where: { key } });
  if (!row) return fallback;
  try { return JSON.parse(row.value); } catch { return fallback; }
}

export async function GET() {
  const [statuses, prioridades, segmentos] = await Promise.all([
    read("demanda_statuses",    DEFAULTS.demanda_statuses),
    read("demanda_prioridades", DEFAULTS.demanda_prioridades),
    read("demanda_segmentos",   DEFAULTS.demanda_segmentos),
  ]);
  return NextResponse.json({ statuses, prioridades, segmentos });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const allowed = ["demanda_statuses", "demanda_prioridades", "demanda_segmentos"];
  for (const key of allowed) {
    if (body[key] !== undefined) {
      await prisma.appConfig.upsert({
        where: { key },
        update: { value: JSON.stringify(body[key]) },
        create: { key, value: JSON.stringify(body[key]) },
      });
    }
  }
  return NextResponse.json({ ok: true });
}
