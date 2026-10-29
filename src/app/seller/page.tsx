import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { currentSeller } from "@/lib/seller/current-seller";
import { SignOutButton } from "./sign-out-button";

export const metadata: Metadata = { title: "Your shop · Jaribu", robots: { index: false } };

// Placeholder until the shop and add-a-wig steps: proves only signed-in sellers get here.
async function SellerHome() {
  const session = await currentSeller();
  if (!session) redirect("/seller/sign-in");

  return (
    <>
      <p className="text-zinc-600 dark:text-zinc-400">Signed in as {session.user.email}.</p>
      <p>Setting up your shop and adding wigs comes next.</p>
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
