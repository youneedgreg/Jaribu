import "server-only";
import { db } from "@/lib/db";
import type { WigStats } from "./stats-line";
import { isWigId } from "./wigs";

// The seller's stats: try-ons started (table `wig_tryon_count`, db/migrations/005_wig_tryon_count.sql)
// and orders (table `wig_order`) per wig.

/** Adds one try-on to a seller wig's count. Demo wigs live in code, so they aren't counted. */
export async function recordTryOn(wigId: string): Promise<void> {
  if (!isWigId(wigId)) return;
  await db().query(
    `insert into wig_tryon_count (wig_id, tryons) values ($1, 1)
     on conflict (wig_id) do update set tryons = wig_tryon_count.tryons + 1`,
    [wigId],
  );
}

/** Each of the shop's wigs' numbers, by wig id. */
export async function statsForShop(shopId: string): Promise<Map<string, WigStats>> {
  const { rows } = await db().query<WigStats & { wigId: string }>(
    `select w.id as "wigId", coalesce(c.tryons, 0) as tryons,
       (select count(*)::int from wig_order o where o.wig_id = w.id) as orders
     from wig w left join wig_tryon_count c on c.wig_id = w.id
     where w.shop_id = $1`,
    [shopId],
  );
  return new Map(rows.map(({ wigId, ...stats }) => [wigId, stats]));
}
