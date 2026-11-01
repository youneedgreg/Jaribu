import { describe, expect, it } from "vitest";
import { sellerInitial } from "./initial";

describe("sellerInitial", () => {
  it("uses the first letter of the name, in capitals", () => {
    expect(sellerInitial("wanjiru", "w@example.com")).toBe("W");
  });

  it("falls back to the email when the name is blank", () => {
    expect(sellerInitial("   ", "amina@example.com")).toBe("A");
    expect(sellerInitial(null, "amina@example.com")).toBe("A");
  });

  it("keeps a letter outside the basic alphabet whole", () => {
    expect(sellerInitial("𝒜mina", "a@example.com")).toBe("𝒜");
  });

  it("shows a question mark when there's nothing to use", () => {
    expect(sellerInitial("", "")).toBe("?");
  });
});
