import { hasAccessPass } from "@/lib/access-cookie";
import { pollTone, startTone, TonePhotoError } from "@/lib/checks/tone";
import { failure, json, logError } from "@/lib/http";
import { results } from "@/lib/results/server";
import { currentSession } from "@/lib/session-cookie";
import { PHOTO_MAX_BYTES } from "@/lib/tryon/tryon";
import { isOutOfUnits } from "@/lib/youcam/client";
import { youcam } from "@/lib/youcam/server";

// The skin-tone reading for the lace match, one per session (20 units). POST a multipart
// `photo` (the cropped close-up) after the try-on has started the session; then GET every 3 s
// until it succeeds or fails. A second POST in the same session returns the first one's status,
// marked `earlier: true` so the screen can say the reading isn't from the new close-up.

export async function POST(request: Request) {
  const session = await currentSession();
  if (!session) return failure(401, "session_ended", "This preview has ended. Please start again.");
  if (!(await hasAccessPass())) return failure(401, "access_code", "Enter the access code again to keep trying.");
  if (Number(request.headers.get("content-length") ?? 0) > PHOTO_MAX_BYTES + 64 * 1024) {
    return failure(413, "too_large", "The close-up photo is too large.");
  }

  let photo: Uint8Array<ArrayBuffer>;
  try {
    const file = (await request.formData()).get("photo");
    photo = file instanceof File ? new Uint8Array(await file.arrayBuffer()) : new Uint8Array();
  } catch {
    return failure(400, "bad_form", "Send the photo as a form.");
  }

  try {
    return json(await startTone(youcam(), results(), session.id, photo));
  } catch (error) {
    if (error instanceof TonePhotoError) return failure(400, "bad_photo", error.message);
    logError("tone/start", error);
    if (isOutOfUnits(error)) {
      return failure(503, "paused", "The lace match is paused for now. Please try again later.");
    }
    return failure(502, "start_failed", "We couldn't start the lace match. Please try again in a minute.");
  }
}

export async function GET() {
  const session = await currentSession();
  if (!session) return failure(401, "session_ended", "This preview has ended. Please start again.");
  try {
    const status = await pollTone(youcam(), results(), session.id);
    if (!status) return failure(404, "not_found", "The lace match hasn't started.");
    return json(status);
  } catch (error) {
    logError("tone/poll", error);
    return failure(502, "poll_failed", "We couldn't check on the lace match. Trying again…");
  }
}
