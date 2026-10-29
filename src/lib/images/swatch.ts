// Colour swatches drawn as tiny PNG images instead of CSS colours. Samsung Internet's forced
// dark mode recolours CSS colours (1B off black showed near white, 28 Oct) and can't be turned
// off from the page, but its makers say it leaves most images unchanged.

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const u32 = (n: number) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];

function chunk(type: string, data: number[]): number[] {
  const body = new Uint8Array([...type].map((c) => c.charCodeAt(0)).concat(data));
  return [...u32(data.length), ...body, ...u32(crc32(body))];
}

/** A 1×1 PNG of an sRGB "#rrggbb" colour. */
export function swatchPng(hex: string): Uint8Array {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) throw new Error(`Not a colour: ${hex}`);
  const [r, g, b] = m.slice(1).map((h) => parseInt(h, 16));
  // One scanline: filter byte 0, then RGB. Stored in a single uncompressed deflate block.
  const raw = [0, r, g, b];
  let a = 1;
  let s = 0;
  for (const byte of raw) {
    a = (a + byte) % 65521;
    s = (s + a) % 65521;
  }
  const zlib = [0x78, 0x01, 0x01, raw.length, 0, ~raw.length & 0xff, 0xff, ...raw, ...u32(((s << 16) | a) >>> 0)];
  // Width 1, height 1, bit depth 8, colour type 2 (RGB), default compression, filter, no interlace.
  const ihdr = [...u32(1), ...u32(1), 8, 2, 0, 0, 0];
  return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...chunk("IHDR", ihdr), ...chunk("IDAT", zlib), ...chunk("IEND", [])]);
}

/** The swatch as a data URL for an `<img>`. */
export function swatchDataUrl(hex: string): string {
  return `data:image/png;base64,${btoa(String.fromCharCode(...swatchPng(hex)))}`;
}
