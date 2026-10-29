import type { Metadata } from "next";
import { notFound } from "next/navigation";
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

  const opened = await results().open(order.sessionId, order.resultTaskId);
  if (opened.status === "ok") await opened.stream.cancel();
  const hasPicture = opened.status === "ok";

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-8">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Order for {shop.name}</p>
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">{wig.name}</h1>
          <p className="text-lg font-medium">{formatKes(wig.priceKes)}</p>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Sent {SENT.format(order.createdAt)}</p>
      </header>

      {hasPicture ? (
        <figure className="flex flex-col gap-1">
          {/* The shopper's picture, never cached or optimised. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/orders/${order.id}/picture`} alt={`The shopper wearing ${wig.name}, try-on preview`} className="w-full rounded-md" />
          <figcaption className="text-xs text-zinc-500">
            Try-on preview: how the style may look, not a fit guarantee. This picture is deleted 24 hours after it was made.
          </figcaption>
        </figure>
      ) : (
        <p className="rounded-md border border-zinc-200 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          The try-on picture has been deleted: pictures are kept for 24 hours. The order details are below.
        </p>
      )}

      {check.ok ? (
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-zinc-600 dark:text-zinc-400">Colour</dt>
          <dd>{check.spec.colorway ? `${check.spec.colorway.code} ${check.spec.colorway.name}` : "As in the listing photo"}</dd>
          <dt className="text-zinc-600 dark:text-zinc-400">Made as</dt>
          <dd>{check.spec.construction.name}</dd>
          {check.spec.lace && (
            <>
              <dt className="text-zinc-600 dark:text-zinc-400">Lace</dt>
              <dd>{check.spec.lace.name}</dd>
            </>
          )}
          <dt className="text-zinc-600 dark:text-zinc-400">Length</dt>
          <dd>{wig.length}</dd>
          <dt className="text-zinc-600 dark:text-zinc-400">Texture</dt>
          <dd>{wig.texture}</dd>
        </dl>
      ) : (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          This wig&apos;s listing has changed since the order was sent. Ask the shopper which options they want.
        </p>
      )}
    </main>
  );
}
