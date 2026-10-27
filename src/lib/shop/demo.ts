// A hard-coded demo shop until sellers can list their own wigs (step F). The photos are from
// Unsplash (https://unsplash.com/license): free to use, but with no model releases, so the
// people in them are never presented as sellers, customers or anyone endorsing Jaribu.

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
    },
  ],
};

export function findWig(id: string): Wig | undefined {
  return DEMO_SHOP.wigs.find((wig) => wig.id === id);
}

const KES = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 });

export const formatKes = (amount: number) => KES.format(amount);
