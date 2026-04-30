import { prisma } from "@/lib/prisma";

/**
 * Resolve um array de {contactId?, nome?, telefone?} em contactIds.
 * Para entradas manuais (sem contactId mas com telefone), procura contato
 * existente por telefone; se não achar, cria um novo Contact ligado ao líder
 * (via parentId) com source="reuniao".
 */
export async function resolveContactIds(
  items: Array<{ contactId?: string | null; nome?: string | null; telefone?: string | null }>,
  liderId: string | null,
  defaultRoleId: string | null,
): Promise<string[]> {
  const ids: string[] = [];
  for (const it of items) {
    if (it.contactId) { ids.push(it.contactId); continue; }
    if (!it.telefone?.trim()) continue;
    const phone = it.telefone.replace(/\D/g, "");
    let contact = await prisma.contact.findFirst({ where: { phone } });
    if (!contact && defaultRoleId) {
      contact = await prisma.contact.create({
        data: {
          name: it.nome?.trim() || phone,
          phone,
          roleId: defaultRoleId,
          source: "reuniao",
          parentId: liderId || null,
        },
      });
    }
    if (contact) ids.push(contact.id);
  }
  return ids;
}
