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

function scoredResult(primaryAgrees: boolean): LiveFixtureResult {
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
    latency_ms: 100,
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

  it("enforces the 85 percent agreement gate and every safety gate", () => {
    const exactlyAtGate = [...Array.from({ length: 17 }, () => scoredResult(true)), ...Array.from({ length: 3 }, () => scoredResult(false))];
    expect(summarizeLiveResults(exactlyAtGate).gates.overall).toBe(true);

    const belowGate = [...Array.from({ length: 16 }, () => scoredResult(true)), ...Array.from({ length: 4 }, () => scoredResult(false))];
    expect(summarizeLiveResults(belowGate).gates.primary_agreement_at_least_85_percent).toBe(false);

    belowGate[0] = { ...belowGate[0]!, semantic_valid: false };
    expect(summarizeLiveResults(belowGate).gates.semantic_validity).toBe(false);
    expect(summarizeLiveResults(belowGate).gates.overall).toBe(false);
  });
});
