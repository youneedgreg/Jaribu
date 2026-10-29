import type { BetterAuthOptions } from "better-auth";

/**
 * Sellers' IP addresses and browser names are never saved with their sessions.
 * IP tracking itself stays on: Better Auth's sign-in rate limiting needs it (in memory only).
 */
export const databaseHooks = {
  session: {
    create: {
      before: async (session) => ({ data: { ...session, ipAddress: null, userAgent: null } }),
    },
  },
} satisfies BetterAuthOptions["databaseHooks"];
