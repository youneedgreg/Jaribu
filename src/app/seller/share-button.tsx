"use client";

import { useState } from "react";

/** Opens the phone's share sheet for a link, or copies it where there's no share sheet. */
export function ShareButton({ url, title, label = "Share" }: { url: string; title: string; label?: string }) {
  const [note, setNote] = useState<string | null>(null);

  async function share() {
    setNote(null);
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        // Closing the share sheet isn't a failure.
        if ((error as Error).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setNote("Link copied.");
    } catch {
      setNote(`Copy this link: ${url}`);
    }
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => void share()} className="text-sm font-medium underline underline-offset-4">
        {label}
      </button>
      <span role="status" className="text-sm break-all text-zinc-600 dark:text-zinc-400">
        {note}
      </span>
    </span>
  );
}
