"use client";

import { startTransition, useActionState, useState } from "react";
import { PhotoPicker } from "@/components/photo-picker";
import { card, errorText, fieldError, fieldHint as hint, fieldLabel, primaryButton, textInput as input } from "@/components/styles";
import { COLORS, CONSTRUCTIONS, LACE, TEXTURES } from "@/lib/shop/catalog";
import { LENGTH_MAX, LENGTH_MIN, NAME_MAX } from "@/lib/seller/wig-fields";
import { PHOTO_MAX_BYTES, TRYON_MAX_SIDE } from "@/lib/tryon/tryon";
import { Swatch } from "@/app/w/[wigId]/try/swatch";
import { addWigAction, type WigFormState } from "../actions";

// Floated so the title sits inside the card, not on its border.
const legend = "float-left mb-1 w-full font-medium";
const choice = "flex min-h-10 flex-wrap items-center gap-x-2 py-1";
const tick = "h-5 w-5 accent-primary";
const group = `${card} flex flex-col gap-1`;

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
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [photoProblem, setPhotoProblem] = useState<string | null>(null);
  const { values, errors } = state;

  async function choosePhoto(file: File | null) {
    setPhoto(null);
    setPhotoProblem(null);
    if (!file) return;
    try {
      setPhoto(await toWigJpeg(file));
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
        if (photo) data.set("photo", photo, "wig.jpg");
        startTransition(() => formAction(data));
      }}
    >
      <div className={`${card} flex flex-col gap-3`}>
        <PhotoPicker name="photoFile" label="Front photo" disabled={pending} onPick={(file) => void choosePhoto(file)} />
        {(photoProblem || errors.photo) && <p className={`text-sm ${fieldError}`}>{photoProblem ?? errors.photo}</p>}
        <div className={`flex flex-col gap-1 text-sm ${hint}`}>
          <p>Shoppers&apos; previews are made from this photo. A poor one can put the model&apos;s face on the shopper, so use:</p>
          <ul className="list-disc pl-5">
            <li>The wig on a person or a mannequin with a face, looking at the camera with the head straight</li>
            <li>One person only, with no hands near the face</li>
            <li>All the hair in the frame, with calm styling (no wind-blown strands)</li>
          </ul>
          <p>Then try it on yourself before you share the link.</p>
        </div>
      </div>

      <div className={`${card} flex flex-col gap-4`}>
        <label className={fieldLabel}>
          Name
          <input name="name" type="text" required maxLength={NAME_MAX} defaultValue={values.name} placeholder="Body wave 22 in" className={input} disabled={pending} />
          {errors.name && <span className={fieldError}>{errors.name}</span>}
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className={fieldLabel}>
            Price (KES)
            <input name="price" type="text" inputMode="numeric" required defaultValue={values.price} placeholder="16000" className={input} disabled={pending} />
            {errors.price && <span className={fieldError}>{errors.price}</span>}
          </label>
          <label className={fieldLabel}>
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

      <label className={fieldLabel}>
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
      </div>

      <fieldset disabled={pending} className={group}>
        <legend className={legend}>How it&apos;s made (tick all you offer)</legend>
        {Object.values(CONSTRUCTIONS).map((c) => (
          <label key={c.id} className={choice}>
            <input type="checkbox" name="constructions" value={c.id} defaultChecked={values.constructions.includes(c.id)} className={tick} />
            {c.name}
            {c.leaveOut && <span className={hint}>(some of the shopper&apos;s own hair shows)</span>}
          </label>
        ))}
        {errors.constructions && <p className={`text-sm ${fieldError}`}>{errors.constructions}</p>}
      </fieldset>

      <fieldset disabled={pending} className={group}>
        <legend className={legend}>Colours you sell it in</legend>
        {Object.values(COLORS).map((c) => (
          <label key={c.id} className={choice}>
            <input type="checkbox" name="colorways" value={c.id} defaultChecked={values.colorways.includes(c.id)} className={tick} />
            <Swatch hex={c.hex} className="h-4 w-4" />
            {c.code} · {c.name}
          </label>
        ))}
        {errors.colorways ? (
          <p className={`text-sm ${fieldError}`}>{errors.colorways}</p>
        ) : (
          <p className={`text-sm ${hint}`}>Shoppers can preview each one on their try-on.</p>
        )}
      </fieldset>

      <fieldset disabled={pending} className={group}>
        <legend className={legend}>Lace shades</legend>
        {Object.values(LACE).map((l) => (
          <label key={l.id} className={choice}>
            <input type="checkbox" name="laceShades" value={l.id} defaultChecked={values.laceShades.includes(l.id)} className={tick} />
            <Swatch hex={l.hex} className="h-4 w-4" />
            {l.name}
          </label>
        ))}
        {errors.laceShades ? (
          <p className={`text-sm ${fieldError}`}>{errors.laceShades}</p>
        ) : (
          <p className={`text-sm ${hint}`}>Leave these unticked if the wig has no lace or only clear (HD) lace.</p>
        )}
      </fieldset>

      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Adding the wig…" : "Add the wig"}
      </button>
      <p role="alert" className={errorText}>
        {state.message}
      </p>
    </form>
  );
}
