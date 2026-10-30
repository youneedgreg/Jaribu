import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { RESULT_MAX_AGE_MS } from "./results/store";
import type { TaskApi } from "./youcam/apis";

// A shopper session is a random id in a signed, httpOnly cookie. There's no account and no
// database row: the id only scopes the shopper's results in Blob, and it dies after 24 hours
// like the results do.

export const SESSION_COOKIE = "jaribu_session";
export const SESSION_MAX_AGE_MS = RESULT_MAX_AGE_MS;

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
  maxAge: SESSION_MAX_AGE_MS / 1000,
} as const;

export interface Session {
  id: string;
  issuedAt: number;
}

function checkSecret(secret: string | undefined): string {
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET must be set to at least 32 characters");
  return secret;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/** A new session: 128 random bits, base64url (22 characters). */
export function newSession(now = Date.now()): Session {
  return { id: randomBytes(16).toString("base64url"), issuedAt: now };
}

/** The cookie value: `<id>.<issuedAt>.<signature>`. */
export function encodeSession(session: Session, secret: string | undefined): string {
  const payload = `${session.id}.${session.issuedAt}`;
  return `${payload}.${sign(payload, checkSecret(secret))}`;
}

/** The session in a cookie value, or null if it's forged, malformed or older than 24 hours. */
export function decodeSession(value: string | undefined, secret: string | undefined, now = Date.now()): Session | null {
  const key = checkSecret(secret);
  const match = value?.match(/^([A-Za-z0-9_-]{22})\.(\d{1,15})\.([A-Za-z0-9_-]{43})$/);
  if (!match) return null;
  const [, id, issued, signature] = match;
  const expected = Buffer.from(sign(`${id}.${issued}`, key));
  if (!timingSafeEqual(Buffer.from(signature), expected)) return null;
  const issuedAt = Number(issued);
  // A little slack for clock differences between function instances.
  if (issuedAt > now + 60_000 || now - issuedAt > SESSION_MAX_AGE_MS) return null;
  return { id, issuedAt };
}

/**
 * Ties a YouCam task to the session that started it and to its API, so nobody else can poll
 * it into theirs and a task is only ever polled where it runs.
 */
export function taskTicket(api: TaskApi, sessionId: string, taskId: string, secret: string | undefined): string {
  return sign(`task.${api}.${sessionId}.${taskId}`, checkSecret(secret));
}

export function taskTicketMatches(
  ticket: string | null | undefined,
  api: TaskApi,
  sessionId: string,
  taskId: string,
  secret: string | undefined,
): boolean {
  const expected = Buffer.from(taskTicket(api, sessionId, taskId, secret));
  const given = Buffer.from(ticket ?? "");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// A limit on what one session can start, so one visit can't use up the units. The count lives in
// a signed cookie, so it can't be edited, but clearing cookies starts over: the unit reserve in
// youcam/server.ts is what actually protects the balance. Tone and hair type are already once per session.

export const USAGE_COOKIE = "jaribu_usage";
export const SESSION_LIMITS = { hairstyle: 10, haircolor: 12 } as const;

export type LimitedApi = keyof typeof SESSION_LIMITS;
export type Usage = Record<LimitedApi, number>;

export function encodeUsage(sessionId: string, usage: Usage, secret: string | undefined): string {
  const payload = `${usage.hairstyle}.${usage.haircolor}`;
  return `${payload}.${sign(`usage.${sessionId}.${payload}`, checkSecret(secret))}`;
}

/** The session's counts, or zero if the cookie is missing, forged or from another session. */
export function decodeUsage(value: string | undefined, sessionId: string, secret: string | undefined): Usage {
  const none = { hairstyle: 0, haircolor: 0 };
  const match = value?.match(/^(\d{1,4})\.(\d{1,4})\.([A-Za-z0-9_-]{43})$/);
  if (!match) return none;
  const [, hairstyle, haircolor, signature] = match;
  const expected = Buffer.from(sign(`usage.${sessionId}.${hairstyle}.${haircolor}`, checkSecret(secret)));
  if (!timingSafeEqual(Buffer.from(signature), expected)) return none;
  return { hairstyle: Number(hairstyle), haircolor: Number(haircolor) };
}

export const countUsage = (usage: Usage, api: LimitedApi): Usage => ({ ...usage, [api]: usage[api] + 1 });
export const reachedLimit = (usage: Usage, api: LimitedApi) => usage[api] >= SESSION_LIMITS[api];

export function limitMessage(api: LimitedApi): string {
  return api === "hairstyle"
    ? `You've tried ${SESSION_LIMITS.hairstyle} wigs on this visit, which is the most we can show. Please come back tomorrow to try more.`
    : `You've tried ${SESSION_LIMITS.haircolor} colours on this visit, which is the most we can show. Please come back tomorrow to try more.`;
}
