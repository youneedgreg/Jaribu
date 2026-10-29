"use client";

import { blend, type Construction, type TextureRange } from "@/lib/checks/blend";
import { fitWithin, HAIR_MAX_SIDE } from "@/lib/images/crop";
import type { HairShots } from "@/lib/camera-kit/camera-kit";
import type { HairType } from "@/lib/youcam/hair-type";

/** The hair reading belongs to the photos, not the wig, so the try-on screen keeps it. */
export type HairState =
  | { step: "idle" }
  | { step: "working"; label: string }
  /** `earlier`: read from the session's first photos, not the current ones. */
  | { step: "done"; hair: HairType; earlier: boolean }
  | { step: "failed"; message: string };

/** One photo as a JPG of at most 1080 px, the most Hair Type Detection analyses. */
async function toHairJpeg(photo: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(photo, { imageOrientation: "from-image" });
  const size = fitWithin(bitmap.width, bitmap.height, HAIR_MAX_SIDE);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't read that photo."))), "image/jpeg", 0.92),
  );
}

/** The three camera photos, shrunk the same way so they stay the same size. */
export async function toHairJpegs(shots: HairShots): Promise<{ front: Blob; right: Blob; left: Blob }> {
  const [front, right, left] = await Promise.all([shots.front, shots.right, shots.left].map((s) => toHairJpeg(s.image)));
  return { front, right, left };
}

const range = (r: TextureRange) => (r.from === r.to ? r.from : `${r.from} to ${r.to}`);

/**
 * Whether this wig, in each way the seller builds it, may blend with the shopper's own hair.
 * The reading runs only when the shopper asks (`onCheck`): 2 units, once per session.
 */
export function BlendCheck({
  texture,
  textureRange,
  constructions,
  hasPhotos,
  hair,
  onCheck,
  disabled,
}: {
  texture: string;
  textureRange: TextureRange;
  constructions: Construction[];
  hasPhotos: boolean;
  hair: HairState;
  onCheck: () => void;
  disabled: boolean;
}) {
  const muted = "text-sm text-zinc-600 dark:text-zinc-400";

  return (
    <section aria-label="Blend check" className="flex flex-col gap-2 rounded-md border border-zinc-300 p-3 dark:border-zinc-700">
      <h3 className="text-sm font-medium">Blend check</h3>

      {!hasPhotos ? (
        <p className={muted}>The blend check needs the three photos from the guided camera. Take the photos with the camera to see it.</p>
      ) : hair.step === "idle" || hair.step === "failed" ? (
        <>
          <p className={muted}>Checks whether this wig may blend with your own hair, using your three photos.</p>
          {hair.step === "failed" && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-400">
              {hair.message}
            </p>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={onCheck}
            className="self-start rounded-md border border-zinc-900 px-3 py-2 text-sm font-medium disabled:opacity-50 dark:border-zinc-100"
          >
            {hair.step === "failed" ? "Try the blend check again" : "Check the blend"}
          </button>
        </>
      ) : hair.step === "working" ? (
        <p role="status" aria-live="polite" className="text-sm">
          {hair.label}
        </p>
      ) : (
        <>
          <p className="text-sm">
            {hair.earlier ? "Your hair in your first photos reads as type" : "Your hair reads as type"} {range(hair.hair)}
            {hair.hair.term && ` (${hair.hair.term})`}. This wig is {texture.toLowerCase()} (type {range(textureRange)}).
          </p>
          {hair.earlier && <p className={muted}>We read hair type once every 24 hours, so this comes from your first photos, not your new ones.</p>}
          <ul className="flex flex-col gap-1 text-sm">
            {constructions.map((c) => {
              const v = blend(hair.hair, textureRange, c, constructions);
              return (
                <li key={c.id}>
                  <span className="font-medium">{c.name}:</span>{" "}
                  {v.verdict === "covers"
                    ? "covers all your own hair, so your hair type doesn't change how it blends."
                    : v.verdict === "may_blend"
                      ? "your own hair shows at the front, and it's close to this wig's texture, so it may blend."
                      : `your own hair shows at the front and may not blend with this texture.${v.instead ? ` The ${v.instead.name.toLowerCase()} version covers your hair instead.` : ""}`}
                </li>
              );
            })}
          </ul>
          <p className={muted}>
            Based on the hair type YouCam read from your three photos. It reads your hair as it is in the photos, so braids, cornrows or a
            wig cap can read wrong. Provisional: how close counts as a blend hasn&apos;t been checked with wig wearers yet.
          </p>
        </>
      )}
    </section>
  );
}
