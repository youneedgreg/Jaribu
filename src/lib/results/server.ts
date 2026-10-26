import "server-only";
import { get, put } from "@vercel/blob";
import { createResultStore, type ResultStore } from "./store";

let store: ResultStore | undefined;

/** The result store for server code. Reads BLOB_READ_WRITE_TOKEN from the environment. */
export function results(): ResultStore {
  store ??= createResultStore({ blob: { put, get } });
  return store;
}
