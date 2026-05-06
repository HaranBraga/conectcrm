import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Retorna a "origem" de um contato: as reuniões em que aparece (como
 * anfitrião ou presente) e os eventos da agenda em que é solicitante.
 * Usado na aba "Novos" pra mostrar de onde o contato veio antes de
 * promover pra base.
 */
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const contactId = params.id;

  const [anfitriaoEm, presenteEm, agendaEventos] = await Promise.all([
    prisma.reuniaoAnfitriao.findMany({
      where: { contactId },
      include: { reuniao: { select: { id: true, titulo: true, dataHora: true, local: true } } },
      orderBy: { reuniao: { dataHora: "desc" } },
    }),
    prisma.reuniaoPresente.findMany({
      where: { contactId },
      include: { reuniao: { select: { id: true, titulo: true, dataHora: true, local: true } } },
      orderBy: { reuniao: { dataHora: "desc" } },
    }),
    prisma.agendaEvento.findMany({
      where: { solicitanteId: contactId },
      select: { id: true, titulo: true, inicio: true, local: true, tipo: true },
      orderBy: { inicio: "desc" },
    }),
  ]);

  // Agrupa reuniões (mesma reunião pode ter o contato como anfitrião E presente)
  const reunioesMap = new Map<string, any>();
  anfitriaoEm.forEach(a => {
    reunioesMap.set(a.reuniao.id, { ...a.reuniao, role: "anfitriao" });
  });
  presenteEm.forEach(p => {
    const existing = reunioesMap.get(p.reuniao.id);
    if (existing) existing.role = `${existing.role}+presente`;
    else reunioesMap.set(p.reuniao.id, { ...p.reuniao, role: "presente" });
  });
  const reunioes = Array.from(reunioesMap.values()).sort(
    (a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime(),
  );

  return NextResponse.json({
    reunioes,
    agenda: agendaEventos,
    total: reunioes.length + agendaEventos.length,
  });
}
