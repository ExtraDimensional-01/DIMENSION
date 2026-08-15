import { SOCIAL_PLATFORMS, type SocialPlatform } from "@/lib/constants";

const VALID_PLATFORMS = new Set<string>(SOCIAL_PLATFORMS.map((p) => p.value));

export function isValidPlatform(value: unknown): value is SocialPlatform {
  return typeof value === "string" && VALID_PLATFORMS.has(value);
}

/**
 * Normalizes and validates a social link URL: adds "https://" if the
 * protocol was omitted (the common case when someone types
 * "instagram.com/user"), then requires the result to be a well-formed
 * http/https URL. Returns null if it can't be made valid — never throws.
 */
export function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (!parsed.hostname || !parsed.hostname.includes(".")) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}
