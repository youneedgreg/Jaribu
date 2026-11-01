export interface WigStats {
  tryons: number;
  orders: number;
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * A wig's numbers in words. "Started" because a try-on is counted when it starts, so one that
 * later fails is included. "Opened" because an order is saved when the shopper taps the button:
 * we can't see whether they then sent the WhatsApp message.
 */
export function statsLine({ tryons, orders }: WigStats): string {
  return `${count(tryons, "try-on", "try-ons")} started · ${count(orders, "order", "orders")} opened in WhatsApp`;
}
