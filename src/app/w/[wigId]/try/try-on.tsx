"use client";

import { useEffect, useRef, useState } from "react";
import { capture, CameraKitError, hairShots, loadCameraKit, type HairShots, type Shot } from "@/lib/camera-kit/camera-kit";

const MAX_SIDE = 1024;
const POLL_MS = 3000;
const GIVE_UP_MS = 3 * 60_000;

type State =
  | { step: "idle" }
  | { step: "working"; label: string }
  | { step: "done"; resultUrl: string; seconds: number }
  | { step: "failed"; message: string };

/** What the camera took. Only the front shot is sent for now; the checks (step E) use the rest. */
interface Captures {
  hair: HairShots;
  tone: Shot | null;
}

/** Shrinks a photo to a JPG whose long side is at most 1024 px, upright. */
async function toTryOnJpeg(photo: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(photo, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't read that photo."))), "image/jpeg", 0.9),
  );
}

const errorOf = (body: unknown) => (body as { error?: { code?: string; message?: string } } | null)?.error;

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

export function TryOn({ wigId, wigName }: { wigId: string; wigName: string }) {
  const [state, setState] = useState<State>({ step: "idle" });
  // null while we ask the server whether this device already entered the code.
  const [needsCode, setNeedsCode] = useState<boolean | null>(null);
  const [mode, setMode] = useState<"camera" | "upload">("camera");
  const [cameraNote, setCameraNote] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [captures, setCaptures] = useState<Captures | null>(null);
  const [debug, setDebug] = useState(false);
  const cancelled = useRef(false);

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

  useEffect(() => () => void (selfiePreview && URL.revokeObjectURL(selfiePreview)), [selfiePreview]);

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
      setState({ step: "failed", message: "Something went wrong on this phone. Check the connection and try again." });
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
      await run(hair.front.image);
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

  async function run(photo: Blob) {
    const started = Date.now();
    try {
      setState({ step: "working", label: "Preparing your photo…" });
      const selfie = await toTryOnJpeg(photo);
      setSelfiePreview(URL.createObjectURL(selfie));

      const body = new FormData();
      body.set("wigId", wigId);
      body.set("selfie", selfie, "selfie.jpg");
      setState({ step: "working", label: "Starting the preview…" });
      const res = await fetch("/api/tryon", { method: "POST", body });
      const startBody = await res.json().catch(() => null);
      if (!res.ok) {
        const error = errorOf(startBody);
        if (error?.code === "access_code") setNeedsCode(true);
        return setState({ step: "failed", message: error?.message ?? "We couldn't start the preview." });
      }
      const { taskId, ticket } = startBody as { taskId: string; ticket: string };

      while (!cancelled.current) {
        const seconds = Math.round((Date.now() - started) / 1000);
        if (Date.now() - started > GIVE_UP_MS) {
          return setState({ step: "failed", message: "This is taking too long. Please try again." });
        }
        setState({ step: "working", label: `Putting the wig on… ${seconds} s` });
        await new Promise((r) => setTimeout(r, POLL_MS));
        const poll = await fetch(`/api/tryon/${encodeURIComponent(taskId)}?ticket=${encodeURIComponent(ticket)}`);
        const pollBody = await poll.json().catch(() => null);
        // 502 means "try again"; anything else that isn't OK ends the attempt.
        if (poll.status === 502) continue;
        if (!poll.ok) return setState({ step: "failed", message: errorOf(pollBody)?.message ?? "Something went wrong." });
        if (pollBody.status === "success") {
          return setState({ step: "done", resultUrl: pollBody.resultUrl, seconds: Math.round((Date.now() - started) / 1000) });
        }
        if (pollBody.status === "error") {
          return setState({ step: "failed", message: `${pollBody.message}${pollBody.code ? ` (${pollBody.code})` : ""}` });
        }
      }
    } catch {
      setState({ step: "failed", message: "Something went wrong on this phone. Check the connection and try again." });
    }
  }

  const busy = state.step === "working" || needsCode === null;
  const button =
    "rounded-md bg-zinc-900 px-4 py-3 font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900";
  const link = "self-start text-sm text-zinc-600 underline underline-offset-4 disabled:opacity-50 dark:text-zinc-400";

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
        </form>
      ) : mode === "camera" ? (
        <div className="flex flex-col gap-4">
          <ol className="list-decimal pl-5 text-sm text-zinc-600 dark:text-zinc-400">
            <li>Let your hair down, in daylight if you can.</li>
            <li>Hold the phone at arm&apos;s length so your shoulders and some space above your hair show.</li>
            <li>The camera takes three photos: facing it, turned right, turned left. Then a close-up of your face.</li>
          </ol>
          <button type="button" disabled={busy} className={button} onClick={() => void startCamera()}>
            {state.step === "working" ? "Working…" : `Try on ${wigName}`}
          </button>
          <button type="button" disabled={busy} className={link} onClick={() => setMode("upload")}>
            Upload a photo instead
          </button>
        </div>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const file = new FormData(e.currentTarget).get("selfie");
            if (busy) return;
            if (!(file instanceof File) || !file.size) return setState({ step: "failed", message: "Choose a photo first." });
            void run(file);
          }}
        >
          {cameraNote && <p className="text-sm text-amber-800 dark:text-amber-300">{cameraNote}</p>}
          <label className="flex flex-col gap-1 text-sm font-medium">
            Your photo: face forward, shoulders showing, some space above your hair
            <input name="selfie" type="file" accept="image/*" className="text-sm font-normal" disabled={busy} />
          </label>
          <button type="submit" disabled={busy} className={button}>
            {state.step === "working" ? "Working…" : `Try on ${wigName}`}
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
        </form>
      )}

      {/* Camera Kit draws its own UI here; React must leave this div's children alone. */}
      <div id="YMK-module" />

      <p role="status" aria-live="polite" className="text-sm">
        {state.step === "working" && state.label}
        {state.step === "failed" && <span className="text-red-700 dark:text-red-400">{state.message}</span>}
        {state.step === "done" && `Done in ${state.seconds} s.`}
      </p>

      {state.step === "done" && (
        <figure className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            {selfiePreview && (
              // Local object URLs: next/image can't optimise these, and shouldn't.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selfiePreview} alt="Your photo, before" className="w-full rounded-md" />
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={state.resultUrl} alt={`You wearing the ${wigName} wig, preview`} className="w-full rounded-md" />
          </div>
          <figcaption className="text-sm text-zinc-600 dark:text-zinc-400">
            Preview: how the style may look, not a fit guarantee.
          </figcaption>
        </figure>
      )}

      {debug && captures && <CaptureDetails captures={captures} />}
    </div>
  );
}

/** Testing aid (?debug): what Camera Kit returned, measured from the photos themselves. */
function CaptureDetails({ captures }: { captures: Captures }) {
  const [rows, setRows] = useState<{ label: string; url: string; text: string }[]>([]);

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
      {rows.map((row) => (
        <figure key={row.label} className="flex flex-col gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={row.url} alt={`${row.label} capture`} className="w-full rounded border border-zinc-300" />
          <figcaption>{row.text}</figcaption>
        </figure>
      ))}
    </section>
  );
}
