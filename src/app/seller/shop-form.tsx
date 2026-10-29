"use client";

import { useActionState } from "react";
import { NAME_MAX, SLUG_MAX, type ShopFields } from "@/lib/seller/shop-fields";
import { saveShopAction } from "./actions";

const input = "rounded-md border border-zinc-300 px-3 py-2 font-normal dark:border-zinc-700 dark:bg-zinc-900";
const hint = "font-normal text-zinc-600 dark:text-zinc-400";
const fieldError = "font-normal text-red-700 dark:text-red-400";
const button =
  "rounded-md bg-zinc-900 px-4 py-3 font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900";

/** Shop setup: name, WhatsApp number and link. `current` is the saved shop, if any. */
export function ShopForm({ current, linkPrefix }: { current: ShopFields | null; linkPrefix: string }) {
  const [state, formAction, pending] = useActionState(saveShopAction, {
    values: current ?? { name: "", whatsapp: "", slug: "" },
    errors: {},
  });
  const { values, errors } = state;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Shop name
        <input
          name="name"
          type="text"
          autoComplete="organization"
          required
          maxLength={NAME_MAX}
          defaultValue={values.name}
          aria-invalid={Boolean(errors.name)}
          className={input}
          disabled={pending}
        />
        {errors.name && <span className={fieldError}>{errors.name}</span>}
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
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
          className={input}
          disabled={pending}
        />
        {errors.whatsapp ? (
          <span className={fieldError}>{errors.whatsapp}</span>
        ) : (
          <span className={hint}>Shoppers&apos; orders open a WhatsApp chat with this number.</span>
        )}
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Shop link
        <span className="flex items-center gap-1">
          <span className={hint}>{linkPrefix}</span>
          <input
            name="slug"
            type="text"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={SLUG_MAX}
            defaultValue={values.slug}
            aria-invalid={Boolean(errors.slug)}
            className={`${input} min-w-0 flex-1`}
            disabled={pending}
          />
        </span>
        {errors.slug ? (
          <span className={fieldError}>{errors.slug}</span>
        ) : (
          <span className={hint}>
            {current
              ? "Changing it stops links you've already shared from working."
              : "Leave it blank to make one from your shop name."}
          </span>
        )}
      </label>
      <button type="submit" disabled={pending} className={button}>
        {pending ? "Saving…" : current ? "Save changes" : "Set up my shop"}
      </button>
      <p role="alert" className="text-sm text-red-700 dark:text-red-400">
        {state.message}
      </p>
      <p role="status" className="text-sm text-zinc-600 dark:text-zinc-400">
        {state.saved && !pending ? "Saved." : null}
      </p>
    </form>
  );
}
