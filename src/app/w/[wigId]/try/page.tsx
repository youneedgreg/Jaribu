import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DEMO_SHOP, findWig } from "@/lib/shop/demo";
import { TryOn } from "./try-on";

// Allowed to block on navigation: awaiting params outside <Suspense> keeps real 404s for
// unknown ids, and every demo id is prerendered anyway. Revisit with seller listings (step F).
export const instant = false;

export function generateStaticParams() {
  return DEMO_SHOP.wigs.map((wig) => ({ wigId: wig.id }));
}

export async function generateMetadata({ params }: PageProps<"/w/[wigId]/try">): Promise<Metadata> {
  const wig = findWig((await params).wigId);
  return wig ? { title: `Try on ${wig.name} · Jaribu`, robots: { index: false } } : {};
}

// Step D: guided capture with YouCam's Camera Kit, with "upload a photo" as the fallback.
export default async function TryPage({ params }: PageProps<"/w/[wigId]/try">) {
  const wig = findWig((await params).wigId);
  if (!wig) notFound();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex items-center gap-3">
        <Image src={wig.photo} alt="" width={wig.photoWidth} height={wig.photoHeight} sizes="56px" className="h-16 w-12 rounded object-cover" />
        <div className="flex flex-col">
          <h1 className="text-xl font-semibold tracking-tight">Try on: {wig.name}</h1>
          <Link href={`/w/${wig.id}`} className="text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400">
            Back to the wig
          </Link>
        </div>
      </header>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Your front photo is sent to YouCam to make the preview. Your face close-up is sent only if you check the lace
        match, and your side photos only if you check the blend. YouCam keeps uploaded photos for up to 30 days. Your
        result is shown for 24 hours.
      </p>
      <TryOn wigs={DEMO_SHOP.wigs} firstWigId={wig.id} />
    </main>
  );
}
