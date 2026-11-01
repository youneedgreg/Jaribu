"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { textLink } from "@/components/styles";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      className={textLink}
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
