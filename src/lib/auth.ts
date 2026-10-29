import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { db } from "./db";

// No `import "server-only"` here: the Better Auth CLI (`npx auth migrate`)
// can't load a config that has it. Secrets come from server-only env vars
// (BETTER_AUTH_SECRET, DATABASE_URL), so nothing leaks if this is misimported.

/** Hosts that may serve sign-in: production, the preview alias, any tryjaribu preview, local dev. */
const ALLOWED_HOSTS = [
  "tryjaribu.vercel.app",
  "tryjaribupreview.vercel.app",
  "tryjaribu-*-gregory-temwas-projects.vercel.app",
  "localhost:3000",
];

/** Seller sign-in: email + password, no email sending (so no verification or password reset). */
export const auth = betterAuth({
  appName: "Jaribu",
  database: db(),
  baseURL: { allowedHosts: ALLOWED_HOSTS, fallback: "https://tryjaribu.vercel.app" },
  emailAndPassword: { enabled: true, requireEmailVerification: false },
  telemetry: { enabled: false },
  // nextCookies must stay last: it lets server actions set the session cookie.
  plugins: [nextCookies()],
});
