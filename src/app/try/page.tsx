import type { Metadata } from "next";
import { TryOnTest } from "./try-on-test";

export const metadata: Metadata = {
  title: "Try-on test · Jaribu",
  robots: { index: false, follow: false },
};

// A bare page for testing the try-on routes end to end. The real capture and try-on screens
// replace it in step D.
export default function TryPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Try-on test</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          For testing only. Use photos of people who agreed to this. Photos are sent to YouCam to make the preview; the result is
          kept for 24 hours.
        </p>
      </header>
      <TryOnTest />
    </main>
  );
}
