import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { openWigPhoto } from "@/lib/seller/wigs";
import type { Wig } from "./demo";

// Demo wig photos ship in public/ for the pages; the try-on route reads the same file from disk.
// next.config.ts traces public/wigs into that function, since Vercel doesn't bundle public/.
// Sellers' photos are read from the private Blob store.

export async function readWigPhoto(wig: Wig): Promise<Uint8Array<ArrayBuffer>> {
  if (wig.photo.startsWith("/wigs/")) {
    return new Uint8Array(await readFile(path.join(process.cwd(), "public", wig.photo)));
  }
  const found = await openWigPhoto(wig.id);
  if (!found) throw new Error("Wig photo missing");
  return new Uint8Array(await new Response(found.stream).arrayBuffer());
}
