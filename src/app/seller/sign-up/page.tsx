import type { Metadata } from "next";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Seller sign-up · Jaribu", robots: { index: false } };

export default function SignUpPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Create a seller account</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        There&apos;s no password reset yet, so keep your password somewhere safe.
      </p>
      <AuthForm mode="sign-up" />
    </main>
  );
}
