import { describe, expect, it } from "vitest";
import {
  countUsage,
  decodeSession,
  decodeUsage,
  encodeSession,
  encodeUsage,
  limitMessage,
  newSession,
  reachedLimit,
  SESSION_LIMITS,
  SESSION_MAX_AGE_MS,
  taskTicket,
  taskTicketMatches,
} from "./session";

const SECRET = "test-secret-that-is-at-least-32-characters";

describe("session cookie", () => {
  it("round-trips a new session", () => {
    const session = newSession(1_000);
    expect(session.id).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(decodeSession(encodeSession(session, SECRET), SECRET, 2_000)).toEqual(session);
  });

  it("gives every session a different id", () => {
    const ids = new Set(Array.from({ length: 100 }, () => newSession().id));
    expect(ids.size).toBe(100);
  });

  it("rejects a cookie signed with another secret", () => {
    const value = encodeSession(newSession(0), "another-secret-that-is-32-characters-long");
    expect(decodeSession(value, SECRET, 0)).toBeNull();
  });

  it("rejects a cookie whose id or time was changed", () => {
    const value = encodeSession(newSession(0), SECRET);
    const [id, issued, sig] = value.split(".");
    const otherId = newSession(0).id;
    expect(decodeSession(`${otherId}.${issued}.${sig}`, SECRET, 0)).toBeNull();
    expect(decodeSession(`${id}.${Number(issued) + 1}.${sig}`, SECRET, 0)).toBeNull();
  });

  it.each([undefined, "", "garbage", "a.b.c", "../x.1.y"])("rejects %j", (value) => {
    expect(decodeSession(value, SECRET, 0)).toBeNull();
  });

  it("expires after 24 hours", () => {
    const value = encodeSession(newSession(0), SECRET);
    expect(decodeSession(value, SECRET, SESSION_MAX_AGE_MS)).not.toBeNull();
    expect(decodeSession(value, SECRET, SESSION_MAX_AGE_MS + 1)).toBeNull();
  });

  it("rejects a session issued in the future", () => {
    const value = encodeSession(newSession(10 * 60_000), SECRET);
    expect(decodeSession(value, SECRET, 0)).toBeNull();
  });

  it("refuses to work without a long enough secret", () => {
    expect(() => encodeSession(newSession(), undefined)).toThrow("SESSION_SECRET");
    expect(() => decodeSession("x", "short", 0)).toThrow("SESSION_SECRET");
  });
});

describe("task ticket", () => {
  it("matches only the session and task it was made for", () => {
    const ticket = taskTicket("hairstyle", "session-a", "task-1", SECRET);
    expect(taskTicketMatches(ticket, "hairstyle", "session-a", "task-1", SECRET)).toBe(true);
    expect(taskTicketMatches(ticket, "hairstyle", "session-b", "task-1", SECRET)).toBe(false);
    expect(taskTicketMatches(ticket, "hairstyle", "session-a", "task-2", SECRET)).toBe(false);
  });

  it("matches only the API it was made for", () => {
    const ticket = taskTicket("haircolor", "session-a", "task-1", SECRET);
    expect(taskTicketMatches(ticket, "haircolor", "session-a", "task-1", SECRET)).toBe(true);
    expect(taskTicketMatches(ticket, "hairstyle", "session-a", "task-1", SECRET)).toBe(false);
  });

  it.each([null, undefined, "", "short"])("rejects %j", (ticket) => {
    expect(taskTicketMatches(ticket, "hairstyle", "session-a", "task-1", SECRET)).toBe(false);
  });
});

describe("session limits", () => {
  const ID = "a".repeat(22);
  const none = { hairstyle: 0, haircolor: 0 };

  it("round-trips the counts for the same session", () => {
    const usage = countUsage(countUsage(none, "hairstyle"), "haircolor");
    expect(decodeUsage(encodeUsage(ID, usage, SECRET), ID, SECRET)).toEqual({ hairstyle: 1, haircolor: 1 });
  });

  it("starts from zero without a cookie, or with a forged or edited one", () => {
    const value = encodeUsage(ID, { hairstyle: 9, haircolor: 2 }, SECRET);
    expect(decodeUsage(undefined, ID, SECRET)).toEqual(none);
    expect(decodeUsage("junk", ID, SECRET)).toEqual(none);
    expect(decodeUsage(value.replace(/^9/, "1"), ID, SECRET)).toEqual(none);
    expect(decodeUsage(encodeUsage(ID, { hairstyle: 9, haircolor: 2 }, "another-secret-that-is-at-least-32-chars"), ID, SECRET)).toEqual(none);
  });

  it("doesn't carry counts over to another session", () => {
    expect(decodeUsage(encodeUsage(ID, { hairstyle: 9, haircolor: 2 }, SECRET), "b".repeat(22), SECRET)).toEqual(none);
  });

  it("stops at each api's limit", () => {
    expect(reachedLimit({ hairstyle: SESSION_LIMITS.hairstyle - 1, haircolor: 0 }, "hairstyle")).toBe(false);
    expect(reachedLimit({ hairstyle: SESSION_LIMITS.hairstyle, haircolor: 0 }, "hairstyle")).toBe(true);
    expect(reachedLimit({ hairstyle: SESSION_LIMITS.hairstyle, haircolor: 0 }, "haircolor")).toBe(false);
    expect(reachedLimit({ hairstyle: 0, haircolor: SESSION_LIMITS.haircolor }, "haircolor")).toBe(true);
  });

  it("says in plain words what happened and what to do", () => {
    expect(limitMessage("hairstyle")).toContain("come back tomorrow");
    expect(limitMessage("haircolor")).toContain("colours");
  });
});
