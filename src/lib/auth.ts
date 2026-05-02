import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, signSession, verifySession } from "@/lib/auth-edge";
import { redirect } from "next/navigation";

export { SESSION_COOKIE, signSession, verifySession };

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export type CurrentUser = {
  id: string;
  name: string;
  username: string | null;
  isAdmin: boolean;
  modules: string[];
};

/** Lê o cookie de sessão (server-side) e retorna o user atual, ou null. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySession(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({
    where: { id: payload.uid },
    select: { id: true, name: true, username: true, isAdmin: true, modules: true, active: true },
  });
  if (!user || !user.active) return null;
  return { id: user.id, name: user.name, username: user.username, isAdmin: user.isAdmin, modules: user.modules };
}

export async function requireUser(): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  return u;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const u = await requireUser();
  if (!u.isAdmin) redirect("/");
  return u;
}
