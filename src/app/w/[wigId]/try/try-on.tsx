"use client";

import { useEffect, useRef, useState } from "react";
import { capture, CameraKitError, hairShots, loadCameraKit, type HairShots, type Shot } from "@/lib/camera-kit/camera-kit";
import { formatKes, type Wig } from "@/lib/shop/demo";
import { requestTryOn } from "@/lib/tryon/client";
import { BeforeAfter } from "./before-after";

const MAX_SIDE = 1024;

type State = { step: "idle" } | { step: "working"; label: string; detail?: string } | { step: "failed"; message: string };

/** What the camera took. Only the front shot is sent for now; the checks (step E) use the rest. */
interface Captures {
  hair: HairShots;
  tone: Shot | null;
}

/** The photo sent for every wig: shrunk once, reused when the shopper tries another wig. */
interface Selfie {
  blob: Blob;
  url: string;
  width: number;
  height: number;
}

/** Shrinks a photo to a JPG whose long side is at most 1024 px, upright. */
async function toTryOnJpeg(photo: Blob): Promise<Omit<Selfie, "url">> {
  const bitmap = await createImageBitmap(photo, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't read that photo."))), "image/jpeg", 0.9),
  );
  return { blob, width: canvas.width, height: canvas.height };
}

const errorOf = (body: unknown) => (body as { error?: { code?: string; message?: string } } | null)?.error;
const ON_THIS_PHONE = "Something went wrong on this phone. Check the connection and try again.";

function cameraMessage(code: string): string {
  switch (code) {
    case "error_permission_denied":
      return "Camera access is blocked. Allow the camera for this site in your browser settings, or upload a photo instead.";
    case "error_resolution_unsupported":
      return "This phone's camera can't run the guided capture. Upload a photo instead.";
    case "load_failed":
      return "The guided camera didn't load. Check the connection, or upload a photo instead.";
    default:
      return "We couldn't open the camera. Upload a photo instead.";
  }
}

export function TryOn({ wigs, firstWigId }: { wigs: Wig[]; firstWigId: string }) {
  const [state, setState] = useState<State>({ step: "idle" });
  // null while we ask the server whether this device already entered the code.
  const [needsCode, setNeedsCode] = useState<boolean | null>(null);
  const [mode, setMode] = useState<"camera" | "upload">("camera");
  const [cameraNote, setCameraNote] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<Selfie | null>(null);
  const [wigId, setWigId] = useState(firstWigId);
  // Finished previews by wig id, so going back to a wig already tried costs nothing.
  const [results, setResults] = useState<Record<string, string>>({});
  const [captures, setCaptures] = useState<Captures | null>(null);
  const [debug, setDebug] = useState(false);
  const cancelled = useRef(false);

  const wig = wigs.find((w) => w.id === wigId) ?? wigs[0];
  const result = results[wig.id];

  useEffect(() => {
    cancelled.current = false;
    fetch("/api/access")
      .then((res) => res.json())
      .then((body: { granted?: boolean }) => !cancelled.current && setNeedsCode(!body.granted))
      .catch(() => !cancelled.current && setNeedsCode(true));
    return () => {
      cancelled.current = true;
      (window as Window & { YMK?: { close(): void } }).YMK?.close();
    };
  }, []);

  useEffect(() => () => void (selfie && URL.revokeObjectURL(selfie.url)), [selfie]);

  async function checkCode(form: HTMLFormElement) {
    const code = new FormData(form).get("accessCode");
    setState({ step: "working", label: "Checking the code…" });
    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: typeof code === "string" ? code : "" }),
      });
      if (!res.ok) {
        return setState({ step: "failed", message: errorOf(await res.json().catch(() => null))?.message ?? "We couldn't check the code." });
      }
      setNeedsCode(false);
      setState({ step: "idle" });
    } catch {
      setState({ step: "failed", message: ON_THIS_PHONE });
    }
  }

  async function startCamera() {
    setCameraNote(null);
    try {
      setState({ step: "working", label: "Opening the camera…" });
      const kit = await loadCameraKit();
      setState({ step: "working", label: "Face the camera, then turn right, then turn left." });
      const hair = hairShots(await capture(kit, "hairtype"));
      setState({ step: "working", label: "Now a close-up of your face." });
      const tone = (await capture(kit, "shadefinder"))[0] ?? null;
      setCaptures({ hair, tone });
      // Testing aid: ?debug shows what Camera Kit returned. The photos stay on this phone.
      setDebug(new URLSearchParams(window.location.search).has("debug"));
      await takePhoto(hair.front.image);
    } catch (error) {
      if (!(error instanceof CameraKitError)) {
        return setState({ step: "failed", message: "Something went wrong on this phone. Please try again." });
      }
      if (error.code === "closed") return setState({ step: "idle" });
      setMode("upload");
      setCameraNote(cameraMessage(error.code));
      setState({ step: "idle" });
    }
  }

  async function takePhoto(photo: Blob) {
    let next: Selfie;
    try {
      setState({ step: "working", label: "Preparing your photo…" });
      const shrunk = await toTryOnJpeg(photo);
      next = { ...shrunk, url: URL.createObjectURL(shrunk.blob) };
    } catch {
      return setState({ step: "failed", message: "We couldn't read that photo. Try another one." });
    }
    setSelfie(next);
    setResults({});
    await tryWig(firstWigId, next, {});
  }

  async function tryWig(id: string, photo = selfie, done = results) {
    setWigId(id);
    if (!photo || done[id]) return setState({ step: "idle" });
    const outcome = await requestTryOn(photo.blob, id, {
      isCancelled: () => cancelled.current,
      onProgress: (p) =>
        setState(
          p.stage === "starting"
            ? { step: "working", label: "Sending your photo with the wig…" }
            : { step: "working", label: `Putting the wig on… ${p.seconds} s`, detail: "Usually about 10 seconds." },
        ),
    });
    if (outcome.ok) {
      setResults((r) => ({ ...r, [id]: outcome.resultUrl }));
      return setState({ step: "idle" });
    }
    if (outcome.code === "cancelled") return;
    if (outcome.code === "access_code") setNeedsCode(true);
    setState({ step: "failed", message: outcome.message });
  }

  function startOver() {
    setSelfie(null);
    setResults({});
    setCaptures(null);
    setWigId(firstWigId);
    setMode("camera");
    setState({ step: "idle" });
  }

  const busy = state.step === "working" || needsCode === null;
  const button =
    "rounded-md bg-zinc-900 px-4 py-3 font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900";
  const link = "self-start text-sm text-zinc-600 underline underline-offset-4 disabled:opacity-50 dark:text-zinc-400";
  const status = (
    <p role="status" aria-live="polite" className="text-sm">
      {state.step === "working" && state.label}
      {state.step === "failed" && <span className="text-red-700 dark:text-red-400">{state.message}</span>}
    </p>
  );

  return (
    <div className="flex flex-col gap-6">
      {needsCode ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy) void checkCode(e.currentTarget);
          }}
        >
          <label className="flex flex-col gap-1 text-sm font-medium">
            Access code (asked once on this device)
            <input
              name="accessCode"
              type="password"
              autoComplete="off"
              className="rounded-md border border-zinc-300 px-3 py-2 font-normal dark:border-zinc-700 dark:bg-zinc-900"
              disabled={busy}
            />
          </label>
          <button type="submit" disabled={busy} className={button}>
            Continue
          </button>
          {status}
        </form>
      ) : selfie ? (
        <section className="flex flex-col gap-3" aria-label="Your preview">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-lg font-semibold">{wig.name}</h2>
            <p className="font-medium">{formatKes(wig.priceKes)}</p>
          </div>

          {result ? (
            <BeforeAfter
              before={selfie.url}
              after={result}
              afterAlt={`You wearing the ${wig.name} wig, preview`}
              width={selfie.width}
              height={selfie.height}
            />
          ) : (
            <div className="relative overflow-hidden rounded-md" style={{ aspectRatio: `${selfie.width} / ${selfie.height}` }}>
              {/* Local object URL: next/image can't optimise it, and shouldn't. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selfie.url} alt="Your photo" className="absolute inset-0 h-full w-full object-cover" />
              {state.step === "working" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/55 p-4 text-center text-white">
                  <span aria-hidden className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-white/30 border-t-white" />
                  <p className="font-medium">{state.label}</p>
                  {state.detail && <p className="text-sm text-white/80">{state.detail}</p>}
                </div>
              )}
            </div>
          )}

          {result && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Preview: how the style may look, not a fit guarantee. Drag across the photo to compare.
            </p>
          )}
          <p role="status" aria-live="polite" className="sr-only">
            {state.step === "working" ? state.label : result ? `Preview of ${wig.name} ready.` : ""}
          </p>

          {state.step === "failed" && (
            <div className="flex flex-col gap-2">
              <p role="alert" className="text-sm text-red-700 dark:text-red-400">
                {state.message}
              </p>
              <button type="button" className={button} onClick={() => void tryWig(wig.id)}>
                Try again
              </button>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <h3 className="text-sm font-medium">Try another wig with the same photo</h3>
            <ul className="grid grid-cols-4 gap-2">
              {wigs.map((w) => (
                <li key={w.id}>
                  <button
                    type="button"
                    disabled={busy}
                    aria-pressed={w.id === wig.id}
                    onClick={() => void tryWig(w.id)}
                    className="flex w-full flex-col gap-1 text-left text-xs disabled:opacity-50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={w.photo}
                      alt=""
                      className={`aspect-[3/4] w-full rounded object-cover ${w.id === wig.id ? "ring-2 ring-zinc-900 dark:ring-zinc-100" : ""}`}
                    />
                    <span>{w.name}</span>
                    {results[w.id] && w.id !== wig.id && <span className="text-zinc-500">Tried</span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <button type="button" disabled={busy} className={link} onClick={startOver}>
            Take the photos again
          </button>
        </section>
      ) : mode === "camera" ? (
        <div className="flex flex-col gap-4">
          <ol className="list-decimal pl-5 text-sm text-zinc-600 dark:text-zinc-400">
            <li>Let your hair down, in daylight if you can.</li>
            <li>Hold the phone at arm&apos;s length so your shoulders and some space above your hair show.</li>
            <li>The camera takes three photos: facing it, turned right, turned left. Then a close-up of your face.</li>
          </ol>
          <button type="button" disabled={busy} className={button} onClick={() => void startCamera()}>
            {state.step === "working" ? "Working…" : `Try on ${wig.name}`}
          </button>
          <button type="button" disabled={busy} className={link} onClick={() => setMode("upload")}>
            Upload a photo instead
          </button>
          {status}
        </div>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const file = new FormData(e.currentTarget).get("selfie");
            if (busy) return;
            if (!(file instanceof File) || !file.size) return setState({ step: "failed", message: "Choose a photo first." });
            void takePhoto(file);
          }}
        >
          {cameraNote && <p className="text-sm text-amber-800 dark:text-amber-300">{cameraNote}</p>}
          <label className="flex flex-col gap-1 text-sm font-medium">
            Your photo: face forward, shoulders showing, some space above your hair
            <input name="selfie" type="file" accept="image/*" className="text-sm font-normal" disabled={busy} />
          </label>
          <button type="submit" disabled={busy} className={button}>
            {state.step === "working" ? "Working…" : `Try on ${wig.name}`}
          </button>
          <button
            type="button"
            disabled={busy}
            className={link}
            onClick={() => {
              setCameraNote(null);
              setMode("camera");
            }}
          >
            Use the guided camera instead
          </button>
          {status}
        </form>
      )}

      {/* Camera Kit draws its own UI here; React must leave this div's children alone. */}
      <div id="YMK-module" />

      {debug && captures && <CaptureDetails captures={captures} result={result} />}
    </div>
  );
}

/** Testing aid (?debug): what Camera Kit returned, measured from the photos themselves. */
function CaptureDetails({ captures, result }: { captures: Captures; result: string | undefined }) {
  const [rows, setRows] = useState<{ label: string; url: string; text: string }[]>([]);
  const [resultSize, setResultSize] = useState<string | null>(null);

  useEffect(() => {
    const shots: [string, Shot | null][] = [
      ["Front", captures.hair.front],
      ["Right", captures.hair.right],
      ["Left", captures.hair.left],
      ["Tone", captures.tone],
    ];
    const urls: string[] = [];
    let live = true;
    Promise.all(
      shots.flatMap(([label, shot]) =>
        shot
          ? [
              createImageBitmap(shot.image).then((bitmap) => {
                const url = URL.createObjectURL(shot.image);
                urls.push(url);
                const text = `${label}: reported ${shot.width}×${shot.height}, actual ${bitmap.width}×${bitmap.height}, ${shot.image.type || "no type"}, ${Math.round(shot.image.size / 1024)} KB`;
                bitmap.close();
                return { label, url, text };
              }),
            ]
          : [],
      ),
    ).then((r) => live && setRows(r));
    return () => {
      live = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [captures]);

  return (
    <section className="flex flex-col gap-2 rounded-md border border-dashed border-zinc-400 p-3 text-xs">
      <h2 className="font-semibold">Capture details (testing only, nothing here is uploaded)</h2>
      <p>Hair type photos the same size: {captures.hair.sameSize ? "yes" : "no"}</p>
      {result && (
        <p>
          Preview result: {resultSize ?? "measuring…"}
          {/* Hidden copy of the result, only to read its pixel size. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result}
            alt=""
            hidden
            onLoad={(e) => setResultSize(`${e.currentTarget.naturalWidth}×${e.currentTarget.naturalHeight}`)}
          />
        </p>
      )}
      {rows.map((row) => (
        <figure key={row.label} className="flex flex-col gap-1">
          <figcaption>{row.text}</figcaption>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={row.url} alt={`${row.label} capture`} className="w-full rounded border border-zinc-300" />
        </figure>
      ))}
    </section>
  );
}
