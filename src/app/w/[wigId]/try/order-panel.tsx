"use client";

import { useState } from "react";
import { card, errorText, primaryButton, sectionTitle } from "@/components/styles";
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

const link = "self-start py-1 text-left text-sm text-muted underline underline-offset-4 disabled:opacity-50";
const choice = "flex min-h-10 flex-wrap items-center gap-x-2 py-1";
const radio = "h-5 w-5 accent-primary";
const hint = "text-sm text-muted";

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
      <section className={`${card} flex flex-col gap-2`}>
        <h3 className={sectionTitle}>Order on WhatsApp</h3>
        <p className={hint}>
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
    <section className={`${card} flex flex-col gap-4`}>
      <h3 className={sectionTitle}>Order on WhatsApp</h3>
      <fieldset disabled={busy}>
        <legend className="mb-1 font-medium">Made as</legend>
        {wig.constructions.map((c) => (
          <label key={c.id} className={choice}>
            <input type="radio" name="construction" value={c.id} className={radio} checked={construction === c.id} onChange={() => setConstructionId(c.id)} />
            {c.name}
            {c.id === suggestedConstruction?.id && wig.constructions.some((o) => o.leaveOut) && (
              <span className={hint}>(may blend best, from the blend check)</span>
            )}
          </label>
        ))}
      </fieldset>
      {wig.laceShades.length > 0 && (
        <fieldset disabled={busy}>
          <legend className="mb-1 font-medium">Lace shade</legend>
          {wig.laceShades.map((l) => (
            <label key={l.id} className={choice}>
              <input type="radio" name="laceShade" value={l.id} className={radio} checked={laceShade === l.id} onChange={() => setLaceShadeId(l.id)} />
              {l.name}
              {l.id === suggestedLace && <span className={hint}>(nearest your skin tone, from the lace match)</span>}
            </label>
          ))}
        </fieldset>
      )}
      <p className="text-sm">
        Colour: {colorway ? `${colorway.code} ${colorway.name}` : "as in the listing photo"}
        <span className="text-muted"> (change it above)</span>
      </p>
      <p className={hint}>
        The seller will see your preview picture through a private link that stops working 24 hours after the picture was made.
      </p>
      {status.step === "share" ? (
        <button type="button" className={primaryButton} onClick={() => void sharePicture(status.file, status.message)}>
          Share the picture now
        </button>
      ) : (
        <button type="button" disabled={busy || missingLace} className={primaryButton} onClick={() => void order()}>
          {status.step === "sending" ? "Opening WhatsApp…" : "Order on WhatsApp"}
        </button>
      )}
      {missingLace && <p className={hint}>Pick a lace shade first.</p>}
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
      <p role="alert" className={errorText}>
        {status.step === "failed" ? status.message : null}
      </p>
    </section>
  );
}
