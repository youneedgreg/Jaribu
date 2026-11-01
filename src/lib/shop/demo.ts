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
  /** Path of the JPG (long side ≤ 1024 px), also sent to YouCam as the try-on reference: under
   * /wigs/ for demo wigs (in public/), /api/wigs/<id>/photo for sellers' (in Blob). */
  photo: string;
  photoWidth: number;
  photoHeight: number;
  /** Who took the photo: demo wigs only (Unsplash). */
  credit?: { name: string; url: string };
  colorways: Colorway[];
  laceShades: LaceShade[];
}

export interface Shop {
  /** The shop link: /s/<id>. */
  id: string;
  name: string;
  /** True for the demo shop, whose wigs aren't for sale. */
  sample: boolean;
  /** Where orders go (digits, country code first). Sellers' shops only. */
  whatsapp?: string;
  wigs: Wig[];
}

export const DEMO_SHOP: Shop = {
  id: "demo",
  name: "Jaribu demo shop",
  sample: true,
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
    {
      id: "layered-long",
      name: "Layered long",
      texture: "Straight",
      textureRange: { from: "1", to: "1" },
      constructions: [BUILT.glueless, BUILT.laceFront],
      length: "About 20 in",
      priceKes: 15500,
      photo: "/wigs/layered-long.jpg",
      photoWidth: 683,
      photoHeight: 1024,
      credit: { name: "Clive Thibela", url: "https://unsplash.com/photos/9kQBQqY_xrk" },
      colorways: [COLORS.offBlack, COLORS.chocolate, COLORS.auburn],
      laceShades: [LACE.medium, LACE.dark],
    },
    {
      id: "long-braids",
      name: "Long braids",
      texture: "Kinky straight (yaki)",
      textureRange: { from: "4B", to: "4C" },
      constructions: [BUILT.fullLace, BUILT.laceFront],
      length: "About 26 in",
      priceKes: 12000,
      photo: "/wigs/long-braids.jpg",
      photoWidth: 683,
      photoHeight: 1024,
      credit: { name: "Etty Fidele", url: "https://unsplash.com/photos/UBJsHb3HLv8" },
      colorways: [COLORS.offBlack, COLORS.chocolate, COLORS.honey],
      laceShades: [LACE.medium, LACE.dark],
    },
    {
      id: "sleek-long",
      name: "Sleek long",
      texture: "Straight",
      textureRange: { from: "1", to: "1" },
      constructions: [BUILT.lace360, BUILT.glueless],
      length: "About 28 in",
      priceKes: 21000,
      photo: "/wigs/sleek-long.jpg",
      photoWidth: 683,
      photoHeight: 1024,
      credit: { name: "Ibrahima Toure", url: "https://unsplash.com/photos/jUhwu8MgtOs" },
      colorways: [COLORS.offBlack, COLORS.burgundy, COLORS.auburn],
      laceShades: [LACE.light, LACE.medium, LACE.dark],
    },
    {
      id: "platinum-long",
      name: "Platinum long",
      texture: "Straight",
      textureRange: { from: "1", to: "1" },
      constructions: [BUILT.fullLace, BUILT.glueless],
      length: "About 22 in",
      priceKes: 19500,
      photo: "/wigs/platinum-long.jpg",
      photoWidth: 684,
      photoHeight: 1024,
      credit: { name: "Jassir Jonis", url: "https://unsplash.com/photos/3GkURhNXqAM" },
      colorways: [COLORS.platinum, COLORS.honey, COLORS.offBlack],
      laceShades: [LACE.light, LACE.medium],
    },
    {
      id: "full-afro",
      name: "Full afro",
      texture: "Kinky curly",
      textureRange: { from: "4A", to: "4B" },
      constructions: [BUILT.glueless, BUILT.vPart],
      length: "About 10 in",
      priceKes: 10500,
      photo: "/wigs/full-afro.jpg",
      photoWidth: 683,
      photoHeight: 1024,
      credit: { name: "JEaLiFe Pictures", url: "https://unsplash.com/photos/SvOD2p3n_bk" },
      colorways: [COLORS.offBlack, COLORS.chocolate, COLORS.burgundy],
      laceShades: [LACE.medium, LACE.dark],
    },
    {
      id: "short-natural",
      name: "Short natural",
      texture: "Kinky curly",
      textureRange: { from: "4A", to: "4B" },
      constructions: [BUILT.glueless, BUILT.uPart],
      length: "About 6 in",
      priceKes: 7500,
      photo: "/wigs/short-natural.jpg",
      photoWidth: 683,
      photoHeight: 1024,
      credit: { name: "melvin Ankrah", url: "https://unsplash.com/photos/R92yksNSpf0" },
      colorways: [COLORS.offBlack, COLORS.chocolate, COLORS.auburn],
      laceShades: [LACE.medium, LACE.dark],
    },
    {
      id: "tapered-crop",
      name: "Tapered crop",
      texture: "Kinky curly",
      textureRange: { from: "4A", to: "4B" },
      constructions: [BUILT.glueless, BUILT.laceFront],
      length: "About 4 in",
      priceKes: 6500,
      photo: "/wigs/tapered-crop.jpg",
      photoWidth: 683,
      photoHeight: 1024,
      credit: { name: "Prince Akachi", url: "https://unsplash.com/photos/J1OScm_uHUQ" },
      colorways: [COLORS.offBlack, COLORS.burgundy, COLORS.auburn],
      laceShades: [LACE.medium, LACE.dark],
    },
    {
      id: "honey-curls",
      name: "Honey curls",
      texture: "Curly",
      textureRange: { from: "3B", to: "3C" },
      constructions: [BUILT.glueless, BUILT.uPart],
      length: "About 16 in",
      priceKes: 13500,
      photo: "/wigs/honey-curls.jpg",
      photoWidth: 683,
      photoHeight: 1024,
      credit: { name: "Gift Habeshaw", url: "https://unsplash.com/photos/9GqzlFLgyHY" },
      colorways: [COLORS.honey, COLORS.chocolate, COLORS.offBlack],
      laceShades: [LACE.light, LACE.medium],
    },
  ],
};

/** The wigs grouped by texture, each style where its first wig came and in listing order within it. */
export function groupByStyle(wigs: Wig[]): { style: string; wigs: Wig[] }[] {
  const groups = new Map<string, Wig[]>();
  for (const wig of wigs) groups.set(wig.texture, [...(groups.get(wig.texture) ?? []), wig]);
  return [...groups].map(([style, list]) => ({ style, wigs: list }));
}

export function findDemoWig(id: string): Wig | undefined {
  return DEMO_SHOP.wigs.find((wig) => wig.id === id);
}

export function findColorway(wig: Wig, id: string): Colorway | undefined {
  return wig.colorways.find((colorway) => colorway.id === id);
}

const KES = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 });

export const formatKes = (amount: number) => KES.format(amount);
