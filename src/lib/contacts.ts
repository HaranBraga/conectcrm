import { prisma } from "@/lib/prisma";

/**
 * Resolve os contatos abaixo de um conjunto de líderes na hierarquia.
 *
 * - depth = "direct": apenas filhos diretos (parentId IN leaderIds)
 * - depth = "all":    todos os descendentes (transitivo, via WITH RECURSIVE)
 *
 * Não inclui os próprios líderes no resultado.
 */
export async function getDescendantContactIds(
  leaderIds: string[],
  depth: "direct" | "all",
): Promise<string[]> {
  if (leaderIds.length === 0) return [];

  if (depth === "direct") {
    const rows = await prisma.contact.findMany({
      where: { parentId: { in: leaderIds } },
      select: { id: true },
    });
    return rows.map(r => r.id);
  }

  // Recursivo: precisa de SQL puro
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    WITH RECURSIVE descendants AS (
      SELECT id FROM "Contact" WHERE "parentId" = ANY(${leaderIds})
      UNION ALL
      SELECT c.id FROM "Contact" c
      INNER JOIN descendants d ON c."parentId" = d.id
    )
    SELECT DISTINCT id FROM descendants;
  `;
  return rows.map(r => r.id);
}
