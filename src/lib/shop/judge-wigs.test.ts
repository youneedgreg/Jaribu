import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { JUDGE_SHOP, JUDGE_WIGS } from "../../../scripts/judge-wigs.mjs";
import { jpegSize } from "../images/jpeg";
import { checkShopFields } from "../seller/shop-fields";
import { checkWigFields, type WigFields } from "../seller/wig-fields";
import { checkPhoto } from "../tryon/tryon";
import { DEMO_SHOP } from "./demo";

describe("the judges' demo shop", () => {
  it("has a name and link the shop form would accept", () => {
    const check = checkShopFields({ name: JUDGE_SHOP.name, whatsapp: "0712345678", slug: JUDGE_SHOP.slug });
    expect(check.ok).toBe(true);
  });

  it("lists every demo wig, with its photo", () => {
    expect(JUDGE_WIGS.map((wig) => `/wigs/${wig.file}`)).toEqual(DEMO_SHOP.wigs.map((wig) => wig.photo));
  });

  it.each(JUDGE_WIGS)("$name is a wig the add-a-wig form would accept", (wig) => {
    const check = checkWigFields({
      name: wig.name,
      price: String(wig.priceKes),
      length: String(wig.lengthIn),
      texture: wig.texture,
      constructions: wig.constructions,
      colorways: wig.colorways,
      laceShades: wig.laceShades,
    });
    const expected: WigFields = {
      name: wig.name,
      priceKes: wig.priceKes,
      lengthIn: wig.lengthIn,
      texture: wig.texture,
      constructions: wig.constructions,
      colorways: wig.colorways,
      laceShades: wig.laceShades,
    };
    expect(check).toEqual({ ok: true, value: expected });
  });

  it.each(JUDGE_WIGS)("$name has a usable photo of the size saved for it", (wig) => {
    const photo = new Uint8Array(readFileSync(`public/wigs/${wig.file}`));
    expect(() => checkPhoto("wig", photo)).not.toThrow();
    expect(jpegSize(photo)).toEqual({ width: wig.photoWidth, height: wig.photoHeight });
  });

  it("matches the demo wigs' prices and options", () => {
    JUDGE_WIGS.forEach((wig, index) => {
      const demo = DEMO_SHOP.wigs[index];
      expect(wig.name).toBe(demo.name);
      expect(wig.priceKes).toBe(demo.priceKes);
      expect([...wig.colorways].sort()).toEqual(demo.colorways.map((color) => color.id).sort());
      expect([...wig.laceShades].sort()).toEqual(demo.laceShades.map((shade) => shade.id).sort());
    });
  });
});
