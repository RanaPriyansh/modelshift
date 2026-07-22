import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { INTERPRETATION_FIXTURES, INTERPRETATION_FIXTURE_VERSION, type InterpretationFixture } from "../../evals/fixtures";
import { ruleBaseline } from "../../evals/rule-baseline";
import { PROBES } from "../../src/content/probes";
import policy from "./evaluation-baseline.json";

export const OFFLINE_EVALUATOR_VERSION = "2.0.0";
type Gate = { id: string; status: "pass" | "fail"; observed: number | string | boolean; required: number | string | boolean };
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
  dataset: { version: string; fixture_count: number; clear_fixture_count: number; ambiguous_fixture_count: number; category_counts: Record<string, number> };
  execution_boundary: { model_calls: false; network_access: false; learner_text_persisted: false; per_fixture_text_in_report: false };
  metrics: { valid_fixture_count: number; unique_fixture_id_count: number; clear_primary_agreement_count: number; clear_primary_agreement_rate: number; authored_probe_safe_count: number; authored_probe_safety_rate: number; ambiguous_neutral_count: number; ambiguous_neutral_rate: number };
  gates: Gate[];
  offline_regression_status: "pass" | "fail";
  live_model_evaluation: { status: "not_evaluated"; required_for_release: boolean; reason: string };
  fixture_results: FixtureResult[];
};

type BuildOptions = { fixtures?: readonly InterpretationFixture[]; generatedAt?: string; gitSha?: string };
const safeSha = (value?: string): string | "unknown" => value && /^[0-9a-f]{40}$/i.test(value) ? value.toLowerCase() : "unknown";
function currentSha(): string | "unknown" { try { return safeSha(execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim()); } catch { return "unknown"; } }
const rate = (n: number, d: number): number => d === 0 ? 0 : n / d;
const gate = (id: string, passed: boolean, observed: Gate["observed"], required: Gate["required"]): Gate => ({ id, status: passed ? "pass" : "fail", observed, required });
function validFixture(fixture: InterpretationFixture): boolean {
  return fixture.id.length > 0 && fixture.explanation.length > 0 && fixture.explanation.length <= 600
    && (fixture.clear ? fixture.expected_primary !== null : fixture.expected_primary === null)
    && (fixture.clear || fixture.expected_probe === "neutral_core_probe");
}

export function buildOfflineRegressionReport(options: BuildOptions = {}): OfflineRegressionReport {
  const fixtures = options.fixtures ?? INTERPRETATION_FIXTURES;
  const ids = new Set(fixtures.map((fixture) => fixture.id));
  const clear = fixtures.filter((fixture) => fixture.clear);
  const ambiguous = fixtures.filter((fixture) => !fixture.clear);
  const categoryCounts: Record<string, number> = {};
  const results = fixtures.map((fixture): FixtureResult => {
    categoryCounts[fixture.category] = (categoryCounts[fixture.category] ?? 0) + 1;
    const actual = ruleBaseline(fixture.explanation);
    return { fixture_id: fixture.id, category: fixture.category, clear: fixture.clear, expected_primary: fixture.expected_primary, actual_primary: actual.primary, expected_probe: fixture.expected_probe, actual_probe: actual.probe, primary_agrees: fixture.clear ? actual.primary === fixture.expected_primary : null, authored_probe_safe: Object.hasOwn(PROBES, actual.probe) };
  });
  const validCount = fixtures.filter(validFixture).length;
  const agreement = results.filter((result) => result.primary_agrees).length;
  const probeSafe = results.filter((result) => result.authored_probe_safe).length;
  const ambiguousNeutral = results.filter((result) => !result.clear && result.actual_primary === null && result.actual_probe === "neutral_core_probe").length;
  const gates = [
    gate("dataset_version", INTERPRETATION_FIXTURE_VERSION === policy.dataset_version, INTERPRETATION_FIXTURE_VERSION, policy.dataset_version),
    gate("fixture_count", fixtures.length >= policy.minimum_fixture_count, fixtures.length, policy.minimum_fixture_count),
    gate("clear_fixture_count", clear.length >= policy.minimum_clear_fixture_count, clear.length, policy.minimum_clear_fixture_count),
    gate("ambiguous_fixture_count", ambiguous.length >= policy.minimum_ambiguous_fixture_count, ambiguous.length, policy.minimum_ambiguous_fixture_count),
    gate("fixture_ids_unique", ids.size === fixtures.length, ids.size, fixtures.length),
    gate("fixture_contract_validity", validCount === fixtures.length, validCount, fixtures.length),
    gate("clear_agreement_count", agreement >= policy.minimum_clear_agreement_count, agreement, policy.minimum_clear_agreement_count),
    gate("clear_agreement_rate", rate(agreement, clear.length) >= policy.minimum_clear_agreement_rate, rate(agreement, clear.length), policy.minimum_clear_agreement_rate),
    gate("authored_probe_safety", rate(probeSafe, fixtures.length) >= policy.required_probe_safety_rate, rate(probeSafe, fixtures.length), policy.required_probe_safety_rate),
  ];
  return {
    schema_version: "1.0", report_kind: "offline_deterministic_regression", generated_at: options.generatedAt ?? new Date().toISOString(),
    git_sha: safeSha(options.gitSha) === "unknown" ? currentSha() : safeSha(options.gitSha), evaluator_version: OFFLINE_EVALUATOR_VERSION,
    dataset: { version: INTERPRETATION_FIXTURE_VERSION, fixture_count: fixtures.length, clear_fixture_count: clear.length, ambiguous_fixture_count: ambiguous.length, category_counts: Object.fromEntries(Object.entries(categoryCounts).sort(([a], [b]) => a.localeCompare(b))) },
    execution_boundary: { model_calls: false, network_access: false, learner_text_persisted: false, per_fixture_text_in_report: false },
    metrics: { valid_fixture_count: validCount, unique_fixture_id_count: ids.size, clear_primary_agreement_count: agreement, clear_primary_agreement_rate: rate(agreement, clear.length), authored_probe_safe_count: probeSafe, authored_probe_safety_rate: rate(probeSafe, fixtures.length), ambiguous_neutral_count: ambiguousNeutral, ambiguous_neutral_rate: rate(ambiguousNeutral, ambiguous.length) },
    gates, offline_regression_status: gates.every((item) => item.status === "pass") ? "pass" : "fail",
    live_model_evaluation: { status: "not_evaluated", required_for_release: policy.live_evaluation_required_for_release, reason: "Offline by design: no OPENAI_API_KEY read and no model or network call." },
    fixture_results: results,
  };
}

export function renderEvaluationMarkdown(report: OfflineRegressionReport): string {
  const rows = report.gates.map((item) => `| ${item.id} | ${item.status.toUpperCase()} | ${String(item.observed)} | ${String(item.required)} |`).join("\n");
  return `# FORGE Offline Evaluation Regression Report\n\n- Status: **${report.offline_regression_status.toUpperCase()}**\n- Git SHA: \`${report.git_sha}\`\n- Dataset: \`${report.dataset.version}\` (${report.dataset.fixture_count} fixtures)\n- Evaluator: \`${report.evaluator_version}\`\n- Generated: ${report.generated_at}\n\nThis deterministic comparison baseline is not a model-quality, learner-outcome, or deployment-readiness claim. Live model evaluation is **NOT_EVALUATED** and remains a separate release requirement.\n\n## Privacy and execution boundary\n\n- Model calls: no\n- Network access: no\n- Learner text persisted: no\n- Per-fixture explanation text in report: no\n\n## Metrics\n\n| Metric | Value |\n| --- | ---: |\n| Clear primary agreement | ${report.metrics.clear_primary_agreement_count}/${report.dataset.clear_fixture_count} (${(report.metrics.clear_primary_agreement_rate * 100).toFixed(1)}%) |\n| Authored probe safety | ${report.metrics.authored_probe_safe_count}/${report.dataset.fixture_count} (${(report.metrics.authored_probe_safety_rate * 100).toFixed(1)}%) |\n| Ambiguous neutral diagnostic | ${report.metrics.ambiguous_neutral_count}/${report.dataset.ambiguous_fixture_count} (${(report.metrics.ambiguous_neutral_rate * 100).toFixed(1)}%) |\n\n## Regression gates\n\n| Gate | Status | Observed | Required |\n| --- | --- | ---: | ---: |\n${rows}\n`;
}

export async function writeEvaluationReport(report: OfflineRegressionReport, outputDirectory: string): Promise<void> {
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    writeFile(resolve(outputDirectory, "evaluation-regression.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(resolve(outputDirectory, "evaluation-regression.md"), renderEvaluationMarkdown(report), "utf8"),
  ]);
}

const arg = (name: string): string | undefined => { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; };
async function main() {
  const outputDirectory = resolve(arg("--output-dir") ?? "test-results/release-ops");
  const report = buildOfflineRegressionReport({ gitSha: arg("--git-sha") ?? process.env.GITHUB_SHA });
  await writeEvaluationReport(report, outputDirectory);
  console.log(`offline evaluation regression: ${report.offline_regression_status.toUpperCase()}`);
  console.log(`report: ${resolve(outputDirectory, "evaluation-regression.md")}`);
  if (report.offline_regression_status === "fail") process.exitCode = 1;
}
const entryUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === entryUrl) void main();
