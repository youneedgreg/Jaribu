import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <Link href="/seller" className="text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400">
        Back to your shop
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Add a wig</h1>
      <Suspense fallback={<p className="text-zinc-600 dark:text-zinc-400">Loading…</p>}>
        <NewWig />
      </Suspense>
    </main>
  );
}
