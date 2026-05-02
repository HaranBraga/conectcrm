import { jwtVerify, SignJWT } from "jose";

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-change-me-in-production");

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
