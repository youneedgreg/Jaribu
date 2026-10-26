import { accessCodeMatches } from "@/lib/access-code";
import { failure, json, logError } from "@/lib/http";
import { taskTicket } from "@/lib/session";
import { currentOrNewSession } from "@/lib/session-cookie";
import { checkPhoto, PHOTO_MAX_BYTES, PhotoError, startTryOn, type Photo } from "@/lib/tryon/tryon";
import { InsufficientUnitsError } from "@/lib/youcam/client";
import { youcam } from "@/lib/youcam/server";

// Starts a try-on: multipart form with `selfie` and `wig` (JPGs, long side ≤ 1024 px) and
// `accessCode`. Returns the task id and a ticket for polling GET /api/tryon/<taskId>.

async function readPhoto(form: FormData, photo: Photo): Promise<Uint8Array<ArrayBuffer>> {
  const file = form.get(photo);
  const bytes = file instanceof File ? new Uint8Array(await file.arrayBuffer()) : new Uint8Array();
  checkPhoto(photo, bytes);
  return bytes;
}

export async function POST(request: Request) {
  // Two photos plus form overhead; anything bigger isn't ours.
  if (Number(request.headers.get("content-length") ?? 0) > 2 * PHOTO_MAX_BYTES + 64 * 1024) {
    return failure(413, "too_large", "Those photos are too large. Use photos under 2 MB each.");
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return failure(400, "bad_form", "Send the two photos as a form.");
  }

  const code = form.get("accessCode");
  if (!accessCodeMatches(typeof code === "string" ? code : null, process.env.TRYON_ACCESS_CODE)) {
    return failure(401, "access_code", "That access code isn't right.");
  }

  let selfie: Uint8Array<ArrayBuffer>, wig: Uint8Array<ArrayBuffer>;
  try {
    selfie = await readPhoto(form, "selfie");
    wig = await readPhoto(form, "wig");
  } catch (error) {
    if (error instanceof PhotoError) return failure(400, `bad_${error.photo}`, error.message);
    throw error;
  }

  try {
    const session = await currentOrNewSession();
    const taskId = await startTryOn(youcam(), selfie, wig);
    return json({ taskId, ticket: taskTicket(session.id, taskId, process.env.SESSION_SECRET) });
  } catch (error) {
    logError("tryon/start", error);
    if (error instanceof InsufficientUnitsError) {
      return failure(503, "paused", "Try-on is paused for now. Please try again later.");
    }
    return failure(502, "start_failed", "We couldn't start the preview. Please try again in a minute.");
  }
}
