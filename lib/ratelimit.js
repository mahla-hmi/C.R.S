// Tiny in-memory sliding-window limiter (per server process). Good enough for one server;
// behind several instances / serverless use a shared store (Redis, Upstash) or the proxy's rate limiting.
const g = globalThis;
export function limited(key, max, windowMs) {
  const m = (g._rl ||= new Map());
  const now = Date.now();
  const hits = (m.get(key) || []).filter((t) => now - t < windowMs);
  hits.push(now); m.set(key, hits);
  if (m.size > 5000) for (const [k, v] of m) if (!v.some((t) => now - t < windowMs)) m.delete(k);
  return hits.length > max;
}
