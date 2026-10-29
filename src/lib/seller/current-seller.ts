import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/** The signed-in seller's session, or null. Reads request headers, so call it inside <Suspense>. */
export async function currentSeller() {
  return auth.api.getSession({ headers: await headers() });
}
