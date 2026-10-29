/** What a seller types into the shop setup form. */
export interface ShopFields {
  name: string;
  /** As typed on the form; saved as digits only (see normalizeWhatsapp). */
  whatsapp: string;
  /** Blank means "make one from the shop name". */
  slug: string;
}

export type ShopFieldErrors = Partial<Record<keyof ShopFields, string>>;

export type ShopCheck = { ok: true; value: ShopFields } | { ok: false; errors: ShopFieldErrors };

export const NAME_MAX = 60;
export const SLUG_MAX = 40;

// Slugs already used by fixed pages under /s/.
const RESERVED_SLUGS = new Set(["demo"]);

const SLUG = /^[a-z0-9](-?[a-z0-9])+$/;
const KENYAN_MOBILE = /^254[17]\d{8}$/;
const INTERNATIONAL = /^[1-9]\d{7,14}$/;

/**
 * A WhatsApp number as wa.me wants it (digits, country code first, no +), or null.
 * Kenyan numbers work in any common form (0712 345 678, 712345678, +254 712 345 678);
 * other countries need + or 00 and the country code.
 */
export function normalizeWhatsapp(input: string): string | null {
  const compact = input.replace(/[\s().-]/g, "");
  let digits: string;
  if (compact.startsWith("+")) digits = compact.slice(1);
  else if (compact.startsWith("00")) digits = compact.slice(2);
  else if (compact.startsWith("254")) digits = compact;
  else if (/^0[17]\d{8}$/.test(compact)) digits = `254${compact.slice(1)}`;
  else if (/^[17]\d{8}$/.test(compact)) digits = `254${compact}`;
  else return null;

  if (!/^\d+$/.test(digits)) return null;
  if (digits.startsWith("254")) return KENYAN_MOBILE.test(digits) ? digits : null;
  return INTERNATIONAL.test(digits) ? digits : null;
}

/** A saved number for people to read: +254 712 345 678, or + and the digits elsewhere. */
export function formatWhatsapp(digits: string): string {
  const kenyan = /^254(\d{3})(\d{3})(\d{3})$/.exec(digits);
  return kenyan ? `+254 ${kenyan[1]} ${kenyan[2]} ${kenyan[3]}` : `+${digits}`;
}

/** A link slug made from a shop name: "Wanjiru's Wigs" → "wanjirus-wigs". */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/, "");
}

/** Checks the form and returns the values to save, or a plain-words message per field. */
export function checkShopFields(input: ShopFields): ShopCheck {
  const errors: ShopFieldErrors = {};

  const name = input.name.trim().replace(/\s+/g, " ");
  if (name.length < 2) errors.name = "Give your shop a name.";
  else if (name.length > NAME_MAX) errors.name = `Use at most ${NAME_MAX} characters.`;

  const whatsapp = normalizeWhatsapp(input.whatsapp);
  if (!whatsapp) {
    errors.whatsapp = input.whatsapp.trim()
      ? "That doesn't look like a WhatsApp number. Try 0712 345 678, or + and the country code."
      : "Add the WhatsApp number where you take orders.";
  }

  const typed = input.slug.trim().toLowerCase();
  const slug = typed || slugify(name);
  // A blank link with a bad name only gets the name's message.
  if (typed || !errors.name) {
    if (!typed && (slug.length < 3 || !SLUG.test(slug))) {
      errors.slug = `Choose a shop link: 3 to ${SLUG_MAX} letters, numbers or dashes.`;
    } else if (slug.length < 3 || slug.length > SLUG_MAX) {
      errors.slug = `Use 3 to ${SLUG_MAX} letters, numbers or dashes.`;
    } else if (!SLUG.test(slug)) {
      errors.slug = "Use only letters, numbers and single dashes between them.";
    } else if (RESERVED_SLUGS.has(slug)) {
      errors.slug = "That link is taken. Try another.";
    }
  }

  if (!whatsapp || Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { name, whatsapp, slug } };
}
