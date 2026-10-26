import { createHash, timingSafeEqual } from "node:crypto";

// Until per-device caps exist (step G), routes that spend YouCam units need a code that only
// Gregory and his testers know. Set TRYON_ACCESS_CODE in Vercel; unset means nobody gets in.

const digest = (value: string) => createHash("sha256").update(value).digest();

export function accessCodeMatches(provided: string | null | undefined, expected: string | undefined): boolean {
  if (!expected || !provided) return false;
  // Comparing digests keeps the comparison constant-time whatever the lengths.
  return timingSafeEqual(digest(provided), digest(expected));
}
