import { describe, expect, it } from "vitest";
import { capture, CameraKitError, failureCode, hairShots, type CameraKit, type Shot } from "./camera-kit";

// A fake YMK: records calls and lets a test fire events at the listeners.
function fakeKit({ firesClosedOnClose = true } = {}) {
  const listeners = new Map<number, { event: string; callback: (payload: unknown) => void }>();
  const calls: string[] = [];
  let next = 0;
  const fire = (event: string, payload?: unknown) => {
    for (const l of [...listeners.values()]) if (l.event === event) l.callback(payload);
  };
  const kit: CameraKit = {
    init: (args) => void calls.push(`init:${args.faceDetectionMode}:${args.imageFormat}`),
    openCameraKit: () => void calls.push("open"),
    close: () => {
      calls.push("close");
      if (firesClosedOnClose) queueMicrotask(() => fire("closed"));
    },
    addEventListener: (event, callback) => (listeners.set(++next, { event, callback }), next),
    removeEventListener: (id) => void listeners.delete(id as number),
  };
  return { kit, calls, fire, listenerCount: () => listeners.size };
}

const shot = (phase: number, width = 720, height = 960): Shot => ({ phase, image: new Blob(["x"]), width, height });

describe("capture", () => {
  it("opens the mode asked for and resolves with the photos as blobs, then closes", async () => {
    const { kit, calls, fire, listenerCount } = fakeKit();
    const result = capture(kit, "hairtype");
    expect(calls).toEqual(["init:hairtype:blob", "open"]);

    fire("faceDetectionCaptured", {
      mode: "hairtype",
      images: [
        { phase: 0, image: new Blob(["a"], { type: "image/jpeg" }), width: 720, height: 960 },
        { phase: 1, image: "data:image/jpeg;base64,Yg==", width: 720, height: 960 },
      ],
    });
    const shots = await result;

    expect(shots.map((s) => [s.phase, s.width, s.height])).toEqual([
      [0, 720, 960],
      [1, 720, 960],
    ]);
    expect(await shots[1].image.text()).toBe("b");
    expect(calls.at(-1)).toBe("close");
    expect(listenerCount()).toBe(0);
  });

  it("rejects with the camera's code when it fails", async () => {
    const { kit, fire } = fakeKit();
    const result = capture(kit, "shadefinder");
    fire("cameraFailed", "error_permission_denied");
    await expect(result).rejects.toMatchObject({ name: "CameraKitError", code: "error_permission_denied" });
  });

  it("rejects when the resolution is too low or the shopper closes it", async () => {
    const low = fakeKit();
    const lowResult = capture(low.kit, "hairtype");
    low.fire("unsupportedResolution");
    await expect(lowResult).rejects.toMatchObject({ code: "error_resolution_unsupported" });

    const closed = fakeKit();
    const closedResult = capture(closed.kit, "hairtype");
    closed.fire("closed");
    await expect(closedResult).rejects.toMatchObject({ code: "closed" });
    expect(closed.listenerCount()).toBe(0);
  });

  it("settles once, and doesn't hang if close never reports back", async () => {
    const { kit, fire } = fakeKit({ firesClosedOnClose: false });
    const result = capture(kit, "hairtype");
    fire("faceDetectionCaptured", { images: [{ phase: 0, image: new Blob(["a"]) }] });
    fire("cameraFailed", "error_access_failed");
    await expect(result).resolves.toHaveLength(1);
  });
});

describe("failureCode", () => {
  it("reads a string or an object, with a fallback", () => {
    expect(failureCode("error_access_failed")).toBe("error_access_failed");
    expect(failureCode({ code: "error_permission_denied" })).toBe("error_permission_denied");
    expect(failureCode({ error: "error_resolution_unsupported" })).toBe("error_resolution_unsupported");
    expect(failureCode(undefined)).toBe("error_access_failed");
  });
});

describe("hairShots", () => {
  it("puts the phases in Hair Type Detection's order: front, right, left", () => {
    const shots = hairShots([shot(2), shot(0), shot(1)]);
    expect([shots.front.phase, shots.right.phase, shots.left.phase]).toEqual([0, 1, 2]);
    expect(shots.sameSize).toBe(true);
  });

  it("flags photos of different sizes and refuses a missing phase", () => {
    expect(hairShots([shot(0), shot(1, 960, 720), shot(2)]).sameSize).toBe(false);
    expect(() => hairShots([shot(0), shot(1)])).toThrow(CameraKitError);
  });
});
