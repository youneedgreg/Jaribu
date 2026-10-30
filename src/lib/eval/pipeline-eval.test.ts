import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { median, RUNS, summarize } from "./pipeline-eval";

const cells = (line: string) => [...line.matchAll(/"((?:[^"]|"")*)"/g)].map((match) => match[1]);

describe("pipeline eval", () => {
  it("matches the CSV people can download", () => {
    const [head, ...lines] = readFileSync("public/eval/pipeline-eval.csv", "utf8").trim().split("\n");
    const columns = head.split(",");
    const csv = lines.map((line) => Object.fromEntries(cells(line).map((cell, i) => [columns[i], cell])));
    expect(csv.map((row) => [row.id, row.api, row.expect, row.outcome, row.seconds === "" ? null : Number(row.seconds)])).toEqual(
      RUNS.map((run) => [run.id, run.api, run.expect, run.outcome, run.seconds]),
    );
  });

  it("gives the published numbers", () => {
    const lines = summarize(RUNS);
    expect(lines.map((line) => [line.api, line.runs, line.succeeded])).toEqual([
      ["hairstyle", 12, 12],
      ["haircolor", 6, 6],
      ["hairtype", 3, 3],
      ["tone", 1, 1],
    ]);
    expect(lines[0].median).toBeCloseTo(9.9, 1);
    expect(lines[0].slowest).toBeCloseTo(20.1, 1);
  });

  it("leaves out bad photos and doesn't time failures", () => {
    const run = { id: "x", api: "tone", expect: "success", outcome: "success", seconds: 5 } as const;
    expect(
      summarize([run, { ...run, outcome: "timeout", seconds: 180 }, { ...run, expect: "fail", outcome: "task_error", seconds: 1 }])[3],
    ).toEqual({ api: "tone", runs: 2, succeeded: 1, median: 5, slowest: 5 });
  });

  it("takes the middle value, or the mean of the middle two", () => {
    expect(median([])).toBeNull();
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
  });
});
