"use client";

import { useRef, useState, type PointerEvent } from "react";

const clamp = (value: number) => Math.min(100, Math.max(0, value));

/**
 * One photo the shopper drags across: her own photo on the left of the handle, the try-on on
 * the right. Both fill the frame of the photo she took, so they line up only if YouCam returns
 * the same size (?debug on the try page shows the result's size).
 * A range input underneath gives keyboard and screen-reader users the same control.
 */
export function BeforeAfter({
  before,
  after,
  afterAlt,
  width,
  height,
}: {
  before: string;
  after: string;
  afterAlt: string;
  width: number;
  height: number;
}) {
  const [position, setPosition] = useState(50);
  const frame = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const moveTo = (clientX: number) => {
    const box = frame.current?.getBoundingClientRect();
    if (box?.width) setPosition(clamp(((clientX - box.left) / box.width) * 100));
  };
  const start = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    moveTo(e.clientX);
  };
  const stop = () => void (dragging.current = false);

  return (
    <div
      ref={frame}
      // pan-y: vertical swipes still scroll the page; sideways drags move the handle.
      className="relative w-full cursor-ew-resize touch-pan-y select-none overflow-hidden rounded-md bg-zinc-200 dark:bg-zinc-800"
      style={{ aspectRatio: `${width} / ${height}` }}
      onPointerDown={start}
      onPointerMove={(e) => dragging.current && moveTo(e.clientX)}
      onPointerUp={stop}
      onPointerCancel={stop}
    >
      {/* Local object URL and a private route: next/image can't optimise these, and shouldn't. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={after} alt={afterAlt} draggable={false} className="absolute inset-0 h-full w-full object-cover" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={before}
        alt="Your photo, before"
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      />
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(position)}
        onChange={(e) => setPosition(Number(e.target.value))}
        aria-label="Compare your photo with the preview"
        className="peer sr-only"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -ml-px w-0.5 bg-white shadow-[0_0_4px_rgba(0,0,0,0.5)]"
        style={{ left: `${position}%` }}
      >
        <span className="absolute top-1/2 left-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-sm text-zinc-900 shadow">
          ⟷
        </span>
      </div>
      <span className="pointer-events-none absolute inset-0 rounded-md ring-zinc-900 peer-focus-visible:ring-4 dark:ring-zinc-100" />
      <span className="pointer-events-none absolute top-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">Before</span>
      <span className="pointer-events-none absolute top-2 right-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">Preview</span>
    </div>
  );
}
