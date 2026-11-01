import { ImageResponse } from "next/og";

export const alt = "Jaribu: see the wig on your face before you pay.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The link preview for any page without a wig photo of its own. */
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 28,
        padding: 90,
        background: "#4a1d3f",
        color: "#fff8f1",
      }}
    >
      <div style={{ fontSize: 44 }}>Jaribu</div>
      <div style={{ fontSize: 84, lineHeight: 1.08 }}>See the wig on your face before you pay.</div>
    </div>,
    size,
  );
}
