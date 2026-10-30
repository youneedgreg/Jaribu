import { describe, expect, it } from "vitest";
import { fakeJpeg } from "../images/__fixtures__/fake-jpeg";
import { InsufficientUnitsError } from "../youcam/client";
import { checkTonePhoto, pollTone, startTone, TonePhotoError } from "./tone";

// Fakes: a YouCam client that records calls and answers getTask from a queue, and an
// in-memory record store.
function fakes({ balanceOk = true, outcomes = [] as unknown[] } = {}) {
  const calls: { fn: string; args: unknown[] }[] = [];
  const client = {
    async ensureUnits(cost: number) {
      calls.push({ fn: "ensureUnits", args: [cost] });
      if (!balanceOk) throw new InsufficientUnitsError(110, cost, 100);
      return 900;
    },
    async uploadFile(file: { fileName: string }) {
      calls.push({ fn: "uploadFile", args: [file.fileName] });
      return "file-1";
    },
    async startTask(api: string, body: unknown) {
      calls.push({ fn: "startTask", args: [api, body] });
      return "tone-task";
    },
    async getTask(api: string, taskId: string) {
      calls.push({ fn: "getTask", args: [api, taskId] });
      return outcomes.shift();
    },
  };
  const saved = new Map<string, unknown>();
  const records = {
    async saveRecord(sessionId: string, name: string, data: unknown) {
      saved.set(`${sessionId}/${name}`, JSON.parse(JSON.stringify(data)));
    },
    async openRecord(sessionId: string, name: string) {
      return saved.get(`${sessionId}/${name}`) ?? null;
    },
  };
  return { client: client as unknown as Parameters<typeof startTone>[0], records, calls, saved };
}

// The 26 Oct live result (synthetic face S01).
const success = (skin = "#614633") => ({
  status: "success",
  taskId: "tone-task",
  results: { color: { skin_color: skin, eye_color: "#120f0b", lip_color: "#6e4d49", hair_color: "#B56637" } },
});
const closeUp = fakeJpeg(608, 810);

describe("checkTonePhoto", () => {
  it("takes the cropped close-up", () => {
    expect(() => checkTonePhoto(closeUp)).not.toThrow();
  });

  it.each([
    ["too small", fakeJpeg(300, 400)],
    ["too large", fakeJpeg(1200, 1600)],
    ["not a JPG", new Uint8Array([0x89, 0x50, 0x4e, 0x47])],
    ["missing", new Uint8Array()],
  ])("refuses a photo that is %s", (_, bytes) => {
    expect(() => checkTonePhoto(bytes)).toThrow(TonePhotoError);
  });
});

describe("startTone", () => {
  it("checks the balance for 20 units, uploads the close-up and records the task", async () => {
    const { client, records, calls, saved } = fakes();
    expect(await startTone(client, records, "s1", closeUp)).toEqual({ status: "running" });
    expect(calls).toEqual([
      { fn: "ensureUnits", args: [20] },
      { fn: "uploadFile", args: ["closeup.jpg"] },
      { fn: "startTask", args: ["tone", { src_file_id: "file-1" }] },
    ]);
    expect(saved.get("s1/tone")).toEqual({ status: "running", taskId: "tone-task" });
  });

  it("never starts a second task in the same session", async () => {
    const { client, records, calls } = fakes({ outcomes: [success()] });
    await startTone(client, records, "s1", closeUp);
    await pollTone(client, records, "s1");
    calls.length = 0;

    expect(await startTone(client, records, "s1", closeUp)).toEqual({ status: "success", skinHex: "#614633", earlier: true });
    expect(calls).toEqual([]);
  });

  it("does nothing while the first task is still running", async () => {
    const { client, records, calls } = fakes();
    await startTone(client, records, "s1", closeUp);
    calls.length = 0;
    expect(await startTone(client, records, "s1", closeUp)).toEqual({ status: "running", earlier: true });
    expect(calls).toEqual([]);
  });

  it("may start again after a failed task, which cost nothing", async () => {
    const { client, records, calls } = fakes({ outcomes: [{ status: "error", taskId: "tone-task", error: "error_face_position_too_small" }] });
    await startTone(client, records, "s1", closeUp);
    await pollTone(client, records, "s1");
    calls.length = 0;
    await startTone(client, records, "s1", closeUp);
    expect(calls.map((c) => c.fn)).toEqual(["ensureUnits", "uploadFile", "startTask"]);
  });

  it("spends nothing on a bad photo or a low balance", async () => {
    const bad = fakes();
    await expect(startTone(bad.client, bad.records, "s1", fakeJpeg(200, 200))).rejects.toBeInstanceOf(TonePhotoError);
    expect(bad.calls).toEqual([]);

    const low = fakes({ balanceOk: false });
    await expect(startTone(low.client, low.records, "s1", closeUp)).rejects.toBeInstanceOf(InsufficientUnitsError);
    expect(low.calls.map((c) => c.fn)).toEqual(["ensureUnits"]);
    expect(low.saved.size).toBe(0);
  });
});

describe("pollTone", () => {
  it("says there's nothing when no task was started", async () => {
    const { client, records, calls } = fakes();
    expect(await pollTone(client, records, "s1")).toBeNull();
    expect(calls).toEqual([]);
  });

  it("keeps only the skin colour, lower case", async () => {
    const { client, records, saved } = fakes({ outcomes: [{ status: "running", taskId: "tone-task" }, success("#B9947C")] });
    await startTone(client, records, "s1", closeUp);
    expect(await pollTone(client, records, "s1")).toEqual({ status: "running" });
    expect(await pollTone(client, records, "s1")).toEqual({ status: "success", skinHex: "#b9947c" });
    expect(saved.get("s1/tone")).toEqual({ status: "success", taskId: "tone-task", skinHex: "#b9947c" });
  });

  it("answers from the record once finished, without asking YouCam again", async () => {
    const { client, records, calls } = fakes({ outcomes: [success()] });
    await startTone(client, records, "s1", closeUp);
    await pollTone(client, records, "s1");
    calls.length = 0;
    expect(await pollTone(client, records, "s1")).toEqual({ status: "success", skinHex: "#614633" });
    expect(calls).toEqual([]);
  });

  it.each([
    ["error_face_position_too_small", /closer/],
    ["error_face_position_out_of_boundary", /further away/],
    ["error_face_angle_leftward", /straight/],
    ["error_below_min_image_size", /too small to read/],
    ["unknown_internal_error", /not your photo/],
    [null, /daylight/],
  ])("turns %s into something the shopper can do", async (code, message) => {
    const { client, records } = fakes({ outcomes: [{ status: "error", taskId: "tone-task", error: code }] });
    await startTone(client, records, "s1", closeUp);
    expect(await pollTone(client, records, "s1")).toMatchObject({ status: "error", code, message: expect.stringMatching(message) });
  });

  it("treats a result without a proper colour as a failure", async () => {
    const { client, records } = fakes({ outcomes: [success("not-a-colour")] });
    await startTone(client, records, "s1", closeUp);
    expect(await pollTone(client, records, "s1")).toMatchObject({ status: "error", code: "unreadable_result" });
  });
});
