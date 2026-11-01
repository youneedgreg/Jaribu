import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { pageTitle, sectionTitle } from "@/components/styles";
import { DEMO_SHOP, formatKes, groupByStyle } from "@/lib/shop/demo";
import { findShop } from "@/lib/shop/listings";

// Allowed to block on navigation: awaiting params and the shop outside <Suspense> keeps real
// 404s for unknown links. The demo shop is prerendered; sellers' shops are read per request.
export const instant = false;

export function generateStaticParams() {
  return [{ shopId: DEMO_SHOP.id }];
}

export async function generateMetadata({ params }: PageProps<"/s/[shopId]">): Promise<Metadata> {
  const shop = await findShop((await params).shopId);
  if (!shop) return {};
  const title = `${shop.name} · Jaribu`;
  const description = shop.sample ? "Sample wigs to show how Jaribu works. Not for sale." : "Try any wig on your own face before you order.";
  const images = shop.wigs.slice(0, 1).map((wig) => wig.photo);
  return { title, description, openGraph: { title, description, ...(images.length > 0 && { images }) } };
}

export default async function ShopPage({ params }: PageProps<"/s/[shopId]">) {
  const shop = await findShop((await params).shopId);
  if (!shop) notFound();
  const groups = groupByStyle(shop.wigs);

  return (
    <>
      <SiteHeader wigsHref={`/s/${shop.id}`} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 pt-4 pb-12 sm:px-6">
        <header className="flex flex-col gap-2">
          <h1 className={pageTitle}>{shop.name}</h1>
          <p className="text-muted">
            {shop.sample
              ? "Sample wigs to show how Jaribu works. Not for sale."
              : "Try any wig on your own face before you order."}
          </p>
        </header>
        {shop.wigs.length === 0 && <p className="text-muted">This shop hasn&apos;t listed any wigs yet. Check back soon.</p>}
        {groups.length > 1 && (
          <nav aria-label="Styles" className="flex flex-wrap gap-2">
            {groups.map((group, index) => (
              <a
                key={group.style}
                href={`#style-${index}`}
                className="inline-flex min-h-10 items-center rounded-full border border-line bg-card px-4 text-sm font-medium"
              >
                {group.style}
              </a>
            ))}
          </nav>
        )}
        {groups.map((group, index) => (
          <section key={group.style} id={`style-${index}`} className="flex scroll-mt-4 flex-col gap-4">
            {groups.length > 1 && <h2 className={sectionTitle}>{group.style}</h2>}
            <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4">
              {group.wigs.map((wig) => (
                <li key={wig.id}>
                  <Link href={`/w/${wig.id}`} className="flex flex-col gap-1">
                    <Image
                      src={wig.photo}
                      alt={`${wig.name} wig`}
                      width={wig.photoWidth}
                      height={wig.photoHeight}
                      sizes="(min-width: 768px) 240px, (min-width: 640px) 33vw, 50vw"
                      className="mb-1 aspect-[3/4] w-full rounded-2xl object-cover"
                    />
                    <span className="font-medium">{wig.name}</span>
                    <span className="text-sm text-muted">
                      {formatKes(wig.priceKes)} · {wig.length}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </>
  );
}
