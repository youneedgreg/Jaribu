/** What Better Auth's client returns when sign-up or sign-in fails. */
export type AuthError = { code?: string | undefined; status?: number | undefined };

/** A plain-words message for a failed seller sign-up or sign-in. */
export function authErrorMessage(error: AuthError): string {
  if (error.status === 429) return "Too many tries. Wait a minute, then try again.";
  switch (error.code) {
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "There's already a seller account with this email. Sign in instead.";
    case "INVALID_EMAIL_OR_PASSWORD":
      return "That email and password don't match.";
    case "INVALID_EMAIL":
      return "That doesn't look like an email address.";
    case "PASSWORD_TOO_SHORT":
      return "Use a password of at least 8 characters.";
    case "PASSWORD_TOO_LONG":
      return "Use a password of at most 128 characters.";
    default:
      return "Something went wrong. Please try again.";
  }
}
