import { logError } from "@/lib/http";
import { openWigPhoto } from "@/lib/seller/wigs";

// A seller wig's front photo, from the private Blob store. Product photos are public, and a
// wig's photo never changes under the same id, so browsers and Vercel's CDN may keep it.

export async function GET(_request: Request, { params }: RouteContext<"/api/wigs/[wigId]/photo">) {
  const { wigId } = await params;
  try {
    const found = await openWigPhoto(wigId);
    if (!found) return new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } });
    return new Response(found.stream, {
      headers: {
        "content-type": "image/jpeg",
        ...(found.blob.size ? { "content-length": String(found.blob.size) } : {}),
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    logError("wigs/photo", error);
    return new Response("Error", { status: 502, headers: { "cache-control": "no-store" } });
  }
}
