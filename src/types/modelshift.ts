export const LEARNING_STAGES = [
  "HOOK",
  "PREDICT",
  "EXPLAIN",
  "INTERPRET",
  "PROBE_PREDICT",
  "EXPERIMENT",
  "REFLECT",
  "RECONSTRUCT",
  "COLD_TRANSFER",
  "PROOF_RESULT",
] as const;

export type LearningStage = (typeof LEARNING_STAGES)[number];

export const PREDICTION_IDS = [
  "stops_immediately",
  "gradually_slows",
  "continues_constant_velocity",
  "speeds_up",
] as const;

export type PredictionId = (typeof PREDICTION_IDS)[number];

export const HYPOTHESIS_IDS = [
  "continuous_force_required",
  "implicit_resistance",
  "force_equals_velocity",
  "scientific_or_near_scientific",
  "mixed_or_unclear",
] as const;

export type HypothesisId = (typeof HYPOTHESIS_IDS)[number];

export const PROBE_IDS = [
  "friction_contrast",
  "brief_vs_continuous_force",
  "zero_force_velocity_contrast",
  "neutral_core_probe",
] as const;

export type ProbeId = (typeof PROBE_IDS)[number];

export const MISSING_DISTINCTION_IDS = [
  "force_changes_velocity_not_velocity_itself",
  "zero_net_force_means_zero_acceleration",
  "friction_is_a_force",
  "existing_velocity_can_persist",
] as const;

export type MissingDistinctionId = (typeof MISSING_DISTINCTION_IDS)[number];

export const LEVEL_1_QUESTION_IDS = [
  "what_differs_between_cases",
  "which_quantity_changed",
  "where_is_the_force_now",
  "compare_force_and_velocity_graphs",
  "neutral_observation_prompt",
] as const;

export type Level1QuestionId = (typeof LEVEL_1_QUESTION_IDS)[number];

export type HypothesisSupport = "high" | "medium" | "low";
export type SupportLevel = 0 | 1 | 2 | 3;
export type InterpretationSource = "model" | "fallback";

export const ABSTAIN_REASONS = [
  "none",
  "insufficient_text",
  "contradictory_text",
  "outside_domain",
  "unsafe_or_adversarial",
  "model_uncertain",
] as const;

export type AbstainReason = (typeof ABSTAIN_REASONS)[number];

export const FALLBACK_REASONS = [
  "missing_key",
  "disabled",
  "timeout",
  "api_error",
  "refusal",
  "malformed_output",
  "invalid_enum",
  "unsupported_evidence",
  "incompatible_probe",
  "answer_leakage",
  "ambiguous_input",
] as const;

export type FallbackReason = (typeof FALLBACK_REASONS)[number];

export interface HypothesisEvidence {
  id: HypothesisId;
  support: HypothesisSupport;
  evidence_spans: string[];
  rationale: string;
}

export interface InterpretationPayload {
  schema_version: "1.0";
  hypotheses: HypothesisEvidence[];
  missing_distinctions: MissingDistinctionId[];
  recommended_probe_id: ProbeId;
  recommended_level_1_question_id: Level1QuestionId;
  abstain: boolean;
  abstain_reason: AbstainReason;
}

export interface ValidatedInterpretation extends InterpretationPayload {
  source: InterpretationSource;
  fallback_reason?: FallbackReason;
}

export interface InterpretationRequest {
  scenario_id: "mystery_force_cutoff";
  prediction_id: PredictionId;
  confidence: number;
  explanation: string;
  stage: "INTERPRET";
}

export interface PredictionChoice {
  id: PredictionId;
  label: string;
  compactLabel: string;
  graphHint: "zero" | "falling" | "constant" | "rising";
}

export interface ProbePredictionChoice {
  id: string;
  label: string;
  description: string;
}

export interface ProbeDefinition {
  id: ProbeId;
  title: string;
  shortTitle: string;
  purpose: string;
  connection: string;
  compatibleHypotheses: HypothesisId[];
  defaultQuestionId: Level1QuestionId;
  predictionPrompt: string;
  predictionChoices: [ProbePredictionChoice, ProbePredictionChoice];
  correctPredictionId: string;
  adjustableControl: "friction" | "force_duration" | "none";
}

export interface HypothesisDefinition {
  id: HypothesisId;
  learnerFacingName: string;
  learnerFacingSummary: string;
  internalDefinition: string;
}

export interface AuthoredSupport {
  level: SupportLevel;
  title: string;
  text: string;
}

export const TRANSFER_CHOICE_IDS = [
  "returns_to_zero",
  "stays_constant_after_force",
  "keeps_accelerating",
] as const;

export type TransferChoiceId = (typeof TRANSFER_CHOICE_IDS)[number];
