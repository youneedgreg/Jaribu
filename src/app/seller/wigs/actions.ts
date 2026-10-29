"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { logError } from "@/lib/http";
import { currentSeller } from "@/lib/seller/current-seller";
import { shopForOwner } from "@/lib/seller/shop";
import { checkWigFields, type WigFieldErrors, type WigFieldsInput } from "@/lib/seller/wig-fields";
import { addWig, deleteWig } from "@/lib/seller/wigs";
import { checkPhoto, PhotoError } from "@/lib/tryon/tryon";

export interface WigFormState {
  /** The seller's last typing, so a refused form keeps it. The photo stays in the browser. */
  values: WigFieldsInput;
  errors: WigFieldErrors & { photo?: string };
  message?: string;
}

/** The signed-in seller's shop; sends them to sign in or set it up first. */
async function sellerShop() {
  const session = await currentSeller();
  if (!session) redirect("/seller/sign-in");
  const shop = await shopForOwner(session.user.id);
  if (!shop) redirect("/seller");
  return shop;
}

const texts = (form: FormData, name: string) => form.getAll(name).filter((v): v is string => typeof v === "string");

/** Adds a wig from the add-a-wig form, then goes back to the seller page. */
export async function addWigAction(_previous: WigFormState, form: FormData): Promise<WigFormState> {
  const shop = await sellerShop();

  const values: WigFieldsInput = {
    name: String(form.get("name") ?? ""),
    price: String(form.get("price") ?? ""),
    length: String(form.get("length") ?? ""),
    texture: String(form.get("texture") ?? ""),
    constructions: texts(form, "constructions"),
    colorways: texts(form, "colorways"),
    laceShades: texts(form, "laceShades"),
  };
  const check = checkWigFields(values);
  const errors: WigFormState["errors"] = check.ok ? {} : { ...check.errors };

  const file = form.get("photo");
  const photo = file instanceof File ? new Uint8Array(await file.arrayBuffer()) : new Uint8Array();
  try {
    checkPhoto("wig", photo);
  } catch (error) {
    if (!(error instanceof PhotoError)) throw error;
    errors.photo = photo.byteLength === 0 ? "Add a photo of the wig." : error.message;
  }
  if (!check.ok || errors.photo) return { values, errors };

  try {
    await addWig(shop.id, check.value, photo);
  } catch (error) {
    logError("seller/add-wig", error);
    return { values, errors: {}, message: "The wig wasn't saved. Please try again." };
  }
  redirect("/seller");
}

/** Deletes one of the seller's wigs and its photo. */
export async function deleteWigAction(form: FormData): Promise<void> {
  const shop = await sellerShop();
  try {
    await deleteWig(shop.id, String(form.get("wigId") ?? ""));
  } catch (error) {
    logError("seller/delete-wig", error);
  }
  refresh();
}
