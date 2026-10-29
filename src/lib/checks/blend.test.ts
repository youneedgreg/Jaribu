import { describe, expect, it } from "vitest";
import type { HairType } from "../youcam/hair-type";
import { bandGap, blend, BLEND_WITHIN_BANDS, type Construction } from "./blend";

const glueless: Construction = { id: "glueless", name: "Glueless", leaveOut: false };
const uPart: Construction = { id: "u-part", name: "U-part", leaveOut: true };

// The Day 1 readings (synthetic faces S01–S03).
const coily: HairType = { from: "4B", to: "4C", term: "Coily to Extremely Coily" };
const straight: HairType = { from: "1", to: "2A", term: "Straight to Slight Wavy" };

describe("bandGap", () => {
  it("is 0 when the ranges overlap or touch the same band", () => {
    expect(bandGap({ from: "4B", to: "4C" }, { from: "4A", to: "4B" })).toBe(0);
    expect(bandGap({ from: "1", to: "2A" }, { from: "1", to: "1" })).toBe(0);
  });

  it("counts the bands between the nearest ends, either way round", () => {
    expect(bandGap({ from: "4B", to: "4C" }, { from: "1", to: "1" })).toBe(8);
    expect(bandGap({ from: "1", to: "1" }, { from: "4B", to: "4C" })).toBe(8);
    expect(bandGap({ from: "3C", to: "4A" }, { from: "4B", to: "4C" })).toBe(1);
  });
});

describe("blend", () => {
  it("says a glueless wig covers any hair type", () => {
    expect(blend(coily, { from: "1", to: "1" }, glueless, [glueless, uPart])).toEqual({ verdict: "covers" });
  });

  it("says a leave-out wig may blend when the textures are within one band", () => {
    expect(BLEND_WITHIN_BANDS).toBe(1);
    expect(blend(coily, { from: "4A", to: "4A" }, uPart, [uPart])).toEqual({ verdict: "may_blend" });
    expect(blend(straight, { from: "1", to: "1" }, uPart, [uPart])).toEqual({ verdict: "may_blend" });
  });

  it("says a leave-out wig may show the shopper's hair, and offers the covering version", () => {
    expect(blend(coily, { from: "1", to: "1" }, uPart, [glueless, uPart])).toEqual({ verdict: "may_show", instead: glueless });
  });

  it("has nothing to offer instead when the seller only makes leave-out versions", () => {
    expect(blend(coily, { from: "2A", to: "2B" }, uPart, [uPart])).toEqual({ verdict: "may_show", instead: null });
  });
});
