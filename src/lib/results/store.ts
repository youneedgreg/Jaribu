// Try-on results live in the private Blob store, because YouCam's result link expires after
// 2 hours. Kept free of server-only imports so it can be tested with fakes; build the real
// one through `./server`.

/** Results older than this are never served (Jaribu promises deletion after 24 hours). */
export const RESULT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Largest result we'll copy. YouCam returns ~1024 px JPGs, well under this. */
export const RESULT_MAX_BYTES = 10 * 1024 * 1024;

// Session ids are ours (base64url); task ids are YouCam's (86 URL-safe characters in the
// 26 Oct run). Both end up in a pathname, so nothing else gets through.
const ID = /^[A-Za-z0-9_-]{1,128}$/;

export class ResultCopyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResultCopyError";
  }
}

export function resultPathname(sessionId: string, taskId: string): string {
  if (!ID.test(sessionId) || !ID.test(taskId)) throw new Error("Invalid session or task id");
  return `sessions/${sessionId}/tryon-${taskId}.jpg`;
}

/** The subset of @vercel/blob this module uses, so tests can pass fakes. */
export interface BlobOps {
  put(pathname: string, body: Buffer, options: { access: "private"; contentType: string; allowOverwrite: true; addRandomSuffix: false }): Promise<{ pathname: string }>;
  get(pathname: string, options: { access: "private" }): Promise<{ statusCode: number; stream: ReadableStream<Uint8Array> | null; blob: { uploadedAt: Date; contentType: string | null; size: number | null } } | null>;
}

export type OpenedResult =
  | { status: "ok"; stream: ReadableStream<Uint8Array>; contentType: string; size: number | null }
  | { status: "missing" }
  | { status: "expired" };

export function createResultStore({ blob, fetch: doFetch = fetch, now = Date.now }: { blob: BlobOps; fetch?: typeof fetch; now?: () => number }) {
  /** Downloads the result from YouCam and stores it privately. Returns the Blob pathname. */
  async function save(sessionId: string, taskId: string, sourceUrl: string): Promise<string> {
    const pathname = resultPathname(sessionId, taskId);
    if (new URL(sourceUrl).protocol !== "https:") throw new ResultCopyError("Result URL is not https");

    const res = await doFetch(sourceUrl);
    if (!res.ok) throw new ResultCopyError(`Result download failed: ${res.status}`);
    const contentType = res.headers.get("content-type")?.split(";")[0].trim() ?? "";
    if (!contentType.startsWith("image/")) throw new ResultCopyError(`Result is not an image: ${contentType || "no type"}`);
    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > RESULT_MAX_BYTES) throw new ResultCopyError("Result is too large");
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.byteLength > RESULT_MAX_BYTES) throw new ResultCopyError("Result is too large");

    // Overwrite is safe: the same task always gives the same image, and a repeat poll after
    // success shouldn't fail.
    await blob.put(pathname, bytes, { access: "private", contentType, allowOverwrite: true, addRandomSuffix: false });
    return pathname;
  }

  /** Opens a stored result, refusing anything older than 24 hours even if the sweep missed it. */
  async function open(sessionId: string, taskId: string): Promise<OpenedResult> {
    const found = await blob.get(resultPathname(sessionId, taskId), { access: "private" });
    if (!found || found.statusCode !== 200 || !found.stream) return { status: "missing" };
    if (now() - found.blob.uploadedAt.getTime() > RESULT_MAX_AGE_MS) {
      await found.stream.cancel();
      return { status: "expired" };
    }
    return { status: "ok", stream: found.stream, contentType: found.blob.contentType ?? "image/jpeg", size: found.blob.size };
  }

  return { save, open };
}

export type ResultStore = ReturnType<typeof createResultStore>;
