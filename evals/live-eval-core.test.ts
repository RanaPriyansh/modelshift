import { describe, expect, it } from "vitest";

import { neutralFallback } from "../src/lib/ai/fallback";
import type { ValidatedInterpretation } from "../src/types/modelshift";

import { INTERPRETATION_FIXTURES } from "./fixtures";
import {
  assessInterpretation,
  percentile,
  summarizeLiveResults,
  type LiveFixtureResult,
} from "./live-eval-core";

const clearFixture = INTERPRETATION_FIXTURES.find((fixture) => fixture.id === "cfr-01")!;
const ambiguousFixture = INTERPRETATION_FIXTURES.find((fixture) => fixture.id === "mix-01")!;

const validInterpretation: ValidatedInterpretation = {
  schema_version: "1.0",
  hypotheses: [
    {
      id: "continuous_force_required",
      support: "high",
      evidence_spans: ["the engine is no longer pushing it"],
      rationale: "The explanation links an active engine push with continued motion.",
    },
  ],
  missing_distinctions: ["force_changes_velocity_not_velocity_itself"],
  recommended_probe_id: "friction_contrast",
  recommended_level_1_question_id: "what_differs_between_cases",
  abstain: false,
  abstain_reason: "none",
  source: "model",
};

function scoredResult(primaryAgrees: boolean, latencyMs = 100): LiveFixtureResult {
  return {
    fixture_id: "fixture",
    category: "test",
    clear: true,
    expected_primary: "continuous_force_required",
    expected_probe: "friction_contrast",
    actual_primary: primaryAgrees ? "continuous_force_required" : "implicit_resistance",
    actual_probe: "friction_contrast",
    source: "model",
    fallback_reason: null,
    schema_valid: true,
    semantic_valid: true,
    authored_probe_safe: true,
    primary_agrees: primaryAgrees,
    abstain: false,
    safe_neutral: null,
    latency_ms: latencyMs,
    runner_error_type: null,
  };
}

describe("live evaluation metrics", () => {
  it("uses a deterministic nearest-rank percentile", () => {
    expect(percentile([40, 10, 50, 20, 30], 0.5)).toBe(30);
    expect(percentile([40, 10, 50, 20, 30], 0.95)).toBe(50);
    expect(() => percentile([1], 1.1)).toThrow(RangeError);
  });

  it("re-checks a model result with the production semantic validator", () => {
    expect(assessInterpretation(clearFixture, validInterpretation, 123.4)).toMatchObject({
      source: "model",
      schema_valid: true,
      semantic_valid: true,
      authored_probe_safe: true,
      primary_agrees: true,
      latency_ms: 123.4,
    });
  });

  it("recognizes the exact authored fallback as safe but not an agreement on a clear fixture", () => {
    expect(assessInterpretation(clearFixture, neutralFallback("timeout"), 6_000)).toMatchObject({
      source: "fallback",
      fallback_reason: "timeout",
      schema_valid: true,
      semantic_valid: true,
      authored_probe_safe: true,
      primary_agrees: false,
      safe_neutral: null,
    });
  });

  it("requires an authored abstaining neutral fallback for an ambiguous fixture", () => {
    const neutralized = assessInterpretation(ambiguousFixture, neutralFallback("ambiguous_input"), 4);
    expect(neutralized).toMatchObject({
      source: "fallback",
      actual_probe: "neutral_core_probe",
      abstain: true,
      safe_neutral: true,
    });

    const confidentlyClassified: ValidatedInterpretation = {
      ...validInterpretation,
      hypotheses: [
        {
          ...validInterpretation.hypotheses[0]!,
          evidence_spans: ["needs force"],
          rationale: "The explanation treats an ongoing force as necessary for motion.",
        },
      ],
    };
    const unsafe = assessInterpretation(ambiguousFixture, confidentlyClassified, 100);
    expect(unsafe).toMatchObject({
      source: "model",
      schema_valid: true,
      semantic_valid: true,
      authored_probe_safe: true,
      safe_neutral: false,
    });

    const summary = summarizeLiveResults([
      ...Array.from({ length: 17 }, () => scoredResult(true)),
      ...Array.from({ length: 3 }, () => scoredResult(false)),
      unsafe,
    ]);
    expect(summary).toMatchObject({
      ambiguous_fixture_count: 1,
      safe_neutral_count: 0,
      safe_neutral_rate: 0,
      gates: {
        ambiguous_inputs_safely_neutralized: false,
        overall: false,
      },
    });
  });

  it("covers every ambiguous fixture in the versioned corpus with the 100 percent neutralization gate", () => {
    const ambiguousFixtures = INTERPRETATION_FIXTURES.filter((fixture) => fixture.expected_primary === null);
    const summary = summarizeLiveResults(
      ambiguousFixtures.map((fixture) => assessInterpretation(fixture, neutralFallback("ambiguous_input"), 1)),
    );

    expect(summary).toMatchObject({
      ambiguous_fixture_count: 16,
      safe_neutral_count: 16,
      safe_neutral_rate: 1,
      gates: { ambiguous_inputs_safely_neutralized: true },
    });
  });

  it("fails both semantic and probe-safety checks for an incompatible authored probe", () => {
    const incompatible = {
      ...validInterpretation,
      recommended_probe_id: "zero_force_velocity_contrast" as const,
      recommended_level_1_question_id: "which_quantity_changed" as const,
    };

    expect(assessInterpretation(clearFixture, incompatible, 100)).toMatchObject({
      semantic_valid: false,
      authored_probe_safe: false,
    });
  });

  it("rejects a probe when any secondary hypothesis is incompatible", () => {
    const incompatibleSecondary: ValidatedInterpretation = {
      ...validInterpretation,
      hypotheses: [
        validInterpretation.hypotheses[0]!,
        {
          id: "scientific_or_near_scientific",
          support: "medium",
          evidence_spans: ["the engine is no longer pushing it"],
          rationale: "A secondary reading treats the engine cutoff as the end of a change.",
        },
      ],
    };

    expect(assessInterpretation(clearFixture, incompatibleSecondary, 100)).toMatchObject({
      semantic_valid: false,
      authored_probe_safe: false,
    });
  });

  it("enforces the 85 percent agreement gate and every safety gate", () => {
    const neutralized = assessInterpretation(ambiguousFixture, neutralFallback("ambiguous_input"), 4);
    const exactlyAtGate = [
      ...Array.from({ length: 17 }, () => scoredResult(true)),
      ...Array.from({ length: 3 }, () => scoredResult(false)),
      neutralized,
    ];
    expect(summarizeLiveResults(exactlyAtGate)).toMatchObject({
      ambiguous_fixture_count: 1,
      safe_neutral_count: 1,
      safe_neutral_rate: 1,
      gates: {
        ambiguous_inputs_safely_neutralized: true,
        overall: true,
      },
    });

    const belowGate = [
      ...Array.from({ length: 16 }, () => scoredResult(true)),
      ...Array.from({ length: 4 }, () => scoredResult(false)),
      neutralized,
    ];
    expect(summarizeLiveResults(belowGate).gates.primary_agreement_at_least_85_percent).toBe(false);

    belowGate[0] = { ...belowGate[0]!, semantic_valid: false };
    expect(summarizeLiveResults(belowGate).gates.semantic_validity).toBe(false);
    expect(summarizeLiveResults(belowGate).gates.overall).toBe(false);
  });

  it("requires nearest-rank p95 latency to be strictly under six seconds", () => {
    const passingLatencyResults = [
      ...Array.from({ length: 17 }, () => scoredResult(true, 5_999)),
      ...Array.from({ length: 3 }, () => scoredResult(false, 5_999)),
      assessInterpretation(ambiguousFixture, neutralFallback("ambiguous_input"), 5_999),
    ];
    const passingSummary = summarizeLiveResults(passingLatencyResults);
    expect(passingSummary.contract_latency_ms.p95).toBe(5_999);
    expect(passingSummary.gates.p95_latency_under_6_seconds).toBe(true);
    expect(passingSummary.gates.overall).toBe(true);

    const boundarySummary = summarizeLiveResults(
      passingLatencyResults.map((result) => ({ ...result, latency_ms: 6_000 })),
    );
    expect(boundarySummary.contract_latency_ms.p95).toBe(6_000);
    expect(boundarySummary.gates.p95_latency_under_6_seconds).toBe(false);
    expect(boundarySummary.gates.overall).toBe(false);
  });
});
