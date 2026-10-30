import { hasAccessPass } from "@/lib/access-cookie";
import { failure, json, logError } from "@/lib/http";
import { isSafeId } from "@/lib/results/store";
import { results } from "@/lib/results/server";
import { taskTicket, taskTicketMatches } from "@/lib/session";
import { currentSession } from "@/lib/session-cookie";
import { findColorway } from "@/lib/shop/demo";
import { findWig } from "@/lib/shop/listings";
import { RecolorError, startRecolor } from "@/lib/tryon/tryon";
import { isOutOfUnits } from "@/lib/youcam/client";
import { youcam } from "@/lib/youcam/server";

// Shows a finished try-on in one of the wig's colours: JSON `{ ticket, wigId, colorwayId }`, where
// the ticket is the try-on's own. Returns a Hair Color task id and ticket for polling
// GET /api/tryon/<taskId>?api=haircolor. The colour is looked up here, never taken from the browser.

export async function POST(request: Request, ctx: RouteContext<"/api/tryon/[taskId]/color">) {
  const { taskId } = await ctx.params;
  const session = await currentSession();
  if (!session) return failure(401, "session_ended", "This preview has ended. Please start again.");
  if (!(await hasAccessPass())) return failure(401, "access_code", "Enter the access code again to keep trying.");

  const body = (await request.json().catch(() => null)) as { ticket?: unknown; wigId?: unknown; colorwayId?: unknown } | null;
  const ticket = typeof body?.ticket === "string" ? body.ticket : null;
  if (!isSafeId(taskId) || !taskTicketMatches(ticket, "hairstyle", session.id, taskId, process.env.SESSION_SECRET)) {
    return failure(404, "not_found", "We couldn't find this preview. Please start again.");
  }
  let wig;
  try {
    wig = typeof body?.wigId === "string" ? (await findWig(body.wigId))?.wig : undefined;
  } catch (error) {
    logError("tryon/color-wig", error);
    return failure(502, "wig_failed", "We couldn't load that wig. Please try again in a minute.");
  }
  const colorway = wig && typeof body?.colorwayId === "string" ? findColorway(wig, body.colorwayId) : undefined;
  if (!colorway) return failure(404, "no_colorway", "This wig doesn't come in that colour.");

  try {
    const colorTaskId = await startRecolor(youcam(), results(), session.id, taskId, colorway);
    return json({ taskId: colorTaskId, ticket: taskTicket("haircolor", session.id, colorTaskId, process.env.SESSION_SECRET) });
  } catch (error) {
    if (error instanceof RecolorError) {
      return failure(error.code === "expired" ? 410 : error.code === "not_found" ? 404 : 422, error.code, error.message);
    }
    logError("tryon/color", error);
    if (isOutOfUnits(error)) {
      return failure(503, "paused", "Colours are paused for now. Please try again later.");
    }
    return failure(502, "start_failed", "We couldn't start the colour preview. Please try again in a minute.");
  }
}
