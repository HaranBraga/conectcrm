import { jwtVerify, SignJWT } from "jose";

const RAW_SECRET = process.env.AUTH_SECRET;
if (process.env.NODE_ENV === "production" && (!RAW_SECRET || RAW_SECRET.length < 32)) {
  throw new Error(
    "AUTH_SECRET não está configurada (ou é muito curta). Em produção, defina " +
    "uma string aleatória de pelo menos 32 caracteres na variável AUTH_SECRET. " +
    "Gere uma com: openssl rand -hex 32"
  );
}
const SECRET = new TextEncoder().encode(RAW_SECRET || "dev-secret-change-me-in-production");

export const SESSION_COOKIE = "session";

export type SessionPayload = { uid: string; isAdmin: boolean };

/** Cria token JWT de sessão (Edge-compatible — usa jose). */
export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET);
}

/** Verifica e retorna payload, ou null se inválido. */
export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
