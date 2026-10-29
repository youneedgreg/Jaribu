"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/seller/auth-errors";

const input = "rounded-md border border-zinc-300 px-3 py-2 font-normal dark:border-zinc-700 dark:bg-zinc-900";
const button =
  "rounded-md bg-zinc-900 px-4 py-3 font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900";

/** Seller sign-up or sign-in with email and password; goes to /seller when it works. */
export function AuthForm({ mode }: { mode: "sign-up" | "sign-in" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signingUp = mode === "sign-up";

  async function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    setBusy(true);
    setError(null);
    const { error } = signingUp
      ? await authClient.signUp.email({ name: String(data.get("name") ?? "").trim(), email, password })
      : await authClient.signIn.email({ email, password });
    if (error) {
      setError(authErrorMessage(error));
      setBusy(false);
      return;
    }
    router.replace("/seller");
    router.refresh();
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy) void submit(e.currentTarget);
      }}
    >
      {signingUp && (
        <label className="flex flex-col gap-1 text-sm font-medium">
          Your name
          <input name="name" type="text" autoComplete="name" required maxLength={100} className={input} disabled={busy} />
        </label>
      )}
      <label className="flex flex-col gap-1 text-sm font-medium">
        Email
        <input name="email" type="email" autoComplete="email" required className={input} disabled={busy} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Password
        <input
          name="password"
          type="password"
          autoComplete={signingUp ? "new-password" : "current-password"}
          required
          minLength={signingUp ? 8 : undefined}
          maxLength={128}
          className={input}
          disabled={busy}
        />
        {signingUp && <span className="font-normal text-zinc-600 dark:text-zinc-400">At least 8 characters.</span>}
      </label>
      <button type="submit" disabled={busy} className={button}>
        {signingUp ? (busy ? "Creating your account…" : "Create account") : busy ? "Signing in…" : "Sign in"}
      </button>
      <p role="alert" className="text-sm text-red-700 dark:text-red-400">
        {error}
      </p>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {signingUp ? "Already selling on Jaribu? " : "New to Jaribu? "}
        <Link href={signingUp ? "/seller/sign-in" : "/seller/sign-up"} className="underline underline-offset-4">
          {signingUp ? "Sign in" : "Create a seller account"}
        </Link>
      </p>
    </form>
  );
}
