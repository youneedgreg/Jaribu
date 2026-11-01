import Link from "next/link";
import { AccountMenu } from "./account-menu";

/** The wordmark and the two ways in, shown at the top of the public pages. */
export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
      <Link href="/" className="font-display text-2xl font-semibold tracking-tight">
        Jaribu
      </Link>
      <nav className="flex items-center gap-1 text-sm font-medium">
        <Link href="/s/demo" className="rounded-full px-3 py-2">
          Wigs
        </Link>
        <AccountMenu />
      </nav>
    </header>
  );
}
