"use client";

import { useEffect, useRef, useState } from "react";

const MAX_SIDE = 1024;
const POLL_MS = 3000;
const GIVE_UP_MS = 3 * 60_000;

type State =
  | { step: "idle" }
  | { step: "working"; label: string }
  | { step: "done"; resultUrl: string; seconds: number }
  | { step: "failed"; message: string };

/** Shrinks a phone photo to a JPG whose long side is at most 1024 px, upright. */
async function toTryOnJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
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

export function TryOn({ wigId, wigName }: { wigId: string; wigName: string }) {
  const [state, setState] = useState<State>({ step: "idle" });
  // null while we ask the server whether this device already entered the code.
  const [needsCode, setNeedsCode] = useState<boolean | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    fetch("/api/access")
      .then((res) => res.json())
      .then((body: { granted?: boolean }) => !cancelled.current && setNeedsCode(!body.granted))
      .catch(() => !cancelled.current && setNeedsCode(true));
    return () => {
      cancelled.current = true;
    };
  }, []);

  useEffect(() => () => void (selfiePreview && URL.revokeObjectURL(selfiePreview)), [selfiePreview]);

  async function run(form: HTMLFormElement) {
    const data = new FormData(form);
    const selfieFile = data.get("selfie");
    if (!(selfieFile instanceof File) || !selfieFile.size) {
      setState({ step: "failed", message: "Choose a photo first." });
      return;
    }

    const started = Date.now();
    try {
      setState({ step: "working", label: "Preparing your photo…" });
      const selfie = await toTryOnJpeg(selfieFile);
      setSelfiePreview(URL.createObjectURL(selfie));

      const body = new FormData();
      body.set("wigId", wigId);
      body.set("selfie", selfie, "selfie.jpg");
      const code = data.get("accessCode");
      if (typeof code === "string" && code) body.set("accessCode", code);
      setState({ step: "working", label: "Starting the preview…" });
      const res = await fetch("/api/tryon", { method: "POST", body });
      const startBody = await res.json().catch(() => null);
      if (!res.ok) {
        const error = errorOf(startBody);
        if (error?.code === "access_code") setNeedsCode(true);
        return setState({ step: "failed", message: error?.message ?? "We couldn't start the preview." });
      }
      setNeedsCode(false);
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

  return (
    <div className="flex flex-col gap-6">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy) void run(e.currentTarget);
        }}
      >
        <label className="flex flex-col gap-1 text-sm font-medium">
          Your photo: face forward, shoulders showing, some space above your hair
          <input name="selfie" type="file" accept="image/*" className="text-sm font-normal" disabled={busy} />
        </label>
        {needsCode && (
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
        )}
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-zinc-900 px-4 py-3 font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {state.step === "working" ? "Working…" : `Try on ${wigName}`}
        </button>
      </form>

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
    </div>
  );
}
