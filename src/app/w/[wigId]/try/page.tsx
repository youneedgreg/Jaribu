import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { backLink } from "@/components/styles";
import { DEMO_SHOP } from "@/lib/shop/demo";
import { findWig } from "@/lib/shop/listings";
import { TryOn } from "./try-on";

// Allowed to block on navigation: awaiting params and the wig outside <Suspense> keeps real
// 404s for unknown ids. Demo wigs are prerendered; sellers' wigs are read per request.
export const instant = false;

export function generateStaticParams() {
  return DEMO_SHOP.wigs.map((wig) => ({ wigId: wig.id }));
}

export async function generateMetadata({ params }: PageProps<"/w/[wigId]/try">): Promise<Metadata> {
  const found = await findWig((await params).wigId);
  return found ? { title: `Try on ${found.wig.name} · Jaribu`, robots: { index: false } } : {};
}

// Step D: guided capture with YouCam's Camera Kit, with "upload a photo" as the fallback.
export default async function TryPage({ params }: PageProps<"/w/[wigId]/try">) {
  const found = await findWig((await params).wigId);
  if (!found) notFound();
  const { wig, shop } = found;

  return (
    <>
      <SiteHeader wigsHref={`/s/${shop.id}`} />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-2 pb-12">
        <header className="flex items-center gap-3">
          <Image src={wig.photo} alt="" width={wig.photoWidth} height={wig.photoHeight} sizes="56px" className="h-16 w-12 rounded-xl bg-tint object-cover" />
          <div className="flex flex-col gap-0.5">
            <h1 className="font-display text-2xl font-semibold tracking-tight">Try on: {wig.name}</h1>
            <Link href={`/w/${wig.id}`} className={backLink}>
              Back to the wig
            </Link>
          </div>
        </header>
        <TryOn wigs={shop.wigs} firstWigId={wig.id} ordersOpen={!shop.sample && Boolean(shop.whatsapp)} />
      </main>
    </>
  );
}
