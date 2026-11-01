"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

const FAILED = "We couldn't sign you out. Check your connection and try again.";

/** Signs the seller out and goes to sign-in. On failure they stay put and see why. */
export function useSignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    setBusy(true);
    setError(null);
    try {
      const { error } = await authClient.signOut();
      if (error) throw error;
    } catch {
      setError(FAILED);
      setBusy(false);
      return;
    }
    router.replace("/seller/sign-in");
    router.refresh();
  }

  return { busy, error, signOut };
}
