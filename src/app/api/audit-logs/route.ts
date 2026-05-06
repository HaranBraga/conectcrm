import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Lista logs de auditoria. Apenas admin.
 * Query params:
 *   - userId    : filtra por usuário
 *   - action    : filtra por ação exata (ex: "user.login")
 *   - actionPrefix : filtra por prefixo (ex: "campaign." pega todas de campanha)
 *   - entity    : filtra por entidade
 *   - entityId  : filtra por entidade específica
 *   - dateFrom  : ISO date — desde
 *   - dateTo    : ISO date — até
 *   - search    : texto livre no summary
 *   - page, limit (default page=1, limit=50, máx 200)
 */
export async function GET(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!me.isAdmin) return NextResponse.json({ error: "Apenas admin" }, { status: 403 });

  const sp = new URL(req.url).searchParams;
  const userId       = sp.get("userId")       ?? undefined;
  const action       = sp.get("action")       ?? undefined;
  const actionPrefix = sp.get("actionPrefix") ?? undefined;
  const entity       = sp.get("entity")       ?? undefined;
  const entityId     = sp.get("entityId")     ?? undefined;
  const dateFrom     = sp.get("dateFrom");
  const dateTo       = sp.get("dateTo");
  const search       = sp.get("search")       ?? undefined;

  const page  = Math.max(1, parseInt(sp.get("page")  ?? "1"));
  const limit = Math.min(200, Math.max(1, parseInt(sp.get("limit") ?? "50")));

  const where: any = {};
  if (userId)       where.userId = userId;
  if (action)       where.action = action;
  if (actionPrefix) where.action = { startsWith: actionPrefix };
  if (entity)       where.entity = entity;
  if (entityId)     where.entityId = entityId;
  if (search)       where.summary = { contains: search, mode: "insensitive" };
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo)   where.createdAt.lte = new Date(dateTo);
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true, username: true } } },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json({ logs, total, page, pages: Math.ceil(total / limit) });
}
