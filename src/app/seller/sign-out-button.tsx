"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      className="self-start text-sm text-zinc-600 underline underline-offset-4 disabled:opacity-50 dark:text-zinc-400"
      onClick={async () => {
        setBusy(true);
        await authClient.signOut();
        router.replace("/seller/sign-in");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
