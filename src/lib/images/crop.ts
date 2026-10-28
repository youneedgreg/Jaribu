// The skin-tone close-up is cropped in the browser before it's sent: Facial Color Tones wants
// the face wider than 60% of the photo, and Camera Kit's shadefinder shot on a phone came back
// with the face about 50% wide, centred (28 Oct). Keeping the middle 75% puts it near 67%.
// The crop is then shrunk to 1080 px: Camera Kit's size varies (810×1080 in one phone browser,
// about 1031×1920 in Samsung Internet on the same phone, 28 Oct).

/** How much of the close-up's width and height to keep, around its centre. */
export const TONE_CROP = 0.75;

/** Facial Color Tones refuses photos with a side under 320 px. */
export const TONE_MIN_SIDE = 320;

/** Facial Color Tones takes up to 4096 px, but anything over 1080 is shrunk before analysis. */
export const TONE_MAX_SIDE = 1080;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The centred rectangle keeping `keep` of each side, in whole pixels, same shape as the photo. */
export function centerCrop(width: number, height: number, keep = TONE_CROP): Rect {
  const w = Math.round(width * keep);
  const h = Math.round(height * keep);
  return { x: Math.floor((width - w) / 2), y: Math.floor((height - h) / 2), width: w, height: h };
}

/** The size that fits `width`×`height` within `maxSide` on its long side, same shape; never enlarged. */
export function fitWithin(width: number, height: number, maxSide = TONE_MAX_SIDE): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}
