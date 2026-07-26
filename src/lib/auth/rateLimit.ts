// Best-effort in-memory rate limiter for auth endpoints. This resets on
// server restart/redeploy and isn't shared across serverless instances, so on
// Vercel it's a soft speed bump, not a hard guarantee — for real protection
// against distributed brute force, put this behind Vercel Firewall or a
// shared store (e.g. Upstash Redis). Still worth having as defense-in-depth
// for the common single-instance/local case.
const attempts = new Map<string, { count: number; resetAt: number }>();

// Periodically drop stale entries so this map doesn't grow forever.
setInterval(() => {
  const now = Date.now();
  for (const [key, v] of attempts) {
    if (v.resetAt < now) attempts.delete(key);
  }
}, 5 * 60 * 1000).unref?.();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (entry.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0].trim() ?? "unknown";
}
