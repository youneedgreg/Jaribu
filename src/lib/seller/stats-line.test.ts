import { describe, expect, it } from "vitest";
import { statsLine } from "./stats-line";

describe("statsLine", () => {
  it("says zero plainly for a new wig", () => {
    expect(statsLine({ tryons: 0, orders: 0 })).toBe("0 try-ons started · 0 orders opened in WhatsApp");
  });

  it("uses the singular for one", () => {
    expect(statsLine({ tryons: 1, orders: 1 })).toBe("1 try-on started · 1 order opened in WhatsApp");
  });

  it("uses the plural above one", () => {
    expect(statsLine({ tryons: 12, orders: 3 })).toBe("12 try-ons started · 3 orders opened in WhatsApp");
  });
});
