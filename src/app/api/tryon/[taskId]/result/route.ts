import { failure, logError } from "@/lib/http";
import { isSafeId } from "@/lib/results/store";
import { results } from "@/lib/results/server";
import { currentSession } from "@/lib/session-cookie";

// Serves a stored try-on result to the session that made it, and only for 24 hours.

export async function GET(_request: Request, ctx: RouteContext<"/api/tryon/[taskId]/result">) {
  const { taskId } = await ctx.params;
  const session = await currentSession();
  if (!session) return failure(401, "session_ended", "This preview has ended. Please start again.");
  if (!isSafeId(taskId)) return failure(404, "not_found", "We couldn't find this preview.");

  try {
    const opened = await results().open(session.id, taskId);
    if (opened.status === "missing") return failure(404, "not_found", "We couldn't find this preview.");
    if (opened.status === "expired") return failure(410, "expired", "Previews are deleted after 24 hours. Please start again.");
    const headers: Record<string, string> = {
      "content-type": opened.contentType,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    };
    if (opened.size !== null) headers["content-length"] = String(opened.size);
    return new Response(opened.stream, { headers });
  } catch (error) {
    logError("tryon/result", error);
    return failure(502, "result_failed", "We couldn't load the preview. Please try again.");
  }
}
