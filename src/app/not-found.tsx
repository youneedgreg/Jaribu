import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { pageTitle, primaryButton, secondaryButton } from "@/components/styles";

export const metadata: Metadata = { title: "Page not found · Jaribu", robots: { index: false } };

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pt-6 pb-12">
        <h1 className={pageTitle}>We can&apos;t find that page</h1>
        <p className="text-muted">
          The link may be old or mistyped, or the seller may have removed this wig. If a seller sent it to you, ask them for a new link.
        </p>
        <div className="flex flex-col gap-3">
          <Link href="/s/demo" className={primaryButton}>
            See sample wigs
          </Link>
          <Link href="/" className={secondaryButton}>
            Go to the home page
          </Link>
        </div>
      </main>
    </>
  );
}
