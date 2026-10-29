"use client";

import { useState } from "react";
import { blend } from "@/lib/checks/blend";
import { matchLace } from "@/lib/checks/lace";
import type { Colorway } from "@/lib/shop/catalog";
import type { Wig } from "@/lib/shop/demo";
import type { TaskRef } from "@/lib/tryon/client";
import type { HairState } from "./blend-check";
import type { ToneState } from "./lace-match";

/** The preview on screen and which API made it, so the order points at the right picture. */
export interface ShownPreview {
  url: string;
  task: TaskRef;
  api: "hairstyle" | "haircolor";
}

type Created = { message: string; whatsappUrl: string };

type Status =
  | { step: "idle" }
  | { step: "sending" }
  /** WhatsApp was asked to open; the link stays in case it didn't. */
  | { step: "sent"; whatsappUrl: string }
  /** The share sheet needs a fresh tap once the order is saved. */
  | { step: "share"; file: File; message: string }
  | { step: "failed"; message: string };

const errorOf = (body: unknown) => (body as { error?: { message?: string } } | null)?.error;

const button =
  "rounded-md bg-zinc-900 px-4 py-3 font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900";
const link = "self-start text-sm text-zinc-600 underline underline-offset-4 disabled:opacity-50 dark:text-zinc-400";
const choice = "flex items-center gap-2 py-1 text-sm";
const hint = "text-zinc-600 dark:text-zinc-400";

/** Order on WhatsApp: the shopper picks how it's made and the lace, then the seller's chat opens. */
export function OrderPanel({
  wig,
  ordersOpen,
  shown,
  colorway,
  tone,
  hair,
  disabled,
}: {
  wig: Wig;
  ordersOpen: boolean;
  shown: ShownPreview;
  colorway: Colorway | null;
  tone: ToneState;
  hair: HairState;
  disabled: boolean;
}) {
  // null: use the checks' suggestion until the shopper picks.
  const [constructionId, setConstructionId] = useState<string | null>(null);
  const [laceShadeId, setLaceShadeId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ step: "idle" });
  // Only shown after a try-on, so never rendered on the server.
  const [canShareFiles] = useState(() =>
    Boolean(navigator.canShare?.({ files: [new File([new Uint8Array(1)], "preview.jpg", { type: "image/jpeg" })] })),
  );

  const suggestedConstruction =
    hair.step === "done"
      ? wig.constructions.find((c) => blend(hair.hair, wig.textureRange, c, wig.constructions).verdict !== "may_show")
      : undefined;
  const lace = tone.step === "done" ? matchLace(tone.skinHex, wig.laceShades) : null;
  const suggestedLace = lace && lace.verdict !== "no_shades" ? lace.shade.id : null;
  const construction = constructionId ?? suggestedConstruction?.id ?? wig.constructions[0]?.id ?? "";
  const laceShade = laceShadeId ?? suggestedLace;

  if (!ordersOpen) {
    return (
      <section className="flex flex-col gap-2 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
        <h3 className="font-medium">Order on WhatsApp</h3>
        <p className={`text-sm ${hint}`}>
          This is a sample shop, so ordering is off. In a seller&apos;s shop, this sends your order to the seller on WhatsApp.
        </p>
      </section>
    );
  }

  async function createOrder(): Promise<Created | null> {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        wigId: wig.id,
        taskId: shown.task.taskId,
        ticket: shown.task.ticket,
        api: shown.api,
        colorwayId: colorway?.id ?? null,
        constructionId: construction,
        laceShadeId: wig.laceShades.length > 0 ? laceShade : null,
      }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      setStatus({ step: "failed", message: errorOf(body)?.message ?? "We couldn't send the order. Please try again." });
      return null;
    }
    return body as Created;
  }

  async function order() {
    setStatus({ step: "sending" });
    try {
      const created = await createOrder();
      if (!created) return;
      setStatus({ step: "sent", whatsappUrl: created.whatsappUrl });
      window.location.assign(created.whatsappUrl);
    } catch {
      setStatus({ step: "failed", message: "Something went wrong on this phone. Check the connection and try again." });
    }
  }

  async function sharePicture(file: File, message: string) {
    try {
      await navigator.share({ files: [file], text: message });
      setStatus({ step: "idle" });
    } catch (error) {
      const name = (error as Error).name;
      if (name === "AbortError") return setStatus({ step: "idle" });
      // The tap that started this has expired while the order was saved: ask for another.
      if (name === "NotAllowedError") return setStatus({ step: "share", file, message });
      setStatus({ step: "failed", message: "This phone couldn't share the picture. Use Order on WhatsApp instead." });
    }
  }

  async function orderWithPicture() {
    setStatus({ step: "sending" });
    try {
      const [created, picture] = await Promise.all([createOrder(), fetch(shown.url).then((r) => (r.ok ? r.blob() : null))]);
      if (!created) return;
      if (!picture) return setStatus({ step: "failed", message: "We couldn't load your preview picture. Use Order on WhatsApp instead." });
      const file = new File([picture], `${wig.name} preview.jpg`, { type: picture.type || "image/jpeg" });
      await sharePicture(file, created.message);
    } catch {
      setStatus({ step: "failed", message: "Something went wrong on this phone. Check the connection and try again." });
    }
  }

  const busy = disabled || status.step === "sending";
  const missingLace = wig.laceShades.length > 0 && !laceShade;

  return (
    <section className="flex flex-col gap-3 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
      <h3 className="font-medium">Order on WhatsApp</h3>
      <fieldset disabled={busy}>
        <legend className="mb-1 text-sm font-medium">Made as</legend>
        {wig.constructions.map((c) => (
          <label key={c.id} className={choice}>
            <input type="radio" name="construction" value={c.id} checked={construction === c.id} onChange={() => setConstructionId(c.id)} />
            {c.name}
            {c.id === suggestedConstruction?.id && wig.constructions.some((o) => o.leaveOut) && (
              <span className={hint}>(may blend best, from the blend check)</span>
            )}
          </label>
        ))}
      </fieldset>
      {wig.laceShades.length > 0 && (
        <fieldset disabled={busy}>
          <legend className="mb-1 text-sm font-medium">Lace shade</legend>
          {wig.laceShades.map((l) => (
            <label key={l.id} className={choice}>
              <input type="radio" name="laceShade" value={l.id} checked={laceShade === l.id} onChange={() => setLaceShadeId(l.id)} />
              {l.name}
              {l.id === suggestedLace && <span className={hint}>(nearest your skin tone, from the lace match)</span>}
            </label>
          ))}
        </fieldset>
      )}
      <p className="text-sm">
        Colour: {colorway ? `${colorway.code} ${colorway.name}` : "as in the listing photo"}
        <span className={hint}> (change it above)</span>
      </p>
      <p className={`text-sm ${hint}`}>
        The seller will see your preview picture through a private link that stops working 24 hours after the picture was made.
      </p>
      {status.step === "share" ? (
        <button type="button" className={button} onClick={() => void sharePicture(status.file, status.message)}>
          Share the picture now
        </button>
      ) : (
        <button type="button" disabled={busy || missingLace} className={button} onClick={() => void order()}>
          {status.step === "sending" ? "Opening WhatsApp…" : "Order on WhatsApp"}
        </button>
      )}
      {missingLace && <p className={`text-sm ${hint}`}>Pick a lace shade first.</p>}
      {status.step === "sent" && (
        <p role="status" className="text-sm">
          Your order is ready in WhatsApp: check the message, then send it.{" "}
          <a href={status.whatsappUrl} className="underline underline-offset-4">
            Open WhatsApp again
          </a>
        </p>
      )}
      {canShareFiles && status.step !== "share" && (
        <button type="button" disabled={busy || missingLace} className={link} onClick={() => void orderWithPicture()}>
          Or send the picture itself (you pick the seller&apos;s chat)
        </button>
      )}
      <p role="alert" className="text-sm text-red-700 dark:text-red-400">
        {status.step === "failed" ? status.message : null}
      </p>
    </section>
  );
}
