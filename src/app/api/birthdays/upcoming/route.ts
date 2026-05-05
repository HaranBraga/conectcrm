import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Lista contatos cujo aniversário cai entre hoje e hoje+days.
 * GET /api/birthdays/upcoming?days=7
 *
 * Retorna pra cada um: dados do contato + idade + dias até aniversário +
 * se já recebeu mensagem este ano (via BirthdayMessage).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const days = Math.max(0, Math.min(60, Number(searchParams.get("days") ?? "7")));

  const today = new Date();
  const year = today.getFullYear();
  // gera lista (mês, dia) dos próximos N dias incluindo hoje
  const targetMonthDays: { month: number; day: number; daysFromToday: number }[] = [];
  for (let i = 0; i <= days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    targetMonthDays.push({ month: d.getMonth() + 1, day: d.getDate(), daysFromToday: i });
  }

  // Query SQL puro para extrair MM/DD do dataNascimento
  const tuples = targetMonthDays.map(t => `(${t.month},${t.day})`).join(",");
  const rows = await prisma.$queryRawUnsafe<any[]>(`
    SELECT c.id, c.name, c.phone, c."dataNascimento", c."roleId", c."parentId",
           c.cidade, c.bairro, c.zona, c."profilePhotoUrl", c."labels", c."source"
    FROM "Contact" c
    WHERE c."dataNascimento" IS NOT NULL
      AND (EXTRACT(MONTH FROM c."dataNascimento")::int, EXTRACT(DAY FROM c."dataNascimento")::int) IN (${tuples})
    ORDER BY EXTRACT(MONTH FROM c."dataNascimento"), EXTRACT(DAY FROM c."dataNascimento"), c.name
  `);

  if (rows.length === 0) return NextResponse.json([]);

  const ids = rows.map((r: any) => r.id);
  const [roles, parents, sentThisYear] = await Promise.all([
    prisma.personRole.findMany({
      where: { id: { in: rows.map((r: any) => r.roleId) } },
      select: { id: true, key: true, label: true, color: true, bgColor: true, level: true },
    }),
    prisma.contact.findMany({
      where: { id: { in: rows.filter((r: any) => r.parentId).map((r: any) => r.parentId) } },
      select: { id: true, name: true },
    }),
    prisma.birthdayMessage.findMany({
      where: { contactId: { in: ids }, year },
      select: { contactId: true, sentAt: true, message: true },
    }),
  ]);

  const rolesById   = Object.fromEntries(roles.map(r => [r.id, r]));
  const parentsById = Object.fromEntries(parents.map(p => [p.id, p]));
  const sentMap     = Object.fromEntries(sentThisYear.map(s => [s.contactId, s]));

  const enriched = rows.map((r: any) => {
    const dob = new Date(r.dataNascimento);
    const month = dob.getMonth() + 1;
    const day = dob.getDate();
    // calcular idade que completará neste aniversário (ano atual)
    const willTurn = year - dob.getFullYear();
    const target = targetMonthDays.find(t => t.month === month && t.day === day);
    const sent = sentMap[r.id];
    return {
      ...r,
      role: rolesById[r.roleId] ?? null,
      parent: r.parentId ? parentsById[r.parentId] ?? null : null,
      birthMonth: month,
      birthDay: day,
      willTurn,
      daysFromToday: target?.daysFromToday ?? 0,
      sentThisYear: sent ?? null,
    };
  });

  return NextResponse.json(enriched);
}
