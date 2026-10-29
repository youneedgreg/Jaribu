import { describe, expect, it } from "vitest";
import { DEMO_SHOP, type Wig } from "../shop/demo";
import { checkOrderChoice, orderMessage, whatsappLink } from "./order";

const wig = DEMO_SHOP.wigs.find((w) => w.id === "body-wave")!;
const noLace: Wig = { ...wig, laceShades: [] };

describe("order choices", () => {
  it("accepts what the seller offers", () => {
    const check = checkOrderChoice(wig, { colorwayId: "30", constructionId: "u-part", laceShadeId: "medium-brown" });
    expect(check.ok && [check.spec.colorway?.code, check.spec.construction.name, check.spec.lace?.name]).toEqual([
      "#30",
      "U-part",
      "Medium brown lace",
    ]);
  });

  it("allows the colour as photographed", () => {
    const check = checkOrderChoice(wig, { colorwayId: null, constructionId: "glueless", laceShadeId: "light-brown" });
    expect(check.ok && check.spec.colorway).toBeNull();
  });

  it("refuses picks the wig isn't offered in", () => {
    expect(checkOrderChoice(wig, { colorwayId: "613", constructionId: "glueless", laceShadeId: "light-brown" })).toEqual({
      ok: false,
      message: "This wig doesn't come in that colour.",
    });
    expect(checkOrderChoice(wig, { colorwayId: null, constructionId: "v-part", laceShadeId: "light-brown" }).ok).toBe(false);
    expect(checkOrderChoice(wig, { colorwayId: null, constructionId: "glueless", laceShadeId: "dark-brown" }).ok).toBe(false);
  });

  it("needs a lace shade only when the wig has lace", () => {
    expect(checkOrderChoice(wig, { colorwayId: null, constructionId: "glueless", laceShadeId: null })).toEqual({
      ok: false,
      message: "Pick a lace shade.",
    });
    const check = checkOrderChoice(noLace, { colorwayId: null, constructionId: "glueless", laceShadeId: null });
    expect(check.ok && check.spec.lace).toBeNull();
    expect(checkOrderChoice(noLace, { colorwayId: null, constructionId: "glueless", laceShadeId: "light-brown" }).ok).toBe(false);
  });
});

describe("order message", () => {
  it("gives the seller the exact spec and the preview link", () => {
    const check = checkOrderChoice(wig, { colorwayId: "30", constructionId: "u-part", laceShadeId: "medium-brown" });
    if (!check.ok) throw new Error("check failed");
    const text = orderMessage("Wanjiru's Wigs", wig, check.spec, "https://tryjaribu.vercel.app/o/abc");
    expect(text.split("\n")).toEqual([
      "Hi Wanjiru's Wigs, I'd like to order this wig:",
      expect.stringMatching(/^Body wave, Ksh\s16,000$/),
      "Colour: #30 Auburn",
      "Made as: U-part",
      "Lace: Medium brown lace",
      "Length: About 22 in",
      "",
      "My try-on preview (the link works for 24 hours): https://tryjaribu.vercel.app/o/abc",
    ]);
  });

  it("leaves out lace for a wig without it, and says when the colour is as photographed", () => {
    const check = checkOrderChoice(noLace, { colorwayId: null, constructionId: "glueless", laceShadeId: null });
    if (!check.ok) throw new Error("check failed");
    const text = orderMessage("Shop", noLace, check.spec, "https://x/o/1");
    expect(text).toContain("Colour: as in your photo");
    expect(text).not.toContain("Lace:");
  });
});

describe("WhatsApp link", () => {
  it("opens the seller's chat with the message filled in", () => {
    expect(whatsappLink("254712345678", "Hi & hello\nline 2")).toBe("https://wa.me/254712345678?text=Hi%20%26%20hello%0Aline%202");
  });

  it("refuses anything that isn't a saved number", () => {
    expect(() => whatsappLink("+254712345678", "x")).toThrow();
    expect(() => whatsappLink("12/../x", "x")).toThrow();
  });
});
