import "server-only";
import { db } from "@/lib/db";
import type { ShopFields } from "./shop-fields";

/** A seller's saved shop (table `shop`, db/migrations/001_shop.sql). */
export interface SellerShop {
  id: string;
  name: string;
  /** Digits only, country code first. */
  whatsapp: string;
  slug: string;
}

const COLUMNS = "id, name, whatsapp, slug";

/** The shop this seller owns, or null before they set one up. */
export async function shopForOwner(ownerId: string): Promise<SellerShop | null> {
  const { rows } = await db().query<SellerShop>(`select ${COLUMNS} from shop where owner_id = $1`, [ownerId]);
  return rows[0] ?? null;
}

/** The shop with this link, or null. */
export async function shopBySlug(slug: string): Promise<SellerShop | null> {
  const { rows } = await db().query<SellerShop>(`select ${COLUMNS} from shop where slug = $1`, [slug]);
  return rows[0] ?? null;
}

/** The shop with this id, or null. */
export async function shopById(id: string): Promise<SellerShop | null> {
  const { rows } = await db().query<SellerShop>(`select ${COLUMNS} from shop where id = $1`, [id]);
  return rows[0] ?? null;
}

/**
 * Creates the seller's shop, or updates it if they have one. Takes values that passed
 * checkShopFields. Returns "slug-taken" when another shop already has that link.
 */
export async function saveShop(ownerId: string, fields: ShopFields): Promise<"saved" | "slug-taken"> {
  try {
    await db().query(
      `insert into shop (owner_id, name, whatsapp, slug) values ($1, $2, $3, $4)
       on conflict (owner_id) do update
       set name = excluded.name, whatsapp = excluded.whatsapp, slug = excluded.slug, updated_at = now()`,
      [ownerId, fields.name, fields.whatsapp, fields.slug],
    );
    return "saved";
  } catch (error) {
    const e = error as { code?: string; constraint?: string };
    if (e.code === "23505" && e.constraint === "shop_slug_key") return "slug-taken";
    throw error;
  }
}
