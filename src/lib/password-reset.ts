import { createHash, randomBytes } from "crypto";

/** Reset links stop working after this long. */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Max reset emails per account / per IP, per window. */
export const RESET_REQUESTS_PER_EMAIL = 3;
export const RESET_REQUESTS_PER_IP = 10;
export const RESET_REQUEST_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/** Max reset-confirmation attempts per IP (throttles token guessing). */
export const RESET_CONFIRMS_PER_IP = 10;
export const RESET_CONFIRM_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/** 256 bits of randomness, URL-safe. This raw value only ever goes in the email. */
export function generateResetToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * The database stores only this hash. A fast hash (SHA-256) is appropriate
 * here because the input is already a high-entropy random token, not a
 * human-chosen password — there's nothing to brute-force.
 */
export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Base URL used to build links in emails. Deliberately NOT derived from the
 * incoming request's Host header — that would let an attacker request a
 * reset for someone else's account with a spoofed Host and get the victim
 * emailed a link to the attacker's domain (host-header poisoning).
 */
export function getAppBaseUrl(): string | null {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  return null;
}
