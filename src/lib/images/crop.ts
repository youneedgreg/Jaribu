// The skin-tone close-up is cropped in the browser before it's sent: Facial Color Tones wants
// the face wider than 60% of the photo, and Camera Kit's shadefinder shot on a phone came back
// with the face about 50% wide, centred (28 Oct). Keeping the middle 75% puts it near 67%.

/** How much of the close-up's width and height to keep, around its centre. */
export const TONE_CROP = 0.75;

/** Facial Color Tones refuses photos with a side under 320 px. */
export const TONE_MIN_SIDE = 320;

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
