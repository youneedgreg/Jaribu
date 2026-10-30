import { HairPhotoError, pollHairType, startHairType } from "@/lib/checks/hair";
import { failure, json, logError } from "@/lib/http";
import { results } from "@/lib/results/server";
import { currentSession } from "@/lib/session-cookie";
import { PHOTO_MAX_BYTES } from "@/lib/tryon/tryon";
import { isOutOfUnits } from "@/lib/youcam/client";
import { youcam } from "@/lib/youcam/server";

// The hair-type reading for the blend check, one per session (2 units). POST a multipart
// `front`, `right` and `left` (the three Camera Kit photos, same size) after the try-on has
// started the session; then GET every 3 s until it succeeds or fails. A second POST in the same
// session returns the first one's status, marked `earlier: true`.

const SIDES = ["front", "right", "left"] as const;

export async function POST(request: Request) {
  const session = await currentSession();
  if (!session) return failure(401, "session_ended", "This preview has ended. Please start again.");
  if (Number(request.headers.get("content-length") ?? 0) > 3 * PHOTO_MAX_BYTES + 64 * 1024) {
    return failure(413, "too_large", "The photos are too large.");
  }

  const photos = { front: new Uint8Array(), right: new Uint8Array(), left: new Uint8Array() };
  try {
    const form = await request.formData();
    for (const side of SIDES) {
      const file = form.get(side);
      if (file instanceof File) photos[side] = new Uint8Array(await file.arrayBuffer());
    }
  } catch {
    return failure(400, "bad_form", "Send the photos as a form.");
  }

  try {
    return json(await startHairType(youcam(), results(), session.id, photos));
  } catch (error) {
    if (error instanceof HairPhotoError) return failure(400, "bad_photo", error.message);
    logError("hairtype/start", error);
    if (isOutOfUnits(error)) {
      return failure(503, "paused", "The blend check is paused for now. Please try again later.");
    }
    return failure(502, "start_failed", "We couldn't start the blend check. Please try again in a minute.");
  }
}

export async function GET() {
  const session = await currentSession();
  if (!session) return failure(401, "session_ended", "This preview has ended. Please start again.");
  try {
    const status = await pollHairType(youcam(), results(), session.id);
    if (!status) return failure(404, "not_found", "The blend check hasn't started.");
    return json(status);
  } catch (error) {
    logError("hairtype/poll", error);
    return failure(502, "poll_failed", "We couldn't check on the blend check. Trying again…");
  }
}
