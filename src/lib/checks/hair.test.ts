import { describe, expect, it } from "vitest";
import { fakeJpeg } from "../images/__fixtures__/fake-jpeg";
import { InsufficientUnitsError } from "../youcam/client";
import { checkHairPhotos, HairPhotoError, pollHairType, startHairType, type HairPhotos } from "./hair";

// Fakes: a YouCam client that records calls and answers getTask from a queue, and an
// in-memory record store.
function fakes({ balanceOk = true, outcomes = [] as unknown[] } = {}) {
  const calls: { fn: string; args: unknown[] }[] = [];
  let uploads = 0;
  const client = {
    async ensureUnits(cost: number) {
      calls.push({ fn: "ensureUnits", args: [cost] });
      if (!balanceOk) throw new InsufficientUnitsError(101, cost, 100);
      return 900;
    },
    async uploadFile(file: { fileName: string }) {
      calls.push({ fn: "uploadFile", args: [file.fileName] });
      return `file-${++uploads}`;
    },
    async startTask(api: string, body: unknown) {
      calls.push({ fn: "startTask", args: [api, body] });
      return "hair-task";
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
  return { client: client as unknown as Parameters<typeof startHairType>[0], records, calls, saved };
}

// Shaped like the 26 Oct live results (synthetic faces S01–S03): upper case, as the API returns it.
const success = (mapping = "4B to 4C", term = "Coily to Extremely Coily") => ({
  status: "success",
  taskId: "hair-task",
  results: { hair_type: { mapping, term } },
});
const shot = () => fakeJpeg(580, 1080);
const photos = (): HairPhotos => ({ front: shot(), right: shot(), left: shot() });

describe("checkHairPhotos", () => {
  it("takes three same-size photos within 320–1080 px", () => {
    expect(() => checkHairPhotos(photos())).not.toThrow();
  });

  it.each([
    ["a missing photo", { ...photos(), right: new Uint8Array() }, /right photo is missing/],
    ["a PNG", { ...photos(), left: new Uint8Array([0x89, 0x50, 0x4e, 0x47]) }, /left photo needs to be a JPG/],
    ["a photo over 1080 px", { ...photos(), front: fakeJpeg(1030, 1920) }, /front photo is 1030×1920/],
    ["a photo under 320 px", { ...photos(), front: fakeJpeg(300, 400) }, /front photo is 300×400/],
    ["photos of different sizes", { ...photos(), left: fakeJpeg(600, 1080) }, /same size/],
  ])("refuses %s", (_, input, message) => {
    expect(() => checkHairPhotos(input as HairPhotos)).toThrow(HairPhotoError);
    expect(() => checkHairPhotos(input as HairPhotos)).toThrow(message);
  });
});

describe("startHairType", () => {
  it("checks the balance for 2 units, uploads front, right, left in that order and records the task", async () => {
    const { client, records, calls, saved } = fakes();
    expect(await startHairType(client, records, "s1", photos())).toEqual({ status: "running" });
    expect(calls).toEqual([
      { fn: "ensureUnits", args: [2] },
      { fn: "uploadFile", args: ["front.jpg"] },
      { fn: "uploadFile", args: ["right.jpg"] },
      { fn: "uploadFile", args: ["left.jpg"] },
      { fn: "startTask", args: ["hairtype", { src_file_ids: ["file-1", "file-2", "file-3"] }] },
    ]);
    expect(saved.get("s1/hairtype")).toEqual({ status: "running", taskId: "hair-task" });
  });

  it("never starts a second task in the same session, and says the answer is from earlier", async () => {
    const { client, records, calls } = fakes({ outcomes: [success()] });
    await startHairType(client, records, "s1", photos());
    await pollHairType(client, records, "s1");
    calls.length = 0;
    expect(await startHairType(client, records, "s1", photos())).toEqual({
      status: "success",
      hair: { from: "4B", to: "4C", term: "Coily to Extremely Coily" },
      earlier: true,
    });
    expect(calls).toEqual([]);
  });

  it("may start again after a failed task, which cost nothing", async () => {
    const { client, records, calls } = fakes({ outcomes: [{ status: "error", taskId: "hair-task", error: "error_insufficient_lighting" }] });
    await startHairType(client, records, "s1", photos());
    await pollHairType(client, records, "s1");
    calls.length = 0;
    await startHairType(client, records, "s1", photos());
    expect(calls.map((c) => c.fn)).toEqual(["ensureUnits", "uploadFile", "uploadFile", "uploadFile", "startTask"]);
  });

  it("spends nothing on bad photos or a low balance", async () => {
    const bad = fakes();
    await expect(startHairType(bad.client, bad.records, "s1", { ...photos(), left: fakeJpeg(600, 1080) })).rejects.toThrow(HairPhotoError);
    expect(bad.calls).toEqual([]);

    const poor = fakes({ balanceOk: false });
    await expect(startHairType(poor.client, poor.records, "s1", photos())).rejects.toThrow(InsufficientUnitsError);
    expect(poor.calls.map((c) => c.fn)).toEqual(["ensureUnits"]);
  });
});

describe("pollHairType", () => {
  it("says there's nothing when no task was started", async () => {
    const { client, records, calls } = fakes();
    expect(await pollHairType(client, records, "s1")).toBeNull();
    expect(calls).toEqual([]);
  });

  it("reads the range and keeps YouCam's wording", async () => {
    const { client, records, saved } = fakes({ outcomes: [{ status: "running", taskId: "hair-task" }, success("2a to 2b", "Slight to Medium Wavy")] });
    await startHairType(client, records, "s1", photos());
    expect(await pollHairType(client, records, "s1")).toEqual({ status: "running" });
    expect(await pollHairType(client, records, "s1")).toEqual({
      status: "success",
      hair: { from: "2A", to: "2B", term: "Slight to Medium Wavy" },
    });
    expect(saved.get("s1/hairtype")).toEqual({ status: "success", taskId: "hair-task", mapping: "2A to 2B", term: "Slight to Medium Wavy" });
  });

  it("answers from the record once finished, without asking YouCam again", async () => {
    const { client, records, calls } = fakes({ outcomes: [success()] });
    await startHairType(client, records, "s1", photos());
    await pollHairType(client, records, "s1");
    calls.length = 0;
    expect(await pollHairType(client, records, "s1")).toMatchObject({ status: "success" });
    expect(calls).toEqual([]);
  });

  it.each([
    ["error_insufficient_lighting", /daylight/],
    ["error_face_position_too_small", /closer/],
    ["error_face_angle_invalid", /straight ahead/],
    [null, /hair loose/],
  ])("turns %s into something the shopper can do", async (code, message) => {
    const { client, records } = fakes({ outcomes: [{ status: "error", taskId: "hair-task", error: code }] });
    await startHairType(client, records, "s1", photos());
    expect(await pollHairType(client, records, "s1")).toMatchObject({ status: "error", code, message: expect.stringMatching(message) });
  });

  it("treats a range it can't read as a failure", async () => {
    const { client, records } = fakes({ outcomes: [success("4C to 1", "Nonsense")] });
    await startHairType(client, records, "s1", photos());
    expect(await pollHairType(client, records, "s1")).toMatchObject({ status: "error", code: "unreadable_result" });
  });
});
