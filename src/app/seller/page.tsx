import type { Metadata } from "next";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import { card, pageTitle, primaryButton, sectionTitle } from "@/components/styles";
import { currentSeller } from "@/lib/seller/current-seller";
import { shopForOwner } from "@/lib/seller/shop";
import { formatWhatsapp } from "@/lib/seller/shop-fields";
import { statsForShop } from "@/lib/seller/stats";
import { statsLine } from "@/lib/seller/stats-line";
import { wigsForShop } from "@/lib/seller/wigs";
import { byId, TEXTURES } from "@/lib/shop/catalog";
import { formatKes } from "@/lib/shop/demo";
import { DeleteWigButton } from "./delete-wig-button";
import { ShareButton } from "./share-button";
import { ShopForm } from "./shop-form";
import { SignOutButton } from "./sign-out-button";

const label = "text-sm text-muted";

export const metadata: Metadata = { title: "Your shop · Jaribu", robots: { index: false } };

async function SellerHome() {
  const session = await currentSeller();
  if (!session) redirect("/seller/sign-in");

  const shop = await shopForOwner(session.user.id);
  const host = (await headers()).get("host") ?? "tryjaribu.vercel.app";
  const origin = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
  const linkPrefix = `${host}/s/`;

  if (!shop) {
    return (
      <>
        <p className="text-muted">
          Set up your shop first. Shoppers see its name, and their orders come to your WhatsApp.
        </p>
        <div className={card}>
          <ShopForm current={null} linkPrefix={linkPrefix} />
        </div>
        <p className="text-sm text-muted">Signed in as {session.user.email}.</p>
        <SignOutButton />
      </>
    );
  }

  const [wigs, stats] = await Promise.all([wigsForShop(shop.id), statsForShop(shop.id)]);

  return (
    <>
      <dl className={`${card} flex flex-col gap-3`}>
        <div>
          <dt className={label}>Shop name</dt>
          <dd className="font-medium">{shop.name}</dd>
        </div>
        <div>
          <dt className={label}>Orders go to WhatsApp</dt>
          <dd className="font-medium">{formatWhatsapp(shop.whatsapp)}</dd>
        </div>
        <div>
          <dt className={label}>Shop link</dt>
          <dd className="flex flex-col gap-1">
            <a href={`/s/${shop.slug}`} className="font-medium break-all underline underline-offset-4">
              {linkPrefix}
              {shop.slug}
            </a>
            <ShareButton url={`${origin}/s/${shop.slug}`} title={shop.name} label="Share your shop" />
          </dd>
        </div>
      </dl>
      <section className="flex flex-col gap-3">
        <h2 className={sectionTitle}>Your wigs</h2>
        {wigs.length === 0 ? (
          <p className="rounded-2xl bg-tint p-4">No wigs yet. Add your first one so shoppers can try it on.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {wigs.map((wig) => (
              <li key={wig.id} className={`${card} flex gap-4`}>
                <Image
                  src={`/api/wigs/${wig.id}/photo`}
                  alt={`${wig.name} wig`}
                  width={wig.photoWidth}
                  height={wig.photoHeight}
                  unoptimized
                  className="aspect-[3/4] w-20 shrink-0 self-start rounded-xl object-cover"
                />
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="font-medium">{wig.name}</span>
                  <span className="text-sm text-muted">
                    {formatKes(wig.priceKes)} · {wig.lengthIn} in · {byId(TEXTURES, wig.texture)?.name}
                  </span>
                  <span className="text-sm">
                    {statsLine(stats.get(wig.id) ?? { tryons: 0, orders: 0 })}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-4">
                    <a href={`/w/${wig.id}`} className="inline-flex min-h-10 items-center text-sm font-medium underline underline-offset-4">
                      View
                    </a>
                    <ShareButton url={`${origin}/w/${wig.id}`} title={`${wig.name} · ${shop.name}`} />
                    <DeleteWigButton wigId={wig.id} name={wig.name} />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Link href="/seller/wigs/new" className={`${primaryButton} self-start`}>
          Add a wig
        </Link>
      </section>
      <details className={card}>
        <summary className="cursor-pointer font-medium">Edit shop details</summary>
        <div className="mt-4">
          <ShopForm
            current={{ name: shop.name, whatsapp: formatWhatsapp(shop.whatsapp), slug: shop.slug }}
            linkPrefix={linkPrefix}
          />
        </div>
      </details>
      <p className="text-sm text-muted">Signed in as {session.user.email}.</p>
      <SignOutButton />
    </>
  );
}

export default function SellerPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pt-2 pb-12">
        <h1 className={pageTitle}>Your shop</h1>
        <Suspense fallback={<p className="text-muted">Loading…</p>}>
          <SellerHome />
        </Suspense>
      </main>
    </>
  );
}
