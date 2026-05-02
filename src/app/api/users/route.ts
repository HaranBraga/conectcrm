import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function requireAdminOrError() {
  const u = await getCurrentUser();
  if (!u) return { error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }), user: null };
  if (!u.isAdmin) return { error: NextResponse.json({ error: "Apenas admin" }, { status: 403 }), user: null };
  return { error: null, user: u };
}

const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;

export async function GET() {
  const { error } = await requireAdminOrError();
  if (error) return error;

  const users = await prisma.user.findMany({
    select: { id: true, name: true, username: true, isAdmin: true, modules: true, active: true, lastLogin: true, createdAt: true },
    orderBy: [{ isAdmin: "desc" }, { name: "asc" }],
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdminOrError();
  if (error) return error;

  const body = await req.json();
  const { name, username, password, isAdmin = false, modules = [], active = true } = body;
  if (!name?.trim() || !username?.trim() || !password) {
    return NextResponse.json({ error: "Nome, usuário e senha são obrigatórios" }, { status: 400 });
  }
  const uname = String(username).toLowerCase().trim();
  if (!USERNAME_RE.test(uname)) {
    return NextResponse.json({ error: "Usuário deve ter 3-32 caracteres (letras minúsculas, números, ., _ ou -)" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Senha deve ter ao menos 6 caracteres" }, { status: 400 });
  }
  const exists = await prisma.user.findUnique({ where: { username: uname } });
  if (exists) return NextResponse.json({ error: "Usuário já cadastrado" }, { status: 409 });

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      username: uname,
      password: await hashPassword(password),
      isAdmin: !!isAdmin,
      modules: Array.isArray(modules) ? modules : [],
      active: !!active,
    },
    select: { id: true, name: true, username: true, isAdmin: true, modules: true, active: true, createdAt: true },
  });
  return NextResponse.json(user, { status: 201 });
}
