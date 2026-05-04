/**
 * Rate limit simples in-memory.
 *
 * Uso:
 *   const rl = checkRateLimit(`login:${ip}`, { limit: 5, windowMs: 15*60*1000 });
 *   if (!rl.ok) return Response.json({ error: ... }, { status: 429 });
 *
 * Limitações:
 * - in-memory: cada instância do Node tem seu próprio contador
 * - reseta no restart do container
 * - bom o suficiente como primeira camada anti-bruteforce; pra escala
 *   horizontal real, trocar por Redis.
 */

type Bucket = { hits: number[] };
const store = new Map<string, Bucket>();

// limpeza preguiçosa pra não vazar memória
let lastSweep = Date.now();
function sweep(now: number) {
  if (now - lastSweep < 60_000) return; // a cada 1 min no máximo
  lastSweep = now;
  const cutoff = now - 30 * 60_000; // joga fora buckets sem hits nos últimos 30 min
  for (const [k, v] of store) {
    v.hits = v.hits.filter(t => t > cutoff);
    if (v.hits.length === 0) store.delete(k);
  }
}

export function checkRateLimit(key: string, opts: { limit: number; windowMs: number }) {
  const now = Date.now();
  sweep(now);
  const bucket = store.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter(t => now - t < opts.windowMs);
  if (bucket.hits.length >= opts.limit) {
    const oldest = bucket.hits[0];
    const retryAfterMs = Math.max(0, opts.windowMs - (now - oldest));
    store.set(key, bucket);
    return { ok: false as const, retryAfterMs, hits: bucket.hits.length };
  }
  bucket.hits.push(now);
  store.set(key, bucket);
  return { ok: true as const, hits: bucket.hits.length };
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
