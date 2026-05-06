import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Troca da senha do próprio usuário autenticado.
 * Body: { currentPassword, newPassword }
 */
export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Senha atual e nova são obrigatórias" }, { status: 400 });
  }
  if (String(newPassword).length < 6) {
    return NextResponse.json({ error: "Senha nova deve ter ao menos 6 caracteres" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: me.id } });
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const ok = await verifyPassword(currentPassword, user.password);
  if (!ok) return NextResponse.json({ error: "Senha atual incorreta" }, { status: 401 });

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await hashPassword(newPassword) },
  });

  await logAudit({
    action: "user.password_change",
    summary: `Trocou a própria senha`,
    req,
  });

  return NextResponse.json({ ok: true });
}
