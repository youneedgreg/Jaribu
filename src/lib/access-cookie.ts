import "server-only";
import { cookies } from "next/headers";
import { ACCESS_COOKIE, accessPassValid, issueAccessPass } from "./access-code";
import { SESSION_COOKIE_OPTIONS } from "./session";

/** Whether this device entered the access code in the last 24 hours. */
export async function hasAccessPass(): Promise<boolean> {
  const value = (await cookies()).get(ACCESS_COOKIE)?.value;
  return accessPassValid(value, process.env.TRYON_ACCESS_CODE, process.env.SESSION_SECRET);
}

/** Remembers a correct code for 24 hours. Route handlers only. */
export async function grantAccessPass(): Promise<void> {
  (await cookies()).set(ACCESS_COOKIE, issueAccessPass(process.env.TRYON_ACCESS_CODE, process.env.SESSION_SECRET), SESSION_COOKIE_OPTIONS);
}
