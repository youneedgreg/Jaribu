import { swatchDataUrl } from "@/lib/images/swatch";

/** A round colour swatch, drawn as an image so forced dark modes leave its colour alone. */
export function Swatch({ hex, className = "h-5 w-5" }: { hex: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={swatchDataUrl(hex)}
      alt=""
      aria-hidden
      className={`inline-block shrink-0 rounded-full border border-black/10 ${className}`}
    />
  );
}
