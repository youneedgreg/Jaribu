import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DEMO_SHOP, formatKes } from "@/lib/shop/demo";
import { findShop } from "@/lib/shop/listings";

// Allowed to block on navigation: awaiting params and the shop outside <Suspense> keeps real
// 404s for unknown links. The demo shop is prerendered; sellers' shops are read per request.
export const instant = false;

export function generateStaticParams() {
  return [{ shopId: DEMO_SHOP.id }];
}

export async function generateMetadata({ params }: PageProps<"/s/[shopId]">): Promise<Metadata> {
  const shop = await findShop((await params).shopId);
  return shop ? { title: `${shop.name} · Jaribu` } : {};
}

export default async function ShopPage({ params }: PageProps<"/s/[shopId]">) {
  const shop = await findShop((await params).shopId);
  if (!shop) notFound();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{shop.name}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {shop.sample
            ? "Sample wigs to show how Jaribu works. Not for sale."
            : "Try any wig on your own face before you order."}
        </p>
      </header>
      {shop.wigs.length === 0 ? (
        <p className="text-zinc-600 dark:text-zinc-400">This shop hasn&apos;t listed any wigs yet. Check back soon.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4">
          {shop.wigs.map((wig) => (
            <li key={wig.id}>
              <Link href={`/w/${wig.id}`} className="flex flex-col gap-2">
                <Image
                  src={wig.photo}
                  alt={`${wig.name} wig`}
                  width={wig.photoWidth}
                  height={wig.photoHeight}
                  sizes="(max-width: 448px) 50vw, 200px"
                  className="aspect-[3/4] w-full rounded-md object-cover"
                />
                <span className="text-sm font-medium">{wig.name}</span>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">{formatKes(wig.priceKes)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
