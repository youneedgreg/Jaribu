import "server-only";
import { cookies } from "next/headers";
import { decodeSession, encodeSession, newSession, SESSION_COOKIE, SESSION_COOKIE_OPTIONS, type Session } from "./session";

/** The shopper's session from the cookie, or null if there's none or it has expired. */
export async function currentSession(): Promise<Session | null> {
  const store = await cookies();
  return decodeSession(store.get(SESSION_COOKIE)?.value, process.env.SESSION_SECRET);
}

/** The shopper's session, starting a new one (and setting the cookie) if needed. Route handlers only. */
export async function currentOrNewSession(): Promise<Session> {
  const existing = await currentSession();
  if (existing) return existing;
  const session = newSession();
  (await cookies()).set(SESSION_COOKIE, encodeSession(session, process.env.SESSION_SECRET), SESSION_COOKIE_OPTIONS);
  return session;
}
