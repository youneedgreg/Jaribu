import { describe, expect, it } from "vitest";
import { centerCrop, fitWithin, TONE_CROP, TONE_MAX_SIDE, TONE_MIN_SIDE } from "./crop";

describe("centerCrop", () => {
  it("keeps the middle 75% of a phone's close-up, same shape", () => {
    expect(centerCrop(810, 1080)).toEqual({ x: 101, y: 135, width: 608, height: 810 });
  });

  it("makes a face half the photo's width about two thirds of it", () => {
    const crop = centerCrop(810, 1080);
    expect(405 / crop.width).toBeGreaterThan(0.6);
  });

  it("leaves a crop YouCam will still take", () => {
    const crop = centerCrop(480, 640);
    expect(Math.min(crop.width, crop.height)).toBeGreaterThanOrEqual(TONE_MIN_SIDE);
  });

  it("stays inside the photo for odd sizes", () => {
    for (const [w, h] of [
      [811, 1081],
      [1, 1],
      [4032, 3024],
    ]) {
      const c = centerCrop(w, h, TONE_CROP);
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.y).toBeGreaterThanOrEqual(0);
      expect(c.x + c.width).toBeLessThanOrEqual(w);
      expect(c.y + c.height).toBeLessThanOrEqual(h);
    }
  });
});

describe("fitWithin", () => {
  it("shrinks Samsung Internet's close-up crop to 1080 px on the long side", () => {
    const crop = centerCrop(1031, 1920);
    expect(crop).toMatchObject({ width: 773, height: 1440 });
    expect(fitWithin(crop.width, crop.height)).toEqual({ width: 580, height: 1080 });
  });

  it("leaves a crop that already fits alone", () => {
    expect(fitWithin(608, 810)).toEqual({ width: 608, height: 810 });
  });

  it("gives every phone's crop a size YouCam and our check take", () => {
    for (const [w, h] of [
      [810, 1080],
      [1031, 1920],
      [1080, 1920],
      [1440, 2560],
      [3024, 4032],
      [1920, 1080],
    ]) {
      const crop = centerCrop(w, h);
      const size = fitWithin(crop.width, crop.height);
      expect(Math.max(size.width, size.height)).toBeLessThanOrEqual(TONE_MAX_SIDE);
      expect(Math.min(size.width, size.height)).toBeGreaterThanOrEqual(TONE_MIN_SIDE);
    }
  });
});
