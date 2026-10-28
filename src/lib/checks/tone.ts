import { TONE_MIN_SIDE } from "../images/crop";
import { jpegSize } from "../images/jpeg";
import type { ResultStore } from "../results/store";
import { PHOTO_MAX_BYTES } from "../tryon/tryon";
import { TASK_APIS } from "../youcam/apis";
import type { YouCamClient } from "../youcam/client";

// The skin-tone reading behind the lace match: Facial Color Tones on the cropped close-up.
// It costs 20 units, so each session gets one task: the record in Blob says whether it has
// started, and a repeat request gets that record back instead of a new task. Only the skin
// colour is kept, not the eye, lip, eyebrow or hair colours YouCam also returns.

/** Facial Color Tones takes up to 4096 px, but anything over 1080 is shrunk before analysis. */
export const TONE_MAX_SIDE = 1080;

export class TonePhotoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TonePhotoError";
  }
}

/** Throws a TonePhotoError with a message a shopper can act on. */
export function checkTonePhoto(bytes: Uint8Array): void {
  if (bytes.byteLength === 0) throw new TonePhotoError("The close-up photo is missing.");
  if (bytes.byteLength > PHOTO_MAX_BYTES) throw new TonePhotoError("The close-up photo is too large.");
  const size = jpegSize(bytes);
  if (!size) throw new TonePhotoError("The close-up photo needs to be a JPG.");
  if (Math.min(size.width, size.height) < TONE_MIN_SIDE || Math.max(size.width, size.height) > TONE_MAX_SIDE) {
    throw new TonePhotoError(`The close-up photo is ${size.width}×${size.height}. It must be ${TONE_MIN_SIDE}–${TONE_MAX_SIDE} px on each side.`);
  }
}

/** What's stored per session. */
export type ToneRecord =
  | { status: "running"; taskId: string }
  | { status: "success"; taskId: string; skinHex: string }
  | { status: "error"; taskId: string; code: string | null };

export type ToneStatus =
  | { status: "running" }
  | { status: "success"; skinHex: string }
  | { status: "error"; code: string | null; message: string };

// Placeholder wording until step G; these codes say exactly what to change.
function toneMessage(code: string | null): string {
  switch (code) {
    case "error_face_position_too_small":
      return "Your face was too small in the close-up. Hold the phone a little closer and take the photos again.";
    case "error_face_position_out_of_boundary":
      return "Your face went past the edge of the close-up. Hold the phone a little further away and take the photos again.";
    case "error_face_position_invalid":
    case "error_face_not_forward_facing":
    case "error_face_angle_upward":
    case "error_face_angle_downward":
    case "error_face_angle_leftward":
    case "error_face_angle_rightward":
    case "error_face_angle_left_tilt":
    case "error_face_angle_right_tilt":
      return "The close-up needs your face straight on to the camera. Take the photos again, looking straight ahead.";
    default:
      return "We couldn't read your skin tone from the close-up. Try again in daylight.";
  }
}

const HEX = /^#[0-9a-f]{6}$/i;

function isToneRecord(value: unknown): value is ToneRecord {
  const r = value as Partial<ToneRecord> | null;
  if (!r || typeof r.taskId !== "string") return false;
  if (r.status === "running") return true;
  if (r.status === "success") return typeof (r as { skinHex?: unknown }).skinHex === "string";
  return r.status === "error";
}

function statusOf(record: ToneRecord): ToneStatus {
  if (record.status === "running") return { status: "running" };
  if (record.status === "success") return { status: "success", skinHex: record.skinHex };
  return { status: "error", code: record.code, message: toneMessage(record.code) };
}

type Client = Pick<YouCamClient, "ensureUnits" | "uploadFile" | "startTask" | "getTask">;
type Records = Pick<ResultStore, "saveRecord" | "openRecord">;

async function current(records: Records, sessionId: string): Promise<ToneRecord | null> {
  const found = await records.openRecord(sessionId, "tone");
  return isToneRecord(found) ? found : null;
}

/**
 * Starts the session's one tone task, unless it already has one running or done: then its
 * status comes back and nothing is spent. A failed task (free) can be replaced.
 */
export async function startTone(client: Client, records: Records, sessionId: string, photo: Uint8Array<ArrayBuffer>): Promise<ToneStatus> {
  const existing = await current(records, sessionId);
  if (existing && existing.status !== "error") return statusOf(existing);
  checkTonePhoto(photo);
  await client.ensureUnits(TASK_APIS.tone.units);
  const fileId = await client.uploadFile({ bytes: photo, fileName: "closeup.jpg", contentType: "image/jpg" });
  const taskId = await client.startTask("tone", { src_file_id: fileId });
  await records.saveRecord(sessionId, "tone", { status: "running", taskId } satisfies ToneRecord);
  return { status: "running" };
}

/** One look at the session's tone task. null: none was started. */
export async function pollTone(client: Client, records: Records, sessionId: string): Promise<ToneStatus | null> {
  const record = await current(records, sessionId);
  if (!record) return null;
  if (record.status !== "running") return statusOf(record);

  const outcome = await client.getTask("tone", record.taskId);
  if (outcome.status === "running" || outcome.status === "timeout") return { status: "running" };
  const next: ToneRecord =
    outcome.status === "success" && HEX.test(outcome.results.color.skin_color)
      ? { status: "success", taskId: record.taskId, skinHex: outcome.results.color.skin_color.toLowerCase() }
      : { status: "error", taskId: record.taskId, code: outcome.status === "error" ? outcome.error : "unreadable_result" };
  await records.saveRecord(sessionId, "tone", next);
  return statusOf(next);
}
