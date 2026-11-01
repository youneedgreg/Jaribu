"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { pageTitle, primaryButton, secondaryButton } from "@/components/styles";

/** Shown when a page fails on our side, for example if the database doesn't answer. */
export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pt-6 pb-12">
        <h1 className={pageTitle}>This page didn&apos;t load</h1>
        <p className="text-muted">The problem is on our side, not yours. Wait a few seconds and try again.</p>
        <div className="flex flex-col gap-3">
          <button type="button" onClick={() => retry()} className={primaryButton}>
            Try again
          </button>
          <Link href="/" className={secondaryButton}>
            Go to the home page
          </Link>
        </div>
      </main>
    </>
  );
}
