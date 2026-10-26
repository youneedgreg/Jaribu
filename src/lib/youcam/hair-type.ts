// Hair Type Detection returns a range like "4B to 4C". The docs show lower case ("4b to 4c")
// but the live API returns upper case, so parse case-insensitively.

export const HAIR_BANDS = ["1", "2A", "2B", "2C", "3A", "3B", "3C", "4A", "4B", "4C"] as const;
export type HairBand = (typeof HAIR_BANDS)[number];

export interface HairType {
  from: HairBand;
  to: HairBand;
  /** YouCam's wording, e.g. "Coily to Extremely Coily". */
  term: string;
}

/** Returns null for anything outside the documented ranges (always two neighbouring bands). */
export function parseHairType(raw: { mapping?: unknown; term?: unknown }): HairType | null {
  if (typeof raw.mapping !== "string") return null;
  const m = /^\s*(\w+)\s+to\s+(\w+)\s*$/i.exec(raw.mapping);
  if (!m) return null;
  const from = HAIR_BANDS.indexOf(m[1].toUpperCase() as HairBand);
  const to = HAIR_BANDS.indexOf(m[2].toUpperCase() as HairBand);
  if (from < 0 || to !== from + 1) return null;
  return { from: HAIR_BANDS[from], to: HAIR_BANDS[to], term: typeof raw.term === "string" ? raw.term : "" };
}
