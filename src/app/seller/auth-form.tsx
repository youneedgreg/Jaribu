"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { card, errorText, fieldHint, fieldLabel, primaryButton, textInput } from "@/components/styles";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/seller/auth-errors";


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
      className={`${card} flex flex-col gap-4`}
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy) void submit(e.currentTarget);
      }}
    >
      {signingUp && (
        <label className={fieldLabel}>
          Your name
          <input name="name" type="text" autoComplete="name" required maxLength={100} className={textInput} disabled={busy} />
        </label>
      )}
      <label className={fieldLabel}>
        Email
        <input name="email" type="email" autoComplete="email" required className={textInput} disabled={busy} />
      </label>
      <label className={fieldLabel}>
        Password
        <input
          name="password"
          type="password"
          autoComplete={signingUp ? "new-password" : "current-password"}
          required
          minLength={signingUp ? 8 : undefined}
          maxLength={128}
          className={textInput}
          disabled={busy}
        />
        {signingUp && <span className={fieldHint}>At least 8 characters.</span>}
      </label>
      <button type="submit" disabled={busy} className={primaryButton}>
        {signingUp ? (busy ? "Creating your account…" : "Create account") : busy ? "Signing in…" : "Sign in"}
      </button>
      <p role="alert" className={errorText}>
        {error}
      </p>
      <p className="text-sm text-muted">
        {signingUp ? "Already selling on Jaribu? " : "New to Jaribu? "}
        <Link href={signingUp ? "/seller/sign-in" : "/seller/sign-up"} className="font-medium text-foreground underline underline-offset-4">
          {signingUp ? "Sign in" : "Create a seller account"}
        </Link>
      </p>
    </form>
  );
}
