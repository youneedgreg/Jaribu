import { describe, expect, it } from "vitest";
import { checkShopFields, formatWhatsapp, normalizeWhatsapp, slugify } from "./shop-fields";

describe("WhatsApp numbers", () => {
  it("reads Kenyan numbers in the usual forms", () => {
    for (const typed of ["0712 345 678", "0712-345-678", "712345678", "+254 712 345 678", "254712345678", "00254712345678"]) {
      expect(normalizeWhatsapp(typed)).toBe("254712345678");
    }
  });

  it("takes the newer 01 Kenyan prefixes", () => {
    expect(normalizeWhatsapp("0110 123 456")).toBe("254110123456");
  });

  it("refuses Kenyan numbers that aren't mobiles or have the wrong length", () => {
    expect(normalizeWhatsapp("020 123 4567")).toBeNull();
    expect(normalizeWhatsapp("+254 712 345 67")).toBeNull();
    expect(normalizeWhatsapp("0712 345 6789")).toBeNull();
  });

  it("takes other countries only with + or 00 and the country code", () => {
    expect(normalizeWhatsapp("+1 (415) 555-0134")).toBe("14155550134");
    expect(normalizeWhatsapp("0044 7700 900123")).toBe("447700900123");
    expect(normalizeWhatsapp("4155550134")).toBeNull();
  });

  it("refuses letters and blanks", () => {
    expect(normalizeWhatsapp("")).toBeNull();
    expect(normalizeWhatsapp("+254 7l2 345 678")).toBeNull();
    expect(normalizeWhatsapp("call me")).toBeNull();
  });

  it("formats saved numbers for reading", () => {
    expect(formatWhatsapp("254712345678")).toBe("+254 712 345 678");
    expect(formatWhatsapp("14155550134")).toBe("+14155550134");
    expect(normalizeWhatsapp(formatWhatsapp("254712345678"))).toBe("254712345678");
  });
});

describe("shop link slugs", () => {
  it("makes a link from the shop name", () => {
    expect(slugify("Wanjiru's Wigs")).toBe("wanjirus-wigs");
    expect(slugify("  Nywele  &  Co.  ")).toBe("nywele-co");
    expect(slugify("Crème Hair Lounge")).toBe("creme-hair-lounge");
  });

  it("keeps links to 40 characters without a dash at the end", () => {
    const slug = slugify("The very long name of a wig shop in Nairobi CBD");
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("shop setup form", () => {
  const good = { name: "Wanjiru's Wigs", whatsapp: "0712 345 678", slug: "" };

  it("cleans up good values and makes the link", () => {
    expect(checkShopFields({ ...good, name: "  Wanjiru's   Wigs " })).toEqual({
      ok: true,
      value: { name: "Wanjiru's Wigs", whatsapp: "254712345678", slug: "wanjirus-wigs" },
    });
  });

  it("keeps a link the seller typed, in lower case", () => {
    const check = checkShopFields({ ...good, slug: " Wanjiru-Nairobi " });
    expect(check.ok && check.value.slug).toBe("wanjiru-nairobi");
  });

  it("asks for a name and a number", () => {
    const check = checkShopFields({ name: " ", whatsapp: "", slug: "" });
    expect(check).toEqual({
      ok: false,
      errors: { name: "Give your shop a name.", whatsapp: "Add the WhatsApp number where you take orders." },
    });
  });

  it("says when a number doesn't look right", () => {
    const check = checkShopFields({ ...good, whatsapp: "12345" });
    expect(!check.ok && check.errors.whatsapp).toMatch(/doesn't look like a WhatsApp number/);
  });

  it("refuses names over 60 characters", () => {
    const check = checkShopFields({ ...good, name: "x".repeat(61), slug: "long-name" });
    expect(!check.ok && check.errors.name).toMatch(/at most 60/);
  });

  it("refuses bad links", () => {
    for (const slug of ["ab", "has space", "double--dash", "-leading", "trailing-", "x".repeat(41)]) {
      const check = checkShopFields({ ...good, slug });
      expect(check.ok, slug).toBe(false);
    }
  });

  it("keeps the demo shop's link for the demo shop", () => {
    const check = checkShopFields({ ...good, slug: "demo" });
    expect(!check.ok && check.errors.slug).toBe("That link is taken. Try another.");
  });

  it("asks for a link when the name doesn't make one", () => {
    const check = checkShopFields({ ...good, name: "!!" });
    expect(!check.ok && check.errors.slug).toMatch(/Choose a shop link/);
  });
});
