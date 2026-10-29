import { describe, expect, it } from "vitest";
import type { SellerWig } from "../seller/wigs";
import { sellerShop, sellerWig } from "./seller-listing";

const row: SellerWig = {
  id: "1f5742af-7f13-4ea2-94cd-b298ee3725a8",
  name: "Body wave 22 in",
  priceKes: 16000,
  lengthIn: 22,
  texture: "body-wave",
  constructions: ["glueless", "u-part"],
  colorways: ["1b", "30"],
  laceShades: ["medium-brown"],
  photoWidth: 682,
  photoHeight: 1024,
};

describe("seller listings", () => {
  it("turns a saved wig into a listing the try-on and checks can use", () => {
    expect(sellerWig(row)).toEqual({
      id: row.id,
      name: "Body wave 22 in",
      texture: "Body wave",
      textureRange: { from: "2A", to: "2B" },
      constructions: [
        { id: "glueless", name: "Glueless", leaveOut: false },
        { id: "u-part", name: "U-part", leaveOut: true },
      ],
      length: "22 in",
      priceKes: 16000,
      photo: `/api/wigs/${row.id}/photo`,
      photoWidth: 682,
      photoHeight: 1024,
      colorways: [
        { id: "1b", code: "1B", name: "Off black", hex: "#1c1613" },
        { id: "30", code: "#30", name: "Auburn", hex: "#7a3a1c" },
      ],
      laceShades: [{ id: "medium-brown", name: "Medium brown lace", hex: "#8d5f40" }],
    });
  });

  it("has no photo credit, so pages don't call it a sample", () => {
    expect(sellerWig(row)?.credit).toBeUndefined();
  });

  it("skips catalog ids that no longer exist", () => {
    const wig = sellerWig({ ...row, colorways: ["1b", "retired"], laceShades: ["hd"] });
    expect(wig?.colorways.map((c) => c.id)).toEqual(["1b"]);
    expect(wig?.laceShades).toEqual([]);
  });

  it("drops a wig whose texture is no longer listed", () => {
    expect(sellerWig({ ...row, texture: "retired" })).toBeNull();
    const shop = sellerShop({ id: "s1", name: "Wanjiru's Wigs", whatsapp: "254712345678", slug: "wanjirus-wigs" }, [row, { ...row, id: "x", texture: "retired" }]);
    expect(shop.wigs.map((w) => w.id)).toEqual([row.id]);
  });

  it("uses the shop link as the shop id, marks it as a real shop and keeps its number", () => {
    const shop = sellerShop({ id: "s1", name: "Wanjiru's Wigs", whatsapp: "254712345678", slug: "wanjirus-wigs" }, []);
    expect(shop).toEqual({ id: "wanjirus-wigs", name: "Wanjiru's Wigs", sample: false, whatsapp: "254712345678", wigs: [] });
  });
});
