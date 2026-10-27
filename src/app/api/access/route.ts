import { accessCodeMatches } from "@/lib/access-code";
import { grantAccessPass, hasAccessPass } from "@/lib/access-cookie";
import { failure, json } from "@/lib/http";

// Tells the try-on screen whether to ask for the access code.
export async function GET() {
  return json({ granted: await hasAccessPass() });
}

// Checks the code before the shopper spends time on the camera: JSON `{ code }`. A correct
// code gives this device the same 24-h pass that POST /api/tryon grants.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  const code = typeof body?.code === "string" ? body.code : null;
  if (!accessCodeMatches(code, process.env.TRYON_ACCESS_CODE)) {
    return failure(401, "access_code", "That access code isn't right.");
  }
  await grantAccessPass();
  return json({ granted: true });
}
