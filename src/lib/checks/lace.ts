// The lace match: which of the seller's lace shades is nearest the shopper's skin, by lightness.
// Lightness is CIELAB L* (0 black, 100 white), worked out from the skin colour YouCam read.
// PROVISIONAL: how close counts as "may blend" is our guess until wig wearers tell us which
// shades they actually wear (roadmap rule: cut-offs come from testers). The screen says so.

/** A lace shade a wig is offered in. `hex` is roughly how the lace looks over skin. */
export interface LaceShade {
  id: string;
  name: string;
  hex: string;
}

/** Provisional: within this much lightness, a shade may blend. Not checked with wig wearers. */
export const LACE_MAY_BLEND_WITHIN = 8;

const channel = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

/** CIELAB L* of an sRGB "#rrggbb" colour, D65 white. */
export function lightness(hex: string): number {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) throw new Error(`Not a colour: ${hex}`);
  const [r, g, b] = m.slice(1).map((h) => channel(parseInt(h, 16)));
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const f = y > 216 / 24389 ? Math.cbrt(y) : (24389 / 27 * y + 16) / 116;
  return 116 * f - 16;
}

export type LaceMatch =
  | { verdict: "may_blend"; shade: LaceShade }
  /** The nearest shade still looks `direction` than the skin. */
  | { verdict: "may_show"; shade: LaceShade; direction: "lighter" | "darker" }
  | { verdict: "no_shades" };

/** The seller's nearest lace shade to this skin colour, and whether it may blend. */
export function matchLace(skinHex: string, shades: LaceShade[]): LaceMatch {
  if (shades.length === 0) return { verdict: "no_shades" };
  const skin = lightness(skinHex);
  const [nearest] = shades
    .map((shade) => ({ shade, gap: lightness(shade.hex) - skin }))
    .sort((a, b) => Math.abs(a.gap) - Math.abs(b.gap));
  if (Math.abs(nearest.gap) <= LACE_MAY_BLEND_WITHIN) return { verdict: "may_blend", shade: nearest.shade };
  return { verdict: "may_show", shade: nearest.shade, direction: nearest.gap > 0 ? "lighter" : "darker" };
}
