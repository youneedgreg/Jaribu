import { describe, expect, it } from "vitest";
import { authErrorMessage } from "./auth-errors";

describe("seller auth error messages", () => {
  it("says to sign in when the email is taken", () => {
    expect(authErrorMessage({ code: "USER_ALREADY_EXISTS", status: 422 })).toMatch(/Sign in instead/);
    expect(authErrorMessage({ code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" })).toMatch(/Sign in instead/);
  });

  it("doesn't say which of email or password was wrong", () => {
    expect(authErrorMessage({ code: "INVALID_EMAIL_OR_PASSWORD", status: 401 })).toBe("That email and password don't match.");
  });

  it("asks to wait when rate limited, whatever the code", () => {
    expect(authErrorMessage({ status: 429 })).toMatch(/Wait a minute/);
    expect(authErrorMessage({ code: "INVALID_EMAIL_OR_PASSWORD", status: 429 })).toMatch(/Wait a minute/);
  });

  it("gives the password length limits", () => {
    expect(authErrorMessage({ code: "PASSWORD_TOO_SHORT" })).toMatch(/at least 8/);
    expect(authErrorMessage({ code: "PASSWORD_TOO_LONG" })).toMatch(/at most 128/);
  });

  it("falls back to a general message", () => {
    expect(authErrorMessage({})).toBe("Something went wrong. Please try again.");
    expect(authErrorMessage({ code: "SOMETHING_NEW", status: 500 })).toBe("Something went wrong. Please try again.");
  });
});
