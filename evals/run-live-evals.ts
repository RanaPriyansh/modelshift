import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { interpretExplanation } from "../src/lib/ai/interpret";

import { INTERPRETATION_FIXTURES, INTERPRETATION_FIXTURE_VERSION, type InterpretationFixture } from "./fixtures";
import {
  assessInterpretation,
  LIVE_EVALUATOR_VERSION,
  runnerErrorResult,
  summarizeLiveResults,
  type LiveFixtureResult,
} from "./live-eval-core";

const DEFAULT_MODEL = "gpt-5.6-sol";
const DEFAULT_CONCURRENCY = 3;
const FIXED_CONFIDENCE = 70;

function readConcurrency(): number {
  const raw = process.env.MODELSHIFT_EVAL_CONCURRENCY;
  if (!raw) return DEFAULT_CONCURRENCY;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 8) {
    throw new Error("MODELSHIFT_EVAL_CONCURRENCY must be an integer from 1 to 8.");
  }
  return parsed;
}

function roundedDuration(startedAt: number): number {
  return Math.round((performance.now() - startedAt) * 10) / 10;
}

async function evaluateFixture(
  fixture: InterpretationFixture,
  apiKey: string,
  model: string,
): Promise<LiveFixtureResult> {
  const startedAt = performance.now();
  try {
    const interpretation = await interpretExplanation(
      {
        scenario_id: "mystery_force_cutoff",
        prediction_id: fixture.prediction_id,
        confidence: FIXED_CONFIDENCE,
        explanation: fixture.explanation,
        stage: "INTERPRET",
      },
      { apiKey, model },
    );
    return assessInterpretation(fixture, interpretation, roundedDuration(startedAt));
  } catch (error) {
    return runnerErrorResult(fixture, roundedDuration(startedAt), error);
  }
}

async function evaluateCorpus(apiKey: string, model: string, concurrency: number) {
  const results = new Array<LiveFixtureResult>(INTERPRETATION_FIXTURES.length);
  let nextFixture = 0;

  async function worker() {
    while (nextFixture < INTERPRETATION_FIXTURES.length) {
      const index = nextFixture;
      nextFixture += 1;
      const fixture = INTERPRETATION_FIXTURES[index];
      if (!fixture) continue;

      results[index] = await evaluateFixture(fixture, apiKey, model);
      process.stdout.write(".");
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  process.stdout.write("\n");
  return results;
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Live evaluation NOT RUN: OPENAI_API_KEY is required for pnpm eval:live.");
    console.error("The offline `pnpm eval` command never invokes the network.");
    process.exitCode = 2;
    return;
  }

  if (process.env.OPENAI_INTERPRETATION_DISABLED === "true") {
    console.error("Live evaluation NOT RUN: unset OPENAI_INTERPRETATION_DISABLED first.");
    process.exitCode = 2;
    return;
  }

  const model = process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
  const concurrency = readConcurrency();
  const startedAt = new Date();

  console.log("ModelShift live interpretation eval");
  console.log(`model: ${model}`);
  console.log(`fixtures: ${INTERPRETATION_FIXTURES.length} (dataset ${INTERPRETATION_FIXTURE_VERSION})`);
  console.log(`evaluator: ${LIVE_EVALUATOR_VERSION}; concurrency: ${concurrency}`);

  const results = await evaluateCorpus(apiKey, model, concurrency);
  const finishedAt = new Date();
  const summary = summarizeLiveResults(results);
  const report = {
    report_schema_version: "1.1",
    evaluator_version: LIVE_EVALUATOR_VERSION,
    dataset_version: INTERPRETATION_FIXTURE_VERSION,
    model,
    fixed_request_configuration: {
      scenario_id: "mystery_force_cutoff",
      stage: "INTERPRET",
      confidence: FIXED_CONFIDENCE,
      concurrency,
    },
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    duration_ms: finishedAt.getTime() - startedAt.getTime(),
    summary,
    fixture_results: results,
  };

  const reportDirectory = resolve(process.cwd(), "evals", "live-results");
  await mkdir(reportDirectory, { recursive: true });
  const timestamp = finishedAt.toISOString().replaceAll(":", "-").replaceAll(".", "-");
  const reportPath = resolve(reportDirectory, `${timestamp}-${model.replaceAll("/", "-")}.json`);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`clear primary agreement: ${summary.clear_primary_agreement_count}/${summary.clear_fixture_count} (${(summary.clear_primary_agreement_rate * 100).toFixed(1)}%)`);
  console.log(`ambiguous safe-neutral rate: ${summary.safe_neutral_count}/${summary.ambiguous_fixture_count} (${(summary.safe_neutral_rate * 100).toFixed(1)}%)`);
  console.log(`schema validity: ${summary.schema_valid_count}/${summary.fixture_count}`);
  console.log(`semantic validity: ${summary.semantic_valid_count}/${summary.fixture_count}`);
  console.log(`authored-probe safety: ${summary.authored_probe_safe_count}/${summary.fixture_count}`);
  console.log(`fallbacks: ${summary.fallback_count}; runner errors: ${summary.runner_error_count}`);
  console.log(`contract latency: p50=${summary.contract_latency_ms.p50.toFixed(1)}ms p95=${summary.contract_latency_ms.p95.toFixed(1)}ms`);
  console.log(`gate: ${summary.gates.overall ? "PASS" : "FAIL"}`);
  console.log(`report: ${reportPath}`);

  if (!summary.gates.overall) process.exitCode = 1;
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown live evaluation runner error.";
  console.error(`Live evaluation runner failed: ${message}`);
  process.exitCode = 1;
});
