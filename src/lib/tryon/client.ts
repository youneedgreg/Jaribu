// The browser side of a try-on: start it with POST /api/tryon, then poll
// GET /api/tryon/<taskId> every 3 s until it succeeds, fails or takes too long. A colour on a
// finished try-on runs the same way through POST /api/tryon/<taskId>/color, the skin-tone
// reading through POST then GET /api/tone, and the hair-type reading through /api/hairtype.
// fetch, sleep and the clock are passed in so the flow can be tested without a browser.

import type { HairType } from "../youcam/hair-type";

export const POLL_MS = 3000;
export const GIVE_UP_MS = 3 * 60_000;

export type TryOnProgress = { stage: "starting" } | { stage: "waiting"; seconds: number };

/** A started task and the ticket that lets this session poll it. */
export interface TaskRef {
  taskId: string;
  ticket: string;
}

type Failure = { ok: false; code: string; message: string };

/** `earlier`: the session's reading came from an earlier close-up, not the one just sent. */
export type ToneOutcome = { ok: true; skinHex: string; earlier: boolean } | Failure;

/** `earlier`: the session's reading came from earlier photos, not the ones just sent. */
export type HairOutcome = { ok: true; hair: HairType; earlier: boolean } | Failure;

export type TryOnOutcome =
  /** `task` is what a colour request needs to point back at this result. */
  | { ok: true; resultUrl: string; seconds: number; task: TaskRef }
  /** `code` is ours (limit, timeout, offline, cancelled…) or YouCam's error code. */
  | { ok: false; code: string; message: string };

export interface TryOnDeps {
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  onProgress?: (progress: TryOnProgress) => void;
  /** Checked before each poll: true stops quietly (the screen went away). */
  isCancelled?: () => boolean;
}

const errorOf = (body: unknown) => (body as { error?: { code?: string; message?: string } } | null)?.error;
const OFFLINE = "Something went wrong on this phone. Check the connection and try again.";

export async function requestTryOn(selfie: Blob, wigId: string, deps: TryOnDeps = {}): Promise<TryOnOutcome> {
  const body = new FormData();
  body.set("wigId", wigId);
  body.set("selfie", selfie, "selfie.jpg");
  const outcome = await runTask((fetchFn) => fetchFn("/api/tryon", { method: "POST", body }), taskPollUrl(""), deps);
  return outcome.ok ? { ok: true, resultUrl: outcome.body?.resultUrl ?? "", seconds: outcome.seconds, task: outcome.start as TaskRef } : outcome;
}

/** Shows a finished try-on in one of the wig's colours (1 unit on success). */
export async function requestColorway(tryOn: TaskRef, wigId: string, colorwayId: string, deps: TryOnDeps = {}): Promise<TryOnOutcome> {
  const outcome = await runTask(
    (fetchFn) =>
      fetchFn(`/api/tryon/${encodeURIComponent(tryOn.taskId)}/color`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ticket: tryOn.ticket, wigId, colorwayId }),
      }),
    taskPollUrl("&api=haircolor"),
    deps,
  );
  return outcome.ok ? { ok: true, resultUrl: outcome.body?.resultUrl ?? "", seconds: outcome.seconds, task: outcome.start as TaskRef } : outcome;
}

/** Reads the shopper's skin tone from the cropped close-up (20 units, once per session). */
export async function requestTone(closeUp: Blob, deps: TryOnDeps = {}): Promise<ToneOutcome> {
  const body = new FormData();
  body.set("photo", closeUp, "closeup.jpg");
  const outcome = await runTask((fetchFn) => fetchFn("/api/tone", { method: "POST", body }), () => "/api/tone", deps);
  return outcome.ok ? { ok: true, skinHex: outcome.body?.skinHex ?? "", earlier: outcome.start?.earlier === true } : outcome;
}

/** Reads the shopper's hair type from the three camera photos (2 units, once per session). */
export async function requestHairType(photos: { front: Blob; right: Blob; left: Blob }, deps: TryOnDeps = {}): Promise<HairOutcome> {
  const body = new FormData();
  for (const side of ["front", "right", "left"] as const) body.set(side, photos[side], `${side}.jpg`);
  const outcome = await runTask((fetchFn) => fetchFn("/api/hairtype", { method: "POST", body }), () => "/api/hairtype", deps);
  if (!outcome.ok) return outcome;
  if (!outcome.body?.hair) return { ok: false, code: "unreadable_result", message: "We couldn't read your hair type. Please try again." };
  return { ok: true, hair: outcome.body.hair, earlier: outcome.start?.earlier === true };
}

const taskPollUrl = (query: string) => (start: TaskRef) =>
  `/api/tryon/${encodeURIComponent(start.taskId)}?ticket=${encodeURIComponent(start.ticket)}${query}`;

/** What our routes answer: a start (task id and ticket) or a status, never both. */
type Body = {
  status?: "running" | "success" | "error";
  code?: string | null;
  message?: string;
  resultUrl?: string;
  skinHex?: string;
  hair?: HairType;
  earlier?: boolean;
  taskId?: string;
  ticket?: string;
} | null;

/**
 * Starts a task, then polls every 3 s until it succeeds, fails or takes too long. A start that
 * already says success or error (the session's tone reading, asked for twice) ends at once.
 */
async function runTask(
  start: (fetchFn: typeof fetch) => Promise<Response>,
  pollUrlOf: (start: TaskRef) => string,
  deps: TryOnDeps,
): Promise<{ ok: true; body: Body; start: Body; seconds: number } | Failure> {
  const {
    fetch: fetchFn = fetch,
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
    now = Date.now,
    onProgress,
    isCancelled = () => false,
  } = deps;
  const started = now();
  const seconds = () => Math.round((now() - started) / 1000);
  const finished = (body: Body, startBody: Body) =>
    body?.status === "success"
      ? ({ ok: true, body, start: startBody, seconds: seconds() } as const)
      : body?.status === "error"
        ? ({ ok: false, code: body.code ?? "task_failed", message: body.message ?? "The preview didn't work." } as const)
        : null;

  try {
    onProgress?.({ stage: "starting" });
    const res = await start(fetchFn);
    const startBody = (await res.json().catch(() => null)) as Body;
    if (!res.ok) {
      const error = errorOf(startBody);
      return { ok: false, code: error?.code ?? "start_failed", message: error?.message ?? "We couldn't start the preview." };
    }
    const early = finished(startBody, startBody);
    if (early) return early;
    const pollUrl = pollUrlOf(startBody as TaskRef);
    for (;;) {
      if (isCancelled()) return { ok: false, code: "cancelled", message: "" };
      if (now() - started > GIVE_UP_MS) {
        return { ok: false, code: "timeout", message: "This is taking too long. Please try again." };
      }
      onProgress?.({ stage: "waiting", seconds: seconds() });
      await sleep(POLL_MS);
      const poll = await fetchFn(pollUrl);
      const pollBody = (await poll.json().catch(() => null)) as Body;
      // 502 means "try again"; anything else that isn't OK ends the attempt.
      if (poll.status === 502) continue;
      if (!poll.ok) {
        const error = errorOf(pollBody);
        return { ok: false, code: error?.code ?? "poll_failed", message: error?.message ?? "Something went wrong." };
      }
      const done = finished(pollBody, startBody);
      if (done) return done;
    }
  } catch {
    return { ok: false, code: "offline", message: OFFLINE };
  }
}
