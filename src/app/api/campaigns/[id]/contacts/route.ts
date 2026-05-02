import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // PENDENTE | ENVIADO | RESPONDEU | IGNOROU
  const search = searchParams.get("search") ?? "";
  const limit  = Math.min(Number(searchParams.get("limit") ?? 200), 500);
  const offset = Number(searchParams.get("offset") ?? 0);

  const where: any = { campaignId: params.id };
  if (status) where.status = status;
  if (search.trim()) {
    where.contact = {
      OR: [
        { name:  { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ],
    };
  }

  const [items, total] = await Promise.all([
    prisma.campaignContact.findMany({
      where,
      include: {
        contact:    { select: { id: true, name: true, phone: true, role: true, parent: { select: { id: true, name: true } } } },
        assignedTo: { select: { id: true, name: true } },
        sentBy:     { select: { id: true, name: true } },
        responseTag: true,
      },
      orderBy: [{ status: "asc" }, { addedAt: "asc" }],
      take: limit,
      skip: offset,
    }),
    prisma.campaignContact.count({ where }),
  ]);

  return NextResponse.json({ items, total });
}

/**
 * Resolve filtros em uma lista de contactIds.
 * Filtros aceitos:
 *  - contactIds: string[]
 *  - reuniaoId + mode ("all" | "anfitrioes" | "presentes")
 *  - roleKeys: string[]
 *  - cidades: string[]
 *  - bairros: string[]
 *  - excludeInAnyCampaign: boolean
 */
async function resolveContactIds(filters: any, campaignId: string): Promise<string[]> {
  const ids = new Set<string>();
  const { contactIds, reuniaoId, mode, roleKeys, cidades, bairros, excludeInAnyCampaign } = filters;

  if (Array.isArray(contactIds)) contactIds.forEach((id: string) => ids.add(id));

  if (reuniaoId) {
    const r = await prisma.reuniao.findUnique({
      where: { id: reuniaoId },
      include: {
        anfitrioes: { select: { contactId: true } },
        presentes:  { select: { contactId: true } },
      },
    });
    if (r) {
      const anfSet = new Set(r.anfitrioes.map(a => a.contactId));
      if (mode === "anfitrioes")     r.anfitrioes.forEach(a => ids.add(a.contactId));
      else if (mode === "presentes") r.presentes.filter(p => p.contactId && !anfSet.has(p.contactId)).forEach(p => ids.add(p.contactId!));
      else                            r.presentes.filter(p => p.contactId).forEach(p => ids.add(p.contactId!));
    }
  }

  // Filtro por critérios (combinados via AND)
  const hasCriteria = (Array.isArray(roleKeys) && roleKeys.length) ||
                      (Array.isArray(cidades)  && cidades.length) ||
                      (Array.isArray(bairros)  && bairros.length);
  if (hasCriteria) {
    const where: any = {};
    if (roleKeys?.length) where.role   = { key: { in: roleKeys } };
    if (cidades?.length)  where.cidade = { in: cidades };
    if (bairros?.length)  where.bairro = { in: bairros };
    const cs = await prisma.contact.findMany({ where, select: { id: true } });
    cs.forEach(c => ids.add(c.id));
  }

  let arr = Array.from(ids);

  // Excluir quem já está em alguma outra campanha
  if (excludeInAnyCampaign && arr.length > 0) {
    const inOther = await prisma.campaignContact.findMany({
      where: { contactId: { in: arr }, campaignId: { not: campaignId } },
      select: { contactId: true },
    });
    const otherSet = new Set(inOther.map(c => c.contactId));
    arr = arr.filter(id => !otherSet.has(id));
  }

  return arr;
}

/**
 * Adiciona contatos à campanha. Aceita os filtros descritos em resolveContactIds
 * + assignedToId opcional aplicado a todos os adicionados.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const ids = await resolveContactIds(body, params.id);

  if (ids.length === 0) return NextResponse.json({ added: 0, skipped: 0 });

  const existing = await prisma.campaignContact.findMany({
    where: { campaignId: params.id, contactId: { in: ids } },
    select: { contactId: true },
  });
  const existingSet = new Set(existing.map(e => e.contactId));
  const toAdd = ids.filter(id => !existingSet.has(id));

  if (toAdd.length > 0) {
    await prisma.campaignContact.createMany({
      data: toAdd.map(contactId => ({
        campaignId:   params.id,
        contactId,
        assignedToId: body.assignedToId || null,
      })),
    });
  }
  broadcast("campaigns", { action: "contacts-added", id: params.id });
  return NextResponse.json({ added: toAdd.length, skipped: existingSet.size });
}
