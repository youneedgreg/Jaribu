import { describe, expect, it } from "vitest";
import { createResultStore, RESULT_MAX_AGE_MS, RESULT_MAX_BYTES, ResultCopyError, resultPathname, type BlobOps } from "./store";

const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
const SESSION = "s3ss10n_Id-abc";
const TASK = "task-123";

// An in-memory Blob store that records puts and ages blobs with a fake clock.
function fakeBlob(clock: { now: number }) {
  const stored = new Map<string, { bytes: Uint8Array<ArrayBuffer>; contentType: string; uploadedAt: Date }>();
  const puts: { pathname: string; options: unknown }[] = [];
  const blob: BlobOps = {
    async put(pathname, body, options) {
      puts.push({ pathname, options });
      stored.set(pathname, { bytes: new Uint8Array(body), contentType: options.contentType, uploadedAt: new Date(clock.now) });
      return { pathname };
    },
    async get(pathname) {
      const b = stored.get(pathname);
      if (!b) return null;
      return {
        statusCode: 200,
        stream: new Response(b.bytes).body!,
        blob: { uploadedAt: b.uploadedAt, contentType: b.contentType, size: b.bytes.byteLength },
      };
    },
  };
  return { blob, puts, stored };
}

function fakeFetch(response: () => Response) {
  const urls: string[] = [];
  const fetch = async (input: string | URL | Request) => {
    urls.push(String(input));
    return response();
  };
  return { fetch: fetch as typeof globalThis.fetch, urls };
}

const jpgResponse = () => new Response(JPG, { headers: { "content-type": "image/jpeg" } });

describe("resultPathname", () => {
  it("puts each result under its session", () => {
    expect(resultPathname(SESSION, TASK)).toBe(`sessions/${SESSION}/tryon-${TASK}.jpg`);
  });

  it.each(["../other", "a/b", "", "x".repeat(129), "id with space"])("rejects %j as an id", (bad) => {
    expect(() => resultPathname(bad, TASK)).toThrow();
    expect(() => resultPathname(SESSION, bad)).toThrow();
  });
});

describe("save", () => {
  it("downloads the YouCam result and stores it privately under the session", async () => {
    const clock = { now: 0 };
    const { blob, puts, stored } = fakeBlob(clock);
    const { fetch, urls } = fakeFetch(jpgResponse);
    const store = createResultStore({ blob, fetch });

    const pathname = await store.save(SESSION, TASK, "https://results.example.test/tryon.jpg");

    expect(urls).toEqual(["https://results.example.test/tryon.jpg"]);
    expect(pathname).toBe(resultPathname(SESSION, TASK));
    expect(puts[0].options).toEqual({ access: "private", contentType: "image/jpeg", allowOverwrite: true, addRandomSuffix: false });
    expect(stored.get(pathname)?.bytes).toEqual(JPG);
  });

  it("refuses a non-https link", async () => {
    const { blob } = fakeBlob({ now: 0 });
    const { fetch, urls } = fakeFetch(jpgResponse);
    const store = createResultStore({ blob, fetch });
    await expect(store.save(SESSION, TASK, "http://results.example.test/tryon.jpg")).rejects.toBeInstanceOf(ResultCopyError);
    expect(urls).toEqual([]);
  });

  it("fails when the link has expired", async () => {
    const { blob, puts } = fakeBlob({ now: 0 });
    const { fetch } = fakeFetch(() => new Response("AccessDenied", { status: 403 }));
    const store = createResultStore({ blob, fetch });
    await expect(store.save(SESSION, TASK, "https://results.example.test/tryon.jpg")).rejects.toThrow("403");
    expect(puts).toEqual([]);
  });

  it("refuses something that isn't an image", async () => {
    const { blob, puts } = fakeBlob({ now: 0 });
    const { fetch } = fakeFetch(() => new Response("<html>", { headers: { "content-type": "text/html" } }));
    const store = createResultStore({ blob, fetch });
    await expect(store.save(SESSION, TASK, "https://results.example.test/tryon.jpg")).rejects.toThrow("not an image");
    expect(puts).toEqual([]);
  });

  it("refuses an oversized result", async () => {
    const { blob, puts } = fakeBlob({ now: 0 });
    const big = new Uint8Array(RESULT_MAX_BYTES + 1);
    const { fetch } = fakeFetch(() => new Response(big, { headers: { "content-type": "image/jpeg" } }));
    const store = createResultStore({ blob, fetch });
    await expect(store.save(SESSION, TASK, "https://results.example.test/tryon.jpg")).rejects.toThrow("too large");
    expect(puts).toEqual([]);
  });
});

describe("open", () => {
  it("serves a stored result", async () => {
    const clock = { now: 1_000 };
    const { blob } = fakeBlob(clock);
    const store = createResultStore({ blob, fetch: fakeFetch(jpgResponse).fetch, now: () => clock.now });
    await store.save(SESSION, TASK, "https://results.example.test/tryon.jpg");

    const opened = await store.open(SESSION, TASK);
    expect(opened.status).toBe("ok");
    if (opened.status !== "ok") return;
    expect(opened.contentType).toBe("image/jpeg");
    expect(new Uint8Array(await new Response(opened.stream).arrayBuffer())).toEqual(JPG);
  });

  it("says missing for another session's task", async () => {
    const clock = { now: 0 };
    const { blob } = fakeBlob(clock);
    const store = createResultStore({ blob, fetch: fakeFetch(jpgResponse).fetch, now: () => clock.now });
    await store.save(SESSION, TASK, "https://results.example.test/tryon.jpg");
    expect(await store.open("someone-else", TASK)).toEqual({ status: "missing" });
  });

  it("serves at exactly 24 hours and refuses after", async () => {
    const clock = { now: 0 };
    const { blob } = fakeBlob(clock);
    const store = createResultStore({ blob, fetch: fakeFetch(jpgResponse).fetch, now: () => clock.now });
    await store.save(SESSION, TASK, "https://results.example.test/tryon.jpg");

    clock.now = RESULT_MAX_AGE_MS;
    expect((await store.open(SESSION, TASK)).status).toBe("ok");
    clock.now = RESULT_MAX_AGE_MS + 1;
    expect(await store.open(SESSION, TASK)).toEqual({ status: "expired" });
  });
});
