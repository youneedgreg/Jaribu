import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DEMO_SHOP, formatKes } from "@/lib/shop/demo";

// Allowed to block on navigation: awaiting params outside <Suspense> keeps real 404s for
// unknown ids, and every demo id is prerendered anyway. Revisit with seller listings (step F).
export const instant = false;

export function generateStaticParams() {
  return [{ shopId: DEMO_SHOP.id }];
}

export async function generateMetadata({ params }: PageProps<"/s/[shopId]">): Promise<Metadata> {
  const { shopId } = await params;
  return shopId === DEMO_SHOP.id ? { title: `${DEMO_SHOP.name} · Jaribu` } : {};
}

export default async function ShopPage({ params }: PageProps<"/s/[shopId]">) {
  const { shopId } = await params;
  if (shopId !== DEMO_SHOP.id) notFound();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{DEMO_SHOP.name}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Sample wigs to show how Jaribu works. Not for sale.</p>
      </header>
      <ul className="grid grid-cols-2 gap-4">
        {DEMO_SHOP.wigs.map((wig) => (
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
    </main>
  );
}
