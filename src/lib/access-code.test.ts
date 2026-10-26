import { describe, expect, it } from "vitest";
import { accessCodeMatches } from "./access-code";

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
