import { describe, expect, it } from "vitest";
import { RESULT_MAX_AGE_MS } from "./store";
import { cronAuthorized, sweepResults, type SweepBlobOps } from "./sweep";

const NOW = 1_800_000_000_000;
const OLD = new Date(NOW - RESULT_MAX_AGE_MS - 1);
const FRESH = new Date(NOW - RESULT_MAX_AGE_MS + 60_000);

type Stored = { pathname: string; uploadedAt: Date };

// An in-memory Blob store that honours the prefix, serves pages and records deletes.
function fakeBlob(stored: Stored[], { pageSize = 1000, ignorePrefix = false } = {}) {
  const deletes: string[][] = [];
  const prefixes: string[] = [];
  const blob: SweepBlobOps = {
    async list({ prefix, cursor }) {
      prefixes.push(prefix);
      const matching = ignorePrefix ? stored : stored.filter((b) => b.pathname.startsWith(prefix));
      const start = Number(cursor ?? 0);
      const end = start + pageSize;
      return { blobs: matching.slice(start, end), hasMore: end < matching.length, cursor: end < matching.length ? String(end) : undefined };
    },
    async del(pathnames) {
      deletes.push(pathnames);
    },
  };
  return { blob, deletes, prefixes };
}

const now = () => NOW;

describe("sweepResults", () => {
  it("deletes only what is older than 24 hours", async () => {
    const { blob, deletes } = fakeBlob([
      { pathname: "sessions/a/tryon-1.jpg", uploadedAt: OLD },
      { pathname: "sessions/a/tone.json", uploadedAt: OLD },
      { pathname: "sessions/b/tryon-2.jpg", uploadedAt: FRESH },
    ]);
    await expect(sweepResults({ blob, now })).resolves.toBe(2);
    expect(deletes).toEqual([["sessions/a/tryon-1.jpg", "sessions/a/tone.json"]]);
  });

  it("keeps a blob that is exactly 24 hours old, like the routes that still serve it", async () => {
    const { blob, deletes } = fakeBlob([{ pathname: "sessions/a/tryon-1.jpg", uploadedAt: new Date(NOW - RESULT_MAX_AGE_MS) }]);
    await expect(sweepResults({ blob, now })).resolves.toBe(0);
    expect(deletes).toEqual([]);
  });

  it("only ever lists sessions/ and leaves old wig photos alone", async () => {
    const { blob, deletes, prefixes } = fakeBlob([
      { pathname: "wigs/w1.jpg", uploadedAt: OLD },
      { pathname: "sessions/a/tryon-1.jpg", uploadedAt: OLD },
    ]);
    await sweepResults({ blob, now });
    expect(prefixes).toEqual(["sessions/"]);
    expect(deletes).toEqual([["sessions/a/tryon-1.jpg"]]);
  });

  it("won't delete outside sessions/ even if the list returns it", async () => {
    const { blob, deletes } = fakeBlob(
      [
        { pathname: "wigs/w1.jpg", uploadedAt: OLD },
        { pathname: "sessions-old/x.jpg", uploadedAt: OLD },
      ],
      { ignorePrefix: true },
    );
    await expect(sweepResults({ blob, now })).resolves.toBe(0);
    expect(deletes).toEqual([]);
  });

  it("follows every page of the list", async () => {
    const stored = Array.from({ length: 5 }, (_, i) => ({ pathname: `sessions/a/${i}.jpg`, uploadedAt: OLD }));
    const { blob, deletes, prefixes } = fakeBlob(stored, { pageSize: 2 });
    await expect(sweepResults({ blob, now })).resolves.toBe(5);
    expect(prefixes).toHaveLength(3);
    expect(deletes.flat()).toHaveLength(5);
  });

  it("deletes in batches", async () => {
    const stored = Array.from({ length: 2500 }, (_, i) => ({ pathname: `sessions/a/${i}.jpg`, uploadedAt: OLD }));
    const { blob, deletes } = fakeBlob(stored);
    await expect(sweepResults({ blob, now })).resolves.toBe(2500);
    expect(deletes.map((d) => d.length)).toEqual([1000, 1000, 500]);
  });

  it("makes no delete call when nothing has expired", async () => {
    const { blob, deletes } = fakeBlob([]);
    await expect(sweepResults({ blob, now })).resolves.toBe(0);
    expect(deletes).toEqual([]);
  });

  it("passes a failed delete up, so the run is reported as failed", async () => {
    const { blob } = fakeBlob([{ pathname: "sessions/a/tryon-1.jpg", uploadedAt: OLD }]);
    blob.del = async () => {
      throw new Error("store down");
    };
    await expect(sweepResults({ blob, now })).rejects.toThrow("store down");
  });
});

describe("cronAuthorized", () => {
  it("accepts the exact bearer secret", () => {
    expect(cronAuthorized("Bearer s3cret", "s3cret")).toBe(true);
  });

  it("refuses a wrong, missing or differently shaped header", () => {
    expect(cronAuthorized("Bearer wrong", "s3cret")).toBe(false);
    expect(cronAuthorized("s3cret", "s3cret")).toBe(false);
    expect(cronAuthorized("bearer s3cret", "s3cret")).toBe(false);
    expect(cronAuthorized(null, "s3cret")).toBe(false);
  });

  it("refuses everything when no secret is set", () => {
    expect(cronAuthorized("Bearer undefined", undefined)).toBe(false);
    expect(cronAuthorized("Bearer ", "")).toBe(false);
    expect(cronAuthorized(null, undefined)).toBe(false);
  });
});
