import { describe, expect, it } from "vitest";
import { ACCESS_MAX_AGE_MS, accessCodeMatches, accessPassValid, issueAccessPass } from "./access-code";

describe("access code", () => {
  it("matches only the exact code", () => {
    expect(accessCodeMatches("letmein", "letmein")).toBe(true);
    expect(accessCodeMatches("letmein ", "letmein")).toBe(false);
    expect(accessCodeMatches("LETMEIN", "letmein")).toBe(false);
  });

  it("lets nobody in when no code is set", () => {
    expect(accessCodeMatches("", undefined)).toBe(false);
    expect(accessCodeMatches("anything", undefined)).toBe(false);
    expect(accessCodeMatches("", "")).toBe(false);
  });

  it("rejects a missing code", () => {
    expect(accessCodeMatches(null, "letmein")).toBe(false);
    expect(accessCodeMatches(undefined, "letmein")).toBe(false);
  });
});

describe("access pass", () => {
  const SECRET = "test-secret-that-is-at-least-32-characters";

  it("is valid for 24 hours with the same code", () => {
    const pass = issueAccessPass("letmein", SECRET, 0);
    expect(accessPassValid(pass, "letmein", SECRET, ACCESS_MAX_AGE_MS)).toBe(true);
    expect(accessPassValid(pass, "letmein", SECRET, ACCESS_MAX_AGE_MS + 1)).toBe(false);
  });

  it("stops working when the code changes", () => {
    const pass = issueAccessPass("letmein", SECRET, 0);
    expect(accessPassValid(pass, "new-code", SECRET, 0)).toBe(false);
  });

  it("rejects a pass signed with another secret, or with its time changed", () => {
    const pass = issueAccessPass("letmein", "another-secret-that-is-32-characters-long", 0);
    expect(accessPassValid(pass, "letmein", SECRET, 0)).toBe(false);
    const [, sig] = issueAccessPass("letmein", SECRET, 0).split(".");
    expect(accessPassValid(`1.${sig}`, "letmein", SECRET, 0)).toBe(false);
  });

  it("rejects one issued in the future", () => {
    expect(accessPassValid(issueAccessPass("letmein", SECRET, 10 * 60_000), "letmein", SECRET, 0)).toBe(false);
  });

  it.each([undefined, "", "garbage", "1.short"])("rejects %j", (value) => {
    expect(accessPassValid(value, "letmein", SECRET, 0)).toBe(false);
  });

  it("lets nobody in when no code or secret is set", () => {
    const pass = issueAccessPass("letmein", SECRET, 0);
    expect(accessPassValid(pass, undefined, SECRET, 0)).toBe(false);
    expect(accessPassValid(pass, "letmein", undefined, 0)).toBe(false);
    expect(() => issueAccessPass(undefined, SECRET)).toThrow("TRYON_ACCESS_CODE");
  });
});
