"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { logError } from "@/lib/http";
import { currentSeller } from "@/lib/seller/current-seller";
import { saveShop } from "@/lib/seller/shop";
import { checkShopFields, formatWhatsapp, type ShopFieldErrors, type ShopFields } from "@/lib/seller/shop-fields";

export interface ShopFormState {
  /** What the form shows: the seller's last typing, or the saved values. */
  values: ShopFields;
  errors: ShopFieldErrors;
  message?: string;
  saved?: boolean;
}

/** Saves the signed-in seller's shop from the setup form. */
export async function saveShopAction(_previous: ShopFormState, form: FormData): Promise<ShopFormState> {
  const session = await currentSeller();
  if (!session) redirect("/seller/sign-in");

  const values: ShopFields = {
    name: String(form.get("name") ?? ""),
    whatsapp: String(form.get("whatsapp") ?? ""),
    slug: String(form.get("slug") ?? ""),
  };
  const check = checkShopFields(values);
  if (!check.ok) return { values, errors: check.errors };

  try {
    if ((await saveShop(session.user.id, check.value)) === "slug-taken") {
      return { values, errors: { slug: "That link is taken. Try another." } };
    }
  } catch (error) {
    logError("seller/shop", error);
    return { values, errors: {}, message: "Your shop wasn't saved. Please try again." };
  }

  refresh();
  return { values: { ...check.value, whatsapp: formatWhatsapp(check.value.whatsapp) }, errors: {}, saved: true };
}
