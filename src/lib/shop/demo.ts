import type { LaceShade } from "../checks/lace";

// A hard-coded demo shop until sellers can list their own wigs (step F). The photos are from
// Unsplash (https://unsplash.com/license): free to use, but with no model releases, so the
// people in them are never presented as sellers, customers or anyone endorsing Jaribu.

/** A colour the seller offers the wig in, shown on the try-on result with Hair Color. */
export interface Colorway {
  id: string;
  /** The hair trade's colour code (1B, #4, 613…), which sellers and shoppers already use. */
  code: string;
  name: string;
  /** "#rrggbb", sent to YouCam Hair Color. */
  hex: string;
}

// Placeholder colours, like the prices: common trade codes with hex values picked by eye, not
// taken from a seller's swatch. A real seller sets their own in step F.
const COLORS = {
  "1b": { id: "1b", code: "1B", name: "Off black", hex: "#1c1613" },
  "4": { id: "4", code: "#4", name: "Chocolate brown", hex: "#3d2618" },
  "27": { id: "27", code: "#27", name: "Honey blonde", hex: "#a86c35" },
  "30": { id: "30", code: "#30", name: "Auburn", hex: "#7a3a1c" },
  "99j": { id: "99j", code: "99J", name: "Burgundy", hex: "#4d1426" },
  "613": { id: "613", code: "613", name: "Platinum blonde", hex: "#dcc49a" },
} satisfies Record<string, Colorway>;

// Placeholder lace shades, like the colours: hex values by eye for how each lace looks over
// skin. Transparent/HD lace isn't listed because it has no colour of its own to compare.
const LACE = {
  light: { id: "light-brown", name: "Light brown lace", hex: "#b98a65" },
  medium: { id: "medium-brown", name: "Medium brown lace", hex: "#8d5f40" },
  dark: { id: "dark-brown", name: "Dark brown lace", hex: "#5a3b2a" },
} satisfies Record<string, LaceShade>;

export interface Wig {
  id: string;
  name: string;
  texture: string;
  length: string;
  priceKes: number;
  /** Public path of the 1024-px JPG, also sent to YouCam as the try-on reference. */
  photo: string;
  photoWidth: number;
  photoHeight: number;
  credit: { name: string; url: string };
  colorways: Colorway[];
  laceShades: LaceShade[];
}

export interface Shop {
  id: string;
  name: string;
  wigs: Wig[];
}

export const DEMO_SHOP: Shop = {
  id: "demo",
  name: "Jaribu demo shop",
  wigs: [
    {
      id: "long-straight",
      name: "Long straight",
      texture: "Straight",
      length: "About 24 in",
      priceKes: 18500,
      photo: "/wigs/long-straight.jpg",
      photoWidth: 648,
      photoHeight: 1024,
      credit: { name: "Júlia Costa", url: "https://unsplash.com/photos/OHSzIUy01Tk" },
      colorways: [COLORS["1b"], COLORS["99j"], COLORS["613"]],
      laceShades: [LACE.light, LACE.medium, LACE.dark],
    },
    {
      id: "body-wave",
      name: "Body wave",
      texture: "Body wave",
      length: "About 22 in",
      priceKes: 16000,
      photo: "/wigs/body-wave.jpg",
      photoWidth: 682,
      photoHeight: 1024,
      credit: { name: "Dellon Thomas", url: "https://unsplash.com/photos/Fp8uh-Ls4ic" },
      colorways: [COLORS["1b"], COLORS["30"], COLORS["27"]],
      laceShades: [LACE.light, LACE.medium],
    },
    {
      id: "curly-afro",
      name: "Curly afro",
      texture: "Kinky curly",
      length: "About 8 in",
      priceKes: 9500,
      photo: "/wigs/curly-afro.jpg",
      photoWidth: 680,
      photoHeight: 1024,
      credit: { name: "Good Faces", url: "https://unsplash.com/photos/xmSWVeGEnJw" },
      colorways: [COLORS["1b"], COLORS["4"], COLORS["30"]],
      laceShades: [LACE.medium, LACE.dark],
    },
    {
      id: "straight-bob",
      name: "Straight bob",
      texture: "Straight",
      length: "About 10 in",
      priceKes: 8000,
      photo: "/wigs/straight-bob.jpg",
      photoWidth: 811,
      photoHeight: 1024,
      credit: { name: "Victor Eke", url: "https://unsplash.com/photos/1aqSXQQF_Pw" },
      colorways: [COLORS["1b"], COLORS["99j"], COLORS["27"]],
      laceShades: [LACE.light, LACE.medium, LACE.dark],
    },
  ],
};

export function findWig(id: string): Wig | undefined {
  return DEMO_SHOP.wigs.find((wig) => wig.id === id);
}

export function findColorway(wig: Wig, id: string): Colorway | undefined {
  return wig.colorways.find((colorway) => colorway.id === id);
}

const KES = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 });

export const formatKes = (amount: number) => KES.format(amount);
