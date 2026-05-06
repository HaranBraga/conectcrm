import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Retorna os contatos "novos" (source IN reuniao|agenda) agrupados pela
 * reunião/evento de origem. Contatos com múltiplas origens aparecem em
 * múltiplos grupos (intencional — facilita triar a partir de qualquer ponto).
 *
 * Resposta:
 *   {
 *     groups: [
 *       { type: "reuniao", id, titulo, dataHora, local, contacts: [...] },
 *       { type: "agenda",  id, titulo, inicio,   local, contacts: [...] },
 *     ],
 *     orphans: [...]  // contatos sem nenhuma relação ativa
 *     totalContacts: N
 *   }
 */
export async function GET(_: NextRequest) {
  // 1. Pega todos os contatos novos
  const contacts = await prisma.contact.findMany({
    where: { source: { in: ["reuniao", "agenda"] } },
    include: {
      role:   { select: { id: true, key: true, label: true, color: true, bgColor: true, level: true } },
      parent: { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
  });

  if (contacts.length === 0) {
    return NextResponse.json({ groups: [], orphans: [], totalContacts: 0 });
  }

  const ids = contacts.map(c => c.id);

  // 2. Busca relações em paralelo
  const [anfitriaoRows, presenteRows, agendaRows] = await Promise.all([
    prisma.reuniaoAnfitriao.findMany({
      where: { contactId: { in: ids } },
      include: { reuniao: { select: { id: true, titulo: true, dataHora: true, local: true } } },
    }),
    prisma.reuniaoPresente.findMany({
      where: { contactId: { in: ids } },
      include: { reuniao: { select: { id: true, titulo: true, dataHora: true, local: true } } },
    }),
    prisma.agendaEvento.findMany({
      where: { solicitanteId: { in: ids } },
      select: { id: true, titulo: true, inicio: true, local: true, solicitanteId: true },
    }),
  ]);

  // 3. Indexa por contato (pra calcular órfãos)
  const contactHasRel = new Set<string>();

  // 4. Monta grupos por reunião
  type Group = {
    type: "reuniao" | "agenda";
    id: string;
    titulo: string;
    when: string;       // ISO date
    local: string | null;
    contacts: any[];
  };
  const reuniaoMap = new Map<string, Group>();

  function addToReuniao(reuniao: any, contactId: string, role: "anfitriao" | "presente") {
    const c = contacts.find(x => x.id === contactId);
    if (!c) return;
    contactHasRel.add(contactId);
    let g = reuniaoMap.get(reuniao.id);
    if (!g) {
      g = {
        type: "reuniao",
        id: reuniao.id,
        titulo: reuniao.titulo,
        when: (reuniao.dataHora as Date).toISOString(),
        local: reuniao.local ?? null,
        contacts: [],
      };
      reuniaoMap.set(reuniao.id, g);
    }
    if (!g.contacts.find(x => x.id === c.id)) {
      g.contacts.push({ ...c, _role: role });
    } else {
      // já existe — marca como ambos
      const existing = g.contacts.find(x => x.id === c.id);
      if (existing && existing._role !== role) existing._role = "anfitriao+presente";
    }
  }

  anfitriaoRows.forEach(r => addToReuniao(r.reuniao, r.contactId, "anfitriao"));
  presenteRows.forEach(r => addToReuniao(r.reuniao, r.contactId, "presente"));

  // 5. Monta grupos por evento de agenda
  const agendaMap = new Map<string, Group>();
  agendaRows.forEach(ev => {
    if (!ev.solicitanteId) return;
    contactHasRel.add(ev.solicitanteId);
    const c = contacts.find(x => x.id === ev.solicitanteId);
    if (!c) return;
    let g = agendaMap.get(ev.id);
    if (!g) {
      g = {
        type: "agenda",
        id: ev.id,
        titulo: ev.titulo,
        when: (ev.inicio as Date).toISOString(),
        local: ev.local ?? null,
        contacts: [],
      };
      agendaMap.set(ev.id, g);
    }
    g.contacts.push(c);
  });

  // 6. Combina e ordena por data desc
  const groups: Group[] = [...reuniaoMap.values(), ...agendaMap.values()]
    .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());

  // 7. Órfãos: contatos sem nenhuma relação
  const orphans = contacts.filter(c => !contactHasRel.has(c.id));

  return NextResponse.json({
    groups,
    orphans,
    totalContacts: contacts.length,
  });
}
