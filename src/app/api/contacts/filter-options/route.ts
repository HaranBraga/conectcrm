import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const [roles, zonasRaw, cidadesRaw, sourcesRaw] = await Promise.all([
    prisma.personRole.findMany({
      select: { key: true, label: true, color: true, bgColor: true, _count: { select: { contacts: true } } },
      orderBy: { level: "desc" },
    }),
    prisma.contact.groupBy({ by: ["zona"],   _count: true, where: { zona:   { not: null } } }),
    prisma.contact.groupBy({ by: ["cidade"], _count: true, where: { cidade: { not: null } } }),
    prisma.contact.groupBy({ by: ["source"], _count: true }),
  ]);

  return NextResponse.json({
    roles: roles.map(r => ({ key: r.key, label: r.label, color: r.color, bgColor: r.bgColor, count: r._count.contacts })),
    zonas:   zonasRaw  .filter(z => z.zona)  .map(z => ({ value: z.zona!,   count: z._count })).sort((a, b) => b.count - a.count),
    cidades: cidadesRaw.filter(c => c.cidade).map(c => ({ value: c.cidade!, count: c._count })).sort((a, b) => b.count - a.count),
    sources: sourcesRaw                       .map(s => ({ value: s.source, count: s._count })).sort((a, b) => b.count - a.count),
  });
}
