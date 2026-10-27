import { hasAccessPass } from "@/lib/access-cookie";
import { json } from "@/lib/http";

// Tells the try-on screen whether to ask for the access code.
export async function GET() {
  return json({ granted: await hasAccessPass() });
}
