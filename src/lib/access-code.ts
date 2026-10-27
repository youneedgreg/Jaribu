import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// Until per-device caps exist (step G), routes that spend YouCam units need a code that only
// Gregory and his testers know. Set TRYON_ACCESS_CODE in Vercel; unset means nobody gets in.

const digest = (value: string) => createHash("sha256").update(value).digest();

export function accessCodeMatches(provided: string | null | undefined, expected: string | undefined): boolean {
  if (!expected || !provided) return false;
  // Comparing digests keeps the comparison constant-time whatever the lengths.
  return timingSafeEqual(digest(provided), digest(expected));
}

// After one correct entry the device gets a pass for 24 hours: `<issuedAt>.<signature>`.
// The signature covers a hash of the code, so changing TRYON_ACCESS_CODE cancels every pass.

export const ACCESS_COOKIE = "jaribu_access";
export const ACCESS_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function passSignature(issuedAt: string, expected: string, secret: string): string {
  return createHmac("sha256", secret).update(`access.${issuedAt}.${digest(expected).toString("hex")}`).digest("base64url");
}

export function issueAccessPass(expected: string | undefined, secret: string | undefined, now = Date.now()): string {
  if (!expected) throw new Error("TRYON_ACCESS_CODE is not set");
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET must be set to at least 32 characters");
  return `${now}.${passSignature(String(now), expected, secret)}`;
}

export function accessPassValid(value: string | undefined, expected: string | undefined, secret: string | undefined, now = Date.now()): boolean {
  if (!expected || !secret || secret.length < 32) return false;
  const match = value?.match(/^(\d{1,15})\.([A-Za-z0-9_-]{43})$/);
  if (!match) return false;
  const [, issued, signature] = match;
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(passSignature(issued, expected, secret)))) return false;
  const issuedAt = Number(issued);
  return issuedAt <= now + 60_000 && now - issuedAt <= ACCESS_MAX_AGE_MS;
}
