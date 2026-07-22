import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { INTERPRETATION_FIXTURES, INTERPRETATION_FIXTURE_VERSION, type InterpretationFixture } from "../../evals/fixtures";
import { ruleBaseline } from "../../evals/rule-baseline";
import { PROBES } from "../../src/content/probes";
import { buildReleaseIdentity, type ReleaseCandidateState, type ReleaseIdentityTuple } from "../../src/operations/release-identity";
import { buildReleaseHealth } from "../../src/operations/release-health";
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
  pre_release_quality_status: "PRE_RELEASE_QUALITY_PASS" | "PRE_RELEASE_QUALITY_FAIL";
  release_closure_status: "PASS" | "FAIL" | "NOT_EVALUATED";
  live_model_evaluation: { status: "not_evaluated" | "pass" | "fail"; required_for_release: boolean; reason: string; artifact_id?: string };
  fixture_results: FixtureResult[];
  release_identity: ReleaseIdentityTuple & { candidate_state: ReleaseCandidateState };
};

type BuildOptions = { fixtures?: readonly InterpretationFixture[]; generatedAt?: string; gitSha?: string; liveEvaluationStatus?: "not_evaluated" | "pass" | "fail"; liveEvaluationArtifactId?: string; releaseClosureMode?: boolean };
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
  const gitSha = safeSha(options.gitSha) === "unknown" ? currentSha() : safeSha(options.gitSha);
  const requestedLiveStatus = options.liveEvaluationStatus ?? "not_evaluated";
  const validLiveArtifact = Boolean(options.liveEvaluationArtifactId && /^[A-Za-z0-9._/-]{1,200}$/.test(options.liveEvaluationArtifactId));
  const liveStatus = requestedLiveStatus === "pass" && !validLiveArtifact ? "fail" : requestedLiveStatus;
  const offlineStatus = gates.every((item) => item.status === "pass") ? "pass" : "fail";
  const releaseClosureStatus = offlineStatus === "fail" || liveStatus === "fail" || (options.releaseClosureMode && liveStatus !== "pass") ? "FAIL" : liveStatus === "pass" ? "PASS" : "NOT_EVALUATED";
  const releaseHealth = buildReleaseHealth();
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  return {
    schema_version: "1.0", report_kind: "offline_deterministic_regression", generated_at: generatedAt,
    git_sha: gitSha, evaluator_version: OFFLINE_EVALUATOR_VERSION,
    dataset: { version: INTERPRETATION_FIXTURE_VERSION, fixture_count: fixtures.length, clear_fixture_count: clear.length, ambiguous_fixture_count: ambiguous.length, category_counts: Object.fromEntries(Object.entries(categoryCounts).sort(([a], [b]) => a.localeCompare(b))) },
    execution_boundary: { model_calls: false, network_access: false, learner_text_persisted: false, per_fixture_text_in_report: false },
    metrics: { valid_fixture_count: validCount, unique_fixture_id_count: ids.size, clear_primary_agreement_count: agreement, clear_primary_agreement_rate: rate(agreement, clear.length), authored_probe_safe_count: probeSafe, authored_probe_safety_rate: rate(probeSafe, fixtures.length), ambiguous_neutral_count: ambiguousNeutral, ambiguous_neutral_rate: rate(ambiguousNeutral, ambiguous.length) },
    gates, offline_regression_status: offlineStatus,
    pre_release_quality_status: offlineStatus === "pass" ? "PRE_RELEASE_QUALITY_PASS" : "PRE_RELEASE_QUALITY_FAIL",
    release_closure_status: releaseClosureStatus,
    live_model_evaluation: { status: liveStatus, required_for_release: policy.live_evaluation_required_for_release, reason: liveStatus === "pass" ? "Credentialed live evidence was supplied by an approved external gate; this offline runner did not spend credits." : requestedLiveStatus === "pass" && !validLiveArtifact ? "A live pass was supplied without a bounded retained artifact ID; release closure is blocked." : liveStatus === "fail" ? "The approved live evaluation evidence failed; release closure is blocked." : "Offline by design: no OPENAI_API_KEY read and no model or network call.", ...(options.liveEvaluationArtifactId ? { artifact_id: options.liveEvaluationArtifactId } : {}) },
    fixture_results: results,
    release_identity: buildReleaseIdentity({
      sourceSha: gitSha,
      testedSha: gitSha,
      generatedAt,
      candidateState: "BUILT_LOCAL",
      buildRuntimeMode: process.env.NODE_ENV ?? "unknown",
      cloudProviderFlags: {
        cloud_accounts_enabled: releaseHealth.cloud_accounts_enabled,
        cloud_auth_configured: releaseHealth.cloud_auth_configured,
        provider_mode: releaseHealth.provider_mode,
        managed_openai: releaseHealth.managed_provider_flags.openai,
        managed_anthropic: releaseHealth.managed_provider_flags.anthropic,
        managed_gemini: releaseHealth.managed_provider_flags.gemini,
        managed_openrouter: releaseHealth.managed_provider_flags.openrouter,
        managed_lesson_studio: releaseHealth.managed_surface_flags.lesson_studio,
        managed_interpretation: releaseHealth.managed_surface_flags.interpretation,
        managed_planner: releaseHealth.managed_surface_flags.planner,
      },
      retainedArtifactIds: ["evaluation-regression.json", "evaluation-regression.md", ...(process.env.FORGE_BROWSER_ARTIFACT_ID ? [process.env.FORGE_BROWSER_ARTIFACT_ID] : []), ...(validLiveArtifact && options.liveEvaluationArtifactId ? [options.liveEvaluationArtifactId] : [])],
      decisionName: "Packet D offline regression; promotion not authorized",
    }),
  };
}

export function renderEvaluationMarkdown(report: OfflineRegressionReport): string {
  const rows = report.gates.map((item) => `| ${item.id} | ${item.status.toUpperCase()} | ${String(item.observed)} | ${String(item.required)} |`).join("\n");
  return `# FORGE Offline Evaluation Regression Report\n\n- Offline status: **${report.offline_regression_status.toUpperCase()}**\n- Pre-release quality: **${report.pre_release_quality_status}**\n- Release closure: **${report.release_closure_status}**\n- Git SHA: \`${report.git_sha}\`\n- Dataset: \`${report.dataset.version}\` (${report.dataset.fixture_count} fixtures)\n- Evaluator: \`${report.evaluator_version}\`\n- Generated: ${report.generated_at}\n\nThis deterministic comparison baseline is not a model-quality, learner-outcome, or deployment-readiness claim. Live model evaluation is **${report.live_model_evaluation.status.toUpperCase()}** and remains a separate approved release gate. A missing live result never becomes production closure.\n\n## Privacy and execution boundary\n\n- Model calls: no\n- Network access: no\n- Learner text persisted: no\n- Per-fixture explanation text in report: no\n\n## Metrics\n\n| Metric | Value |\n| --- | ---: |\n| Clear primary agreement | ${report.metrics.clear_primary_agreement_count}/${report.dataset.clear_fixture_count} (${(report.metrics.clear_primary_agreement_rate * 100).toFixed(1)}%) |\n| Authored probe safety | ${report.metrics.authored_probe_safe_count}/${report.dataset.fixture_count} (${(report.metrics.authored_probe_safety_rate * 100).toFixed(1)}%) |\n| Ambiguous neutral diagnostic | ${report.metrics.ambiguous_neutral_count}/${report.dataset.ambiguous_fixture_count} (${(report.metrics.ambiguous_neutral_rate * 100).toFixed(1)}%) |\n\n## Regression gates\n\n| Gate | Status | Observed | Required |\n| --- | --- | ---: | ---: |\n${rows}\n`;
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
  const liveStatus = arg("--live-evaluation-status") as "not_evaluated" | "pass" | "fail" | undefined;
  if (liveStatus && !["not_evaluated", "pass", "fail"].includes(liveStatus)) throw new Error("--live-evaluation-status must be not_evaluated, pass, or fail");
  const report = buildOfflineRegressionReport({ gitSha: arg("--git-sha") ?? process.env.GITHUB_SHA, liveEvaluationStatus: liveStatus, liveEvaluationArtifactId: arg("--live-evaluation-artifact-id"), releaseClosureMode: process.argv.includes("--release-closure") });
  await writeEvaluationReport(report, outputDirectory);
  console.log(`offline evaluation regression: ${report.offline_regression_status.toUpperCase()}`);
  console.log(`report: ${resolve(outputDirectory, "evaluation-regression.md")}`);
  if (report.offline_regression_status === "fail" || report.live_model_evaluation.status === "fail" || (process.argv.includes("--release-closure") && report.release_closure_status !== "PASS")) process.exitCode = 1;
}
const entryUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === entryUrl) void main();
