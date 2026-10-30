"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * Shown before the camera or the upload opens. The answer stays in the page's state, so it's
 * asked each time the try page opens and nothing about it is saved.
 */
export function Consent({ wigHref, onAgree }: { wigHref: string; onAgree: () => void }) {
  const [ticked, setTicked] = useState(false);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (ticked) onAgree();
      }}
    >
      <h2 className="text-lg font-semibold">Before you take your photos</h2>
      <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
        <li>
          <strong className="font-medium text-zinc-900 dark:text-zinc-100">YouCam makes the preview.</strong> Your front
          photo is sent to YouCam, the company whose AI makes it. Your face close-up is sent only if you check the lace
          match, and your side photos only if you check the blend.
        </li>
        <li>
          <strong className="font-medium text-zinc-900 dark:text-zinc-100">YouCam keeps uploaded photos for up to 30 days.</strong>{" "}
          We can&apos;t delete them sooner.
        </li>
        <li>
          <strong className="font-medium text-zinc-900 dark:text-zinc-100">We keep your previews for about 24 hours.</strong>{" "}
          Your previews and any skin-tone or hair-type readings are stored privately in the United States, then deleted.
        </li>
        <li>
          <strong className="font-medium text-zinc-900 dark:text-zinc-100">Your seller sees a preview only if you order.</strong>{" "}
          They see it through a private link that stops working when the picture is deleted.
        </li>
        <li>
          <strong className="font-medium text-zinc-900 dark:text-zinc-100">Jaribu uses your photos only for this try-on.</strong>{" "}
          We don&apos;t ask for your name or an account.
        </li>
      </ul>
      <label className="flex items-start gap-3 text-sm font-medium">
        <input type="checkbox" checked={ticked} onChange={(e) => setTicked(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0" />
        I&apos;m 18 or older, and I agree to my photos being used this way.
      </label>
      <button
        type="submit"
        disabled={!ticked}
        className="rounded-md bg-zinc-900 px-4 py-3 font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        Continue
      </button>
      <Link href={wigHref} className="self-start text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400">
        Back to the wig
      </Link>
    </form>
  );
}
