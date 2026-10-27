import { describe, expect, it } from "vitest";
import { GIVE_UP_MS, POLL_MS, requestTryOn, type TryOnProgress } from "./client";

// Answers fetch from a queue of [status, body] pairs and records each request.
function fakeServer(answers: [number, unknown][]) {
  const requests: { url: string; method: string; form?: FormData }[] = [];
  let clock = 0;
  const fetch = (async (url: string, init?: RequestInit) => {
    requests.push({ url, method: init?.method ?? "GET", form: init?.body as FormData | undefined });
    const next = answers.shift();
    if (!next) throw new TypeError("network down");
    const [status, body] = next;
    return new Response(JSON.stringify(body), { status });
  }) as typeof globalThis.fetch;
  const sleep = async (ms: number) => void (clock += ms);
  const progress: TryOnProgress[] = [];
  const deps = { fetch, sleep, now: () => clock, onProgress: (p: TryOnProgress) => void progress.push(p) };
  return { deps, requests, progress };
}

const selfie = new Blob(["jpeg"], { type: "image/jpeg" });
const started = [200, { taskId: "task 1", ticket: "t+k" }] as [number, unknown];

describe("requestTryOn", () => {
  it("starts with the wig id and photo, polls until success and reports progress", async () => {
    const { deps, requests, progress } = fakeServer([
      started,
      [200, { status: "running" }],
      [502, { error: { code: "poll_failed", message: "Trying again…" } }],
      [200, { status: "success", resultUrl: "/api/tryon/task%201/result" }],
    ]);

    const outcome = await requestTryOn(selfie, "body-wave", deps);

    expect(outcome).toEqual({ ok: true, resultUrl: "/api/tryon/task%201/result", seconds: 9 });
    expect(requests[0].method).toBe("POST");
    expect(requests[0].form?.get("wigId")).toBe("body-wave");
    expect((requests[0].form?.get("selfie") as File).name).toBe("selfie.jpg");
    expect(requests.slice(1).map((r) => r.url)).toEqual(Array(3).fill("/api/tryon/task%201?ticket=t%2Bk"));
    expect(progress).toEqual([
      { stage: "starting" },
      { stage: "waiting", seconds: 0 },
      { stage: "waiting", seconds: 3 },
      { stage: "waiting", seconds: 6 },
    ]);
  });

  it("passes on the server's code and message when the start is refused", async () => {
    const { deps } = fakeServer([[401, { error: { code: "access_code", message: "That access code isn't right." } }]]);
    expect(await requestTryOn(selfie, "body-wave", deps)).toEqual({
      ok: false,
      code: "access_code",
      message: "That access code isn't right.",
    });
  });

  it("reports a failed task with YouCam's code", async () => {
    const { deps } = fakeServer([started, [200, { status: "error", code: "error_hair_too_short", message: "This photo didn't work." }]]);
    expect(await requestTryOn(selfie, "body-wave", deps)).toMatchObject({ ok: false, code: "error_hair_too_short" });

    const noCode = fakeServer([started, [200, { status: "error", code: null, message: "This photo didn't work." }]]);
    expect(await requestTryOn(selfie, "body-wave", noCode.deps)).toMatchObject({ ok: false, code: "task_failed" });
  });

  it("gives up after three minutes", async () => {
    const running = Array.from({ length: GIVE_UP_MS / POLL_MS + 1 }, () => [200, { status: "running" }] as [number, unknown]);
    const { deps, requests } = fakeServer([started, ...running]);
    expect(await requestTryOn(selfie, "body-wave", deps)).toMatchObject({ ok: false, code: "timeout" });
    // The start, then one poll every 3 s up to and including the one at exactly 3 minutes.
    expect(requests.length).toBe(1 + GIVE_UP_MS / POLL_MS + 1);
  });

  it("stops quietly when cancelled and says so when the network fails", async () => {
    const { deps, requests } = fakeServer([started]);
    expect(await requestTryOn(selfie, "body-wave", { ...deps, isCancelled: () => true })).toMatchObject({ ok: false, code: "cancelled" });
    expect(requests.length).toBe(1);

    const offline = fakeServer([started]);
    expect(await requestTryOn(selfie, "body-wave", offline.deps)).toMatchObject({ ok: false, code: "offline" });
  });

  it("ends the attempt on a poll error other than 502", async () => {
    const { deps } = fakeServer([started, [401, { error: { code: "session_ended", message: "This preview has ended." } }]]);
    expect(await requestTryOn(selfie, "body-wave", deps)).toEqual({ ok: false, code: "session_ended", message: "This preview has ended." });
  });
});
