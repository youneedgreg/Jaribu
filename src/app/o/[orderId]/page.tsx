import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { card, pageTitle } from "@/components/styles";
import { checkOrderChoice } from "@/lib/orders/order";
import { orderById } from "@/lib/orders/store";
import { results } from "@/lib/results/server";
import { formatKes } from "@/lib/shop/demo";
import { findWig } from "@/lib/shop/listings";

// The order card the seller opens from the WhatsApp message: the shopper's try-on picture
// (while it exists) and the exact spec. Anyone with the link can see it, so it's never indexed.

// Allowed to block on navigation: the order is read outside <Suspense> so unknown links 404.
export const instant = false;

export const metadata: Metadata = { title: "Wig order · Jaribu", robots: { index: false, follow: false }, referrer: "no-referrer" };

const SENT = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Nairobi" });

export default async function OrderCardPage({ params }: PageProps<"/o/[orderId]">) {
  const order = await orderById((await params).orderId);
  const found = order ? await findWig(order.wigId) : null;
  if (!order || !found) notFound();
  const { wig, shop } = found;
  const check = checkOrderChoice(wig, order);

  const opened = order.sessionId && order.resultTaskId ? await results().open(order.sessionId, order.resultTaskId) : null;
  if (opened?.status === "ok") await opened.stream.cancel();
  const hasPicture = opened?.status === "ok";

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pt-2 pb-12">
        <header className="flex flex-col gap-1">
          <p className="text-sm font-medium text-accent">Order for {shop.name}</p>
          <div className="flex items-baseline justify-between gap-4">
            <h1 className={pageTitle}>{wig.name}</h1>
            <p className="shrink-0 text-xl font-medium">{formatKes(wig.priceKes)}</p>
          </div>
          <p className="text-sm text-muted">Sent {SENT.format(order.createdAt)}</p>
        </header>

        {hasPicture ? (
          <figure className="flex flex-col gap-2">
            {/* The shopper's picture, never cached or optimised. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/orders/${order.id}/picture`} alt={`The shopper wearing ${wig.name}, try-on preview`} className="w-full rounded-3xl" />
            <figcaption className="text-sm text-muted">
              Try-on preview: how the style may look, not a fit guarantee. This picture is deleted 24 hours after it was made.
            </figcaption>
          </figure>
        ) : (
          <p className="rounded-2xl bg-tint p-4 text-sm">
            The try-on picture has been deleted: pictures are kept for 24 hours. The order details are below.
          </p>
        )}

        {check.ok ? (
          <dl className={`${card} grid grid-cols-[auto_1fr] gap-x-6 gap-y-3`}>
            <dt className="text-muted">Colour</dt>
            <dd className="font-medium">{check.spec.colorway ? `${check.spec.colorway.code} ${check.spec.colorway.name}` : "As in the listing photo"}</dd>
            <dt className="text-muted">Made as</dt>
            <dd className="font-medium">{check.spec.construction.name}</dd>
            {check.spec.lace && (
              <>
                <dt className="text-muted">Lace</dt>
                <dd className="font-medium">{check.spec.lace.name}</dd>
              </>
            )}
            <dt className="text-muted">Length</dt>
            <dd className="font-medium">{wig.length}</dd>
            <dt className="text-muted">Texture</dt>
            <dd className="font-medium">{wig.texture}</dd>
          </dl>
        ) : (
          <p className="rounded-2xl bg-tint p-4 text-sm">
            This wig&apos;s listing has changed since the order was sent. Ask the shopper which options they want.
          </p>
        )}
      </main>
    </>
  );
}
