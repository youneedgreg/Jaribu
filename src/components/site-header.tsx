import Link from "next/link";
import { AccountMenu } from "./account-menu";

/** The wordmark and the two ways in. `wigsHref` keeps a shopper in the shop they're browsing. */
export function SiteHeader({ wigsHref = "/s/demo" }: { wigsHref?: string }) {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
      <Link href="/" className="font-display text-2xl font-semibold tracking-tight">
        Jaribu
      </Link>
      <nav className="flex items-center gap-1 text-sm font-medium">
        <Link href={wigsHref} className="rounded-full px-3 py-2">
          Wigs
        </Link>
        <AccountMenu />
      </nav>
    </header>
  );
}
