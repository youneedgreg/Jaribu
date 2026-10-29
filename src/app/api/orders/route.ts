import { failure, json, logError } from "@/lib/http";
import { checkOrderChoice, orderMessage, whatsappLink } from "@/lib/orders/order";
import { saveOrder } from "@/lib/orders/store";
import { isSafeId } from "@/lib/results/store";
import { results } from "@/lib/results/server";
import { taskTicketMatches } from "@/lib/session";
import { currentSession } from "@/lib/session-cookie";
import { findWig } from "@/lib/shop/listings";

// Saves a WhatsApp order for the preview the shopper is looking at: JSON `{ wigId, taskId,
// ticket, api, colorwayId, constructionId, laceShadeId }`, where the ticket is that preview's
// own (a try-on, or a colour of it). Returns the wa.me link to the seller's chat, the message,
// and the order card link the message points to.

const text = (v: unknown) => (typeof v === "string" ? v : null);

export async function POST(request: Request) {
  const session = await currentSession();
  if (!session) return failure(401, "session_ended", "This preview has ended. Please start again.");

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const taskId = text(body?.taskId) ?? "";
  const api = body?.api === "haircolor" ? "haircolor" : "hairstyle";
  if (!isSafeId(taskId) || !taskTicketMatches(text(body?.ticket), api, session.id, taskId, process.env.SESSION_SECRET)) {
    return failure(404, "not_found", "We couldn't find this preview. Please start again.");
  }

  try {
    const found = await findWig(text(body?.wigId) ?? "");
    if (!found) return failure(404, "no_wig", "We couldn't find that wig.");
    const { wig, shop } = found;
    if (shop.sample || !shop.whatsapp) {
      return failure(409, "sample_shop", "This is a sample shop, so ordering is off.");
    }

    const choice = {
      colorwayId: text(body?.colorwayId),
      constructionId: text(body?.constructionId) ?? "",
      laceShadeId: text(body?.laceShadeId),
    };
    const check = checkOrderChoice(wig, choice);
    if (!check.ok) return failure(400, "bad_choice", check.message);

    // The order card shows this picture, so it has to still be there.
    const opened = await results().open(session.id, taskId);
    if (opened.status !== "ok") return failure(410, "expired", "Previews are deleted after 24 hours. Please start again.");
    await opened.stream.cancel();

    const orderId = await saveOrder({ wigId: wig.id, ...choice, sessionId: session.id, resultTaskId: taskId });
    const cardUrl = `${new URL(request.url).origin}/o/${orderId}`;
    const message = orderMessage(shop.name, wig, check.spec, cardUrl);
    return json({ orderId, cardUrl, message, whatsappUrl: whatsappLink(shop.whatsapp, message) });
  } catch (error) {
    logError("orders/create", error);
    return failure(502, "order_failed", "We couldn't send the order. Please try again in a minute.");
  }
}
