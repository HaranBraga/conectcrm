import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST: retorna preview de quantos contatos serão adicionados
 * (resolve filtros mas não persiste).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const filters = await req.json();
  const ids = new Set<string>();
  const { contactIds, reuniaoId, mode, roleKeys, zonas, cidades, sources, excludeInAnyCampaign } = filters;

  if (Array.isArray(contactIds)) contactIds.forEach((id: string) => ids.add(id));

  if (reuniaoId) {
    const r = await prisma.reuniao.findUnique({
      where: { id: reuniaoId },
      include: { anfitrioes: { select: { contactId: true } }, presentes: { select: { contactId: true } } },
    });
    if (r) {
      const anfSet = new Set(r.anfitrioes.map(a => a.contactId));
      if (mode === "anfitrioes")     r.anfitrioes.forEach(a => ids.add(a.contactId));
      else if (mode === "presentes") r.presentes.filter(p => p.contactId && !anfSet.has(p.contactId)).forEach(p => ids.add(p.contactId!));
      else                            r.presentes.filter(p => p.contactId).forEach(p => ids.add(p.contactId!));
    }
  }

  const hasCriteria = (Array.isArray(roleKeys) && roleKeys.length) ||
                      (Array.isArray(zonas)    && zonas.length) ||
                      (Array.isArray(cidades)  && cidades.length) ||
                      (Array.isArray(sources)  && sources.length);
  if (hasCriteria) {
    const where: any = {};
    if (roleKeys?.length) where.role   = { key: { in: roleKeys } };
    if (zonas?.length)    where.zona   = { in: zonas };
    if (cidades?.length)  where.cidade = { in: cidades };
    if (sources?.length)  where.source = { in: sources };
    const cs = await prisma.contact.findMany({ where, select: { id: true } });
    cs.forEach(c => ids.add(c.id));
  }

  let arr = Array.from(ids);

  if (excludeInAnyCampaign && arr.length > 0) {
    const inOther = await prisma.campaignContact.findMany({
      where: { contactId: { in: arr }, campaignId: { not: params.id } },
      select: { contactId: true },
    });
    const otherSet = new Set(inOther.map(c => c.contactId));
    arr = arr.filter(id => !otherSet.has(id));
  }

  // Quantos já estão nesta campanha
  const already = await prisma.campaignContact.count({
    where: { campaignId: params.id, contactId: { in: arr } },
  });

  return NextResponse.json({
    total: arr.length,
    novos: arr.length - already,
    jaNaCampanha: already,
  });
}
