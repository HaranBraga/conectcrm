import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/sse";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Reordena conversations dentro/entre colunas do kanban.
 * Body: { columns: [{ statusId, orderedIds: string[] }] }
 *
 * Para cada coluna recebida, atualiza statusId e position de todas
 * as conversations na ordem dada. Funciona pra reorder dentro da
 * mesma coluna E para mover entre colunas (basta enviar origem
 * + destino com o card no destino).
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const columns: { statusId: string; orderedIds: string[] }[] = body.columns ?? [];
  if (!Array.isArray(columns) || columns.length === 0) {
    return NextResponse.json({ error: "columns é obrigatório" }, { status: 400 });
  }

  const updates: Promise<any>[] = [];
  for (const col of columns) {
    if (!col.statusId || !Array.isArray(col.orderedIds)) continue;
    col.orderedIds.forEach((convId, index) => {
      updates.push(
        prisma.conversation.update({
          where: { id: convId },
          data: { statusId: col.statusId, position: index },
        }),
      );
    });
  }

  await prisma.$transaction(updates);
  broadcast("kanban", { action: "reordered" });

  await logAudit({
    action: "kanban.move",
    summary: `Reorganizou kanban (${columns.length} coluna(s), ${updates.length} card(s))`,
    meta: { columns: columns.length, cards: updates.length },
    req,
  });

  return NextResponse.json({ ok: true });
}
