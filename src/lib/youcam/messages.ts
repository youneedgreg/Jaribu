// Wording shared by every task's error messages. Codes are from YouCam's error list
// (docs.perfectcorp.com/develop/error_codes, read 30 Oct), which doesn't say which API returns which.

const SERVICE_CODES = new Set(["error_inference", "error_upload", "unknown_internal_error"]);

/** For failures on YouCam's side, so the shopper doesn't change a photo that was fine. */
export const SERVICE_PROBLEM = "The preview service had a problem, not your photo. Please try again in a minute.";

export const PHOTOS_TOO_SMALL = "The photos were too small to read. Take them again.";

export const isServiceProblem = (code: string | null) => code !== null && SERVICE_CODES.has(code);
