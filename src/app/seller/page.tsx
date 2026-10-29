import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { currentSeller } from "@/lib/seller/current-seller";
import { shopForOwner } from "@/lib/seller/shop";
import { formatWhatsapp } from "@/lib/seller/shop-fields";
import { ShopForm } from "./shop-form";
import { SignOutButton } from "./sign-out-button";

export const metadata: Metadata = { title: "Your shop · Jaribu", robots: { index: false } };

async function SellerHome() {
  const session = await currentSeller();
  if (!session) redirect("/seller/sign-in");

  const shop = await shopForOwner(session.user.id);
  const linkPrefix = `${(await headers()).get("host") ?? "tryjaribu.vercel.app"}/s/`;

  if (!shop) {
    return (
      <>
        <p className="text-zinc-600 dark:text-zinc-400">
          Set up your shop first. Shoppers see its name, and their orders come to your WhatsApp.
        </p>
        <ShopForm current={null} linkPrefix={linkPrefix} />
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Signed in as {session.user.email}.</p>
        <SignOutButton />
      </>
    );
  }

  return (
    <>
      <dl className="flex flex-col gap-3">
        <div>
          <dt className="text-sm text-zinc-600 dark:text-zinc-400">Shop name</dt>
          <dd className="font-medium">{shop.name}</dd>
        </div>
        <div>
          <dt className="text-sm text-zinc-600 dark:text-zinc-400">Orders go to WhatsApp</dt>
          <dd className="font-medium">{formatWhatsapp(shop.whatsapp)}</dd>
        </div>
        <div>
          <dt className="text-sm text-zinc-600 dark:text-zinc-400">Shop link</dt>
          <dd className="font-medium break-all">
            {linkPrefix}
            {shop.slug}
          </dd>
        </div>
      </dl>
      <p>Adding wigs comes next.</p>
      <details className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
        <summary className="cursor-pointer font-medium">Edit shop details</summary>
        <div className="mt-4">
          <ShopForm
            current={{ name: shop.name, whatsapp: formatWhatsapp(shop.whatsapp), slug: shop.slug }}
            linkPrefix={linkPrefix}
          />
        </div>
      </details>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">Signed in as {session.user.email}.</p>
      <SignOutButton />
    </>
  );
}

export default function SellerPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Your shop</h1>
      <Suspense fallback={<p className="text-zinc-600 dark:text-zinc-400">Loading…</p>}>
        <SellerHome />
      </Suspense>
    </main>
  );
}
