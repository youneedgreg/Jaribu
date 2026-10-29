import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { describe, expect, it } from "vitest";
import { databaseHooks } from "./auth-hooks";

function testAuth() {
  const tables: Record<string, Record<string, unknown>[]> = { user: [], session: [], account: [], verification: [] };
  const auth = betterAuth({
    database: memoryAdapter(tables),
    baseURL: "http://localhost:3000",
    secret: "test-secret-that-is-at-least-32-characters",
    emailAndPassword: { enabled: true },
    databaseHooks,
    telemetry: { enabled: false },
  });
  return { auth, tables };
}

const headers = new Headers({ "x-forwarded-for": "203.0.113.7", "user-agent": "SamsungBrowser/30.0" });

describe("seller sessions", () => {
  it("are saved without the IP address or browser name on sign-up", async () => {
    const { auth, tables } = testAuth();
    await auth.api.signUpEmail({ body: { name: "Test Seller", email: "seller@example.com", password: "a-long-password" }, headers });
    expect(tables.session).toHaveLength(1);
    expect(tables.session[0]).toMatchObject({ ipAddress: null, userAgent: null });
  });

  it("are saved without the IP address or browser name on sign-in", async () => {
    const { auth, tables } = testAuth();
    const body = { email: "seller@example.com", password: "a-long-password" };
    await auth.api.signUpEmail({ body: { name: "Test Seller", ...body } });
    await auth.api.signInEmail({ body, headers });
    expect(tables.session).toHaveLength(2);
    expect(tables.session[1]).toMatchObject({ ipAddress: null, userAgent: null });
  });
});
