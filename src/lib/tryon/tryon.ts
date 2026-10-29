import { jpegSize } from "../images/jpeg";
import { RESULT_MAX_BYTES, type ResultStore } from "../results/store";
import type { Colorway } from "../shop/demo";
import { TASK_APIS, type TaskApi } from "../youcam/apis";
import type { YouCamClient } from "../youcam/client";

// The try-on flow without Next.js: check the two photos, start a Hair Style task, and poll it
// once per request (the browser polls us every 3 s, so no function waits on YouCam). A finished
// try-on can then be recoloured with Hair Color, which is started and polled the same way.

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

/** Hair Color's input limits (docs, 27 Oct). The docs disagree on the maximum, so stay under both readings. */
export const HAIR_COLOR_MIN_SIDE = 320;
export const HAIR_COLOR_MAX_WIDTH = 1920;
export const HAIR_COLOR_MAX_HEIGHT = 1080;

export class RecolorError extends Error {
  constructor(
    readonly code: "not_found" | "expired" | "unsupported",
    message: string,
  ) {
    super(message);
    this.name = "RecolorError";
  }
}

/**
 * Recolours a stored try-on result in one of the wig's colours. The result is private, so
 * YouCam can't fetch it by link: it goes up through the File API like the selfie did.
 * Returns the Hair Color task id.
 */
export async function startRecolor(
  client: Client,
  store: Pick<ResultStore, "open">,
  sessionId: string,
  tryOnTaskId: string,
  colorway: Pick<Colorway, "hex">,
): Promise<string> {
  const opened = await store.open(sessionId, tryOnTaskId);
  if (opened.status === "missing") throw new RecolorError("not_found", "We couldn't find this preview. Please start again.");
  if (opened.status === "expired") throw new RecolorError("expired", "Previews are deleted after 24 hours. Please start again.");
  const bytes = new Uint8Array(await new Response(opened.stream).arrayBuffer());

  // YouCam's try-on results are JPGs the size of the selfie (≤ 1024 px), so this only catches surprises.
  const size = bytes.byteLength <= RESULT_MAX_BYTES ? jpegSize(bytes) : null;
  if (
    !size ||
    Math.min(size.width, size.height) < HAIR_COLOR_MIN_SIDE ||
    size.width >= HAIR_COLOR_MAX_WIDTH ||
    size.height >= HAIR_COLOR_MAX_HEIGHT
  ) {
    throw new RecolorError("unsupported", "This preview can't be shown in other colours. Try taking the photos again.");
  }

  await client.ensureUnits(TASK_APIS.haircolor.units);
  const fileId = await client.uploadFile({ bytes, fileName: "tryon.jpg", contentType: "image/jpg" });
  return client.startTask("haircolor", { src_file_id: fileId, pattern: { name: "full" }, palettes: [{ color: colorway.hex }] });
}

/** The tasks whose results a shopper sees: the try-on and its colours. */
export type ResultApi = Extract<TaskApi, "hairstyle" | "haircolor">;

export type TryOnStatus =
  | { status: "running" }
  | { status: "success" }
  | { status: "error"; code: string | null; message: string };

// Placeholder wording until step G writes a message for every known code.
const FAILED: Record<ResultApi, string> = {
  hairstyle: "This photo didn't work for a preview. Try a front-facing photo in daylight, with your shoulders and some hair showing.",
  haircolor: "This colour didn't work on the preview. Try another colour, or try again in a minute.",
};

/** One look at the task. On success the result is copied to Blob before we say so. */
export async function pollTryOn(
  client: Client,
  store: Pick<ResultStore, "save">,
  sessionId: string,
  taskId: string,
  api: ResultApi = "hairstyle",
): Promise<TryOnStatus> {
  const outcome = await client.getTask(api, taskId);
  if (outcome.status === "running") return { status: "running" };
  if (outcome.status === "error") return { status: "error", code: outcome.error, message: FAILED[api] };
  if (outcome.status === "success") {
    await store.save(sessionId, taskId, outcome.results.url);
    return { status: "success" };
  }
  return { status: "running" };
}
