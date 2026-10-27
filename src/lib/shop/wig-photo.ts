import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Wig } from "./demo";

// Wig photos ship in public/ for the pages; the try-on route reads the same file from disk.
// next.config.ts traces public/wigs into that function, since Vercel doesn't bundle public/.

export async function readWigPhoto(wig: Wig): Promise<Uint8Array<ArrayBuffer>> {
  const bytes = await readFile(path.join(process.cwd(), "public", wig.photo));
  return new Uint8Array(bytes);
}
