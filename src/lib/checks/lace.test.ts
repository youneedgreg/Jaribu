import { describe, expect, it } from "vitest";
import { LACE_MAY_BLEND_WITHIN, lightness, matchLace, type LaceShade } from "./lace";

const light: LaceShade = { id: "light", name: "Light brown lace", hex: "#b98a65" };
const medium: LaceShade = { id: "medium", name: "Medium brown lace", hex: "#8d5f40" };
const dark: LaceShade = { id: "dark", name: "Dark brown lace", hex: "#5a3b2a" };

describe("lightness", () => {
  it("runs from 0 for black to 100 for white", () => {
    expect(lightness("#000000")).toBeCloseTo(0, 5);
    expect(lightness("#FFFFFF")).toBeCloseTo(100, 5);
  });

  it("reads the 26 Oct skin result as fairly deep", () => {
    expect(lightness("#614633")).toBeCloseTo(32.2, 1);
  });

  it("refuses something that isn't a colour", () => {
    expect(() => lightness("brown")).toThrow();
  });
});

describe("matchLace", () => {
  it("picks the nearest shade and says it may blend when it's close", () => {
    expect(matchLace("#614633", [light, medium, dark])).toEqual({ verdict: "may_blend", shade: dark });
  });

  it("says which way the nearest shade is off when none is close", () => {
    // Deep skin, only lighter lace on offer.
    expect(matchLace("#3a2a20", [light, medium])).toEqual({ verdict: "may_show", shade: medium, direction: "lighter" });
    // Light skin, only darker lace on offer.
    expect(matchLace("#e8c8b0", [medium, dark])).toEqual({ verdict: "may_show", shade: medium, direction: "darker" });
  });

  it("treats the provisional limit as the edge of may blend, on both sides", () => {
    const grey = (v: number) => `#${v.toString(16).padStart(2, "0").repeat(3)}`;
    const shade: LaceShade = { id: "grey", name: "Grey", hex: grey(120) };
    const target = lightness(shade.hex);
    for (let v = 0; v < 256; v++) {
      const gap = Math.abs(lightness(grey(v)) - target);
      expect(matchLace(grey(v), [shade]).verdict).toBe(gap <= LACE_MAY_BLEND_WITHIN ? "may_blend" : "may_show");
    }
  });

  it("says so when the wig lists no lace shades", () => {
    expect(matchLace("#614633", [])).toEqual({ verdict: "no_shades" });
  });
});
