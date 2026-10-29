import "server-only";
import { randomUUID } from "node:crypto";
import { del, get, put } from "@vercel/blob";
import { db } from "@/lib/db";
import { jpegSize } from "@/lib/images/jpeg";
import { checkPhoto } from "@/lib/tryon/tryon";
import type { WigFields } from "./wig-fields";

// Sellers' wigs (table `wig`, db/migrations/002_wig.sql). Each wig's front photo is kept in the
// private Blob store under wigs/, apart from shoppers' sessions/ so the 24-hour sweep never
// touches it.

/** A wig as the seller saved it. List fields hold catalog ids. */
export interface SellerWig extends WigFields {
  id: string;
  photoWidth: number;
  photoHeight: number;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** True for ids that could be a wig's (so bad ones never reach the database). */
export const isWigId = (id: string) => UUID.test(id);

const COLUMNS = `id, name, price_kes as "priceKes", length_in as "lengthIn", texture, constructions,
  colorways, lace_shades as "laceShades", photo_width as "photoWidth", photo_height as "photoHeight"`;

/** The shop's wigs, oldest first. */
export async function wigsForShop(shopId: string): Promise<SellerWig[]> {
  const { rows } = await db().query<SellerWig>(`select ${COLUMNS} from wig where shop_id = $1 order by created_at`, [shopId]);
  return rows;
}

/** A wig and the id of the shop that sells it, or null. */
export async function wigById(wigId: string): Promise<{ wig: SellerWig; shopId: string } | null> {
  if (!isWigId(wigId)) return null;
  const { rows } = await db().query<SellerWig & { shopId: string }>(
    `select ${COLUMNS}, shop_id as "shopId" from wig where id = $1`,
    [wigId],
  );
  if (!rows[0]) return null;
  const { shopId, ...wig } = rows[0];
  return { wig, shopId };
}

/** Stores the photo and saves the wig. The photo must pass checkPhoto("wig"). Returns the wig id. */
export async function addWig(shopId: string, fields: WigFields, photo: Uint8Array): Promise<string> {
  checkPhoto("wig", photo);
  const size = jpegSize(photo)!;
  const id = randomUUID();
  const pathname = `wigs/${id}.jpg`;

  await put(pathname, Buffer.from(photo), { access: "private", contentType: "image/jpeg", addRandomSuffix: false });
  try {
    await db().query(
      `insert into wig (id, shop_id, name, price_kes, length_in, texture, constructions, colorways, lace_shades,
         photo_path, photo_width, photo_height)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [id, shopId, fields.name, fields.priceKes, fields.lengthIn, fields.texture, fields.constructions,
        fields.colorways, fields.laceShades, pathname, size.width, size.height],
    );
  } catch (error) {
    await del(pathname).catch(() => {});
    throw error;
  }
  return id;
}

/** Deletes one of the shop's wigs and its photo. False if the shop has no such wig. */
export async function deleteWig(shopId: string, wigId: string): Promise<boolean> {
  if (!isWigId(wigId)) return false;
  const { rows } = await db().query<{ photo_path: string }>(
    "delete from wig where id = $1 and shop_id = $2 returning photo_path",
    [wigId, shopId],
  );
  if (!rows[0]) return false;
  await del(rows[0].photo_path);
  return true;
}

/** The wig's photo from the Blob store, or null if there's no such wig or file. */
export async function openWigPhoto(wigId: string) {
  if (!isWigId(wigId)) return null;
  const { rows } = await db().query<{ photo_path: string }>("select photo_path from wig where id = $1", [wigId]);
  if (!rows[0]) return null;
  const found = await get(rows[0].photo_path, { access: "private" });
  return found && found.statusCode === 200 && found.stream ? found : null;
}
