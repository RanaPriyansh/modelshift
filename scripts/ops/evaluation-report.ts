import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { PROBES } from "../../src/content/probes";
import {
  INTERPRETATION_FIXTURES,
  INTERPRETATION_FIXTURE_VERSION,
  type InterpretationFixture,
} from "../../evals/fixtures";
import { ruleBaseline } from "../../evals/rule-baseline";
import policy from "./evaluation-baseline.json";

export const OFFLINE_EVALUATOR_VERSION = "1.0.0";

type Gate = {
  id: string;
  status: "pass" | "fail";
  observed: number | string | boolean;
  required: number | string | boolean;
};

type FixtureResult = {
  fixture_id: string;
  category: string;
  clear: boolean;
  expected_primary: string | null;
  actual_primary: string | null;
  expected_probe: string;
  actual_probe: string;
  primary_agrees: boolean | null;
  authored_probe_safe: boolean;
};

export type OfflineRegressionReport = {
  schema_version: "1.0";
  report_kind: "offline_deterministic_regression";
  generated_at: string;
  git_sha: string | "unknown";
  evaluator_version: string;
  dataset: {
    version: string;
    fixture_count: number;
    clear_fixture_count: number;
    ambiguous_fixture_count: number;
    category_counts: Record<string, number>;
  };
  execution_boundary: {
    model_calls: false;
    network_access: false;
    learner_text_persisted: false;
    per_fixture_text_in_report: false;
  };
  metrics: {
    valid_fixture_count: number;
    unique_fixture_id_count: number;
    clear_primary_agreement_count: number;
    clear_primary_agreement_rate: number;
    authored_probe_safe_count: number;
    authored_probe_safety_rate: number;
    ambiguous_neutral_count: number;
    ambiguous_neutral_rate: number;
  };
  gates: Gate[];
  offline_regression_status: "pass" | "fail";
  live_model_evaluation: {
    status: "not_evaluated";
    required_for_release: boolean;
    reason: string;
  };
  fixture_results: FixtureResult[];
};

type BuildOptions = {
  fixtures?: readonly InterpretationFixture[];
  generatedAt?: string;
  gitSha?: string;
};

function safeGitSha(value: string | undefined): string | "unknown" {
  return value && /^[0-9a-f]{40}$/i.test(value) ? value.toLowerCase() : "unknown";
}

function currentGitSha(): string | "unknown" {
  try {
    return safeGitSha(execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim());
  } catch {
    return "unknown";
  }
}

function rate(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

function makeGate(
  id: string,
  passed: boolean,
  observed: Gate["observed"],
  required: Gate["required"],
): Gate {
  return { id, status: passed ? "pass" : "fail", observed, required };
}

function validFixture(fixture: InterpretationFixture): boolean {
  return fixture.id.length > 0
    && fixture.explanation.length > 0
    && fixture.explanation.length <= 600
    && (fixture.clear ? fixture.expected_primary !== null : fixture.expected_primary === null)
    && (fixture.clear || fixture.expected_probe === "neutral_core_probe");
}

export function buildOfflineRegressionReport(options: BuildOptions = {}): OfflineRegressionReport {
  const fixtures = options.fixtures ?? INTERPRETATION_FIXTURES;
  const fixtureIds = new Set(fixtures.map((fixture) => fixture.id));
  const clearFixtures = fixtures.filter((fixture) => fixture.clear);
  const ambiguousFixtures = fixtures.filter((fixture) => !fixture.clear);
  const categoryCounts: Record<string, number> = {};

  const fixtureResults = fixtures.map((fixture): FixtureResult => {
    categoryCounts[fixture.category] = (categoryCounts[fixture.category] ?? 0) + 1;
    const actual = ruleBaseline(fixture.explanation);
    return {
      fixture_id: fixture.id,
      category: fixture.category,
      clear: fixture.clear,
      expected_primary: fixture.expected_primary,
      actual_primary: actual.primary,
      expected_probe: fixture.expected_probe,
      actual_probe: actual.probe,
      primary_agrees: fixture.clear ? actual.primary === fixture.expected_primary : null,
      authored_probe_safe: Object.hasOwn(PROBES, actual.probe),
    };
  });

  const validFixtureCount = fixtures.filter(validFixture).length;
  const agreementCount = fixtureResults.filter((result) => result.primary_agrees).length;
  const probeSafeCount = fixtureResults.filter((result) => result.authored_probe_safe).length;
  const ambiguousNeutralCount = fixtureResults.filter(
    (result) => !result.clear && result.actual_primary === null && result.actual_probe === "neutral_core_probe",
  ).length;
  const agreementRate = rate(agreementCount, clearFixtures.length);
  const probeSafetyRate = rate(probeSafeCount, fixtures.length);

  const gates: Gate[] = [
    makeGate("dataset_version", INTERPRETATION_FIXTURE_VERSION === policy.dataset_version, INTERPRETATION_FIXTURE_VERSION, policy.dataset_version),
    makeGate("fixture_count", fixtures.length >= policy.minimum_fixture_count, fixtures.length, policy.minimum_fixture_count),
    makeGate("clear_fixture_count", clearFixtures.length >= policy.minimum_clear_fixture_count, clearFixtures.length, policy.minimum_clear_fixture_count),
    makeGate("ambiguous_fixture_count", ambiguousFixtures.length >= policy.minimum_ambiguous_fixture_count, ambiguousFixtures.length, policy.minimum_ambiguous_fixture_count),
    makeGate("fixture_ids_unique", fixtureIds.size === fixtures.length, fixtureIds.size, fixtures.length),
    makeGate("fixture_contract_validity", validFixtureCount === fixtures.length, validFixtureCount, fixtures.length),
    makeGate("clear_agreement_count", agreementCount >= policy.minimum_clear_agreement_count, agreementCount, policy.minimum_clear_agreement_count),
    makeGate("clear_agreement_rate", agreementRate >= policy.minimum_clear_agreement_rate, agreementRate, policy.minimum_clear_agreement_rate),
    makeGate("authored_probe_safety", probeSafetyRate >= policy.required_probe_safety_rate, probeSafetyRate, policy.required_probe_safety_rate),
  ];

  return {
    schema_version: "1.0",
    report_kind: "offline_deterministic_regression",
    generated_at: options.generatedAt ?? new Date().toISOString(),
    git_sha: safeGitSha(options.gitSha) === "unknown" ? currentGitSha() : safeGitSha(options.gitSha),
    evaluator_version: OFFLINE_EVALUATOR_VERSION,
    dataset: {
      version: INTERPRETATION_FIXTURE_VERSION,
      fixture_count: fixtures.length,
      clear_fixture_count: clearFixtures.length,
      ambiguous_fixture_count: ambiguousFixtures.length,
      category_counts: Object.fromEntries(Object.entries(categoryCounts).sort(([left], [right]) => left.localeCompare(right))),
    },
    execution_boundary: {
      model_calls: false,
      network_access: false,
      learner_text_persisted: false,
      per_fixture_text_in_report: false,
    },
    metrics: {
      valid_fixture_count: validFixtureCount,
      unique_fixture_id_count: fixtureIds.size,
      clear_primary_agreement_count: agreementCount,
      clear_primary_agreement_rate: agreementRate,
      authored_probe_safe_count: probeSafeCount,
      authored_probe_safety_rate: probeSafetyRate,
      ambiguous_neutral_count: ambiguousNeutralCount,
      ambiguous_neutral_rate: rate(ambiguousNeutralCount, ambiguousFixtures.length),
    },
    gates,
    offline_regression_status: gates.every((gate) => gate.status === "pass") ? "pass" : "fail",
    live_model_evaluation: {
      status: "not_evaluated",
      required_for_release: policy.live_evaluation_required_for_release,
      reason: "This report is offline by design and never reads OPENAI_API_KEY or calls a model.",
    },
    fixture_results: fixtureResults,
  };
}

export function renderEvaluationMarkdown(report: OfflineRegressionReport): string {
  const gateRows = report.gates
    .map((gate) => `| ${gate.id} | ${gate.status.toUpperCase()} | ${String(gate.observed)} | ${String(gate.required)} |`)
    .join("\n");

  return `# FORGE Offline Evaluation Regression Report

- Status: **${report.offline_regression_status.toUpperCase()}**
- Git SHA: \`${report.git_sha}\`
- Dataset: \`${report.dataset.version}\` (${report.dataset.fixture_count} fixtures)
- Evaluator: \`${report.evaluator_version}\`
- Generated: ${report.generated_at}

This is a deterministic comparison-baseline report. It makes no live-model, learner-outcome, or deployment-readiness claim. Live model evaluation is **NOT_EVALUATED** and remains a separate release requirement.

## Privacy and execution boundary

- Model calls: no
- Network access: no
- Learner text persisted: no
- Per-fixture explanation text in report: no

## Metrics

| Metric | Value |
| --- | ---: |
| Clear primary agreement | ${report.metrics.clear_primary_agreement_count}/${report.dataset.clear_fixture_count} (${(report.metrics.clear_primary_agreement_rate * 100).toFixed(1)}%) |
| Authored probe safety | ${report.metrics.authored_probe_safe_count}/${report.dataset.fixture_count} (${(report.metrics.authored_probe_safety_rate * 100).toFixed(1)}%) |
| Ambiguous inputs mapped to neutral by diagnostic baseline | ${report.metrics.ambiguous_neutral_count}/${report.dataset.ambiguous_fixture_count} (${(report.metrics.ambiguous_neutral_rate * 100).toFixed(1)}%) |

The ambiguous-input baseline metric is diagnostic only. Production live evaluation requires exact authored fallback neutralization for every ambiguous fixture.

## Regression gates

| Gate | Status | Observed | Required |
| --- | --- | ---: | ---: |
${gateRows}
`;
}

export async function writeEvaluationReport(report: OfflineRegressionReport, outputDirectory: string): Promise<void> {
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    writeFile(resolve(outputDirectory, "evaluation-regression.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(resolve(outputDirectory, "evaluation-regression.md"), renderEvaluationMarkdown(report), "utf8"),
  ]);
}

function argumentValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const outputDirectory = resolve(argumentValue("--output-dir") ?? "test-results/release-ops");
  const report = buildOfflineRegressionReport({ gitSha: argumentValue("--git-sha") ?? process.env.GITHUB_SHA });
  await writeEvaluationReport(report, outputDirectory);
  console.log(`offline evaluation regression: ${report.offline_regression_status.toUpperCase()}`);
  console.log(`report: ${resolve(outputDirectory, "evaluation-regression.md")}`);
  if (report.offline_regression_status === "fail") process.exitCode = 1;
}

const entryUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === entryUrl) void main();
