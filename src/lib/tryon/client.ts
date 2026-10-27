// The browser side of a try-on: start it with POST /api/tryon, then poll
// GET /api/tryon/<taskId> every 3 s until it succeeds, fails or takes too long. A colour on a
// finished try-on runs the same way through POST /api/tryon/<taskId>/color.
// fetch, sleep and the clock are passed in so the flow can be tested without a browser.

export const POLL_MS = 3000;
export const GIVE_UP_MS = 3 * 60_000;

export type TryOnProgress = { stage: "starting" } | { stage: "waiting"; seconds: number };

/** A started task and the ticket that lets this session poll it. */
export interface TaskRef {
  taskId: string;
  ticket: string;
}

export type TryOnOutcome =
  /** `task` is what a colour request needs to point back at this result. */
  | { ok: true; resultUrl: string; seconds: number; task: TaskRef }
  /** `code` is ours (access_code, timeout, offline, cancelled…) or YouCam's error code. */
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

export function requestTryOn(selfie: Blob, wigId: string, deps: TryOnDeps = {}): Promise<TryOnOutcome> {
  const body = new FormData();
  body.set("wigId", wigId);
  body.set("selfie", selfie, "selfie.jpg");
  return runTask((fetchFn) => fetchFn("/api/tryon", { method: "POST", body }), "", deps);
}

/** Shows a finished try-on in one of the wig's colours (1 unit on success). */
export function requestColorway(tryOn: TaskRef, wigId: string, colorwayId: string, deps: TryOnDeps = {}): Promise<TryOnOutcome> {
  return runTask(
    (fetchFn) =>
      fetchFn(`/api/tryon/${encodeURIComponent(tryOn.taskId)}/color`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ticket: tryOn.ticket, wigId, colorwayId }),
      }),
    "&api=haircolor",
    deps,
  );
}

async function runTask(start: (fetchFn: typeof fetch) => Promise<Response>, pollQuery: string, deps: TryOnDeps): Promise<TryOnOutcome> {
  const {
    fetch: fetchFn = fetch,
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
    now = Date.now,
    onProgress,
    isCancelled = () => false,
  } = deps;
  const started = now();
  const seconds = () => Math.round((now() - started) / 1000);

  try {
    onProgress?.({ stage: "starting" });
    const res = await start(fetchFn);
    const startBody = await res.json().catch(() => null);
    if (!res.ok) {
      const error = errorOf(startBody);
      return { ok: false, code: error?.code ?? "start_failed", message: error?.message ?? "We couldn't start the preview." };
    }
    const task = startBody as TaskRef;
    const pollUrl = `/api/tryon/${encodeURIComponent(task.taskId)}?ticket=${encodeURIComponent(task.ticket)}${pollQuery}`;
    for (;;) {
      if (isCancelled()) return { ok: false, code: "cancelled", message: "" };
      if (now() - started > GIVE_UP_MS) {
        return { ok: false, code: "timeout", message: "This is taking too long. Please try again." };
      }
      onProgress?.({ stage: "waiting", seconds: seconds() });
      await sleep(POLL_MS);
      const poll = await fetchFn(pollUrl);
      const pollBody = await poll.json().catch(() => null);
      // 502 means "try again"; anything else that isn't OK ends the attempt.
      if (poll.status === 502) continue;
      if (!poll.ok) {
        const error = errorOf(pollBody);
        return { ok: false, code: error?.code ?? "poll_failed", message: error?.message ?? "Something went wrong." };
      }
      if (pollBody?.status === "success") return { ok: true, resultUrl: pollBody.resultUrl, seconds: seconds(), task };
      if (pollBody?.status === "error") {
        return { ok: false, code: pollBody.code ?? "task_failed", message: pollBody.message ?? "The preview didn't work." };
      }
    }
  } catch {
    return { ok: false, code: "offline", message: OFFLINE };
  }
}
