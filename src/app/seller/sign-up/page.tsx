import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import { pageTitle } from "@/components/styles";
import { AuthForm } from "../auth-form";
import { SignedOutOnly } from "../signed-out-only";

export const metadata: Metadata = { title: "Seller sign-up · Jaribu", robots: { index: false } };

export default function SignUpPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pt-4 pb-12">
        <h1 className={pageTitle}>Create a seller account</h1>
        <p className="text-muted">There&apos;s no password reset yet, so keep your password somewhere safe.</p>
        <Suspense fallback={<p className="text-muted">Loading…</p>}>
          <SignedOutOnly>
            <AuthForm mode="sign-up" />
          </SignedOutOnly>
        </Suspense>
      </main>
    </>
  );
}
