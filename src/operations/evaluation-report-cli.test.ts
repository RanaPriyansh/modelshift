import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const SHA = "0123456789abcdef0123456789abcdef01234567";
const outputDirectories: string[] = [];

async function outputDirectory(): Promise<string> {
  const directory = await mkdtemp(resolve(tmpdir(), "forge-evaluation-cli-"));
  outputDirectories.push(directory);
  return directory;
}

function runCiEntrypoint(args: readonly string[]) {
  return spawnSync("pnpm", ["exec", "tsx", "scripts/ops/evaluation-report.ts", ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, OPENAI_API_KEY: "must-not-be-read" },
  });
}

afterEach(async () => {
  await Promise.all(outputDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("evaluation report CI entrypoint", () => {
  it("runs the exact quality-gates tsx command without a Next-only dependency", async () => {
    const directory = await outputDirectory();
    const result = runCiEntrypoint(["--git-sha", SHA, "--output-dir", directory]);

    expect(result.status, result.stderr).toBe(0);
    const report = JSON.parse(await readFile(resolve(directory, "evaluation-regression.json"), "utf8")) as {
      git_sha: string;
      live_model_evaluation: { status: string };
    };
    expect(report.git_sha).toBe(SHA);
    expect(report.live_model_evaluation.status).toBe("not_evaluated");
  });

  it("rejects a caller-supplied live pass and arbitrary artifact ID", async () => {
    const directory = await outputDirectory();
    const result = runCiEntrypoint([
      "--git-sha", SHA,
      "--output-dir", directory,
      "--live-evaluation-status", "pass",
      "--live-evaluation-artifact-id", "arbitrary-live-eval-id",
    ]);

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}\n${result.stderr}`).toMatch(/cannot accept self-asserted live evaluation evidence/);
  });
});
