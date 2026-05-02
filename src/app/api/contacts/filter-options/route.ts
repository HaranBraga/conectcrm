import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const [roles, bairrosRaw, cidadesRaw] = await Promise.all([
    prisma.personRole.findMany({
      select: { key: true, label: true, color: true, bgColor: true, _count: { select: { contacts: true } } },
      orderBy: { level: "desc" },
    }),
    prisma.contact.groupBy({ by: ["bairro"], _count: true, where: { bairro: { not: null } } }),
    prisma.contact.groupBy({ by: ["cidade"], _count: true, where: { cidade: { not: null } } }),
  ]);

  return NextResponse.json({
    roles: roles.map(r => ({ key: r.key, label: r.label, color: r.color, bgColor: r.bgColor, count: r._count.contacts })),
    bairros: bairrosRaw.filter(b => b.bairro).map(b => ({ value: b.bairro!, count: b._count })).sort((a, b) => b.count - a.count),
    cidades: cidadesRaw.filter(c => c.cidade).map(c => ({ value: c.cidade!, count: c._count })).sort((a, b) => b.count - a.count),
  });
}
