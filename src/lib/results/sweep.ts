// The 24-hour deletion: removes shoppers' previews and readings from Blob. Kept free of
// server-only imports so it can be tested with fakes; the route builds the real one.

import { createHash, timingSafeEqual } from "node:crypto";
import { RESULT_MAX_AGE_MS } from "./store";

/** Only this folder is ever swept. Sellers' wig photos live in `wigs/` and must stay. */
export const SWEEP_PREFIX = "sessions/";

const DELETE_BATCH = 1000;

/** The subset of @vercel/blob the sweep uses, so tests can pass fakes. */
export interface SweepBlobOps {
  list(options: { prefix: string; cursor?: string }): Promise<{ blobs: { pathname: string; uploadedAt: Date }[]; cursor?: string; hasMore: boolean }>;
  del(pathnames: string[]): Promise<void>;
}

/** Deletes everything under `sessions/` older than 24 hours. Returns how many blobs went. */
export async function sweepResults({ blob, now = Date.now }: { blob: SweepBlobOps; now?: () => number }): Promise<number> {
  const expired: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await blob.list({ prefix: SWEEP_PREFIX, cursor });
    for (const { pathname, uploadedAt } of page.blobs) {
      // The prefix already limits the list; a wrong answer from it still can't reach `wigs/`.
      if (pathname.startsWith(SWEEP_PREFIX) && now() - uploadedAt.getTime() > RESULT_MAX_AGE_MS) expired.push(pathname);
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  for (let i = 0; i < expired.length; i += DELETE_BATCH) {
    await blob.del(expired.slice(i, i + DELETE_BATCH));
  }
  return expired.length;
}

const digest = (text: string) => createHash("sha256").update(text).digest();

/** True only for `Authorization: Bearer <secret>`, and never when no secret is set. */
export function cronAuthorized(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header) return false;
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
}
