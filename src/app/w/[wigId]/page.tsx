import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { backLink, pageTitle, primaryButton } from "@/components/styles";
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
    <>
      <SiteHeader wigsHref={`/s/${shop.id}`} />
      <main className="mx-auto grid w-full max-w-4xl flex-1 content-start gap-6 px-4 pt-2 pb-12 sm:px-6 md:grid-cols-2 md:gap-10">
        <figure className="flex flex-col gap-2">
          <Image
            src={wig.photo}
            alt={`${wig.name} wig`}
            width={wig.photoWidth}
            height={wig.photoHeight}
            sizes="(min-width: 768px) 420px, 100vw"
            preload
            loading="eager"
            className="max-h-[52svh] w-full rounded-3xl object-cover object-top md:max-h-none"
          />
          {wig.credit && (
            <figcaption className="text-xs text-muted">
              Photo:{" "}
              <a href={wig.credit.url} className="underline underline-offset-2">
                {wig.credit.name} on Unsplash
              </a>
              . Sample listing, not a real seller.
            </figcaption>
          )}
        </figure>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Link href={`/s/${shop.id}`} className={backLink}>
              {shop.name}
            </Link>
            <h1 className={pageTitle}>{wig.name}</h1>
            <p className="text-xl font-medium">{formatKes(wig.priceKes)}</p>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-y border-line py-4">
            <dt className="text-muted">Texture</dt>
            <dd>{wig.texture}</dd>
            <dt className="text-muted">Length</dt>
            <dd>{wig.length}</dd>
          </dl>
          <Link href={`/w/${wig.id}/try`} className={`${primaryButton} sticky bottom-4 shadow-lg md:static md:shadow-none`}>
            Try it on
          </Link>
          <p className="text-sm text-muted">The try-on is a preview of how the style may look, not a fit guarantee.</p>
        </div>
      </main>
    </>
  );
}
