import { createHash, randomBytes } from "crypto";

/** How long an emailed reset link stays valid. */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Per-account throttle: at most this many links per window, so nobody can email-bomb an address. */
export const RESET_MAX_PER_WINDOW = 3;
export const RESET_WINDOW_MS = 15 * 60 * 1000;

/** 256 bits of randomness, URL-safe — the raw value only ever lives in the emailed link. */
export function generateResetToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * What's actually stored and looked up. A fast hash is fine here (unlike
 * passwords): the input is 256 random bits, so there's nothing to brute-force.
 */
export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Origin used to build the emailed link. Deliberately NOT taken from the
 * request's Host header in production — that header is attacker-controlled,
 * and trusting it would let someone trigger a genuine reset email for a
 * victim whose link points at the attacker's domain. APP_URL is the explicit
 * setting; Vercel's own production-domain variable is the fallback there.
 */
export function appOrigin(req: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, "");
  if (process.env.NODE_ENV !== "production") return new URL(req.url).origin;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  throw new Error("APP_URL is not set — needed to build password-reset links.");
}
