import { jpegSize } from "../images/jpeg";
import { RESULT_MAX_BYTES, type ResultStore } from "../results/store";
import type { Colorway } from "../shop/catalog";
import { TASK_APIS, type TaskApi } from "../youcam/apis";
import type { YouCamClient } from "../youcam/client";
import { isServiceProblem, SERVICE_PROBLEM } from "../youcam/messages";

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

const TURNED_AWAY = "Your face was turned too far. Look straight at the camera and take a new photo.";
const CANT_MAKE_OUT = "We couldn't make out your face and shoulders. Face the camera in good light, with nothing covering your face.";
const CANT_USE = "This photo can't be used for a preview. Please try a different one.";
const CANT_READ = "We couldn't read this photo. Take a new one or choose another.";

// What each photo problem means for the shopper's try-on photo.
const PHOTO_PROBLEMS = new Map<string, string>([
  ["error_hair_too_short", "This preview works best with some hair showing. Try a photo without a wig cap."],
  ["error_bald_image", "We couldn't see enough hair for this preview. Try a photo with your hair showing and no cap or headwrap."],
  ["error_no_shoulder", "Your shoulders need to show. Hold the phone further away and take a new photo."],
  ["error_large_face_angle", TURNED_AWAY],
  ["error_face_pose", TURNED_AWAY],
  ["error_no_face", "We couldn't find a face in this photo. Face the camera in good light and take a new photo."],
  ["error_insufficient_landmarks", CANT_MAKE_OUT],
  ["error_pose", CANT_MAKE_OUT],
  ["error_face_parsing", CANT_MAKE_OUT],
  ["error_multiple_people", "We found more than one person. Take a new photo with only you in it."],
  ["error_unsupport_ratio", "This photo's shape won't work. Use the guided camera or a normal upright photo."],
  ["error_nsfw_content_detected", CANT_USE],
  ["exceed_nsfw_retry_limits", CANT_USE],
  ["error_decode_image", CANT_READ],
  ["error_download_image", CANT_READ],
  ["exceed_max_filesize", CANT_READ],
]);

function resultMessage(api: ResultApi, code: string | null): string {
  if (isServiceProblem(code)) return SERVICE_PROBLEM;
  if (api === "hairstyle") {
    return (
      (code && PHOTO_PROBLEMS.get(code)) ||
      "This photo didn't work for a preview. Try a front-facing photo in daylight, with your shoulders and some hair showing."
    );
  }
  // A colour starts from the stored preview, so a size problem needs a new try-on, not a new colour.
  if (code === "error_below_min_image_size" || code === "error_exceed_max_image_size") {
    return "We can't make colours from this preview. Take a new photo and try again.";
  }
  if (code && PHOTO_PROBLEMS.has(code)) return "This colour didn't work on this preview. Try another colour.";
  return "This colour didn't work on the preview. Try another colour, or try again in a minute.";
}

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
  if (outcome.status === "error") return { status: "error", code: outcome.error, message: resultMessage(api, outcome.error) };
  if (outcome.status === "success") {
    await store.save(sessionId, taskId, outcome.results.url);
    return { status: "success" };
  }
  return { status: "running" };
}
