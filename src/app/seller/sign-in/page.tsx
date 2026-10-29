import type { Metadata } from "next";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Seller sign-in · Jaribu", robots: { index: false } };

export default function SignInPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Seller sign-in</h1>
      <AuthForm mode="sign-in" />
    </main>
  );
}
