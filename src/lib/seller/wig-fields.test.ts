import { describe, expect, it } from "vitest";
import { checkWigFields, type WigFieldsInput } from "./wig-fields";

const good: WigFieldsInput = {
  name: "Body wave 22 in",
  price: "16000",
  length: "22",
  texture: "body-wave",
  constructions: ["glueless", "u-part"],
  colorways: ["1b", "30"],
  laceShades: ["medium-brown"],
};

describe("add-a-wig form", () => {
  it("returns good values ready to save", () => {
    expect(checkWigFields(good)).toEqual({
      ok: true,
      value: {
        name: "Body wave 22 in",
        priceKes: 16000,
        lengthIn: 22,
        texture: "body-wave",
        constructions: ["glueless", "u-part"],
        colorways: ["1b", "30"],
        laceShades: ["medium-brown"],
      },
    });
  });

  it("reads prices and lengths the way sellers type them", () => {
    for (const price of ["18,500", "KES 18 500", "Ksh. 18500", " 18500 "]) {
      const check = checkWigFields({ ...good, price });
      expect(check.ok && check.value.priceKes, price).toBe(18500);
    }
    for (const length of ["24", "24 in", "24in", "24 inches", '24"']) {
      const check = checkWigFields({ ...good, length });
      expect(check.ok && check.value.lengthIn, length).toBe(24);
    }
  });

  it("refuses prices and lengths out of range or not whole", () => {
    for (const price of ["", "50", "2000000", "16000.50", "-16000", "free"]) {
      expect(checkWigFields({ ...good, price }).ok, price).toBe(false);
    }
    for (const length of ["", "2", "41", "22.5", "long"]) {
      expect(checkWigFields({ ...good, length }).ok, length).toBe(false);
    }
  });

  it("allows a wig with no lace", () => {
    const check = checkWigFields({ ...good, laceShades: [] });
    expect(check.ok && check.value.laceShades).toEqual([]);
  });

  it("needs at least one construction and one colour", () => {
    const check = checkWigFields({ ...good, constructions: [], colorways: [] });
    expect(check).toEqual({
      ok: false,
      errors: { constructions: "Tick at least one way the wig is made.", colorways: "Tick at least one colour." },
    });
  });

  it("refuses ids that aren't in the lists", () => {
    expect(checkWigFields({ ...good, texture: "mohawk" }).ok).toBe(false);
    expect(checkWigFields({ ...good, constructions: ["glueless", "<script>"] }).ok).toBe(false);
    expect(checkWigFields({ ...good, colorways: ["#ff00ff"] }).ok).toBe(false);
    expect(checkWigFields({ ...good, laceShades: ["hd"] }).ok).toBe(false);
  });

  it("keeps each pick once, in list order", () => {
    const check = checkWigFields({ ...good, colorways: ["613", "1b", "613"] });
    expect(check.ok && check.value.colorways).toEqual(["1b", "613"]);
  });

  it("asks for a name of 2 to 60 characters", () => {
    expect(checkWigFields({ ...good, name: " " }).ok).toBe(false);
    expect(checkWigFields({ ...good, name: "x".repeat(61) }).ok).toBe(false);
    const check = checkWigFields({ ...good, name: "  Long   straight " });
    expect(check.ok && check.value.name).toBe("Long straight");
  });
});
