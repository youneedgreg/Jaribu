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

/** True for ids that are safe to use in a pathname. */
export const isSafeId = (id: string) => ID.test(id);

export class ResultCopyError extends Error {
  /** `permanent`: asking YouCam again would give the same file, so retrying can't help. */
  constructor(
    message: string,
    readonly permanent = false,
  ) {
    super(message);
    this.name = "ResultCopyError";
  }
}

export type ImageType = "image/jpeg" | "image/png" | "image/webp";

/**
 * The image type from the file's first bytes. YouCam's result links don't label files
 * reliably: Hair Color's PNGs arrive as binary/octet-stream (checked 28 Oct).
 */
export function imageType(bytes: Uint8Array): ImageType | null {
  const starts = (sig: number[], at = 0) => sig.every((b, i) => bytes[at + i] === b);
  if (starts([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  return null;
}

/** Colour previews are stored the same way, under their own Hair Color task id. */
export function resultPathname(sessionId: string, taskId: string): string {
  if (!isSafeId(sessionId) || !isSafeId(taskId)) throw new Error("Invalid session or task id");
  return `sessions/${sessionId}/tryon-${taskId}.jpg`;
}

/** Small per-session records kept beside the results, such as the skin-tone reading. */
export type RecordName = "tone";

export function recordPathname(sessionId: string, name: RecordName): string {
  if (!isSafeId(sessionId)) throw new Error("Invalid session id");
  return `sessions/${sessionId}/${name}.json`;
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
    if (new URL(sourceUrl).protocol !== "https:") throw new ResultCopyError("Result URL is not https", true);

    const res = await doFetch(sourceUrl);
    if (!res.ok) throw new ResultCopyError(`Result download failed: ${res.status}`);
    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > RESULT_MAX_BYTES) throw new ResultCopyError("Result is too large", true);
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.byteLength > RESULT_MAX_BYTES) throw new ResultCopyError("Result is too large", true);
    // Stored and served as what the bytes are, whatever the link's header said.
    const contentType = imageType(bytes);
    if (!contentType) throw new ResultCopyError("Result is not an image", true);

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

  /** Stores a small JSON record for the session, replacing any earlier one. */
  async function saveRecord(sessionId: string, name: RecordName, data: unknown): Promise<void> {
    const body = Buffer.from(JSON.stringify(data));
    await blob.put(recordPathname(sessionId, name), body, { access: "private", contentType: "application/json", allowOverwrite: true, addRandomSuffix: false });
  }

  /** The session's record, or null if there's none or it's older than 24 hours. */
  async function openRecord(sessionId: string, name: RecordName): Promise<unknown> {
    const found = await blob.get(recordPathname(sessionId, name), { access: "private" });
    if (!found || found.statusCode !== 200 || !found.stream) return null;
    if (now() - found.blob.uploadedAt.getTime() > RESULT_MAX_AGE_MS) {
      await found.stream.cancel();
      return null;
    }
    try {
      return JSON.parse(await new Response(found.stream).text());
    } catch {
      return null;
    }
  }

  return { save, open, saveRecord, openRecord };
}

export type ResultStore = ReturnType<typeof createResultStore>;
