"use client";

import { matchLace, type LaceShade } from "@/lib/checks/lace";
import { centerCrop } from "@/lib/images/crop";

/** The skin reading belongs to the photos, not the wig, so the try-on screen keeps it. */
export type ToneState =
  | { step: "idle" }
  | { step: "working"; label: string }
  | { step: "done"; skinHex: string }
  | { step: "failed"; message: string };

/** The middle of the close-up as a JPG, so the face is wide enough for Facial Color Tones. */
export async function toToneJpeg(photo: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(photo, { imageOrientation: "from-image" });
  const crop = centerCrop(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = crop.width;
  canvas.height = crop.height;
  canvas.getContext("2d")!.drawImage(bitmap, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
  bitmap.close();
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't read that photo."))), "image/jpeg", 0.92),
  );
}

const Swatch = ({ hex }: { hex: string }) => (
  <span aria-hidden className="inline-block h-5 w-5 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: hex }} />
);

/**
 * Which of the wig's lace shades is nearest the shopper's skin. The reading runs only when the
 * shopper asks (`onCheck`): it costs 20 units, once per session.
 */
export function LaceMatch({
  shades,
  hasCloseUp,
  tone,
  onCheck,
  disabled,
}: {
  shades: LaceShade[];
  hasCloseUp: boolean;
  tone: ToneState;
  onCheck: () => void;
  disabled: boolean;
}) {
  const match = tone.step === "done" ? matchLace(tone.skinHex, shades) : null;
  const muted = "text-sm text-zinc-600 dark:text-zinc-400";

  return (
    <section aria-label="Lace match" className="flex flex-col gap-2 rounded-md border border-zinc-300 p-3 dark:border-zinc-700">
      <h3 className="text-sm font-medium">Lace match</h3>

      {!hasCloseUp ? (
        <p className={muted}>The lace match needs the close-up from the guided camera. Take the photos with the camera to see it.</p>
      ) : tone.step === "idle" || tone.step === "failed" ? (
        <>
          <p className={muted}>Checks which of this wig&apos;s lace shades is nearest your skin, using your face close-up.</p>
          {tone.step === "failed" && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-400">
              {tone.message}
            </p>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={onCheck}
            className="self-start rounded-md border border-zinc-900 px-3 py-2 text-sm font-medium disabled:opacity-50 dark:border-zinc-100"
          >
            {tone.step === "failed" ? "Try the lace match again" : "Check the lace match"}
          </button>
        </>
      ) : tone.step === "working" ? (
        <p role="status" aria-live="polite" className="text-sm">
          {tone.label}
        </p>
      ) : (
        match && (
          <>
            <p className="flex items-center gap-2 text-sm">
              <Swatch hex={tone.skinHex} /> Your skin in the close-up
            </p>
            {match.verdict === "no_shades" ? (
              <p className="text-sm">This wig doesn&apos;t list its lace shades. Ask the seller which ones they have.</p>
            ) : (
              <p className="flex items-center gap-2 text-sm">
                <Swatch hex={match.shade.hex} />
                {match.verdict === "may_blend"
                  ? `${match.shade.name} may blend with your skin.`
                  : `${match.shade.name} is the nearest this wig comes in, but it may look ${match.direction} than your skin at the hairline.`}
              </p>
            )}
            <p className={muted}>
              Based on the skin colour YouCam read from your close-up. Light changes this reading, so check in daylight. Provisional:
              how close counts as a match hasn&apos;t been checked with wig wearers yet.
            </p>
          </>
        )
      )}
    </section>
  );
}
