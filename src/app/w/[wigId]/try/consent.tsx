"use client";

import { useState } from "react";
import { card, primaryButton, sectionTitle } from "@/components/styles";

/**
 * Shown before the camera or the upload opens. The answer stays in the page's state, so it's
 * asked each time the try page opens and nothing about it is saved.
 */
export function Consent({ onAgree }: { onAgree: () => void }) {
  const [ticked, setTicked] = useState(false);

  return (
    <form
      className={`${card} flex flex-col gap-4`}
      onSubmit={(e) => {
        e.preventDefault();
        if (ticked) onAgree();
      }}
    >
      <h2 className={sectionTitle}>Before you take your photos</h2>
      <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-muted">
        <li>
          <strong className="font-medium text-foreground">YouCam makes the preview.</strong> Your front
          photo is sent to YouCam, the company whose AI makes it. Your face close-up is sent only if you check the lace
          match, and your side photos only if you check the blend.
        </li>
        <li>
          <strong className="font-medium text-foreground">YouCam keeps uploaded photos for up to 30 days.</strong>{" "}
          We can&apos;t delete them sooner.
        </li>
        <li>
          <strong className="font-medium text-foreground">We keep your previews for about 24 hours.</strong>{" "}
          Your previews and any skin-tone or hair-type readings are stored privately in the United States, then deleted.
        </li>
        <li>
          <strong className="font-medium text-foreground">Your seller sees a preview only if you order.</strong>{" "}
          They see it through a private link that stops working when the picture is deleted.
        </li>
        <li>
          <strong className="font-medium text-foreground">Jaribu uses your photos only for this try-on.</strong>{" "}
          We don&apos;t ask for your name or an account.
        </li>
      </ul>
      <label className="flex items-start gap-3 text-sm font-medium">
        <input type="checkbox" checked={ticked} onChange={(e) => setTicked(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-primary" />
        I&apos;m 18 or older, and I agree to my photos being used this way.
      </label>
      <button
        type="submit"
        disabled={!ticked}
        className={primaryButton}
      >
        Continue
      </button>
    </form>
  );
}
