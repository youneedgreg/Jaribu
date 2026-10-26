import { describe, expect, it } from "vitest";
import { fakeJpeg } from "./__fixtures__/fake-jpeg";
import { jpegSize } from "./jpeg";

describe("jpegSize", () => {
  it("reads a baseline frame header", () => {
    expect(jpegSize(fakeJpeg(768, 1024))).toEqual({ width: 768, height: 1024 });
  });

  it("reads a progressive frame header", () => {
    expect(jpegSize(fakeJpeg(1024, 683, { sof: 0xc2 }))).toEqual({ width: 1024, height: 683 });
  });

  it("skips other segments and fill bytes, including Huffman tables in the frame-marker range", () => {
    const dht = [0xff, 0xc4, 0x00, 0x04, 0x00, 0x00];
    const exif = [0xff, 0xe1, 0x00, 0x06, 0x45, 0x78, 0x69, 0x66];
    expect(jpegSize(fakeJpeg(4032, 3024, { before: [exif, [0xff], dht] }))).toEqual({ width: 4032, height: 3024 });
  });

  it("rejects a PNG", () => {
    expect(jpegSize(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBeNull();
  });

  it("rejects a JPEG cut off before its frame header", () => {
    const whole = fakeJpeg(800, 600);
    expect(jpegSize(whole.slice(0, 24))).toBeNull();
  });

  it("rejects a zero-sized frame", () => {
    expect(jpegSize(fakeJpeg(0, 600))).toBeNull();
  });

  it("rejects empty and junk input", () => {
    expect(jpegSize(new Uint8Array())).toBeNull();
    expect(jpegSize(new Uint8Array([0xff, 0xd8, 0x00, 0x00, 0x00]))).toBeNull();
  });
});
