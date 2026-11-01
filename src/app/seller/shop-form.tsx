"use client";

import { useActionState } from "react";
import { errorText, fieldError, fieldHint, fieldLabel, primaryButton, textInput } from "@/components/styles";
import { NAME_MAX, SLUG_MAX, type ShopFields } from "@/lib/seller/shop-fields";
import { saveShopAction } from "./actions";


/** Shop setup: name, WhatsApp number and link. `current` is the saved shop, if any. */
export function ShopForm({ current, linkPrefix }: { current: ShopFields | null; linkPrefix: string }) {
  const [state, formAction, pending] = useActionState(saveShopAction, {
    values: current ?? { name: "", whatsapp: "", slug: "" },
    errors: {},
  });
  const { values, errors } = state;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <label className={fieldLabel}>
        Shop name
        <input
          name="name"
          type="text"
          autoComplete="organization"
          required
          maxLength={NAME_MAX}
          defaultValue={values.name}
          aria-invalid={Boolean(errors.name)}
          className={textInput}
          disabled={pending}
        />
        {errors.name && <span className={fieldError}>{errors.name}</span>}
      </label>
      <label className={fieldLabel}>
        WhatsApp number for orders
        <input
          name="whatsapp"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          placeholder="0712 345 678"
          defaultValue={values.whatsapp}
          aria-invalid={Boolean(errors.whatsapp)}
          className={textInput}
          disabled={pending}
        />
        {errors.whatsapp ? (
          <span className={fieldError}>{errors.whatsapp}</span>
        ) : (
          <span className={fieldHint}>Shoppers&apos; orders open a WhatsApp chat with this number.</span>
        )}
      </label>
      <label className={fieldLabel}>
        Shop link
        <span className="flex flex-col gap-1">
          <span className={`${fieldHint} break-all`}>{linkPrefix}</span>
          <input
            name="slug"
            type="text"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={SLUG_MAX}
            defaultValue={values.slug}
            aria-invalid={Boolean(errors.slug)}
            className={textInput}
            disabled={pending}
          />
        </span>
        {errors.slug ? (
          <span className={fieldError}>{errors.slug}</span>
        ) : (
          <span className={fieldHint}>
            {current
              ? "Changing it stops links you've already shared from working."
              : "Leave it blank to make one from your shop name."}
          </span>
        )}
      </label>
      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Saving…" : current ? "Save changes" : "Set up my shop"}
      </button>
      <p role="alert" className={errorText}>
        {state.message}
      </p>
      <p role="status" className="text-sm text-muted empty:hidden">
        {state.saved && !pending ? "Saved." : null}
      </p>
    </form>
  );
}
