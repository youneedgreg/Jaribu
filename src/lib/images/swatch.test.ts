import { crc32, inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { swatchDataUrl, swatchPng } from "./swatch";

/** The PNG's chunks, each with its stored and recomputed CRC. */
function chunks(png: Uint8Array) {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const out: { type: string; data: Uint8Array; crc: number; actual: number }[] = [];
  for (let i = 8; i < png.length; ) {
    const length = view.getUint32(i);
    const typeAndData = png.subarray(i + 4, i + 8 + length);
    out.push({
      type: String.fromCharCode(...typeAndData.subarray(0, 4)),
      data: typeAndData.subarray(4),
      crc: view.getUint32(i + 8 + length),
      actual: crc32(typeAndData),
    });
    i += 12 + length;
  }
  return out;
}

describe("swatchPng", () => {
  it("makes a valid 1×1 RGB PNG of the colour", () => {
    const png = swatchPng("#1c1613");
    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const [ihdr, idat, iend] = chunks(png);
    expect([ihdr.type, idat.type, iend.type]).toEqual(["IHDR", "IDAT", "IEND"]);
    for (const c of [ihdr, idat, iend]) expect(c.crc).toBe(c.actual);
    expect([...ihdr.data]).toEqual([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]);
    // inflateSync also checks the zlib Adler-32.
    expect([...inflateSync(idat.data)]).toEqual([0, 0x1c, 0x16, 0x13]);
  });

  it("reads upper-case hex", () => {
    expect([...inflateSync(chunks(swatchPng("#A86C35"))[1].data)]).toEqual([0, 0xa8, 0x6c, 0x35]);
  });

  it("refuses anything that isn't #rrggbb", () => {
    expect(() => swatchPng("#fff")).toThrow();
    expect(() => swatchPng("red")).toThrow();
  });
});

describe("swatchDataUrl", () => {
  it("is a base64 PNG data URL of the same bytes", () => {
    const url = swatchDataUrl("#7a3a1c");
    expect(url.startsWith("data:image/png;base64,")).toBe(true);
    expect([...Buffer.from(url.split(",")[1], "base64")]).toEqual([...swatchPng("#7a3a1c")]);
  });
});
