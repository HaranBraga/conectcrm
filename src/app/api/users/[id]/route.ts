import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;

async function requireAdminOrError() {
  const u = await getCurrentUser();
  if (!u) return { error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }), user: null };
  if (!u.isAdmin) return { error: NextResponse.json({ error: "Apenas admin" }, { status: 403 }), user: null };
  return { error: null, user: u };
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, user: actor } = await requireAdminOrError();
  if (error) return error;

  const body = await req.json();
  const { name, username, password, isAdmin, modules, active } = body;

  if (actor!.id === params.id && isAdmin === false) {
    return NextResponse.json({ error: "Você não pode tirar seu próprio admin" }, { status: 400 });
  }
  if (actor!.id === params.id && active === false) {
    return NextResponse.json({ error: "Você não pode desativar você mesmo" }, { status: 400 });
  }

  const data: any = {};
  if (name      !== undefined) data.name = String(name).trim();
  if (username  !== undefined) {
    const uname = String(username).toLowerCase().trim();
    if (!USERNAME_RE.test(uname)) return NextResponse.json({ error: "Usuário inválido" }, { status: 400 });
    const exists = await prisma.user.findUnique({ where: { username: uname } });
    if (exists && exists.id !== params.id) return NextResponse.json({ error: "Usuário já existe" }, { status: 409 });
    data.username = uname;
  }
  if (isAdmin   !== undefined) data.isAdmin = !!isAdmin;
  if (modules   !== undefined) data.modules = Array.isArray(modules) ? modules : [];
  if (active    !== undefined) data.active = !!active;
  if (password) {
    if (String(password).length < 6) return NextResponse.json({ error: "Senha mínima 6 caracteres" }, { status: 400 });
    data.password = await hashPassword(password);
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data,
    select: { id: true, name: true, username: true, isAdmin: true, modules: true, active: true, lastLogin: true },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const { error, user: actor } = await requireAdminOrError();
  if (error) return error;
  if (actor!.id === params.id) {
    return NextResponse.json({ error: "Você não pode excluir você mesmo" }, { status: 400 });
  }
  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
