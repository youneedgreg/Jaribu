import { describe, expect, it } from "vitest";
import { fakeJpeg } from "../images/__fixtures__/fake-jpeg";
import { InsufficientUnitsError } from "../youcam/client";
import { checkPhoto, PHOTO_MAX_BYTES, PhotoError, pollTryOn, RecolorError, startRecolor, startTryOn } from "./tryon";

// A fake YouCam client that records calls and answers getTask from a queue.
function fakeClient({ balanceOk = true, outcomes = [] as unknown[] } = {}) {
  const calls: { fn: string; args: unknown[] }[] = [];
  let files = 0;
  const client = {
    async ensureUnits(cost: number) {
      calls.push({ fn: "ensureUnits", args: [cost] });
      if (!balanceOk) throw new InsufficientUnitsError(101, cost, 100);
      return 900;
    },
    async uploadFile(file: { fileName: string }) {
      calls.push({ fn: "uploadFile", args: [file.fileName] });
      return `file-${++files}`;
    },
    async startTask(api: string, body: unknown) {
      calls.push({ fn: "startTask", args: [api, body] });
      return "task-123";
    },
    async getTask(api: string, taskId: string) {
      calls.push({ fn: "getTask", args: [api, taskId] });
      return outcomes.shift();
    },
  };
  return { client: client as unknown as Parameters<typeof startTryOn>[0], calls };
}

function fakeStore() {
  const saved: unknown[][] = [];
  return { store: { save: async (...args: [string, string, string]) => (saved.push(args), "path") }, saved };
}

const selfie = fakeJpeg(768, 1024);
const wig = fakeJpeg(1024, 1024);

describe("checkPhoto", () => {
  it("accepts a JPG whose long side is 1024 px", () => {
    expect(() => checkPhoto("selfie", selfie)).not.toThrow();
  });

  it("says which photo is wrong and how", () => {
    expect(() => checkPhoto("wig", fakeJpeg(1025, 800))).toThrow("The wig photo is 1025×800. Its longest side must be 1024 px or less.");
    expect(() => checkPhoto("selfie", new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toThrow("Your photo needs to be a JPG.");
    expect(() => checkPhoto("selfie", new Uint8Array())).toThrow("Your photo is missing.");
  });

  it("refuses a photo over 2 MB", () => {
    const big = new Uint8Array(PHOTO_MAX_BYTES + 1);
    big.set(selfie);
    expect(() => checkPhoto("selfie", big)).toThrow("too large");
  });
});

describe("startTryOn", () => {
  it("checks the balance, uploads both photos under fixed names and starts a hairstyle task", async () => {
    const { client, calls } = fakeClient();
    expect(await startTryOn(client, selfie, wig)).toBe("task-123");
    expect(calls).toEqual([
      { fn: "ensureUnits", args: [2] },
      { fn: "uploadFile", args: ["selfie.jpg"] },
      { fn: "uploadFile", args: ["wig.jpg"] },
      { fn: "startTask", args: ["hairstyle", { src_file_id: "file-1", ref_file_id: "file-2" }] },
    ]);
  });

  it("calls YouCam not at all when a photo is wrong", async () => {
    const { client, calls } = fakeClient();
    await expect(startTryOn(client, selfie, fakeJpeg(2000, 1500))).rejects.toBeInstanceOf(PhotoError);
    expect(calls).toEqual([]);
  });

  it("uploads nothing when units are below the floor", async () => {
    const { client, calls } = fakeClient({ balanceOk: false });
    await expect(startTryOn(client, selfie, wig)).rejects.toBeInstanceOf(InsufficientUnitsError);
    expect(calls.map((c) => c.fn)).toEqual(["ensureUnits"]);
  });
});

describe("pollTryOn", () => {
  it("reports a running task without touching Blob", async () => {
    const { client } = fakeClient({ outcomes: [{ status: "running", taskId: "task-123" }] });
    const { store, saved } = fakeStore();
    expect(await pollTryOn(client, store, "session-1", "task-123")).toEqual({ status: "running" });
    expect(saved).toEqual([]);
  });

  it("copies the result into the session before reporting success", async () => {
    const url = "https://results.example.test/tryon.jpg";
    const { client, calls } = fakeClient({ outcomes: [{ status: "success", taskId: "task-123", results: { url } }] });
    const { store, saved } = fakeStore();
    expect(await pollTryOn(client, store, "session-1", "task-123")).toEqual({ status: "success" });
    expect(calls).toEqual([{ fn: "getTask", args: ["hairstyle", "task-123"] }]);
    expect(saved).toEqual([["session-1", "task-123", url]]);
  });

  it("passes the YouCam error code on with a plain message", async () => {
    const { client } = fakeClient({ outcomes: [{ status: "error", taskId: "task-123", error: "error_hair_too_short" }] });
    const { store, saved } = fakeStore();
    const result = await pollTryOn(client, store, "session-1", "task-123");
    expect(result).toMatchObject({ status: "error", code: "error_hair_too_short" });
    expect(result.status === "error" && result.message).toMatch(/front-facing photo/);
    expect(saved).toEqual([]);
  });
});

// A stored result as ResultStore.open returns it.
function storedResult(bytes: Uint8Array | "missing" | "expired") {
  const opened: string[] = [];
  const store = {
    async open(sessionId: string, taskId: string) {
      opened.push(`${sessionId}/${taskId}`);
      if (typeof bytes === "string") return { status: bytes } as const;
      return { status: "ok", stream: new Blob([new Uint8Array(bytes)]).stream(), contentType: "image/jpeg", size: bytes.byteLength } as const;
    },
  };
  return { store, opened };
}

describe("startRecolor", () => {
  it("re-uploads this session's stored result and starts Hair Color with the colour's hex", async () => {
    const { client, calls } = fakeClient();
    const { store, opened } = storedResult(fakeJpeg(768, 1024));
    expect(await startRecolor(client, store, "session-1", "tryon-task", { hex: "#7a3a1c" })).toBe("task-123");
    expect(opened).toEqual(["session-1/tryon-task"]);
    expect(calls).toEqual([
      { fn: "ensureUnits", args: [1] },
      { fn: "uploadFile", args: ["tryon.jpg"] },
      { fn: "startTask", args: ["haircolor", { src_file_id: "file-1", pattern: { name: "full" }, palettes: [{ color: "#7a3a1c" }] }] },
    ]);
  });

  it.each([
    ["missing", "not_found"],
    ["expired", "expired"],
  ] as const)("calls YouCam not at all when the result is %s", async (state, code) => {
    const { client, calls } = fakeClient();
    const { store } = storedResult(state);
    await expect(startRecolor(client, store, "s", "t", { hex: "#000000" })).rejects.toMatchObject({ name: "RecolorError", code });
    expect(calls).toEqual([]);
  });

  it.each([
    ["too small", fakeJpeg(1024, 300)],
    ["too tall for the stricter limit", fakeJpeg(800, 1080)],
    ["too wide", fakeJpeg(1920, 1000)],
    ["not a JPG", new Uint8Array([0x89, 0x50, 0x4e, 0x47])],
  ])("refuses a result that is %s before spending units", async (_, bytes) => {
    const { client, calls } = fakeClient();
    const { store } = storedResult(bytes);
    await expect(startRecolor(client, store, "s", "t", { hex: "#000000" })).rejects.toBeInstanceOf(RecolorError);
    expect(calls).toEqual([]);
  });

  it("uploads nothing when units are below the floor", async () => {
    const { client, calls } = fakeClient({ balanceOk: false });
    const { store } = storedResult(fakeJpeg(1024, 559));
    await expect(startRecolor(client, store, "s", "t", { hex: "#000000" })).rejects.toBeInstanceOf(InsufficientUnitsError);
    expect(calls.map((c) => c.fn)).toEqual(["ensureUnits"]);
  });
});

describe("pollTryOn for a colour", () => {
  it("polls Hair Color and stores the recoloured result in the session", async () => {
    const url = "https://results.example.test/colorway.jpg";
    const { client, calls } = fakeClient({ outcomes: [{ status: "success", taskId: "color-task", results: { url } }] });
    const { store, saved } = fakeStore();
    expect(await pollTryOn(client, store, "session-1", "color-task", "haircolor")).toEqual({ status: "success" });
    expect(calls).toEqual([{ fn: "getTask", args: ["haircolor", "color-task"] }]);
    expect(saved).toEqual([["session-1", "color-task", url]]);
  });

  it("says the colour failed, not the photo", async () => {
    const { client } = fakeClient({ outcomes: [{ status: "error", taskId: "t", error: "error_inference" }] });
    const result = await pollTryOn(client, fakeStore().store, "s", "t", "haircolor");
    expect(result).toMatchObject({ status: "error", code: "error_inference" });
    expect(result.status === "error" && result.message).toMatch(/colour/);
  });
});
