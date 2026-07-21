import { isDeepStrictEqual } from "node:util";

import { PROBES } from "../src/content/probes";
import { neutralFallback } from "../src/lib/ai/fallback";
import { interpretationSchema } from "../src/lib/ai/schema";
import { validateInterpretation } from "../src/lib/ai/validation";
import type { FallbackReason, HypothesisId, ProbeId, ValidatedInterpretation } from "../src/types/modelshift";

import type { InterpretationFixture } from "./fixtures";

export const LIVE_EVALUATOR_VERSION = "1.2.0";
export const PRIMARY_AGREEMENT_GATE = 0.85;
export const P95_LATENCY_GATE_MS = 6_000;

export type LiveFixtureResult = {
  fixture_id: string;
  category: string;
  clear: boolean;
  expected_primary: HypothesisId | null;
  expected_probe: ProbeId;
  actual_primary: HypothesisId | null;
  actual_probe: ProbeId | null;
  source: "model" | "fallback" | "runner_error";
  fallback_reason: FallbackReason | null;
  schema_valid: boolean;
  semantic_valid: boolean;
  authored_probe_safe: boolean;
  primary_agrees: boolean | null;
  abstain: boolean | null;
  safe_neutral: boolean | null;
  latency_ms: number;
  runner_error_type: string | null;
};

export type LiveEvalSummary = {
  fixture_count: number;
  clear_fixture_count: number;
  clear_primary_agreement_count: number;
  clear_primary_agreement_rate: number;
  ambiguous_fixture_count: number;
  safe_neutral_count: number;
  safe_neutral_rate: number;
  model_result_count: number;
  fallback_count: number;
  fallback_reasons: Record<string, number>;
  runner_error_count: number;
  schema_valid_count: number;
  semantic_valid_count: number;
  authored_probe_safe_count: number;
  contract_latency_ms: {
    p50: number;
    p95: number;
  };
  gates: {
    primary_agreement_at_least_85_percent: boolean;
    schema_validity: boolean;
    semantic_validity: boolean;
    authored_probe_safety: boolean;
    ambiguous_inputs_safely_neutralized: boolean;
    p95_latency_under_6_seconds: boolean;
    no_runner_errors: boolean;
    overall: boolean;
  };
};

/** Nearest-rank percentile, suitable for the small fixed evaluation corpus. */
export function percentile(values: readonly number[], quantile: number): number {
  if (values.length === 0) return 0;
  if (!Number.isFinite(quantile) || quantile < 0 || quantile > 1) {
    throw new RangeError("quantile must be between 0 and 1");
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(quantile * sorted.length) - 1);
  return sorted[index] ?? 0;
}

function payloadOnly(interpretation: ValidatedInterpretation) {
  return {
    schema_version: interpretation.schema_version,
    hypotheses: interpretation.hypotheses,
    missing_distinctions: interpretation.missing_distinctions,
    recommended_probe_id: interpretation.recommended_probe_id,
    recommended_level_1_question_id: interpretation.recommended_level_1_question_id,
    abstain: interpretation.abstain,
    abstain_reason: interpretation.abstain_reason,
  };
}

function isAuthoredProbeSafe(interpretation: ValidatedInterpretation): boolean {
  const probe = PROBES[interpretation.recommended_probe_id];
  if (!probe || probe.defaultQuestionId !== interpretation.recommended_level_1_question_id) return false;
  return interpretation.hypotheses.length > 0
    && interpretation.hypotheses.every((hypothesis) => probe.compatibleHypotheses.includes(hypothesis.id));
}

/**
 * Re-check the post-boundary value instead of trusting that a returned object is valid.
 * Model results go through the same semantic validator as production. Fallbacks must
 * exactly match the authored fallback for their declared reason.
 */
export function assessInterpretation(
  fixture: InterpretationFixture,
  interpretation: ValidatedInterpretation,
  latencyMs: number,
): LiveFixtureResult {
  const payload = payloadOnly(interpretation);
  const schemaValid = interpretationSchema.safeParse(payload).success;
  const semanticValid = interpretation.source === "model"
    ? validateInterpretation(payload, fixture.explanation).ok
    : Boolean(
        interpretation.fallback_reason
        && isDeepStrictEqual(interpretation, neutralFallback(interpretation.fallback_reason)),
      );
  const authoredProbeSafe = isAuthoredProbeSafe(interpretation);
  const primary = interpretation.hypotheses[0]?.id ?? null;
  const safeNeutral = fixture.expected_primary === null
    ? interpretation.source === "fallback"
      && interpretation.recommended_probe_id === "neutral_core_probe"
      && interpretation.abstain
      && semanticValid
    : null;

  return {
    fixture_id: fixture.id,
    category: fixture.category,
    clear: fixture.clear,
    expected_primary: fixture.expected_primary,
    expected_probe: fixture.expected_probe,
    actual_primary: primary,
    actual_probe: interpretation.recommended_probe_id,
    source: interpretation.source,
    fallback_reason: interpretation.fallback_reason ?? null,
    schema_valid: schemaValid,
    semantic_valid: semanticValid,
    authored_probe_safe: authoredProbeSafe,
    primary_agrees: fixture.clear ? interpretation.source === "model" && primary === fixture.expected_primary : null,
    abstain: interpretation.abstain,
    safe_neutral: safeNeutral,
    latency_ms: latencyMs,
    runner_error_type: null,
  };
}

export function runnerErrorResult(
  fixture: InterpretationFixture,
  latencyMs: number,
  error: unknown,
): LiveFixtureResult {
  return {
    fixture_id: fixture.id,
    category: fixture.category,
    clear: fixture.clear,
    expected_primary: fixture.expected_primary,
    expected_probe: fixture.expected_probe,
    actual_primary: null,
    actual_probe: null,
    source: "runner_error",
    fallback_reason: null,
    schema_valid: false,
    semantic_valid: false,
    authored_probe_safe: false,
    primary_agrees: fixture.clear ? false : null,
    abstain: null,
    safe_neutral: fixture.expected_primary === null ? false : null,
    latency_ms: latencyMs,
    runner_error_type: error instanceof Error ? error.name : "UnknownError",
  };
}

export function summarizeLiveResults(results: readonly LiveFixtureResult[]): LiveEvalSummary {
  const clearResults = results.filter((result) => result.clear);
  const clearPrimaryAgreementCount = clearResults.filter((result) => result.primary_agrees).length;
  const clearPrimaryAgreementRate = clearResults.length === 0
    ? 0
    : clearPrimaryAgreementCount / clearResults.length;
  const ambiguousResults = results.filter((result) => result.expected_primary === null);
  const safeNeutralCount = ambiguousResults.filter((result) => result.safe_neutral).length;
  const safeNeutralRate = ambiguousResults.length === 0 ? 0 : safeNeutralCount / ambiguousResults.length;

  const fallbackReasons: Record<string, number> = {};
  for (const result of results) {
    if (result.source === "fallback") {
      const reason = result.fallback_reason ?? "undeclared";
      fallbackReasons[reason] = (fallbackReasons[reason] ?? 0) + 1;
    }
  }

  const schemaValidity = results.length > 0 && results.every((result) => result.schema_valid);
  const semanticValidity = results.length > 0 && results.every((result) => result.semantic_valid);
  const authoredProbeSafety = results.length > 0 && results.every((result) => result.authored_probe_safe);
  const ambiguousInputsSafelyNeutralized = ambiguousResults.length > 0
    && ambiguousResults.every((result) => result.safe_neutral === true);
  const noRunnerErrors = results.every((result) => result.source !== "runner_error");
  const agreementPass = clearPrimaryAgreementRate >= PRIMARY_AGREEMENT_GATE;
  const contractLatency = {
    p50: percentile(results.map((result) => result.latency_ms), 0.5),
    p95: percentile(results.map((result) => result.latency_ms), 0.95),
  };
  const p95LatencyPass = results.length > 0 && contractLatency.p95 < P95_LATENCY_GATE_MS;

  return {
    fixture_count: results.length,
    clear_fixture_count: clearResults.length,
    clear_primary_agreement_count: clearPrimaryAgreementCount,
    clear_primary_agreement_rate: clearPrimaryAgreementRate,
    ambiguous_fixture_count: ambiguousResults.length,
    safe_neutral_count: safeNeutralCount,
    safe_neutral_rate: safeNeutralRate,
    model_result_count: results.filter((result) => result.source === "model").length,
    fallback_count: results.filter((result) => result.source === "fallback").length,
    fallback_reasons: fallbackReasons,
    runner_error_count: results.filter((result) => result.source === "runner_error").length,
    schema_valid_count: results.filter((result) => result.schema_valid).length,
    semantic_valid_count: results.filter((result) => result.semantic_valid).length,
    authored_probe_safe_count: results.filter((result) => result.authored_probe_safe).length,
    contract_latency_ms: contractLatency,
    gates: {
      primary_agreement_at_least_85_percent: agreementPass,
      schema_validity: schemaValidity,
      semantic_validity: semanticValidity,
      authored_probe_safety: authoredProbeSafety,
      ambiguous_inputs_safely_neutralized: ambiguousInputsSafelyNeutralized,
      p95_latency_under_6_seconds: p95LatencyPass,
      no_runner_errors: noRunnerErrors,
      overall: agreementPass
        && schemaValidity
        && semanticValidity
        && authoredProbeSafety
        && ambiguousInputsSafelyNeutralized
        && p95LatencyPass
        && noRunnerErrors,
    },
  };
}
