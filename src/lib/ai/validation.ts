import { PROBES } from "../../content/probes";
import type { FallbackReason, ValidatedInterpretation } from "../../types/modelshift";

import { interpretationSchema, type ModelInterpretation } from "./schema";

const contradictoryPairs = new Set([
  "continuous_force_required|scientific_or_near_scientific",
  "force_equals_velocity|scientific_or_near_scientific",
]);

// Model-generated text must not disclose the answer or teach the principle.
const answerLeakage = /\b(correct answer|the answer is|zero net force|zero acceleration|constant velocity|velocity (?:stays|remains|keeps)|keeps moving|continues moving|force changes velocity|accelerat(?:e|ion)|flat (?:velocity )?graph|\d+(?:\.\d+)?\s*(?:m\/s|newtons?|seconds?))\b/i;

export type ValidationResult =
  | { ok: true; value: ValidatedInterpretation }
  | { ok: false; reason: FallbackReason };

function invalid(reason: FallbackReason): ValidationResult {
  return { ok: false, reason };
}

function hasContradiction(value: ModelInterpretation): boolean {
  const ids = value.hypotheses.map((hypothesis) => hypothesis.id);
  if (ids.includes("mixed_or_unclear") && ids.length > 1) return true;

  return ids.some((id, index) =>
    ids.slice(index + 1).some((other) => contradictoryPairs.has([id, other].sort().join("|"))),
  );
}

export function validateInterpretation(candidate: unknown, explanation: string): ValidationResult {
  const parsed = interpretationSchema.safeParse(candidate);
  if (!parsed.success) {
    const enumProblem = parsed.error.issues.some((issue) => issue.code === "invalid_value");
    return invalid(enumProblem ? "invalid_enum" : "malformed_output");
  }

  const value = parsed.data;
  const ids = value.hypotheses.map((hypothesis) => hypothesis.id);
  if (new Set(ids).size !== ids.length || new Set(value.missing_distinctions).size !== value.missing_distinctions.length) {
    return invalid("malformed_output");
  }

  if (hasContradiction(value)) return invalid("ambiguous_input");

  if (value.abstain !== (value.abstain_reason !== "none")) return invalid("malformed_output");
  if (value.abstain) return invalid("ambiguous_input");

  const primary = value.hypotheses[0];
  if (!primary || primary.support === "low") return invalid("ambiguous_input");
  if (primary.id === "mixed_or_unclear") return invalid("ambiguous_input");

  for (const hypothesis of value.hypotheses) {
    if (hypothesis.evidence_spans.length === 0) return invalid("unsupported_evidence");
    if (hypothesis.evidence_spans.some((span) => !explanation.includes(span))) return invalid("unsupported_evidence");
    if (answerLeakage.test(hypothesis.rationale)) return invalid("answer_leakage");
  }

  const probe = PROBES[value.recommended_probe_id];
  if (!probe.compatibleHypotheses.includes(primary.id)) return invalid("incompatible_probe");
  if (probe.defaultQuestionId !== value.recommended_level_1_question_id) return invalid("incompatible_probe");

  return { ok: true, value: { ...value, source: "model" } };
}
