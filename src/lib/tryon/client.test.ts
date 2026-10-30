import { describe, expect, it } from "vitest";
import { GIVE_UP_MS, POLL_MS, requestColorway, requestHairType, requestTone, requestTryOn, type TryOnProgress } from "./client";

// Answers fetch from a queue of [status, body] pairs and records each request.
function fakeServer(answers: [number, unknown][]) {
  const requests: { url: string; method: string; form?: FormData; json?: unknown }[] = [];
  let clock = 0;
  const fetch = (async (url: string, init?: RequestInit) => {
    const sent = init?.body;
    requests.push({
      url,
      method: init?.method ?? "GET",
      form: sent instanceof FormData ? sent : undefined,
      json: typeof sent === "string" ? JSON.parse(sent) : undefined,
    });
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

    expect(outcome).toEqual({ ok: true, resultUrl: "/api/tryon/task%201/result", seconds: 9, task: { taskId: "task 1", ticket: "t+k" } });
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
    const { deps } = fakeServer([[429, { error: { code: "limit", message: "Please come back tomorrow to try more." } }]]);
    expect(await requestTryOn(selfie, "body-wave", deps)).toEqual({
      ok: false,
      code: "limit",
      message: "Please come back tomorrow to try more.",
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

describe("requestColorway", () => {
  it("asks for the colour on the try-on's own result, then polls the Hair Color task", async () => {
    const { deps, requests } = fakeServer([
      [200, { taskId: "color 1", ticket: "c/k" }],
      [200, { status: "running" }],
      [200, { status: "success", resultUrl: "/api/tryon/color%201/result" }],
    ]);

    const outcome = await requestColorway({ taskId: "task 1", ticket: "t+k" }, "body-wave", "30", deps);

    expect(outcome).toMatchObject({ ok: true, resultUrl: "/api/tryon/color%201/result", task: { taskId: "color 1" } });
    expect(requests[0]).toMatchObject({
      url: "/api/tryon/task%201/color",
      method: "POST",
      json: { ticket: "t+k", wigId: "body-wave", colorwayId: "30" },
    });
    expect(requests.slice(1).map((r) => r.url)).toEqual(Array(2).fill("/api/tryon/color%201?ticket=c%2Fk&api=haircolor"));
  });

  it("passes on a refusal, such as a colour the wig doesn't come in", async () => {
    const { deps } = fakeServer([[404, { error: { code: "no_colorway", message: "This wig doesn't come in that colour." } }]]);
    expect(await requestColorway({ taskId: "t", ticket: "k" }, "body-wave", "613", deps)).toEqual({
      ok: false,
      code: "no_colorway",
      message: "This wig doesn't come in that colour.",
    });
  });
});

describe("requestTone", () => {
  const closeUp = new Blob(["jpeg"], { type: "image/jpeg" });

  it("sends the close-up, then polls the session's tone reading", async () => {
    const { deps, requests } = fakeServer([
      [200, { status: "running" }],
      [200, { status: "running" }],
      [200, { status: "success", skinHex: "#614633" }],
    ]);
    expect(await requestTone(closeUp, deps)).toEqual({ ok: true, skinHex: "#614633", earlier: false });
    expect(requests[0]).toMatchObject({ url: "/api/tone", method: "POST" });
    expect((requests[0].form?.get("photo") as File).name).toBe("closeup.jpg");
    expect(requests.slice(1).map((r) => r.url)).toEqual(["/api/tone", "/api/tone"]);
  });

  it("stops at once when the session already has a reading, and says it's from earlier", async () => {
    const { deps, requests } = fakeServer([[200, { status: "success", skinHex: "#614633", earlier: true }]]);
    expect(await requestTone(closeUp, deps)).toEqual({ ok: true, skinHex: "#614633", earlier: true });
    expect(requests).toHaveLength(1);
  });

  it("still says it's from earlier when the session's first task was running", async () => {
    const { deps } = fakeServer([
      [200, { status: "running", earlier: true }],
      [200, { status: "success", skinHex: "#614633" }],
    ]);
    expect(await requestTone(closeUp, deps)).toEqual({ ok: true, skinHex: "#614633", earlier: true });
  });

  it("passes on what to change when the reading fails", async () => {
    const message = "Your face was too small in the close-up. Hold the phone a little closer and take the photos again.";
    const { deps } = fakeServer([
      [200, { status: "running" }],
      [200, { status: "error", code: "error_face_position_too_small", message }],
    ]);
    expect(await requestTone(closeUp, deps)).toEqual({ ok: false, code: "error_face_position_too_small", message });
  });
});

describe("requestHairType", () => {
  const shot = () => new Blob(["jpeg"], { type: "image/jpeg" });
  const photos = () => ({ front: shot(), right: shot(), left: shot() });
  const coily = { from: "4B", to: "4C", term: "Coily to Extremely Coily" };

  it("sends front, right and left, then polls the session's hair-type reading", async () => {
    const { deps, requests } = fakeServer([
      [200, { status: "running" }],
      [200, { status: "success", hair: coily }],
    ]);
    expect(await requestHairType(photos(), deps)).toEqual({ ok: true, hair: coily, earlier: false });
    expect(requests[0]).toMatchObject({ url: "/api/hairtype", method: "POST" });
    expect(["front", "right", "left"].map((side) => (requests[0].form?.get(side) as File).name)).toEqual(["front.jpg", "right.jpg", "left.jpg"]);
    expect(requests[1].url).toBe("/api/hairtype");
  });

  it("says when the reading came from earlier photos", async () => {
    const { deps, requests } = fakeServer([[200, { status: "success", hair: coily, earlier: true }]]);
    expect(await requestHairType(photos(), deps)).toEqual({ ok: true, hair: coily, earlier: true });
    expect(requests).toHaveLength(1);
  });

  it("passes on what to change when the reading fails", async () => {
    const message = "The photos were too dark to read your hair. Take them again in daylight.";
    const { deps } = fakeServer([[200, { status: "error", code: "error_insufficient_lighting", message }]]);
    expect(await requestHairType(photos(), deps)).toEqual({ ok: false, code: "error_insufficient_lighting", message });
  });
});
