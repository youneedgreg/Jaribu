import { HAIR_BANDS, type HairBand, type HairType } from "../youcam/hair-type";

// The blend check: whether a wig may blend with the shopper's own hair, from the hair type
// YouCam read and how the wig is built (roadmap Section 7c). Full lace, 360 and glueless wigs
// cover all natural hair, so hair type doesn't change how they blend. Leave-out styles (U-part,
// V-part, closure with leave-out) show natural hair at the front, so they blend only when the
// shopper's texture is close to the wig's.
// PROVISIONAL: how close counts as "may blend" is our guess until wig wearers confirm it, and
// the screen says so. Hair Type reads braids wrong (Day 1: box braids came back 2A to 2B).

/** A way the seller builds the wig. `leaveOut`: some of the shopper's own hair shows at the front. */
export interface Construction {
  id: string;
  name: string;
  leaveOut: boolean;
}

/** A wig's texture on the same 1–4C scale Hair Type Detection uses. */
export interface TextureRange {
  from: HairBand;
  to: HairBand;
}

/** Provisional: within this many bands (1, 2A, 2B…), a leave-out wig may blend. Not checked with wig wearers. */
export const BLEND_WITHIN_BANDS = 1;

/** How many bands apart two ranges are; 0 when they overlap. */
export function bandGap(a: TextureRange, b: TextureRange): number {
  const [aFrom, aTo, bFrom, bTo] = [a.from, a.to, b.from, b.to].map((band) => HAIR_BANDS.indexOf(band));
  if (aTo < bFrom) return bFrom - aTo;
  if (bTo < aFrom) return aFrom - bTo;
  return 0;
}

export type BlendVerdict =
  /** The construction hides the shopper's hair: hair type doesn't matter. */
  | { verdict: "covers" }
  | { verdict: "may_blend" }
  /** `instead`: a construction of the same wig that covers the shopper's hair, if the seller offers one. */
  | { verdict: "may_show"; instead: Construction | null };

/** Whether this construction of a wig may blend with the shopper's hair. */
export function blend(hair: HairType, texture: TextureRange, construction: Construction, offered: Construction[]): BlendVerdict {
  if (!construction.leaveOut) return { verdict: "covers" };
  if (bandGap(hair, texture) <= BLEND_WITHIN_BANDS) return { verdict: "may_blend" };
  return { verdict: "may_show", instead: offered.find((c) => !c.leaveOut) ?? null };
}
