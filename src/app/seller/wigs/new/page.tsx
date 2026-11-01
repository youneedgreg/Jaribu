import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import { backLink, pageTitle } from "@/components/styles";
import { currentSeller } from "@/lib/seller/current-seller";
import { shopForOwner } from "@/lib/seller/shop";
import { WigForm } from "./wig-form";

export const metadata: Metadata = { title: "Add a wig · Jaribu", robots: { index: false } };

async function NewWig() {
  const session = await currentSeller();
  if (!session) redirect("/seller/sign-in");
  if (!(await shopForOwner(session.user.id))) redirect("/seller");
  return <WigForm />;
}

export default function NewWigPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pt-2 pb-12">
        <div className="flex flex-col gap-1">
          <Link href="/seller" className={`${backLink} self-start`}>
            Back to your shop
          </Link>
          <h1 className={pageTitle}>Add a wig</h1>
        </div>
        <Suspense fallback={<p className="text-muted">Loading…</p>}>
          <NewWig />
        </Suspense>
      </main>
    </>
  );
}
