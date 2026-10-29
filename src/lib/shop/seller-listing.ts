import type { Construction } from "../checks/blend";
import type { LaceShade } from "../checks/lace";
import type { SellerShop } from "../seller/shop";
import type { SellerWig } from "../seller/wigs";
import { byId, COLORS, CONSTRUCTIONS, LACE, TEXTURES, type Colorway } from "./catalog";
import type { Shop, Wig } from "./demo";

// Sellers' shops and wigs in the same shape as the demo shop's, so the shop, wig and try-on
// pages and both checks treat them alike.

/** Catalog entries for the saved ids, skipping any the catalog no longer has. */
function entries<T extends { id: string }>(list: Record<string, T>, ids: string[]): T[] {
  return ids.map((id) => byId(list, id)).filter((item): item is T => item !== undefined);
}

/** A seller's saved wig as a listing. Null if its texture is no longer in the catalog. */
export function sellerWig(row: SellerWig): Wig | null {
  const texture = byId(TEXTURES, row.texture);
  if (!texture) return null;
  return {
    id: row.id,
    name: row.name,
    texture: texture.name,
    textureRange: texture.range,
    constructions: entries<Construction>(CONSTRUCTIONS, row.constructions),
    length: `${row.lengthIn} in`,
    priceKes: row.priceKes,
    photo: `/api/wigs/${row.id}/photo`,
    photoWidth: row.photoWidth,
    photoHeight: row.photoHeight,
    colorways: entries<Colorway>(COLORS, row.colorways),
    laceShades: entries<LaceShade>(LACE, row.laceShades),
  };
}

/** A seller's shop as a listing, with the wigs that still map. */
export function sellerShop(shop: SellerShop, wigs: SellerWig[]): Shop {
  return {
    id: shop.slug,
    name: shop.name,
    sample: false,
    whatsapp: shop.whatsapp,
    wigs: wigs.map(sellerWig).filter((wig): wig is Wig => wig !== null),
  };
}
