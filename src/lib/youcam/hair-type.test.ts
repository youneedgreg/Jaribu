import { describe, expect, it } from "vitest";
import { parseHairType } from "./hair-type";

describe("parseHairType", () => {
  it("reads the upper-case form the live API returns", () => {
    expect(parseHairType({ mapping: "4B to 4C", term: "Coily to Extremely Coily" })).toEqual({
      from: "4B",
      to: "4C",
      term: "Coily to Extremely Coily",
    });
  });

  it("reads the lower-case form the docs show", () => {
    expect(parseHairType({ mapping: "1 to 2a", term: "Straight to Slight Wavy" })).toMatchObject({ from: "1", to: "2A" });
    expect(parseHairType({ mapping: "3c to 4a" })).toEqual({ from: "3C", to: "4A", term: "" });
  });

  it("rejects anything outside the documented ranges", () => {
    expect(parseHairType({ mapping: "4A to 4C" })).toBeNull(); // not neighbours
    expect(parseHairType({ mapping: "4C to 4B" })).toBeNull(); // backwards
    expect(parseHairType({ mapping: "5A to 5B" })).toBeNull();
    expect(parseHairType({ mapping: "coily" })).toBeNull();
    expect(parseHairType({})).toBeNull();
  });
});
