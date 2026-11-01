"use client";

import { useEffect, useState } from "react";

/**
 * A photo field that reads as a big tap target and shows what was picked, in place of the
 * browser's plain file button. The input stays in the form, so `name` is read on submit as usual.
 */
export function PhotoPicker({
  name,
  label,
  disabled,
  accept = "image/*",
  onPick,
}: {
  name: string;
  label: string;
  disabled?: boolean;
  accept?: string;
  onPick?: (file: File | null) => void;
}) {
  const [picked, setPicked] = useState<{ name: string; url: string | null } | null>(null);

  useEffect(() => () => void (picked?.url && URL.revokeObjectURL(picked.url)), [picked]);

  return (
    <label className={`flex flex-col gap-2 ${disabled ? "opacity-50" : "cursor-pointer"}`}>
      <span className="font-medium">{label}</span>
      <input
        name={name}
        type="file"
        accept={accept}
        disabled={disabled}
        className="peer sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          setPicked(file && { name: file.name, url: URL.createObjectURL(file) });
          onPick?.(file);
        }}
      />
      <span className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-foreground/25 bg-card p-4 peer-focus-visible:ring-2 peer-focus-visible:ring-primary">
        {picked?.url ? (
          // Local object URL: next/image can't optimise it, and shouldn't.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={picked.url}
            alt=""
            className="h-20 w-16 shrink-0 rounded-xl object-cover"
            // A format this browser can't draw (HEIC): keep the file name, drop the picture.
            onError={() => setPicked((p) => p && { ...p, url: null })}
          />
        ) : (
          <span aria-hidden className="flex h-20 w-16 shrink-0 items-center justify-center rounded-xl bg-tint text-3xl text-muted">
            +
          </span>
        )}
        <span className="flex min-w-0 flex-col gap-1">
          <span className="font-medium">{picked ? "Photo chosen" : "Choose a photo"}</span>
          <span className="text-sm break-words text-muted">
            {picked ? `${picked.name}. Tap to choose a different one.` : "From your gallery or your camera."}
          </span>
        </span>
      </span>
    </label>
  );
}
