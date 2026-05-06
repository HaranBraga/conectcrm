import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "session";

/**
 * Resolve o secret em runtime (não no top-level do módulo).
 * Em build (`next build`) Next chega a importar este arquivo para
 * coletar dados das páginas; o throw aqui não pode rodar nesse momento.
 * Por isso a checagem fica nas funções abaixo, executadas só em runtime.
 */
function getSecret(): Uint8Array {
  const raw = process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production" && (!raw || raw.length < 32)) {
    throw new Error(
      "AUTH_SECRET não está configurada (ou é muito curta). Em produção, defina " +
      "uma string aleatória de pelo menos 32 caracteres na variável AUTH_SECRET. " +
      "Gere uma com: openssl rand -hex 32"
    );
  }
  return new TextEncoder().encode(raw || "dev-secret-change-me-in-production");
}

export type SessionPayload = { uid: string; isAdmin: boolean; modules: string[] };

/** Cria token JWT de sessão (Edge-compatible — usa jose). */
export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

/** Verifica e retorna payload, ou null se inválido. */
export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
