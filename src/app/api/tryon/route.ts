import { accessCodeMatches } from "@/lib/access-code";
import { grantAccessPass, hasAccessPass } from "@/lib/access-cookie";
import { failure, json, logError } from "@/lib/http";
import { limitMessage, reachedLimit, taskTicket } from "@/lib/session";
import { currentOrNewSession, recordUsage, usageOf } from "@/lib/session-cookie";
import { findWig } from "@/lib/shop/listings";
import { readWigPhoto } from "@/lib/shop/wig-photo";
import { checkPhoto, PHOTO_MAX_BYTES, PhotoError, startTryOn } from "@/lib/tryon/tryon";
import { isOutOfUnits } from "@/lib/youcam/client";
import { youcam } from "@/lib/youcam/server";

// Starts a try-on: multipart form with `selfie` (JPG, long side ≤ 1024 px), `wigId` (a demo
// or seller wig) and, unless this device has a pass, `accessCode`. Returns the task id and a ticket
// for polling GET /api/tryon/<taskId>.

export async function POST(request: Request) {
  // One photo plus form overhead; anything bigger isn't ours.
  if (Number(request.headers.get("content-length") ?? 0) > PHOTO_MAX_BYTES + 64 * 1024) {
    return failure(413, "too_large", "That photo is too large. Use a photo under 2 MB.");
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return failure(400, "bad_form", "Send the photo as a form.");
  }

  const code = form.get("accessCode");
  const codeMatches = accessCodeMatches(typeof code === "string" ? code : null, process.env.TRYON_ACCESS_CODE);
  if (!codeMatches && !(await hasAccessPass())) {
    return failure(401, "access_code", "That access code isn't right.");
  }

  const wigId = form.get("wigId");
  let wig;
  try {
    wig = typeof wigId === "string" ? (await findWig(wigId))?.wig : undefined;
  } catch (error) {
    logError("tryon/wig", error);
    return failure(502, "wig_failed", "We couldn't load that wig. Please try again in a minute.");
  }
  if (!wig) return failure(404, "no_wig", "We couldn't find that wig.");

  let selfie: Uint8Array<ArrayBuffer>;
  try {
    const file = form.get("selfie");
    selfie = file instanceof File ? new Uint8Array(await file.arrayBuffer()) : new Uint8Array();
    checkPhoto("selfie", selfie);
  } catch (error) {
    if (error instanceof PhotoError) return failure(400, "bad_selfie", error.message);
    throw error;
  }

  try {
    if (codeMatches) await grantAccessPass();
    const session = await currentOrNewSession();
    const usage = await usageOf(session);
    if (reachedLimit(usage, "hairstyle")) return failure(429, "limit", limitMessage("hairstyle"));
    const taskId = await startTryOn(youcam(), selfie, await readWigPhoto(wig));
    await recordUsage(session, usage, "hairstyle");
    return json({ taskId, ticket: taskTicket("hairstyle", session.id, taskId, process.env.SESSION_SECRET) });
  } catch (error) {
    logError("tryon/start", error);
    if (isOutOfUnits(error)) {
      return failure(503, "paused", "Try-on is paused for now. Please try again later.");
    }
    return failure(502, "start_failed", "We couldn't start the preview. Please try again in a minute.");
  }
}
