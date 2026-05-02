import { NextRequest, NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/auth-edge";

// Caminhos públicos (não exigem login)
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/me",
  "/api/auth/logout",
  "/api/webhook",          // webhook do WhatsApp/Evolution
  "/api/sse",              // server-sent events (já valida internamente se quiser)
];

function isPublic(path: string): boolean {
  return PUBLIC_PATHS.some(p => path === p || path.startsWith(p + "/"));
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (isPublic(path)) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    const url = new URL("/login", req.url);
    url.searchParams.set("from", path);
    return NextResponse.redirect(url);
  }

  const session = await verifySession(token);
  if (!session) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
    }
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Tudo exceto assets estáticos
    "/((?!_next/static|_next/image|favicon.ico|campaigns/).*)",
  ],
};
