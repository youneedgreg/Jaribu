import { logError } from "@/lib/http";
import { orderById } from "@/lib/orders/store";
import { results } from "@/lib/results/server";

// The try-on picture on an order card: to anyone with the order's link, and only while the
// picture exists (24 hours from when it was made). Never cached.

const NO_STORE = { "cache-control": "private, no-store" };

export async function GET(_request: Request, { params }: RouteContext<"/api/orders/[orderId]/picture">) {
  const { orderId } = await params;
  try {
    const order = await orderById(orderId);
    if (!order) return new Response("Not found", { status: 404, headers: NO_STORE });
    if (!order.sessionId || !order.resultTaskId) return new Response("Gone", { status: 410, headers: NO_STORE });
    const opened = await results().open(order.sessionId, order.resultTaskId);
    if (opened.status !== "ok") return new Response("Gone", { status: 410, headers: NO_STORE });
    const headers: Record<string, string> = { ...NO_STORE, "content-type": opened.contentType, "x-content-type-options": "nosniff" };
    if (opened.size !== null) headers["content-length"] = String(opened.size);
    return new Response(opened.stream, { headers });
  } catch (error) {
    logError("orders/picture", error);
    return new Response("Error", { status: 502, headers: NO_STORE });
  }
}
