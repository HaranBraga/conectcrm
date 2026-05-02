import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // PENDENTE | ENVIADO | RESPONDEU | IGNOROU

  const where: any = { campaignId: params.id };
  if (status) where.status = status;

  const items = await prisma.campaignContact.findMany({
    where,
    include: {
      contact:    { select: { id: true, name: true, phone: true, role: true, parent: { select: { id: true, name: true } } } },
      assignedTo: { select: { id: true, name: true } },
      sentBy:     { select: { id: true, name: true } },
      responseTag: true,
    },
    orderBy: [{ status: "asc" }, { addedAt: "asc" }],
  });
  return NextResponse.json(items);
}

/**
 * Adiciona contatos à campanha. Aceita:
 *  - { contactIds: string[] }
 *  - { groupId: string }
 *  - { reuniaoId: string, mode?: "all" | "anfitrioes" | "presentes" }
 *  - { roleKey: string }   // todos contatos de um papel
 *  - { assignedToId?: string } opcional, aplicado a todos os adicionados
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { contactIds, groupId, reuniaoId, mode = "all", roleKey, assignedToId } = body;

  let ids: string[] = Array.isArray(contactIds) ? [...contactIds] : [];

  if (groupId) {
    const members = await prisma.groupMember.findMany({ where: { groupId }, select: { contactId: true } });
    ids.push(...members.map(m => m.contactId));
  }
  if (reuniaoId) {
    const r = await prisma.reuniao.findUnique({
      where: { id: reuniaoId },
      include: {
        anfitrioes: { select: { contactId: true } },
        presentes:  { select: { contactId: true } },
      },
    });
    if (!r) return NextResponse.json({ error: "Reunião não encontrada" }, { status: 404 });
    const anfSet = new Set(r.anfitrioes.map(a => a.contactId));
    if (mode === "anfitrioes")     ids.push(...r.anfitrioes.map(a => a.contactId));
    else if (mode === "presentes") ids.push(...r.presentes.filter(p => p.contactId && !anfSet.has(p.contactId)).map(p => p.contactId!));
    else                            ids.push(...r.presentes.filter(p => p.contactId).map(p => p.contactId!));
  }
  if (roleKey) {
    const role = await prisma.personRole.findUnique({ where: { key: roleKey } });
    if (role) {
      const cs = await prisma.contact.findMany({ where: { roleId: role.id }, select: { id: true } });
      ids.push(...cs.map(c => c.id));
    }
  }

  ids = Array.from(new Set(ids));
  if (ids.length === 0) return NextResponse.json({ added: 0, skipped: 0 });

  // Filtra os que já estão
  const existing = await prisma.campaignContact.findMany({
    where: { campaignId: params.id, contactId: { in: ids } },
    select: { contactId: true },
  });
  const existingSet = new Set(existing.map(e => e.contactId));
  const toAdd = ids.filter(id => !existingSet.has(id));

  if (toAdd.length > 0) {
    await prisma.campaignContact.createMany({
      data: toAdd.map(contactId => ({
        campaignId: params.id,
        contactId,
        assignedToId: assignedToId || null,
      })),
    });
  }
  broadcast("campaigns", { action: "contacts-added", id: params.id });
  return NextResponse.json({ added: toAdd.length, skipped: existingSet.size });
}
