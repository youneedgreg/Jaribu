import "server-only";
import { cookies } from "next/headers";
import {
  countUsage,
  decodeSession,
  decodeUsage,
  encodeSession,
  encodeUsage,
  newSession,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  USAGE_COOKIE,
  type LimitedApi,
  type Session,
  type Usage,
} from "./session";

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

/** How many tasks this session has started. */
export async function usageOf(session: Session): Promise<Usage> {
  return decodeUsage((await cookies()).get(USAGE_COOKIE)?.value, session.id, process.env.SESSION_SECRET);
}

/** Counts one more started task. Route handlers only. */
export async function recordUsage(session: Session, usage: Usage, api: LimitedApi): Promise<void> {
  const value = encodeUsage(session.id, countUsage(usage, api), process.env.SESSION_SECRET);
  (await cookies()).set(USAGE_COOKIE, value, SESSION_COOKIE_OPTIONS);
}
