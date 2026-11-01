"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { errorText } from "@/components/styles";
import { authClient } from "@/lib/auth-client";
import { sellerInitial } from "@/lib/seller/initial";
import { useSignOut } from "@/lib/seller/use-sign-out";

const menuItem = "flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm font-medium disabled:opacity-50";

/** "For sellers", or for a signed-in seller a round button with a menu. Asked in the browser so public pages stay static. */
export function AccountMenu() {
  const { data } = authClient.useSession();
  const user = data?.user;

  if (!user) {
    return (
      <Link href="/seller" className="rounded-full border border-line px-3 py-2">
        For sellers
      </Link>
    );
  }
  return <SignedInMenu name={user.name} email={user.email} />;
}

function SignedInMenu({ name, email }: { name: string; email: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const { busy, error, signOut } = useSignOut();

  useEffect(() => {
    if (!open) return;
    const closeOutside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={root} className="relative ml-1">
      <button
        type="button"
        aria-label="Your account"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-display font-semibold text-on-primary"
      >
        {sellerInitial(name, email)}
      </button>
      {open && (
        <div className="absolute top-full right-0 z-20 mt-2 flex w-64 flex-col gap-1 rounded-2xl border border-line bg-card p-2 shadow-lg">
          <p className="flex flex-col px-3 py-2 text-sm font-normal text-muted">
            Signed in as
            <span className="break-all text-foreground">{email}</span>
          </p>
          <Link href="/seller" className={menuItem} onClick={() => setOpen(false)}>
            Your shop
          </Link>
          <Link href="/seller/wigs/new" className={menuItem} onClick={() => setOpen(false)}>
            Add a wig
          </Link>
          <button type="button" disabled={busy} onClick={() => void signOut()} className={menuItem}>
            {busy ? "Signing out…" : "Sign out"}
          </button>
          <p role="alert" className={`${errorText} px-3 pb-2`}>
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
