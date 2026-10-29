"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { COLORS, CONSTRUCTIONS, LACE, TEXTURES } from "@/lib/shop/catalog";
import { LENGTH_MAX, LENGTH_MIN, NAME_MAX } from "@/lib/seller/wig-fields";
import { PHOTO_MAX_BYTES, TRYON_MAX_SIDE } from "@/lib/tryon/tryon";
import { addWigAction, type WigFormState } from "../actions";

const input = "rounded-md border border-zinc-300 px-3 py-2 font-normal dark:border-zinc-700 dark:bg-zinc-900";
const hint = "font-normal text-zinc-600 dark:text-zinc-400";
const fieldError = "font-normal text-red-700 dark:text-red-400";
const legend = "mb-1 text-sm font-medium";
const choice = "flex items-center gap-2 py-1 text-sm";
const button =
  "rounded-md bg-zinc-900 px-4 py-3 font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900";

interface Photo {
  blob: Blob;
  url: string;
}

/** Shrinks a photo to a JPG YouCam takes as a try-on reference: long side ≤ 1024 px, upright, under 2 MB. */
async function toWigJpeg(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, TRYON_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of [0.9, 0.8, 0.7]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && blob.size <= PHOTO_MAX_BYTES) return blob;
  }
  throw new Error("too large");
}

const empty: WigFormState = {
  values: { name: "", price: "", length: "", texture: "", constructions: [], colorways: [], laceShades: [] },
  errors: {},
};

/** The add-a-wig form. The photo is shrunk in the browser, then sent with the rest. */
export function WigForm() {
  const [state, formAction, pending] = useActionState(addWigAction, empty);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [photoProblem, setPhotoProblem] = useState<string | null>(null);
  const { values, errors } = state;

  useEffect(() => () => (photo ? URL.revokeObjectURL(photo.url) : undefined), [photo]);

  async function choosePhoto(file: File | undefined) {
    setPhoto(null);
    setPhotoProblem(null);
    if (!file) return;
    try {
      const blob = await toWigJpeg(file);
      setPhoto({ blob, url: URL.createObjectURL(blob) });
    } catch {
      setPhotoProblem("We couldn't read that photo. Try a JPG or PNG from your gallery.");
    }
  }

  return (
    <form
      className="flex flex-col gap-6"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (pending) return;
        const data = new FormData(e.currentTarget);
        data.delete("photoFile");
        if (photo) data.set("photo", photo.blob, "wig.jpg");
        startTransition(() => formAction(data));
      }}
    >
      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Front photo
          <input
            name="photoFile"
            type="file"
            accept="image/*"
            className="text-sm font-normal"
            disabled={pending}
            onChange={(e) => void choosePhoto(e.currentTarget.files?.[0])}
          />
          {photoProblem || errors.photo ? (
            <span className={fieldError}>{photoProblem ?? errors.photo}</span>
          ) : (
            <span className={hint}>
              The wig from the front, on a head or a mannequin, with all of it in the frame and calm styling (no
              wind-blown strands). Shoppers&apos; previews are made from this photo.
            </span>
          )}
        </label>
        {photo && (
          // A local preview of the shrunk photo; next/image can't show blob: URLs.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.url} alt="The wig photo you picked" className="max-h-64 self-start rounded-md object-contain" />
        )}
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Name
        <input name="name" type="text" required maxLength={NAME_MAX} defaultValue={values.name} placeholder="Body wave 22 in" className={input} disabled={pending} />
        {errors.name && <span className={fieldError}>{errors.name}</span>}
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Price (KES)
          <input name="price" type="text" inputMode="numeric" required defaultValue={values.price} placeholder="16000" className={input} disabled={pending} />
          {errors.price && <span className={fieldError}>{errors.price}</span>}
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Length (inches)
          <input
            name="length"
            type="text"
            inputMode="numeric"
            required
            defaultValue={values.length}
            placeholder={`${LENGTH_MIN}–${LENGTH_MAX}`}
            className={input}
            disabled={pending}
          />
          {errors.length && <span className={fieldError}>{errors.length}</span>}
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Texture
        <select name="texture" required defaultValue={values.texture} className={input} disabled={pending}>
          <option value="" disabled>
            Pick one
          </option>
          {Object.values(TEXTURES).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        {errors.texture ? (
          <span className={fieldError}>{errors.texture}</span>
        ) : (
          <span className={hint}>The blend check compares it with the shopper&apos;s own hair.</span>
        )}
      </label>

      <fieldset disabled={pending}>
        <legend className={legend}>How it&apos;s made (tick all you offer)</legend>
        {Object.values(CONSTRUCTIONS).map((c) => (
          <label key={c.id} className={choice}>
            <input type="checkbox" name="constructions" value={c.id} defaultChecked={values.constructions.includes(c.id)} />
            {c.name}
            {c.leaveOut && <span className={hint}>(some of the shopper&apos;s own hair shows)</span>}
          </label>
        ))}
        {errors.constructions && <p className={`text-sm ${fieldError}`}>{errors.constructions}</p>}
      </fieldset>

      <fieldset disabled={pending}>
        <legend className={legend}>Colours you sell it in</legend>
        {Object.values(COLORS).map((c) => (
          <label key={c.id} className={choice}>
            <input type="checkbox" name="colorways" value={c.id} defaultChecked={values.colorways.includes(c.id)} />
            <span aria-hidden className="size-4 rounded-full border border-zinc-300 dark:border-zinc-700" style={{ backgroundColor: c.hex }} />
            {c.code} · {c.name}
          </label>
        ))}
        {errors.colorways ? (
          <p className={`text-sm ${fieldError}`}>{errors.colorways}</p>
        ) : (
          <p className={`text-sm ${hint}`}>Shoppers can preview each one on their try-on.</p>
        )}
      </fieldset>

      <fieldset disabled={pending}>
        <legend className={legend}>Lace shades</legend>
        {Object.values(LACE).map((l) => (
          <label key={l.id} className={choice}>
            <input type="checkbox" name="laceShades" value={l.id} defaultChecked={values.laceShades.includes(l.id)} />
            <span aria-hidden className="size-4 rounded-full border border-zinc-300 dark:border-zinc-700" style={{ backgroundColor: l.hex }} />
            {l.name}
          </label>
        ))}
        {errors.laceShades ? (
          <p className={`text-sm ${fieldError}`}>{errors.laceShades}</p>
        ) : (
          <p className={`text-sm ${hint}`}>Leave these unticked if the wig has no lace or only clear (HD) lace.</p>
        )}
      </fieldset>

      <button type="submit" disabled={pending} className={button}>
        {pending ? "Adding the wig…" : "Add the wig"}
      </button>
      <p role="alert" className="text-sm text-red-700 dark:text-red-400">
        {state.message}
      </p>
    </form>
  );
}
