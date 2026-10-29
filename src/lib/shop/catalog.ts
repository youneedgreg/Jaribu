import type { Construction } from "../checks/blend";
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
  uPart: { id: "u-part", name: "U-part", leaveOut: true },
} satisfies Record<string, Construction>;
