import { describe, expect, it } from "vitest";
import { decodeSession, encodeSession, newSession, SESSION_MAX_AGE_MS } from "./session";

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
