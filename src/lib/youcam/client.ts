import { TASK_APIS, YOUCAM_BASE_URL, type TaskApi, type TaskBodies, type TaskResults } from "./apis";

// Thin client for the YouCam REST API. Kept free of server-only imports so it can be tested
// with a fake fetch; build the real one through `./server`.

export class YouCamError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "YouCamError";
  }
}

export class InsufficientUnitsError extends Error {
  constructor(
    readonly balance: number,
    readonly cost: number,
    readonly floor: number,
  ) {
    super(`Not enough units: balance ${balance}, cost ${cost}, floor ${floor}`);
    this.name = "InsufficientUnitsError";
  }
}

export type TaskOutcome<A extends TaskApi> =
  | { status: "success"; taskId: string; results: TaskResults[A] }
  | { status: "error"; taskId: string; error: string | null; message?: string }
  // Still running when we gave up. Keep the task id: polling it later costs nothing,
  // starting a new task costs units again.
  | { status: "timeout"; taskId: string };

export interface YouCamClientOptions {
  apiKey: string;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  baseUrl?: string;
  /** How often to poll a running task. */
  pollIntervalMs?: number;
  /** Ceiling for the backoff after 429 or 5xx responses. */
  maxBackoffMs?: number;
  /** Retries after 429 or 5xx before giving up. */
  maxRetries?: number;
  /** Live calls stop when they would leave fewer units than this. */
  unitFloor?: number;
}

type Envelope<T> = { status: number; data: T };

export function createYouCamClient(options: YouCamClientOptions) {
  const {
    apiKey,
    fetch: doFetch = fetch,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now = Date.now,
    baseUrl = YOUCAM_BASE_URL,
    pollIntervalMs = 3000,
    maxBackoffMs = 30_000,
    maxRetries = 4,
    unitFloor = 100,
  } = options;

  async function request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    for (let attempt = 0, wait = pollIntervalMs; ; attempt++) {
      const res = await doFetch(baseUrl + path, {
        method,
        headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if ((res.status === 429 || res.status >= 500) && attempt < maxRetries) {
        await sleep(wait);
        wait = Math.min(wait * 2, maxBackoffMs);
        continue;
      }
      if (!res.ok) {
        const code = typeof json.error_code === "string" ? json.error_code : undefined;
        // Path only: never the key, and task ids aren't useful in a message.
        throw new YouCamError(`${method} ${path.split("/").slice(0, 5).join("/")} failed: ${res.status}${code ? ` ${code}` : ""}`, res.status, code);
      }
      return json as T;
    }
  }

  /** Remaining units across all unit grants. */
  async function getBalance(): Promise<number> {
    const json = await request<{ results?: { amount?: number; amount_dec?: number }[] }>("GET", "/s2s/v1.0/client/credit");
    return (json.results ?? []).reduce((sum, u) => sum + (u.amount_dec ?? u.amount ?? 0), 0);
  }

  /** Throws unless the balance covers `cost` and stays at or above the floor. */
  async function ensureUnits(cost: number): Promise<number> {
    const balance = await getBalance();
    if (balance - cost < unitFloor) throw new InsufficientUnitsError(balance, cost, unitFloor);
    return balance;
  }

  /** Uploads through the File API and returns the file id. */
  async function uploadFile(file: { bytes: Uint8Array<ArrayBuffer>; fileName: string; contentType: "image/jpg" | "image/png" }): Promise<string> {
    const json = await request<Envelope<{ files: { file_id: string; requests: { method?: string; url: string; headers?: Record<string, string> }[] }[] }>>(
      "POST",
      "/s2s/v2.0/file",
      { files: [{ content_type: file.contentType, file_name: file.fileName, file_size: file.bytes.byteLength }] },
    );
    const entry = json.data.files[0];
    const upload = entry.requests[0];
    // The File API only hands out an upload URL; the file must be PUT there before any task uses it.
    const put = await doFetch(upload.url, { method: upload.method ?? "PUT", headers: upload.headers, body: file.bytes });
    if (!put.ok) throw new YouCamError(`File upload failed: ${put.status}`, put.status);
    return entry.file_id;
  }

  async function startTask<A extends TaskApi>(api: A, body: TaskBodies[A]): Promise<string> {
    const json = await request<Envelope<{ task_id: string }>>("POST", TASK_APIS[api].path, body);
    return json.data.task_id;
  }

  async function getTask<A extends TaskApi>(api: A, taskId: string): Promise<TaskOutcome<A> | { status: "running"; taskId: string }> {
    const json = await request<Envelope<{ task_status?: string; error?: string | null; error_message?: string; results?: TaskResults[A] }>>(
      "GET",
      `${TASK_APIS[api].path}/${encodeURIComponent(taskId)}`,
    );
    const d = json.data;
    if (d.task_status === "success" && d.results) return { status: "success", taskId, results: d.results };
    if (d.task_status === "error") return { status: "error", taskId, error: d.error ?? null, message: d.error_message };
    return { status: "running", taskId };
  }

  /**
   * Polls until the task succeeds or fails. Polling is required: YouCam times out a task
   * nobody polls, and the units are still spent.
   */
  async function waitForTask<A extends TaskApi>(api: A, taskId: string, { timeoutMs = 5 * 60_000 } = {}): Promise<TaskOutcome<A>> {
    const deadline = now() + timeoutMs;
    for (;;) {
      const outcome = await getTask(api, taskId);
      if (outcome.status !== "running") return outcome;
      if (now() + pollIntervalMs > deadline) return { status: "timeout", taskId };
      await sleep(pollIntervalMs);
    }
  }

  return { getBalance, ensureUnits, uploadFile, startTask, getTask, waitForTask };
}

export type YouCamClient = ReturnType<typeof createYouCamClient>;
