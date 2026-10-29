import { describe, expect, it } from "vitest";
import * as fx from "./__fixtures__/responses";
import { createYouCamClient, InsufficientUnitsError, YouCamError } from "./client";

type Call = { url: string; method: string; headers: Record<string, string>; body?: unknown };
type Reply = { status: number; body?: unknown };

// A fake fetch that answers from a queue per "METHOD path" and records every call.
function fakeApi(routes: Record<string, Reply[]>) {
  const calls: Call[] = [];
  const fetch = async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";
    calls.push({ url: url.toString(), method, headers: (init?.headers ?? {}) as Record<string, string>, body: init?.body });
    const key = url.host.endsWith("example.test") ? `${method} ${url.host}` : `${method} ${url.pathname}`;
    const queue = routes[key];
    if (!queue?.length) throw new Error(`unexpected request: ${key}`);
    const reply = queue.length > 1 ? queue.shift()! : queue[0];
    return new Response(reply.body === undefined ? null : JSON.stringify(reply.body), { status: reply.status });
  };
  const sleeps: number[] = [];
  let clock = 0;
  const client = createYouCamClient({
    apiKey: "test-key",
    fetch: fetch as typeof globalThis.fetch,
    sleep: async (ms) => {
      sleeps.push(ms);
      clock += ms;
    },
    now: () => clock,
  });
  return { client, calls, sleeps };
}

const ok = (body: unknown): Reply => ({ status: 200, body });

describe("balance", () => {
  it("adds up amount_dec across unit grants", async () => {
    const { client, calls } = fakeApi({ "GET /s2s/v1.0/client/credit": [ok(fx.credit)] });
    expect(await client.getBalance()).toBe(954);
    expect(calls[0].headers.Authorization).toBe("Bearer test-key");
  });

  it("refuses a call that would leave fewer than 100 units", async () => {
    const { client } = fakeApi({ "GET /s2s/v1.0/client/credit": [ok({ status: 200, results: [{ amount_dec: 110 }] })] });
    await expect(client.ensureUnits(20)).rejects.toBeInstanceOf(InsufficientUnitsError);
    await expect(client.ensureUnits(10)).resolves.toBe(110);
  });
});

describe("uploadFile", () => {
  it("asks for an upload URL, then PUTs the bytes there with the given headers", async () => {
    const { client, calls } = fakeApi({
      "POST /s2s/v2.0/file": [ok(fx.fileUpload)],
      "PUT upload.example.test": [{ status: 200 }],
    });
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    const fileId = await client.uploadFile({ bytes, fileName: "front.jpg", contentType: "image/jpg" });

    expect(fileId).toBe("file-123");
    expect(JSON.parse(String(calls[0].body))).toEqual({ files: [{ content_type: "image/jpg", file_name: "front.jpg", file_size: 4 }] });
    expect(calls[1]).toMatchObject({ method: "PUT", headers: { "Content-Type": "image/jpg", "Content-Length": "4" }, body: bytes });
  });

  it("fails if the PUT fails, so no task runs on a missing file", async () => {
    const { client } = fakeApi({
      "POST /s2s/v2.0/file": [ok(fx.fileUpload)],
      "PUT upload.example.test": [{ status: 403 }],
    });
    await expect(client.uploadFile({ bytes: new Uint8Array(4), fileName: "front.jpg", contentType: "image/jpg" })).rejects.toThrow("File upload failed: 403");
  });
});

describe("tasks", () => {
  it("starts a try-on with the selfie and the wig photo", async () => {
    const { client, calls } = fakeApi({ "POST /s2s/v2.1/task/hair-transfer": [ok(fx.taskStarted)] });
    expect(await client.startTask("hairstyle", { src_file_id: "selfie", ref_file_id: "wig" })).toBe("task-123");
    expect(JSON.parse(String(calls[0].body))).toEqual({ src_file_id: "selfie", ref_file_id: "wig" });
  });

  it("sends hair type photos in the order front, right, left", async () => {
    const { client, calls } = fakeApi({ "POST /s2s/v2.0/task/hair-type-detection": [ok(fx.taskStarted)] });
    await client.startTask("hairtype", { src_file_ids: ["front", "right", "left"] });
    expect(JSON.parse(String(calls[0].body))).toEqual({ src_file_ids: ["front", "right", "left"] });
  });

  it("recolours a stored result with one of our colours", async () => {
    const { client, calls } = fakeApi({ "POST /s2s/v2.0/task/hair-color": [ok(fx.taskStarted)] });
    await client.startTask("haircolor", {
      src_file_id: "result",
      pattern: { name: "full" },
      palettes: [{ color: "#4a2c21", color_intensity: 80 }],
    });
    expect(JSON.parse(String(calls[0].body))).toEqual({
      src_file_id: "result",
      pattern: { name: "full" },
      palettes: [{ color: "#4a2c21", color_intensity: 80 }],
    });
  });

  it("returns the Hair Color result link and reports its errors", async () => {
    const { client } = fakeApi({
      "GET /s2s/v2.0/task/hair-color/a": [ok(fx.taskRunning), ok(fx.hairColorSuccess)],
      "GET /s2s/v2.0/task/hair-color/b": [ok(fx.hairColorError)],
    });
    expect(await client.waitForTask("haircolor", "a")).toEqual({
      status: "success",
      taskId: "a",
      results: { url: "https://results.example.test/colorway.jpg" },
    });
    expect(await client.waitForTask("haircolor", "b")).toMatchObject({ status: "error", error: "error_below_min_image_size" });
  });

  it("polls every 3 seconds until success", async () => {
    const { client, sleeps } = fakeApi({
      "GET /s2s/v2.1/task/hair-transfer/task-123": [ok(fx.taskRunning), ok(fx.taskRunning), ok(fx.hairstyleSuccess)],
    });
    const outcome = await client.waitForTask("hairstyle", "task-123");
    expect(outcome).toEqual({ status: "success", taskId: "task-123", results: { url: "https://results.example.test/tryon.jpg" } });
    expect(sleeps).toEqual([3000, 3000]);
  });

  it("returns tone results, including the undocumented face_quality", async () => {
    const { client } = fakeApi({ "GET /s2s/v2.0/task/skin-tone-analysis/t": [ok(fx.toneSuccess)] });
    const outcome = await client.waitForTask("tone", "t");
    expect(outcome.status === "success" && outcome.results.color.skin_color).toBe("#614633");
  });

  it("reports a failed task with its error code (failures cost no units)", async () => {
    const { client } = fakeApi({ "GET /s2s/v2.1/task/hair-transfer/t": [ok(fx.hairstyleError)] });
    expect(await client.waitForTask("hairstyle", "t")).toEqual({
      status: "error",
      taskId: "t",
      error: "error_hair_too_short",
      message: "Input hair is too short",
    });
  });

  it("gives up after the timeout but keeps the task id to resume later", async () => {
    const { client, sleeps } = fakeApi({ "GET /s2s/v2.1/task/hair-transfer/t": [ok(fx.taskRunning)] });
    expect(await client.waitForTask("hairstyle", "t", { timeoutMs: 10_000 })).toEqual({ status: "timeout", taskId: "t" });
    expect(sleeps).toEqual([3000, 3000, 3000]);
  });
});

describe("errors and rate limits", () => {
  it("backs off on 429 and 5xx, doubling the wait", async () => {
    const { client, sleeps } = fakeApi({
      "GET /s2s/v1.0/client/credit": [{ status: 429 }, { status: 503 }, { status: 429 }, ok(fx.credit)],
    });
    expect(await client.getBalance()).toBe(954);
    expect(sleeps).toEqual([3000, 6000, 12000]);
  });

  it("stops retrying after 4 retries", async () => {
    const { client, calls } = fakeApi({ "GET /s2s/v1.0/client/credit": [{ status: 503 }] });
    await expect(client.getBalance()).rejects.toMatchObject({ status: 503 });
    expect(calls).toHaveLength(5);
  });

  it("throws a YouCamError with the error code and without the key", async () => {
    const { client } = fakeApi({ "GET /s2s/v1.0/client/credit": [{ status: 401, body: fx.invalidKey }] });
    const err = await client.getBalance().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(YouCamError);
    expect(err).toMatchObject({ status: 401, code: "InvalidAccessToken" });
    expect(String((err as Error).message)).not.toContain("test-key");
  });
});
