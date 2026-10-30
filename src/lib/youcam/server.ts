import "server-only";
import { createYouCamClient, unitReserve, type YouCamClient } from "./client";

let client: YouCamClient | undefined;

/** The YouCam client for server code. The API key never reaches the browser. */
export function youcam(): YouCamClient {
  if (!client) {
    const apiKey = process.env.YOUCAM_API_KEY;
    if (!apiKey) throw new Error("YOUCAM_API_KEY is not set");
    client = createYouCamClient({ apiKey, unitFloor: unitReserve(process.env.YOUCAM_UNIT_RESERVE) });
  }
  return client;
}
