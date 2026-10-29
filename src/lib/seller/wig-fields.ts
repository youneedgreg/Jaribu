import { byId, COLORS, CONSTRUCTIONS, LACE, TEXTURES } from "../shop/catalog";

/** What a seller sends from the add-a-wig form, apart from the photo. */
export interface WigFieldsInput {
  name: string;
  price: string;
  length: string;
  texture: string;
  constructions: string[];
  colorways: string[];
  laceShades: string[];
}

/** Checked values, ready to save. List fields hold catalog ids. */
export interface WigFields {
  name: string;
  priceKes: number;
  lengthIn: number;
  texture: string;
  constructions: string[];
  colorways: string[];
  laceShades: string[];
}

export type WigFieldErrors = Partial<Record<keyof WigFieldsInput, string>>;

export type WigCheck = { ok: true; value: WigFields } | { ok: false; errors: WigFieldErrors };

export const NAME_MAX = 60;
export const PRICE_MIN = 100;
export const PRICE_MAX = 1_000_000;
export const LENGTH_MIN = 4;
export const LENGTH_MAX = 40;

/** A whole number from what was typed ("18,500", "KES 18 500", "18500"), or null. */
function wholeNumber(typed: string): number | null {
  const compact = typed.replace(/^\s*(kes|ksh)\.?/i, "").replace(/[\s,]/g, "");
  return /^\d{1,9}$/.test(compact) ? Number(compact) : null;
}

/** Keeps known ids once each, in catalog order; false if anything else came in. */
function pick(list: Record<string, { id: string }>, ids: string[]): string[] | false {
  if (!ids.every((id) => byId(list, id))) return false;
  return Object.values(list)
    .map((item) => item.id)
    .filter((id) => ids.includes(id));
}

/** Checks the form and returns the values to save, or a plain-words message per field. */
export function checkWigFields(input: WigFieldsInput): WigCheck {
  const errors: WigFieldErrors = {};

  const name = input.name.trim().replace(/\s+/g, " ");
  if (name.length < 2) errors.name = "Give the wig a name, like \"Body wave 22 in\".";
  else if (name.length > NAME_MAX) errors.name = `Use at most ${NAME_MAX} characters.`;

  const priceKes = wholeNumber(input.price);
  if (priceKes === null) errors.price = "Type the price in shillings, like 18500.";
  else if (priceKes < PRICE_MIN || priceKes > PRICE_MAX) {
    errors.price = `Use a price from KES ${PRICE_MIN} to KES ${PRICE_MAX.toLocaleString("en-KE")}.`;
  }

  const lengthIn = wholeNumber(input.length.replace(/\s*(in|inch|inches|")\s*$/i, ""));
  if (lengthIn === null || lengthIn < LENGTH_MIN || lengthIn > LENGTH_MAX) {
    errors.length = `Type the length in inches, from ${LENGTH_MIN} to ${LENGTH_MAX}.`;
  }

  if (!byId(TEXTURES, input.texture)) errors.texture = "Pick the texture.";

  const constructions = pick(CONSTRUCTIONS, input.constructions);
  if (!constructions || constructions.length === 0) errors.constructions = "Tick at least one way the wig is made.";

  const colorways = pick(COLORS, input.colorways);
  if (!colorways || colorways.length === 0) errors.colorways = "Tick at least one colour.";

  const laceShades = pick(LACE, input.laceShades);
  if (!laceShades) errors.laceShades = "Pick lace shades from the list.";

  if (priceKes === null || lengthIn === null || !constructions || !colorways || !laceShades || Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: { name, priceKes, lengthIn, texture: input.texture, constructions, colorways, laceShades } };
}
