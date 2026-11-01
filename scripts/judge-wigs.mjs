// The judges' demo shop: the four Unsplash demo wigs (src/lib/shop/demo.ts) as a seller's listings.
// The ids are fixed so links to these wigs keep working when the seed runs again.
// src/lib/shop/judge-wigs.test.ts checks these values against the add-a-wig rules.

export const JUDGE_EMAIL = "judge@example.com";
export const JUDGE_SHOP = { name: "Jaribu judge demo (sample listings)", slug: "judge-demo" };

export const JUDGE_WIGS = [
  {
    id: "0f6d6a54-7c1e-4a58-9d3b-1a2b3c4d5e01",
    file: "long-straight.jpg",
    name: "Long straight",
    priceKes: 18500,
    lengthIn: 24,
    texture: "straight",
    constructions: ["glueless", "u-part"],
    colorways: ["1b", "99j", "613"],
    laceShades: ["light-brown", "medium-brown", "dark-brown"],
    photoWidth: 648,
    photoHeight: 1024,
  },
  {
    id: "0f6d6a54-7c1e-4a58-9d3b-1a2b3c4d5e02",
    file: "body-wave.jpg",
    name: "Body wave",
    priceKes: 16000,
    lengthIn: 22,
    texture: "body-wave",
    constructions: ["glueless", "u-part"],
    colorways: ["1b", "27", "30"],
    laceShades: ["light-brown", "medium-brown"],
    photoWidth: 682,
    photoHeight: 1024,
  },
  {
    id: "0f6d6a54-7c1e-4a58-9d3b-1a2b3c4d5e03",
    file: "curly-afro.jpg",
    name: "Curly afro",
    priceKes: 9500,
    lengthIn: 8,
    texture: "kinky-curly",
    constructions: ["glueless", "u-part"],
    colorways: ["1b", "4", "30"],
    laceShades: ["medium-brown", "dark-brown"],
    photoWidth: 680,
    photoHeight: 1024,
  },
  {
    id: "0f6d6a54-7c1e-4a58-9d3b-1a2b3c4d5e04",
    file: "straight-bob.jpg",
    name: "Straight bob",
    priceKes: 8000,
    lengthIn: 10,
    texture: "straight",
    constructions: ["glueless", "u-part"],
    colorways: ["1b", "27", "99j"],
    laceShades: ["light-brown", "medium-brown", "dark-brown"],
    photoWidth: 811,
    photoHeight: 1024,
  },
];
