import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import type { OrderChoice } from "./order";

// WhatsApp orders (table `wig_order`, db/migrations/003_wig_order.sql).

export interface SavedOrder extends OrderChoice {
  id: string;
  wigId: string;
  /** Where the try-on picture is: the shopper's session and the task that made it. Null once swept. */
  sessionId: string | null;
  resultTaskId: string | null;
  createdAt: Date;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Saves an order whose picks passed checkOrderChoice. Returns its id, which is also the order card's link. */
export async function saveOrder(order: Omit<SavedOrder, "id" | "createdAt"> & { sessionId: string; resultTaskId: string }): Promise<string> {
  const id = randomUUID();
  await db().query(
    `insert into wig_order (id, wig_id, colorway, construction, lace_shade, session_id, result_task_id)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [id, order.wigId, order.colorwayId, order.constructionId, order.laceShadeId, order.sessionId, order.resultTaskId],
  );
  return id;
}

/** The order with this id, or null. */
export async function orderById(id: string): Promise<SavedOrder | null> {
  if (!UUID.test(id)) return null;
  const { rows } = await db().query<SavedOrder>(
    `select id, wig_id as "wigId", colorway as "colorwayId", construction as "constructionId",
       lace_shade as "laceShadeId", session_id as "sessionId", result_task_id as "resultTaskId", created_at as "createdAt"
     from wig_order where id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

/**
 * Forgets which session and picture an order pointed at, once it's 24 hours old. The picture was
 * made before the order, so it's older still and already past deletion. Returns how many changed.
 */
export async function clearExpiredOrderPictures(): Promise<number> {
  const { rowCount } = await db().query(
    `update wig_order set session_id = null, result_task_id = null
     where created_at < now() - interval '24 hours' and (session_id is not null or result_task_id is not null)`,
  );
  return rowCount ?? 0;
}
