import { db } from "@/lib/db";

/**
 * Fixed-window-ish rate limiter backed by the database (RateLimitHit).
 *
 * Returns true if the caller is within the limit (and records the hit), or
 * false if they've exceeded `limit` hits for `key` in the last `windowMs`.
 * Rejected attempts are NOT recorded, so a blocked caller isn't punished
 * further and the table can't be grown by spamming a blocked key.
 *
 * Count-then-insert isn't atomic, so a burst of truly simultaneous requests
 * can slip a few extra hits past the limit. That's an acceptable trade for
 * abuse protection on low-frequency endpoints like password reset.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  const since = new Date(Date.now() - windowMs);

  const recent = await db.rateLimitHit.count({
    where: { key, createdAt: { gte: since } },
  });
  if (recent >= limit) return false;

  await db.rateLimitHit.create({ data: { key } });

  // Opportunistic cleanup (~2% of calls) so the table doesn't grow forever.
  // Anything older than a day is past every window we use.
  if (Math.random() < 0.02) {
    await db.rateLimitHit
      .deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } })
      .catch(() => {});
  }

  return true;
}

/**
 * Best-effort client IP. On Vercel, x-forwarded-for is set by the platform
 * edge (client-supplied values are overwritten), so the first entry is
 * trustworthy there. Falls back to a shared bucket if no header is present,
 * which makes the limit stricter, never looser.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim() || "unknown";
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}
