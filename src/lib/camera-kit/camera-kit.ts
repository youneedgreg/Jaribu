// YouCam's JS Camera Kit (v2.5): guided capture in the browser with live face, pose and
// lighting checks. It needs no API key and costs no units. Docs: "JS Camera Kit" on
// https://docs.perfectcorp.com/reference/ai_hair_type_detection (the .md copy is incomplete).
// Checked against the script itself: listener ids are numbers and `cameraFailed` sends a code string.

export const CAMERA_KIT_URL = "https://plugins-media.makeupar.com/v2.5-camera-kit/sdk.js";
const LOAD_TIMEOUT_MS = 20_000;
const CLOSE_WAIT_MS = 1_500;

/** `hairtype`: front, turn right, turn left. `shadefinder`: a front close-up for skin tone. */
export type CameraKitMode = "hairtype" | "shadefinder";

export interface CameraKitInit {
  faceDetectionMode: CameraKitMode;
  imageFormat: "base64" | "blob";
  language: "enu";
  width?: number;
  height?: number;
  qualityLevel?: "relaxed" | "moderate" | "strict";
}

/** The parts of the global `YMK` object we use. */
export interface CameraKit {
  init(args: CameraKitInit): void;
  openCameraKit(): void;
  close(): void;
  addEventListener(event: string, callback: (payload: unknown) => void): unknown;
  removeEventListener(id: unknown): void;
}

/** One captured photo. `phase` is the zero-based capture step; width and height are as reported. */
export interface Shot {
  phase: number;
  image: Blob;
  width: number;
  height: number;
}

/**
 * Why capture stopped without photos: `closed` (the shopper closed it), `load_failed`, or a
 * Camera Kit code such as `error_permission_denied`, `error_access_failed`,
 * `error_resolution_unsupported`.
 */
export class CameraKitError extends Error {
  constructor(readonly code: string) {
    super(`Camera Kit: ${code}`);
    this.name = "CameraKitError";
  }
}

type CameraKitWindow = Window & { YMK?: CameraKit; ymkAsyncInit?: () => void; YMKAsyncInit?: () => void };

let loading: Promise<CameraKit> | null = null;

/**
 * Loads the SDK once and resolves when it says it's ready. The docs name the ready hook
 * `YMKAsyncInit`, but the v2.5 script only calls `window.ymkAsyncInit` (checked 27 Oct), and
 * only if it exists before the script runs. Both are set in case a later version follows the docs.
 */
export function loadCameraKit(): Promise<CameraKit> {
  const w = window as CameraKitWindow;
  if (loading) return loading;
  if (w.YMK) return Promise.resolve(w.YMK);
  loading = new Promise<CameraKit>((resolve, reject) => {
    const script = document.createElement("script");
    const fail = () => {
      clearTimeout(timer);
      loading = null;
      script.remove();
      reject(new CameraKitError("load_failed"));
    };
    const timer = setTimeout(fail, LOAD_TIMEOUT_MS);
    w.ymkAsyncInit = w.YMKAsyncInit = () => {
      clearTimeout(timer);
      if (w.YMK) resolve(w.YMK);
      else fail();
    };
    script.src = CAMERA_KIT_URL;
    script.async = true;
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return loading;
}

/** Camera Kit sends a code string, or an object holding one; the docs don't say which. */
export function failureCode(payload: unknown): string {
  if (typeof payload === "string" && payload) return payload;
  const p = payload as { code?: unknown; error?: unknown; errorCode?: unknown } | null;
  for (const value of [p?.code, p?.error, p?.errorCode]) if (typeof value === "string" && value) return value;
  return "error_access_failed";
}

async function toBlob(image: unknown): Promise<Blob> {
  if (image instanceof Blob) return image;
  if (typeof image === "string" && image.startsWith("data:")) return (await fetch(image)).blob();
  throw new CameraKitError("bad_image");
}

/** Closes the module and waits for its `closed` event, so the next capture starts clean. */
function closeAndWait(kit: CameraKit): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      kit.removeEventListener(id);
      resolve();
    };
    const timer = setTimeout(done, CLOSE_WAIT_MS);
    const id = kit.addEventListener("closed", done);
    kit.close();
  });
}

/**
 * Opens Camera Kit in `mode` (it renders into `<div id="YMK-module">`) and resolves with the
 * photos once every quality check has passed. Rejects with a CameraKitError if the camera
 * can't be used or the shopper closes it.
 */
export function capture(kit: CameraKit, mode: CameraKitMode): Promise<Shot[]> {
  return new Promise((resolve, reject) => {
    const ids: unknown[] = [];
    let settled = false;
    const on = (event: string, callback: (payload: unknown) => void) => ids.push(kit.addEventListener(event, callback));
    const settle = async (outcome: () => Promise<Shot[]>, close: boolean) => {
      if (settled) return;
      settled = true;
      for (const id of ids) kit.removeEventListener(id);
      if (close) await closeAndWait(kit);
      outcome().then(resolve, reject);
    };

    on("faceDetectionCaptured", (payload) => {
      const images = (payload as { images?: { phase?: number; image?: unknown; width?: number; height?: number }[] } | null)?.images ?? [];
      void settle(
        () =>
          Promise.all(
            images.map(async (item, i) => ({
              phase: item.phase ?? i,
              image: await toBlob(item.image),
              width: item.width ?? 0,
              height: item.height ?? 0,
            })),
          ),
        true,
      );
    });
    on("cameraFailed", (payload) => void settle(() => Promise.reject(new CameraKitError(failureCode(payload))), true));
    on("unsupportedResolution", () => void settle(() => Promise.reject(new CameraKitError("error_resolution_unsupported")), true));
    on("closed", () => void settle(() => Promise.reject(new CameraKitError("closed")), false));

    kit.init({ faceDetectionMode: mode, imageFormat: "blob", language: "enu" });
    kit.openCameraKit();
  });
}

/** The three hairtype photos, in Hair Type Detection's order: front, right, left. */
export interface HairShots {
  front: Shot;
  right: Shot;
  left: Shot;
  /** Hair Type Detection refuses three photos of different sizes. */
  sameSize: boolean;
}

export function hairShots(shots: Shot[]): HairShots {
  const byPhase = (phase: number) => {
    const shot = shots.find((s) => s.phase === phase);
    if (!shot) throw new CameraKitError("missing_phase");
    return shot;
  };
  const [front, right, left] = [byPhase(0), byPhase(1), byPhase(2)];
  const sameSize = [right, left].every((s) => s.width === front.width && s.height === front.height);
  return { front, right, left, sameSize };
}
