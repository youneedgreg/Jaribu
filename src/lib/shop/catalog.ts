import type { Construction, TextureRange } from "../checks/blend";
import type { LaceShade } from "../checks/lace";

// The fixed lists sellers pick from (and the demo shop uses), so every wig has what the
// try-on and the checks need. Wigs store the ids; the values here can change without a migration.

/** A colour the seller offers the wig in, shown on the try-on result with Hair Color. */
export interface Colorway {
  id: string;
  /** The hair trade's colour code (1B, #4, 613…), which sellers and shoppers already use. */
  code: string;
  name: string;
  /** "#rrggbb", sent to YouCam Hair Color. */
  hex: string;
}

/** A wig texture, with where it sits on Hair Type Detection's 1–4C scale for the blend check. */
export interface Texture {
  id: string;
  name: string;
  range: TextureRange;
}

// Placeholder colours: common trade codes with hex values picked by eye, not taken from a
// seller's swatch. Listed in the order sellers see them; the keys aren't the codes because
// JavaScript would put number-like keys first.
export const COLORS = {
  offBlack: { id: "1b", code: "1B", name: "Off black", hex: "#1c1613" },
  chocolate: { id: "4", code: "#4", name: "Chocolate brown", hex: "#3d2618" },
  honey: { id: "27", code: "#27", name: "Honey blonde", hex: "#a86c35" },
  auburn: { id: "30", code: "#30", name: "Auburn", hex: "#7a3a1c" },
  burgundy: { id: "99j", code: "99J", name: "Burgundy", hex: "#4d1426" },
  platinum: { id: "613", code: "613", name: "Platinum blonde", hex: "#dcc49a" },
} satisfies Record<string, Colorway>;

// Placeholder lace shades, like the colours: hex values by eye for how each lace looks over
// skin. Transparent/HD lace isn't listed because it has no colour of its own to compare.
export const LACE = {
  light: { id: "light-brown", name: "Light brown lace", hex: "#b98a65" },
  medium: { id: "medium-brown", name: "Medium brown lace", hex: "#8d5f40" },
  dark: { id: "dark-brown", name: "Dark brown lace", hex: "#5a3b2a" },
} satisfies Record<string, LaceShade>;

// How wigs are built. Leave-out styles show some of the shopper's own hair at the front.
export const CONSTRUCTIONS = {
  glueless: { id: "glueless", name: "Glueless", leaveOut: false },
  fullLace: { id: "full-lace", name: "Full lace", leaveOut: false },
  lace360: { id: "360-lace", name: "360 lace", leaveOut: false },
  laceFront: { id: "lace-front", name: "Lace front", leaveOut: false },
  uPart: { id: "u-part", name: "U-part", leaveOut: true },
  vPart: { id: "v-part", name: "V-part", leaveOut: true },
} satisfies Record<string, Construction>;

// Placeholder ranges, by eye like the demo wigs': not checked with wig wearers.
export const TEXTURES = {
  straight: { id: "straight", name: "Straight", range: { from: "1", to: "1" } },
  bodyWave: { id: "body-wave", name: "Body wave", range: { from: "2A", to: "2B" } },
  deepWave: { id: "deep-wave", name: "Deep wave", range: { from: "2C", to: "3A" } },
  waterWave: { id: "water-wave", name: "Water wave", range: { from: "3A", to: "3B" } },
  curly: { id: "curly", name: "Curly", range: { from: "3B", to: "3C" } },
  kinkyCurly: { id: "kinky-curly", name: "Kinky curly", range: { from: "4A", to: "4B" } },
  kinkyStraight: { id: "kinky-straight", name: "Kinky straight (yaki)", range: { from: "4B", to: "4C" } },
} satisfies Record<string, Texture>;

/** The entry with this id, or undefined. */
export function byId<T extends { id: string }>(list: Record<string, T>, id: string): T | undefined {
  return Object.values(list).find((item) => item.id === id);
}
