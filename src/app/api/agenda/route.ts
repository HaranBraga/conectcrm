import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/sse";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const include = {
  solicitante: { select: { id: true, name: true, phone: true, role: true } },
  demanda:     { select: { id: true, titulo: true, status: true } },
  anfitrioes:  { include: { contact: { select: { id: true, name: true, phone: true, role: true } } } },
  calendario:  { select: { id: true, nome: true, cor: true } },
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start       = searchParams.get("start");
  const end         = searchParams.get("end");
  const calIds      = searchParams.getAll("cal");

  const where: any = {};
  if (start && end) where.inicio = { gte: new Date(start), lte: new Date(end) };
  if (calIds.length > 0) where.calendarioId = { in: calIds };

  const eventos = await prisma.agendaEvento.findMany({
    where, include,
    orderBy: { inicio: "asc" },
  });
  return NextResponse.json(eventos);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    titulo, assunto, tipo, status, inicio, duracao,
    local, bairro, zona, quantidadePessoas, oQuePrecisa, notes,
    solicitanteId, solicitanteNome, solicitanteTel,
    demandaId, anfitriaoIds = [],
  } = body;

  if (!titulo?.trim() || !inicio) {
    return NextResponse.json({ error: "Título e início são obrigatórios" }, { status: 400 });
  }

  // Se o solicitante veio só como nome+tel (sem id), tenta resolver pra um
  // Contact (find por phone, ou cria com source="agenda" pra aparecer na
  // aba "Novos" de /contatos pra triar depois).
  let resolvedSolicitanteId: string | null = solicitanteId || null;
  if (!resolvedSolicitanteId && solicitanteTel?.trim()) {
    const phone = String(solicitanteTel).replace(/\D/g, "");
    if (phone) {
      let c = await prisma.contact.findFirst({ where: { phone } });
      if (!c) {
        const defaultRole = await prisma.personRole.findFirst({ orderBy: { level: "desc" } });
        if (defaultRole) {
          c = await prisma.contact.create({
            data: {
              name: (solicitanteNome?.trim() || phone).toUpperCase(),
              phone,
              roleId: defaultRole.id,
              source: "agenda",
            },
          });
        }
      }
      if (c) resolvedSolicitanteId = c.id;
    }
  }

  const evento = await prisma.agendaEvento.create({
    data: {
      titulo: titulo.trim(), assunto, tipo: tipo ?? "AGENDA", status: status ?? "PENDENTE",
      inicio: new Date(inicio), duracao,
      local, bairro, zona, quantidadePessoas, oQuePrecisa, notes,
      solicitanteId: resolvedSolicitanteId,
      solicitanteNome: solicitanteNome || null,
      solicitanteTel: solicitanteTel || null,
      demandaId:    demandaId    || null,
      calendarioId: body.calendarioId || null,
      anfitrioes: {
        create: anfitriaoIds.map((id: string) => ({ contactId: id })),
      },
    },
    include,
  });
  broadcast("agenda", { action: "created", id: evento.id });

  await logAudit({
    action: "agenda.create",
    entity: "AgendaEvento",
    entityId: evento.id,
    summary: `Criou evento "${evento.titulo}"`,
    meta: { inicio: evento.inicio, tipo: evento.tipo },
    req,
  });

  return NextResponse.json(evento, { status: 201 });
}
