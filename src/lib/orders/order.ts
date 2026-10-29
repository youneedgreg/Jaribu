import type { Construction } from "../checks/blend";
import type { LaceShade } from "../checks/lace";
import type { Colorway } from "../shop/catalog";
import { formatKes, type Wig } from "../shop/demo";

// A WhatsApp order: what the shopper picked, checked against what the seller offers, and the
// message that opens in the seller's chat. Kept free of server-only imports so it can be tested.

/** What the shopper picked on the try-on screen. Ids are the wig's own. */
export interface OrderChoice {
  /** null: as photographed. */
  colorwayId: string | null;
  constructionId: string;
  /** null only when the wig has no lace shades. */
  laceShadeId: string | null;
}

export interface OrderSpec {
  colorway: Colorway | null;
  construction: Construction;
  lace: LaceShade | null;
}

export type OrderCheck = { ok: true; spec: OrderSpec } | { ok: false; message: string };

/** Checks the picks against the wig, with a message the shopper can act on. */
export function checkOrderChoice(wig: Wig, choice: OrderChoice): OrderCheck {
  const colorway = choice.colorwayId === null ? null : wig.colorways.find((c) => c.id === choice.colorwayId);
  if (colorway === undefined) return { ok: false, message: "This wig doesn't come in that colour." };
  const construction = wig.constructions.find((c) => c.id === choice.constructionId);
  if (!construction) return { ok: false, message: "Pick how you'd like the wig made." };
  if (wig.laceShades.length === 0) {
    if (choice.laceShadeId !== null) return { ok: false, message: "This wig has no lace to pick." };
    return { ok: true, spec: { colorway, construction, lace: null } };
  }
  const lace = wig.laceShades.find((l) => l.id === choice.laceShadeId);
  if (!lace) return { ok: false, message: "Pick a lace shade." };
  return { ok: true, spec: { colorway, construction, lace } };
}

/** The message that opens in the seller's WhatsApp chat. */
export function orderMessage(shopName: string, wig: Wig, spec: OrderSpec, cardUrl: string): string {
  return [
    `Hi ${shopName}, I'd like to order this wig:`,
    `${wig.name}, ${formatKes(wig.priceKes)}`,
    `Colour: ${spec.colorway ? `${spec.colorway.code} ${spec.colorway.name}` : "as in your photo"}`,
    `Made as: ${spec.construction.name}`,
    ...(spec.lace ? [`Lace: ${spec.lace.name}`] : []),
    `Length: ${wig.length}`,
    "",
    `My try-on preview (the link works for 24 hours): ${cardUrl}`,
  ].join("\n");
}

/** A wa.me link that opens a chat with this number (digits, country code first) and the text. */
export function whatsappLink(number: string, text: string): string {
  if (!/^[1-9]\d{7,14}$/.test(number)) throw new Error("Not a WhatsApp number");
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
