import { NextRequest, NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/auth-edge";
import { PATH_TO_MODULE, MODULES } from "@/lib/modules";

// Caminhos públicos (não exigem login)
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/me",
  "/api/auth/logout",
  "/api/webhook",          // webhook do WhatsApp/Evolution (ver WEBHOOK_TOKEN)
];

function isPublic(path: string): boolean {
  return PUBLIC_PATHS.some(p => path === p || path.startsWith(p + "/"));
}

// Páginas/APIs que só admin pode acessar
// (rotas com leitura geral mas escrita restrita a admin — como
//  /api/agenda/calendarios e /api/demandas/config — ficam fora daqui
//  e validam admin no próprio handler.)
const ADMIN_PATHS = [
  "/configuracoes",
  "/api/users",
  "/api/audit-logs",
];

function isAdminOnly(path: string): boolean {
  return ADMIN_PATHS.some(p => path === p || path.startsWith(p + "/"));
}

/**
 * Resolve o módulo exigido para um path. Retorna null se não há restrição
 * (página pública/genérica como `/`, `/perfil`, ou rota API não mapeada).
 */
function moduleFor(path: string): string | null {
  for (const { prefix, module } of PATH_TO_MODULE) {
    if (path === prefix || path.startsWith(prefix + "/")) return module;
    // mapeia também as APIs: /api/contatos → contatos, /api/campaigns → campanhas, etc
    const apiPrefix = "/api" + prefix;
    if (path === apiPrefix || path.startsWith(apiPrefix + "/")) return module;
  }
  // mapeamentos extras (slug do módulo difere do path)
  if (path.startsWith("/api/contacts"))      return "contatos";
  if (path.startsWith("/api/campaigns"))     return "campanhas";
  if (path.startsWith("/api/conversations")) return "conversas";
  if (path.startsWith("/api/messages"))      return "conversas";
  if (path.startsWith("/api/birthdays"))     return "campanhas";
  if (path.startsWith("/api/reunioes"))      return "reunioes";
  if (path.startsWith("/api/agenda"))        return "agenda";
  if (path.startsWith("/api/demandas"))      return "demandas";
  return null;
}

function deny(req: NextRequest, kind: "auth" | "module") {
  const path = req.nextUrl.pathname;
  if (path.startsWith("/api/")) {
    const status = kind === "auth" ? 401 : 403;
    const error  = kind === "auth" ? "Não autenticado" : "Sem permissão para este módulo";
    return NextResponse.json({ error }, { status });
  }
  // Páginas: redireciona pro login (auth) ou pra home (sem permissão)
  if (kind === "auth") {
    const url = new URL("/login", req.url);
    url.searchParams.set("from", path);
    return NextResponse.redirect(url);
  }
  return NextResponse.redirect(new URL("/", req.url));
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (isPublic(path)) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return deny(req, "auth");

  const session = await verifySession(token);
  if (!session) return deny(req, "auth");

  // Admin tem acesso a tudo
  if (session.isAdmin) return NextResponse.next();

  // Não-admin: bloqueia rotas de admin
  if (isAdminOnly(path)) return deny(req, "module");

  const userModules = Array.isArray(session.modules) ? session.modules : [];

  // "/" é o kanban — se não tem permissão, manda pro primeiro módulo permitido
  if (path === "/") {
    if (userModules.includes("kanban")) return NextResponse.next();
    const first = MODULES.find(m => userModules.includes(m.key) && m.href !== "/");
    if (first) return NextResponse.redirect(new URL(first.href, req.url));
    return NextResponse.redirect(new URL("/perfil", req.url));
  }

  // Não-admin: checa se o módulo está liberado
  const required = moduleFor(path);
  if (required && !userModules.includes(required)) {
    return deny(req, "module");
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Tudo exceto assets estáticos
    "/((?!_next/static|_next/image|favicon.ico|campaigns/).*)",
  ],
};
