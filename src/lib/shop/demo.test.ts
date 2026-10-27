import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { jpegSize } from "../images/jpeg";
import { checkPhoto } from "../tryon/tryon";
import { DEMO_SHOP, findColorway, findWig, formatKes } from "./demo";

describe("demo shop", () => {
  it.each(DEMO_SHOP.wigs.map((w) => [w.id, w] as const))("%s has a photo YouCam will take, at the listed size", (_, wig) => {
    const bytes = new Uint8Array(readFileSync(path.join(process.cwd(), "public", wig.photo)));
    expect(jpegSize(bytes)).toEqual({ width: wig.photoWidth, height: wig.photoHeight });
    expect(() => checkPhoto("wig", bytes)).not.toThrow();
  });

  it("credits every photo on Unsplash", () => {
    for (const wig of DEMO_SHOP.wigs) expect(wig.credit.url).toMatch(/^https:\/\/unsplash\.com\/photos\//);
  });

  it("has unique, URL-safe ids", () => {
    const ids = DEMO_SHOP.wigs.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });

  it("finds wigs by id only", () => {
    expect(findWig("curly-afro")?.name).toBe("Curly afro");
    expect(findWig("../../etc/passwd")).toBeUndefined();
    expect(findWig("")).toBeUndefined();
  });

  it("offers each wig in a few colours YouCam can take", () => {
    for (const wig of DEMO_SHOP.wigs) {
      const ids = wig.colorways.map((c) => c.id);
      expect(ids.length).toBeGreaterThan(0);
      expect(new Set(ids).size).toBe(ids.length);
      for (const c of wig.colorways) {
        expect(c.id).toMatch(/^[a-z0-9-]+$/);
        expect(c.hex).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });

  it("finds a colour only among the wig's own", () => {
    const wig = findWig("body-wave")!;
    expect(findColorway(wig, "30")?.code).toBe("#30");
    expect(findColorway(wig, "613")).toBeUndefined();
    expect(findColorway(wig, "")).toBeUndefined();
  });

  it("formats prices in shillings", () => {
    expect(formatKes(18500)).toMatch(/18,500/);
    expect(formatKes(18500)).toMatch(/Ksh|KES/);
  });
});
