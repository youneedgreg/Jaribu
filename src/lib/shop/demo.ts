import type { Construction, TextureRange } from "../checks/blend";
import type { LaceShade } from "../checks/lace";
import { COLORS, CONSTRUCTIONS as BUILT, LACE, type Colorway } from "./catalog";

// A hard-coded demo shop until sellers can list their own wigs (step F). The photos are from
// Unsplash (https://unsplash.com/license): free to use, but with no model releases, so the
// people in them are never presented as sellers, customers or anyone endorsing Jaribu.

export interface Wig {
  id: string;
  name: string;
  texture: string;
  /** The texture on Hair Type Detection's 1–4C scale, for the blend check. Placeholder, by eye. */
  textureRange: TextureRange;
  constructions: Construction[];
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
      textureRange: { from: "1", to: "1" },
      constructions: [BUILT.glueless, BUILT.uPart],
      length: "About 24 in",
      priceKes: 18500,
      photo: "/wigs/long-straight.jpg",
      photoWidth: 648,
      photoHeight: 1024,
      credit: { name: "Júlia Costa", url: "https://unsplash.com/photos/OHSzIUy01Tk" },
      colorways: [COLORS.offBlack, COLORS.burgundy, COLORS.platinum],
      laceShades: [LACE.light, LACE.medium, LACE.dark],
    },
    {
      id: "body-wave",
      name: "Body wave",
      texture: "Body wave",
      textureRange: { from: "2A", to: "2B" },
      constructions: [BUILT.glueless, BUILT.uPart],
      length: "About 22 in",
      priceKes: 16000,
      photo: "/wigs/body-wave.jpg",
      photoWidth: 682,
      photoHeight: 1024,
      credit: { name: "Dellon Thomas", url: "https://unsplash.com/photos/Fp8uh-Ls4ic" },
      colorways: [COLORS.offBlack, COLORS.auburn, COLORS.honey],
      laceShades: [LACE.light, LACE.medium],
    },
    {
      id: "curly-afro",
      name: "Curly afro",
      texture: "Kinky curly",
      textureRange: { from: "4A", to: "4B" },
      constructions: [BUILT.glueless, BUILT.uPart],
      length: "About 8 in",
      priceKes: 9500,
      photo: "/wigs/curly-afro.jpg",
      photoWidth: 680,
      photoHeight: 1024,
      credit: { name: "Good Faces", url: "https://unsplash.com/photos/xmSWVeGEnJw" },
      colorways: [COLORS.offBlack, COLORS.chocolate, COLORS.auburn],
      laceShades: [LACE.medium, LACE.dark],
    },
    {
      id: "straight-bob",
      name: "Straight bob",
      texture: "Straight",
      textureRange: { from: "1", to: "1" },
      constructions: [BUILT.glueless, BUILT.uPart],
      length: "About 10 in",
      priceKes: 8000,
      photo: "/wigs/straight-bob.jpg",
      photoWidth: 811,
      photoHeight: 1024,
      credit: { name: "Victor Eke", url: "https://unsplash.com/photos/1aqSXQQF_Pw" },
      colorways: [COLORS.offBlack, COLORS.burgundy, COLORS.honey],
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
