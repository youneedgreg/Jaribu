import { jpegSize } from "../images/jpeg";
import type { ResultStore } from "../results/store";
import { TASK_APIS } from "../youcam/apis";
import type { YouCamClient } from "../youcam/client";

// The try-on flow without Next.js: check the two photos, start a Hair Style task, and poll it
// once per request (the browser polls us every 3 s, so no function waits on YouCam).

/** Hair Style takes JPG only, long side ≤ 1024 px. */
export const TRYON_MAX_SIDE = 1024;
/** Two photos have to fit in one request (Vercel caps bodies at 4.5 MB). */
export const PHOTO_MAX_BYTES = 2 * 1024 * 1024;

export type Photo = "selfie" | "wig";

export class PhotoError extends Error {
  constructor(
    readonly photo: Photo,
    message: string,
  ) {
    super(message);
    this.name = "PhotoError";
  }
}

/** Throws a PhotoError with a message a shopper can act on. */
export function checkPhoto(photo: Photo, bytes: Uint8Array): void {
  const name = photo === "selfie" ? "Your photo" : "The wig photo";
  if (bytes.byteLength === 0) throw new PhotoError(photo, `${name} is missing.`);
  if (bytes.byteLength > PHOTO_MAX_BYTES) throw new PhotoError(photo, `${name} is too large. Use a photo under 2 MB.`);
  const size = jpegSize(bytes);
  if (!size) throw new PhotoError(photo, `${name} needs to be a JPG.`);
  if (Math.max(size.width, size.height) > TRYON_MAX_SIDE) {
    throw new PhotoError(photo, `${name} is ${size.width}×${size.height}. Its longest side must be ${TRYON_MAX_SIDE} px or less.`);
  }
}

type Client = Pick<YouCamClient, "ensureUnits" | "uploadFile" | "startTask" | "getTask">;

/** Uploads both photos and starts the try-on. Returns the YouCam task id. */
export async function startTryOn(client: Client, selfie: Uint8Array<ArrayBuffer>, wig: Uint8Array<ArrayBuffer>): Promise<string> {
  checkPhoto("selfie", selfie);
  checkPhoto("wig", wig);
  await client.ensureUnits(TASK_APIS.hairstyle.units);
  // Fixed names: the shopper's own file names never leave our server.
  const [srcFileId, refFileId] = await Promise.all([
    client.uploadFile({ bytes: selfie, fileName: "selfie.jpg", contentType: "image/jpg" }),
    client.uploadFile({ bytes: wig, fileName: "wig.jpg", contentType: "image/jpg" }),
  ]);
  return client.startTask("hairstyle", { src_file_id: srcFileId, ref_file_id: refFileId });
}

export type TryOnStatus =
  | { status: "running" }
  | { status: "success" }
  | { status: "error"; code: string | null; message: string };

// Placeholder wording until step G writes a message for every known code.
const FAILED = "This photo didn't work for a preview. Try a front-facing photo in daylight, with your shoulders and some hair showing.";

/** One look at the task. On success the result is copied to Blob before we say so. */
export async function pollTryOn(client: Client, store: Pick<ResultStore, "save">, sessionId: string, taskId: string): Promise<TryOnStatus> {
  const outcome = await client.getTask("hairstyle", taskId);
  if (outcome.status === "running") return { status: "running" };
  if (outcome.status === "error") return { status: "error", code: outcome.error, message: FAILED };
  if (outcome.status === "success") {
    await store.save(sessionId, taskId, outcome.results.url);
    return { status: "success" };
  }
  return { status: "running" };
}
