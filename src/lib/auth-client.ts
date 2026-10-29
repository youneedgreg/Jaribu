import { createAuthClient } from "better-auth/react";

/** Seller sign-in from the browser. Talks to /api/auth on the current origin. */
export const authClient = createAuthClient();
