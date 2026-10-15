import "server-only";

const hits = new Map<string, number[]>();
export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (hits.size > 10000) {
    for (const [storedKey, timestamps] of hits) {
      const recent = timestamps.filter((time) => time > now - windowMs);
      if (recent.length) hits.set(storedKey, recent);
      else hits.delete(storedKey);
    }
  }
  const current = (hits.get(key) ?? []).filter((time) => time > now - windowMs);
  if (current.length >= limit) { hits.set(key, current); return false; }
  current.push(now);
  hits.set(key, current);
  return true;
}

export function requestKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
