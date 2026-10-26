// Reads a JPEG's pixel size from its frame header, so bad uploads are refused before they
// reach YouCam (Hair Style takes JPG only, long side ≤ 1024 px).

export interface JpegSize {
  width: number;
  height: number;
}

// Start-of-frame markers: baseline, extended, progressive, lossless and the arithmetic-coded
// variants. 0xC4 (DHT), 0xC8 (JPG) and 0xCC (DAC) sit in the same range but aren't frames.
const SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

/** The image size, or null if this isn't a JPEG we can read. */
export function jpegSize(bytes: Uint8Array): JpegSize | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff) return null;
    const marker = bytes[i + 1];
    // Fill bytes before a marker.
    if (marker === 0xff) {
      i++;
      continue;
    }
    // Markers without a length.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    // Start of scan or end of image before any frame header.
    if (marker === 0xda || marker === 0xd9) return null;
    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    if (length < 2) return null;
    if (SOF.has(marker)) {
      if (i + 9 > bytes.length) return null;
      const height = (bytes[i + 5] << 8) | bytes[i + 6];
      const width = (bytes[i + 7] << 8) | bytes[i + 8];
      return width > 0 && height > 0 ? { width, height } : null;
    }
    i += 2 + length;
  }
  return null;
}
