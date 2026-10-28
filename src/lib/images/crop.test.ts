import { describe, expect, it } from "vitest";
import { centerCrop, TONE_CROP, TONE_MIN_SIDE } from "./crop";

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
