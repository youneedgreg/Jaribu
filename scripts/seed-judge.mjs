// Creates the demo seller judges sign in with, or puts it back: account, password, shop and the
// four sample wigs. Safe to run again. Wigs a judge added are listed, never deleted.
//
//   node --env-file=.env.local scripts/seed-judge.mjs          # says what it would do, writes nothing
//   node --env-file=.env.local scripts/seed-judge.mjs --live   # writes to the database and Blob store
//
// Needs JUDGE_PASSWORD and JUDGE_WHATSAPP (digits, country code first), DATABASE_URL and, with
// --live, BETTER_AUTH_SECRET and BLOB_READ_WRITE_TOKEN. The password is never printed.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { put } from "@vercel/blob";
import { betterAuth } from "better-auth";
import { hashPassword } from "better-auth/crypto";
import pg from "pg";
import { JUDGE_EMAIL, JUDGE_SHOP, JUDGE_WIGS } from "./judge-wigs.mjs";

const PHOTOS = join(import.meta.dirname, "..", "public", "wigs");
const WHATSAPP = /^[1-9][0-9]{7,14}$/;

/** The seller's user id, after creating the account or resetting its password. */
async function ensureSeller(pool, auth, password) {
  const { rows } = await pool.query(`select id from "user" where email = $1`, [JUDGE_EMAIL]);
  if (rows[0]) {
    await pool.query(`update account set password = $1 where "userId" = $2 and "providerId" = 'credential'`, [
      await hashPassword(password),
      rows[0].id,
    ]);
    return rows[0].id;
  }
  const { user } = await auth.api.signUpEmail({
    body: { email: JUDGE_EMAIL, password, name: "Jaribu judge demo" },
  });
  return user.id;
}

/** Writes everything. `upload` stores one photo in Blob under the given path. */
export async function seed({ pool, auth, upload, password, whatsapp }) {
  const ownerId = await ensureSeller(pool, auth, password);

  const { rows } = await pool.query(
    `insert into shop (owner_id, name, whatsapp, slug) values ($1, $2, $3, $4)
     on conflict (owner_id) do update
     set name = excluded.name, whatsapp = excluded.whatsapp, slug = excluded.slug, updated_at = now()
     returning id`,
    [ownerId, JUDGE_SHOP.name, whatsapp, JUDGE_SHOP.slug],
  );
  const shopId = rows[0].id;

  for (const wig of JUDGE_WIGS) {
    const path = `wigs/${wig.id}.jpg`;
    await upload(path, await readFile(join(PHOTOS, wig.file)));
    await pool.query(
      `insert into wig (id, shop_id, name, price_kes, length_in, texture, constructions, colorways, lace_shades,
         photo_path, photo_width, photo_height)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       on conflict (id) do update
       set shop_id = excluded.shop_id, name = excluded.name, price_kes = excluded.price_kes,
         length_in = excluded.length_in, texture = excluded.texture, constructions = excluded.constructions,
         colorways = excluded.colorways, lace_shades = excluded.lace_shades, photo_path = excluded.photo_path,
         photo_width = excluded.photo_width, photo_height = excluded.photo_height, updated_at = now()`,
      [wig.id, shopId, wig.name, wig.priceKes, wig.lengthIn, wig.texture, wig.constructions, wig.colorways,
        wig.laceShades, path, wig.photoWidth, wig.photoHeight],
    );
  }

  const extras = await pool.query(`select name from wig where shop_id = $1 and not (id = any($2::uuid[]))`, [
    shopId,
    JUDGE_WIGS.map((wig) => wig.id),
  ]);
  return { shopId, extraWigs: extras.rows.map((row) => row.name) };
}

/** Better Auth for the seller account only: no session is made when the account is created. */
export function sellerAuth(pool) {
  return betterAuth({
    database: pool,
    baseURL: "https://tryjaribu.vercel.app",
    emailAndPassword: { enabled: true, requireEmailVerification: false, autoSignIn: false },
    telemetry: { enabled: false },
  });
}

async function main() {
  const live = process.argv.includes("--live");
  const password = process.env.JUDGE_PASSWORD ?? "";
  const whatsapp = process.env.JUDGE_WHATSAPP ?? "";
  if (password.length < 8) throw new Error("Set JUDGE_PASSWORD (at least 8 characters).");
  if (!WHATSAPP.test(whatsapp)) throw new Error("Set JUDGE_WHATSAPP (digits, country code first).");

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL });
  try {
    if (!live) {
      const seller = await pool.query(`select id from "user" where email = $1`, [JUDGE_EMAIL]);
      const shop = await pool.query(`select owner_id from shop where slug = $1`, [JUDGE_SHOP.slug]);
      if (shop.rows[0] && shop.rows[0].owner_id !== seller.rows[0]?.id) {
        throw new Error(`Another seller already has the link /s/${JUDGE_SHOP.slug}.`);
      }
      for (const wig of JUDGE_WIGS) await readFile(join(PHOTOS, wig.file));
      console.log(`Would ${seller.rows[0] ? "reset" : "create"} seller ${JUDGE_EMAIL}.`);
      console.log(`Would ${shop.rows[0] ? "update" : "create"} shop /s/${JUDGE_SHOP.slug}.`);
      console.log(`Would save ${JUDGE_WIGS.length} wigs and upload their photos. Nothing written; add --live.`);
      return;
    }

    const upload = (path, bytes) =>
      put(path, bytes, { access: "private", contentType: "image/jpeg", addRandomSuffix: false, allowOverwrite: true });
    const { extraWigs } = await seed({ pool, auth: sellerAuth(pool), upload, password, whatsapp });
    console.log(`Saved seller ${JUDGE_EMAIL}, shop /s/${JUDGE_SHOP.slug} and ${JUDGE_WIGS.length} wigs.`);
    if (extraWigs.length > 0) console.log(`Other wigs still in the shop: ${extraWigs.join(", ")}.`);
  } finally {
    await pool.end();
  }
}

if (import.meta.main) await main();
