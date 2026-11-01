"use client";

import { errorText, secondaryButton } from "@/components/styles";
import { useSignOut } from "@/lib/seller/use-sign-out";

export function SignOutButton() {
  const { busy, error, signOut } = useSignOut();

  return (
    <>
      <button type="button" disabled={busy} className={`${secondaryButton} self-start`} onClick={() => void signOut()}>
        {busy ? "Signing out…" : "Sign out"}
      </button>
      <p role="alert" className={errorText}>
        {error}
      </p>
    </>
  );
}
