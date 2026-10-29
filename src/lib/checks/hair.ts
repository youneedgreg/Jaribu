import { HAIR_MAX_SIDE, HAIR_MIN_SIDE } from "../images/crop";
import { jpegSize } from "../images/jpeg";
import type { ResultStore } from "../results/store";
import { PHOTO_MAX_BYTES } from "../tryon/tryon";
import { TASK_APIS } from "../youcam/apis";
import type { YouCamClient } from "../youcam/client";
import { parseHairType, type HairType } from "../youcam/hair-type";

// The hair-type reading behind the blend check: Hair Type Detection on the three Camera Kit
// photos (front, right, left). Like the skin tone, each session gets one task (2 units): the
// record in Blob says whether it has started, and a repeat request gets that record back,
// marked `earlier`, instead of a new task.

export class HairPhotoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HairPhotoError";
  }
}

export interface HairPhotos {
  front: Uint8Array<ArrayBuffer>;
  right: Uint8Array<ArrayBuffer>;
  left: Uint8Array<ArrayBuffer>;
}

/** Throws a HairPhotoError with a message a shopper can act on. */
export function checkHairPhotos(photos: HairPhotos): void {
  const sizes = (["front", "right", "left"] as const).map((side) => {
    const bytes = photos[side];
    if (bytes.byteLength === 0) throw new HairPhotoError(`The ${side} photo is missing.`);
    if (bytes.byteLength > PHOTO_MAX_BYTES) throw new HairPhotoError(`The ${side} photo is too large.`);
    const size = jpegSize(bytes);
    if (!size) throw new HairPhotoError(`The ${side} photo needs to be a JPG.`);
    if (Math.min(size.width, size.height) < HAIR_MIN_SIDE || Math.max(size.width, size.height) > HAIR_MAX_SIDE) {
      throw new HairPhotoError(`The ${side} photo is ${size.width}×${size.height}. It must be ${HAIR_MIN_SIDE}–${HAIR_MAX_SIDE} px on each side.`);
    }
    return size;
  });
  // YouCam refuses three photos of different sizes (error_mismatch_image_size).
  if (sizes.some((s) => s.width !== sizes[0].width || s.height !== sizes[0].height)) {
    throw new HairPhotoError("The three photos must be the same size. Take the photos again.");
  }
}

/** What's stored per session. */
export type HairRecord =
  | { status: "running"; taskId: string }
  | { status: "success"; taskId: string; mapping: string; term: string }
  | { status: "error"; taskId: string; code: string | null };

export type HairStatus =
  | { status: "running" }
  | { status: "success"; hair: HairType }
  | { status: "error"; code: string | null; message: string };

/** `earlier`: the session already had a task, so this answer is about earlier photos, not the ones just sent. */
export type HairStart = HairStatus & { earlier?: true };

// Placeholder wording until step G; these codes say exactly what to change.
function hairMessage(code: string | null): string {
  switch (code) {
    case "error_insufficient_lighting":
      return "The photos were too dark to read your hair. Take them again in daylight.";
    case "error_face_position_too_small":
      return "Your face was too small in the photos. Hold the phone a little closer and take them again.";
    case "error_face_position_out_of_boundary":
    case "error_face_position_invalid":
      return "Your face and the top of your hair need to be fully in each photo. Take them again a little further away.";
    case "error_face_angle_invalid":
      return "Look straight ahead for the first photo, then turn your head clearly to each side. Take the photos again.";
    case "error_mismatch_image_size":
      return "The three photos must be the same size. Take the photos again.";
    default:
      return "We couldn't read your hair type from the photos. Try again in daylight with your hair loose.";
  }
}

function isHairRecord(value: unknown): value is HairRecord {
  const r = value as Partial<HairRecord> | null;
  if (!r || typeof r.taskId !== "string") return false;
  if (r.status === "running") return true;
  if (r.status === "success") return parseHairType(r as { mapping?: unknown; term?: unknown }) !== null;
  return r.status === "error";
}

function statusOf(record: HairRecord): HairStatus {
  if (record.status === "running") return { status: "running" };
  if (record.status === "success") return { status: "success", hair: parseHairType(record)! };
  return { status: "error", code: record.code, message: hairMessage(record.code) };
}

type Client = Pick<YouCamClient, "ensureUnits" | "uploadFile" | "startTask" | "getTask">;
type Records = Pick<ResultStore, "saveRecord" | "openRecord">;

async function current(records: Records, sessionId: string): Promise<HairRecord | null> {
  const found = await records.openRecord(sessionId, "hairtype");
  return isHairRecord(found) ? found : null;
}

/**
 * Starts the session's one hair-type task, unless it already has one running or done: then its
 * status comes back marked `earlier` and nothing is spent. A failed task (free) can be replaced.
 */
export async function startHairType(client: Client, records: Records, sessionId: string, photos: HairPhotos): Promise<HairStart> {
  const existing = await current(records, sessionId);
  if (existing && existing.status !== "error") return { ...statusOf(existing), earlier: true };
  checkHairPhotos(photos);
  await client.ensureUnits(TASK_APIS.hairtype.units);
  // Hair Type Detection wants them in this order: front, right, left.
  const ids: string[] = [];
  for (const side of ["front", "right", "left"] as const) {
    ids.push(await client.uploadFile({ bytes: photos[side], fileName: `${side}.jpg`, contentType: "image/jpg" }));
  }
  const taskId = await client.startTask("hairtype", { src_file_ids: [ids[0], ids[1], ids[2]] });
  await records.saveRecord(sessionId, "hairtype", { status: "running", taskId } satisfies HairRecord);
  return { status: "running" };
}

/** One look at the session's hair-type task. null: none was started. */
export async function pollHairType(client: Client, records: Records, sessionId: string): Promise<HairStatus | null> {
  const record = await current(records, sessionId);
  if (!record) return null;
  if (record.status !== "running") return statusOf(record);

  const outcome = await client.getTask("hairtype", record.taskId);
  if (outcome.status === "running" || outcome.status === "timeout") return { status: "running" };
  const hair = outcome.status === "success" ? parseHairType(outcome.results.hair_type) : null;
  const next: HairRecord = hair
    ? { status: "success", taskId: record.taskId, mapping: `${hair.from} to ${hair.to}`, term: hair.term }
    : { status: "error", taskId: record.taskId, code: outcome.status === "error" ? outcome.error : "unreadable_result" };
  await records.saveRecord(sessionId, "hairtype", next);
  return statusOf(next);
}
