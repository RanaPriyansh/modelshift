import type { AbstainReason, FallbackReason, ValidatedInterpretation } from "../../types/modelshift";

const abstainReasonForFallback: Record<FallbackReason, AbstainReason> = {
  missing_key: "model_uncertain",
  disabled: "model_uncertain",
  timeout: "model_uncertain",
  api_error: "model_uncertain",
  refusal: "model_uncertain",
  malformed_output: "model_uncertain",
  invalid_enum: "model_uncertain",
  unsupported_evidence: "model_uncertain",
  incompatible_probe: "model_uncertain",
  answer_leakage: "model_uncertain",
  ambiguous_input: "insufficient_text",
};

/** A complete, authored-safe result for every unavailable or unsafe model path. */
export function neutralFallback(reason: FallbackReason): ValidatedInterpretation {
  return {
    schema_version: "1.0",
    hypotheses: [
      {
        id: "mixed_or_unclear",
        support: "low",
        evidence_spans: [],
        rationale: "More than one interpretation fits the explanation.",
      },
    ],
    missing_distinctions: [],
    recommended_probe_id: "neutral_core_probe",
    recommended_level_1_question_id: "neutral_observation_prompt",
    abstain: true,
    abstain_reason: abstainReasonForFallback[reason],
    source: "fallback",
    fallback_reason: reason,
    providerId: null,
    modelId: null,
    policyId: "policy.force-and-motion.interpretation.v1",
  };
}
