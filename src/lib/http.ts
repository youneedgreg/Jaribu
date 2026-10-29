// Shared response helpers for the try-on routes. Every error has a code for the app and a
// message a shopper can read.

const NO_STORE = { "cache-control": "private, no-store" };

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

export function failure(status: number, code: string, message: string): Response {
  return json({ error: { code, message } }, status);
}

/** Logs what went wrong without photos, URLs, ids or the API key. */
export function logError(where: string, error: unknown): void {
  const e = error as { name?: string; status?: number; code?: string; message?: string };
  // These two never put a URL, id or key in their message, so it's safe to log.
  const safe = e?.name === "YouCamError" || e?.name === "ResultCopyError";
  console.error(`[${where}]`, e?.name ?? "Error", e?.status ?? "", e?.code ?? "", safe ? e.message : "");
}
