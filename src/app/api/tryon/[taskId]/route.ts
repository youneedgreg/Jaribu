import type { NextRequest } from "next/server";
import { failure, json, logError } from "@/lib/http";
import { isSafeId, ResultCopyError } from "@/lib/results/store";
import { results } from "@/lib/results/server";
import { taskTicketMatches } from "@/lib/session";
import { currentSession } from "@/lib/session-cookie";
import { pollTryOn } from "@/lib/tryon/tryon";
import { youcam } from "@/lib/youcam/server";

// Checks a try-on once. The browser calls this every 3 s with the ticket from POST /api/tryon.
// On success the result is already in Blob and `resultUrl` serves it.

export async function GET(request: NextRequest, ctx: RouteContext<"/api/tryon/[taskId]">) {
  const { taskId } = await ctx.params;
  const session = await currentSession();
  if (!session) return failure(401, "session_ended", "This preview has ended. Please start again.");
  const ticket = request.nextUrl.searchParams.get("ticket");
  if (!isSafeId(taskId) || !taskTicketMatches(ticket, "hairstyle", session.id, taskId, process.env.SESSION_SECRET)) {
    return failure(404, "not_found", "We couldn't find this preview. Please start again.");
  }

  try {
    const status = await pollTryOn(youcam(), results(), session.id, taskId);
    if (status.status === "success") return json({ ...status, resultUrl: `/api/tryon/${taskId}/result` });
    return json(status);
  } catch (error) {
    logError("tryon/poll", error);
    // The task may have finished (and been paid for): asking again fetches a fresh link to copy.
    const message = error instanceof ResultCopyError ? "We couldn't save the preview yet." : "We couldn't check on the preview.";
    return failure(502, "poll_failed", `${message} Trying again…`);
  }
}
