import { attachDatabasePool } from "@vercel/functions";
import { Pool } from "pg";

// No `import "server-only"` here: the Better Auth CLI loads this file through
// auth.ts and can't resolve it. DATABASE_URL isn't NEXT_PUBLIC_, so a stray
// browser import still never sees it.

let pool: Pool | undefined;

/** One shared Postgres pool (Neon) per function instance. Connects on first query. */
export function db(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL, idleTimeoutMillis: 5_000 });
    // Closes idle connections before Vercel suspends the instance.
    attachDatabasePool(pool);
  }
  return pool;
}
