import { del, list } from "@vercel/blob";
import { failure, json, logError } from "@/lib/http";
import { clearExpiredOrderPictures } from "@/lib/orders/store";
import { cronAuthorized, sweepResults } from "@/lib/results/sweep";

// The 24-hour deletion, called hourly by GitHub Actions (.github/workflows/sweep.yml) and daily
// by Vercel Cron as a backup (vercel.json). Vercel sends CRON_SECRET the same way. Each part runs
// even if the other fails, and any failure fails the run. Answers with counts only.

export async function GET(request: Request) {
  if (!cronAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return failure(401, "not_allowed", "Not allowed.");
  }

  const [blobs, orders] = await Promise.allSettled([sweepResults({ blob: { list, del } }), clearExpiredOrderPictures()]);
  if (blobs.status === "rejected") logError("cron/sweep/blobs", blobs.reason);
  if (orders.status === "rejected") logError("cron/sweep/orders", orders.reason);
  if (blobs.status === "rejected" || orders.status === "rejected") {
    return failure(502, "sweep_failed", "The sweep didn't finish. It runs again within the hour.");
  }
  return json({ deletedBlobs: blobs.value, clearedOrders: orders.value });
}
