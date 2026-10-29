import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DEMO_SHOP, formatKes } from "@/lib/shop/demo";
import { findWig } from "@/lib/shop/listings";

// Allowed to block on navigation: awaiting params and the wig outside <Suspense> keeps real
// 404s for unknown ids. Demo wigs are prerendered; sellers' wigs are read per request.
export const instant = false;

export function generateStaticParams() {
  return DEMO_SHOP.wigs.map((wig) => ({ wigId: wig.id }));
}

export async function generateMetadata({ params }: PageProps<"/w/[wigId]">): Promise<Metadata> {
  const found = await findWig((await params).wigId);
  return found ? { title: `${found.wig.name} · ${found.shop.name}` } : {};
}

export default async function WigPage({ params }: PageProps<"/w/[wigId]">) {
  const found = await findWig((await params).wigId);
  if (!found) notFound();
  const { wig, shop } = found;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-8">
      <Link href={`/s/${shop.id}`} className="text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400">
        {shop.name}
      </Link>
      <figure className="flex flex-col gap-1">
        <Image
          src={wig.photo}
          alt={`${wig.name} wig`}
          width={wig.photoWidth}
          height={wig.photoHeight}
          sizes="(max-width: 448px) 100vw, 448px"
          preload
          loading="eager"
          className="w-full rounded-md"
        />
        {wig.credit && (
          <figcaption className="text-xs text-zinc-500">
            Photo:{" "}
            <a href={wig.credit.url} className="underline underline-offset-2">
              {wig.credit.name} on Unsplash
            </a>
            . Sample listing, not a real seller.
          </figcaption>
        )}
      </figure>
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{wig.name}</h1>
        <p className="text-lg font-medium">{formatKes(wig.priceKes)}</p>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <dt className="text-zinc-600 dark:text-zinc-400">Texture</dt>
        <dd>{wig.texture}</dd>
        <dt className="text-zinc-600 dark:text-zinc-400">Length</dt>
        <dd>{wig.length}</dd>
      </dl>
      <Link
        href={`/w/${wig.id}/try`}
        className="rounded-md bg-zinc-900 px-4 py-3 text-center font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        Try it on
      </Link>
      <p className="text-xs text-zinc-500">The try-on is a preview of how the style may look, not a fit guarantee.</p>
    </main>
  );
}
