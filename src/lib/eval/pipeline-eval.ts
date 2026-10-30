// The pipeline eval of 30 Oct 2026, one line per run, from public/eval/pipeline-eval.csv (a test keeps
// them equal). Real runs through the live app on three AI-generated test faces, no outside testers.

export type EvalApi = "hairstyle" | "haircolor" | "hairtype" | "tone";

export interface EvalRun {
  id: string;
  api: EvalApi;
  /** "fail" = a bad photo sent on purpose. */
  expect: "success" | "fail";
  outcome: string;
  seconds: number | null;
}

export const RUNS: EvalRun[] = [
  { id: "S01-long-straight", api: "hairstyle", expect: "success", outcome: "success", seconds: 13.389 },
  { id: "S01-body-wave", api: "hairstyle", expect: "success", outcome: "success", seconds: 9.642 },
  { id: "S01-curly-afro", api: "hairstyle", expect: "success", outcome: "success", seconds: 16.47 },
  { id: "S01-straight-bob", api: "hairstyle", expect: "success", outcome: "success", seconds: 12.74 },
  { id: "S01-long-straight-99j", api: "haircolor", expect: "success", outcome: "success", seconds: 9.072 },
  { id: "S01-body-wave-30", api: "haircolor", expect: "success", outcome: "success", seconds: 8.996 },
  { id: "S01-hairtype", api: "hairtype", expect: "success", outcome: "success", seconds: 14.48 },
  { id: "S02-long-straight", api: "hairstyle", expect: "success", outcome: "success", seconds: 13.015 },
  { id: "S02-body-wave", api: "hairstyle", expect: "success", outcome: "success", seconds: 9.521 },
  { id: "S02-curly-afro", api: "hairstyle", expect: "success", outcome: "success", seconds: 10.01 },
  { id: "S02-straight-bob", api: "hairstyle", expect: "success", outcome: "success", seconds: 9.823 },
  { id: "S02-curly-afro-4", api: "haircolor", expect: "success", outcome: "success", seconds: 8.951 },
  { id: "S02-straight-bob-27", api: "haircolor", expect: "success", outcome: "success", seconds: 8.993 },
  { id: "S02-hairtype", api: "hairtype", expect: "success", outcome: "success", seconds: 10.741 },
  { id: "S03-long-straight", api: "hairstyle", expect: "success", outcome: "success", seconds: 9.13 },
  { id: "S03-body-wave", api: "hairstyle", expect: "success", outcome: "success", seconds: 9.49 },
  { id: "S03-curly-afro", api: "hairstyle", expect: "success", outcome: "success", seconds: 9.302 },
  { id: "S03-straight-bob", api: "hairstyle", expect: "success", outcome: "success", seconds: 20.13 },
  { id: "S03-long-straight-613", api: "haircolor", expect: "success", outcome: "success", seconds: 8.887 },
  { id: "S03-curly-afro-30", api: "haircolor", expect: "success", outcome: "success", seconds: 8.996 },
  { id: "S03-hairtype", api: "hairtype", expect: "success", outcome: "success", seconds: 14.322 },
  { id: "S01-tone", api: "tone", expect: "success", outcome: "success", seconds: 8.753 },
  { id: "bad-png", api: "hairstyle", expect: "fail", outcome: "refused", seconds: 0.379 },
  { id: "bad-oversize", api: "hairstyle", expect: "fail", outcome: "refused", seconds: 0.594 },
  { id: "bad-noface", api: "hairstyle", expect: "fail", outcome: "task_error", seconds: 7.996 },
  { id: "bad-tiny", api: "hairstyle", expect: "fail", outcome: "task_error", seconds: 8.038 },
  { id: "bad-hair-noface", api: "hairtype", expect: "fail", outcome: "task_error", seconds: 5.004 },
];

export interface EvalLine {
  api: EvalApi;
  runs: number;
  succeeded: number;
  median: number | null;
  slowest: number | null;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** One line per API, in this order, leaving out the bad photos sent on purpose. */
export function summarize(runs: EvalRun[]): EvalLine[] {
  return (["hairstyle", "haircolor", "hairtype", "tone"] as const).map((api) => {
    const these = runs.filter((run) => run.api === api && run.expect === "success");
    const seconds = these.flatMap((run) => (run.outcome === "success" && run.seconds !== null ? [run.seconds] : []));
    return {
      api,
      runs: these.length,
      succeeded: these.filter((run) => run.outcome === "success").length,
      median: median(seconds),
      slowest: seconds.length ? Math.max(...seconds) : null,
    };
  });
}
