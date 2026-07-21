import { PROBES } from "../../content/probes";
import { TRANSFER } from "../../content/scenarios";
import {
  LEVEL_1_QUESTION_IDS,
  PREDICTION_IDS,
} from "../../types/modelshift";
import type {
  FallbackReason,
  InterpretationSource,
  Level1QuestionId,
  LearningStage,
  PredictionId,
  ProbeId,
  SupportLevel,
  TransferChoiceId,
  ValidatedInterpretation,
} from "../../types/modelshift";

export type SupportRequestReason =
  | "stuck"
  | "second_explicit_request"
  | "revised_attempt_conflicts"
  | "show_principle";

export type SupportKind = "none" | "attention_cue" | "contrast" | "principle";

export interface LearningInterpretation {
  source: InterpretationSource;
  recommendedProbeId: ProbeId;
  recommendedLevel1QuestionId: Level1QuestionId;
  fallbackReason?: FallbackReason;
}

export interface SupportAuthorization {
  level: Exclude<SupportLevel, 0>;
  reason: SupportRequestReason;
}

export interface SupportConsumption {
  level: Exclude<SupportLevel, 0>;
  reason: SupportRequestReason;
}

export interface LearningContext {
  initialPrediction?: PredictionId;
  initialConfidence?: number;
  initialExplanation?: string;
  initialDontKnow: boolean;
  interpretation?: LearningInterpretation;
  selectedProbeId?: ProbeId;
  probePredictionId?: string;
  experimentObserved: boolean;
  reflection?: string;
  reflectionDontKnow: boolean;
  reconstructionAttempts: number;
  reconstruction?: string;
  reconstructionDontKnow: boolean;
  supportRequests: number;
  authorizedSupport?: SupportAuthorization;
  consumedSupport: readonly SupportConsumption[];
  transferChoiceId?: TransferChoiceId;
  transferExplanation?: string;
  transferDontKnow: boolean;
}

export type LearningState = {
  readonly stage: LearningStage;
  readonly context: Readonly<LearningContext>;
};

export type LearningEvent =
  | { type: "START" }
  | { type: "COMMIT_PREDICTION"; predictionId: PredictionId; confidence: number }
  | { type: "COMMIT_EXPLANATION"; explanation: string; dontKnow?: boolean }
  | { type: "RESOLVE_INTERPRETATION"; interpretation: ValidatedInterpretation }
  | { type: "INTERPRETATION_FAILED"; reason: FallbackReason }
  | { type: "COMMIT_PROBE_PREDICTION"; predictionId: string }
  | { type: "RUN_EXPERIMENT" }
  | { type: "REPLAY_EXPERIMENT" }
  | { type: "OBSERVE_EXPERIMENT" }
  | { type: "SUBMIT_REFLECTION"; reflection: string; dontKnow?: boolean }
  | { type: "SUBMIT_RECONSTRUCTION"; reconstruction: string; dontKnow?: boolean }
  | { type: "CONTINUE_TO_COLD_TRANSFER" }
  | { type: "REQUEST_SUPPORT"; level: Exclude<SupportLevel, 0>; reason: SupportRequestReason }
  | { type: "CONSUME_SUPPORT"; level: Exclude<SupportLevel, 0> }
  | {
      type: "SUBMIT_TRANSFER";
      choiceId?: TransferChoiceId;
      explanation: string;
      dontKnow?: boolean;
    };

export type LearningEventType = LearningEvent["type"];

export type TransitionRejectionReason =
  | "invalid_event_for_stage"
  | "prediction_and_confidence_required"
  | "confidence_out_of_range"
  | "meaningful_explanation_or_dont_know_required"
  | "invalid_model_interpretation"
  | "invalid_probe_prediction"
  | "support_not_authorized"
  | "support_not_available"
  | "support_already_consumed"
  | "support_level_mismatch"
  | "reconstruction_attempt_required"
  | "transfer_answer_or_dont_know_required"
  | "transfer_already_submitted";

export type LearningTransition =
  | { accepted: true; state: LearningState }
  | { accepted: false; state: LearningState; reason: TransitionRejectionReason };

export const LEARNING_EVENT_TYPES = [
  "START",
  "COMMIT_PREDICTION",
  "COMMIT_EXPLANATION",
  "RESOLVE_INTERPRETATION",
  "INTERPRETATION_FAILED",
  "COMMIT_PROBE_PREDICTION",
  "RUN_EXPERIMENT",
  "REPLAY_EXPERIMENT",
  "OBSERVE_EXPERIMENT",
  "SUBMIT_REFLECTION",
  "SUBMIT_RECONSTRUCTION",
  "CONTINUE_TO_COLD_TRANSFER",
  "REQUEST_SUPPORT",
  "CONSUME_SUPPORT",
  "SUBMIT_TRANSFER",
] as const satisfies readonly LearningEventType[];

const STAGE_EVENTS: Record<LearningStage, readonly LearningEventType[]> = {
  HOOK: ["START"],
  PREDICT: ["COMMIT_PREDICTION"],
  EXPLAIN: ["COMMIT_EXPLANATION"],
  INTERPRET: ["RESOLVE_INTERPRETATION", "INTERPRETATION_FAILED"],
  PROBE_PREDICT: ["COMMIT_PROBE_PREDICTION"],
  EXPERIMENT: ["RUN_EXPERIMENT", "REPLAY_EXPERIMENT", "OBSERVE_EXPERIMENT", "REQUEST_SUPPORT", "CONSUME_SUPPORT"],
  REFLECT: ["SUBMIT_REFLECTION", "REQUEST_SUPPORT", "CONSUME_SUPPORT"],
  RECONSTRUCT: ["SUBMIT_RECONSTRUCTION", "CONTINUE_TO_COLD_TRANSFER", "REQUEST_SUPPORT", "CONSUME_SUPPORT"],
  COLD_TRANSFER: ["SUBMIT_TRANSFER"],
  PROOF_RESULT: [],
};

/** All event types that are categorically invalid in each stage. Conditional guards remain in the reducer. */
export const INVALID_EVENT_STATE_MATRIX: Record<LearningStage, readonly LearningEventType[]> = (
  Object.keys(STAGE_EVENTS) as LearningStage[]
).reduce<Record<LearningStage, readonly LearningEventType[]>>((matrix, stage) => {
  matrix[stage] = LEARNING_EVENT_TYPES.filter((eventType) => !STAGE_EVENTS[stage].includes(eventType));
  return matrix;
}, {} as Record<LearningStage, readonly LearningEventType[]>);

const EMPTY_CONTEXT: LearningContext = {
  initialDontKnow: false,
  experimentObserved: false,
  reflectionDontKnow: false,
  reconstructionAttempts: 0,
  reconstructionDontKnow: false,
  supportRequests: 0,
  consumedSupport: [],
  transferDontKnow: false,
};

export function createInitialLearningState(): LearningState {
  return { stage: "HOOK", context: { ...EMPTY_CONTEXT } };
}

export function transitionLearningState(state: LearningState, event: LearningEvent): LearningTransition {
  if (state.stage === "PROOF_RESULT" && event.type === "SUBMIT_TRANSFER") {
    return reject(state, "transfer_already_submitted");
  }

  if (!STAGE_EVENTS[state.stage].includes(event.type)) {
    return reject(state, "invalid_event_for_stage");
  }

  switch (event.type) {
    case "START":
      return accept(next(state, "PREDICT"));

    case "COMMIT_PREDICTION":
      if (!PREDICTION_IDS.includes(event.predictionId) || !Number.isFinite(event.confidence)) {
        return reject(state, "prediction_and_confidence_required");
      }
      if (event.confidence < 0 || event.confidence > 100) {
        return reject(state, "confidence_out_of_range");
      }
      return accept(next(state, "EXPLAIN", { initialPrediction: event.predictionId, initialConfidence: event.confidence }));

    case "COMMIT_EXPLANATION": {
      const explanation = normalizeText(event.explanation);
      const dontKnow = event.dontKnow === true;
      if (!dontKnow && !isMeaningful(explanation)) {
        return reject(state, "meaningful_explanation_or_dont_know_required");
      }
      return accept(next(state, "INTERPRET", { initialExplanation: explanation, initialDontKnow: dontKnow }));
    }

    case "RESOLVE_INTERPRETATION": {
      const interpretation = toLearningInterpretation(event.interpretation);
      if (!interpretation) {
        return reject(state, "invalid_model_interpretation");
      }
      return accept(next(state, "PROBE_PREDICT", { interpretation, selectedProbeId: interpretation.recommendedProbeId }));
    }

    case "INTERPRETATION_FAILED":
      return accept(next(state, "PROBE_PREDICT", neutralFallback(event.reason)));

    case "COMMIT_PROBE_PREDICTION": {
      const probe = state.context.selectedProbeId ? PROBES[state.context.selectedProbeId] : undefined;
      if (!probe || !probe.predictionChoices.some((choice) => choice.id === event.predictionId)) {
        return reject(state, "invalid_probe_prediction");
      }
      return accept(next(state, "EXPERIMENT", { probePredictionId: event.predictionId }));
    }

    case "RUN_EXPERIMENT":
    case "REPLAY_EXPERIMENT":
      return accept(state);

    case "OBSERVE_EXPERIMENT":
      return accept(next(state, "REFLECT", { experimentObserved: true }));

    case "SUBMIT_REFLECTION": {
      const reflection = normalizeText(event.reflection);
      const dontKnow = event.dontKnow === true;
      if (!dontKnow && !isMeaningful(reflection)) {
        return reject(state, "meaningful_explanation_or_dont_know_required");
      }
      return accept(next(state, "RECONSTRUCT", { reflection, reflectionDontKnow: dontKnow }));
    }

    case "SUBMIT_RECONSTRUCTION": {
      const reconstruction = normalizeText(event.reconstruction);
      const dontKnow = event.dontKnow === true;
      if (!dontKnow && !isMeaningful(reconstruction)) {
        return reject(state, "meaningful_explanation_or_dont_know_required");
      }
      return accept(
        next(state, "RECONSTRUCT", {
          reconstruction,
          reconstructionDontKnow: dontKnow,
          reconstructionAttempts: state.context.reconstructionAttempts + 1,
        }),
      );
    }

    case "CONTINUE_TO_COLD_TRANSFER":
      if (state.context.reconstructionAttempts < 1) {
        return reject(state, "reconstruction_attempt_required");
      }
      return accept(next(state, "COLD_TRANSFER", { authorizedSupport: undefined }));

    case "REQUEST_SUPPORT":
      return requestSupport(state, event.level, event.reason);

    case "CONSUME_SUPPORT":
      return consumeSupport(state, event.level);

    case "SUBMIT_TRANSFER": {
      const explanation = normalizeText(event.explanation);
      const dontKnow = event.dontKnow === true;
      if (!event.choiceId && !dontKnow) {
        return reject(state, "transfer_answer_or_dont_know_required");
      }
      if (event.choiceId && !TRANSFER.choices.some((choice) => choice.id === event.choiceId)) {
        return reject(state, "transfer_answer_or_dont_know_required");
      }
      if (!dontKnow && !isMeaningful(explanation)) {
        return reject(state, "meaningful_explanation_or_dont_know_required");
      }
      return accept(next(state, "PROOF_RESULT", { transferChoiceId: event.choiceId, transferExplanation: explanation, transferDontKnow: dontKnow }));
    }
  }
}

export function isProofMode(state: LearningState): boolean {
  return state.stage === "COLD_TRANSFER" || state.stage === "PROOF_RESULT";
}

export function canRequestSupport(
  state: LearningState,
  level: Exclude<SupportLevel, 0>,
  reason: SupportRequestReason,
): boolean {
  return requestSupport(state, level, reason).accepted;
}

export function canConsumeSupport(state: LearningState, level: Exclude<SupportLevel, 0>): boolean {
  return consumeSupport(state, level).accepted;
}

export function selectedProbe(state: LearningState): ProbeId | undefined {
  return state.context.selectedProbeId;
}

export function supportKind(state: LearningState): SupportKind {
  let highest: SupportLevel = 0;
  for (const support of state.context.consumedSupport) {
    if (support.level > highest) {
      highest = support.level;
    }
  }
  return highest === 3 ? "principle" : highest === 2 ? "contrast" : highest === 1 ? "attention_cue" : "none";
}

export interface EvidenceCard {
  before: { predictionId?: PredictionId; explanationQuote: string; confidence?: number };
  test: { probeId?: ProbeId; title: string };
  support: { kind: SupportKind; consumedLevels: readonly Exclude<SupportLevel, 0>[] };
  alone: { choiceId?: TransferChoiceId; correct: boolean | null; explanationEvidence: string; dontKnow: boolean };
  later: "not tested yet";
}

export function deriveEvidenceCard(state: LearningState): EvidenceCard {
  const probe = state.context.selectedProbeId ? PROBES[state.context.selectedProbeId] : undefined;
  const answer = state.context.transferChoiceId;
  return {
    before: {
      predictionId: state.context.initialPrediction,
      explanationQuote: quote(state.context.initialExplanation, state.context.initialDontKnow),
      confidence: state.context.initialConfidence,
    },
    test: { probeId: probe?.id, title: probe?.shortTitle ?? "Not completed" },
    support: { kind: supportKind(state), consumedLevels: state.context.consumedSupport.map((item) => item.level) },
    alone: {
      choiceId: answer,
      correct: state.stage === "PROOF_RESULT" && answer ? answer === TRANSFER.correctChoiceId : null,
      explanationEvidence: quote(state.context.transferExplanation, state.context.transferDontKnow),
      dontKnow: state.context.transferDontKnow,
    },
    later: "not tested yet",
  };
}

function requestSupport(
  state: LearningState,
  level: Exclude<SupportLevel, 0>,
  reason: SupportRequestReason,
): LearningTransition {
  if (isProofMode(state)) {
    return reject(state, "invalid_event_for_stage");
  }
  if (state.context.consumedSupport.some((support) => support.level === level)) {
    return reject(state, "support_already_consumed");
  }
  if (state.context.authorizedSupport) {
    return reject(state, "support_not_available");
  }

  const afterCommittedProbeAttempt = state.context.probePredictionId !== undefined;
  const secondExplicitRequest = state.context.supportRequests >= 1 && reason === "second_explicit_request";
  const permitted =
    (level === 1 && afterCommittedProbeAttempt && reason === "stuck") ||
    (level === 2 &&
      ((reason === "revised_attempt_conflicts" && state.context.reconstructionAttempts >= 1) || secondExplicitRequest)) ||
    (level === 3 && (state.context.reconstructionAttempts >= 2 || reason === "show_principle"));

  if (!permitted) {
    return reject(state, "support_not_authorized");
  }
  return accept(
    next(state, state.stage, {
      supportRequests: state.context.supportRequests + 1,
      authorizedSupport: { level, reason },
    }),
  );
}

function consumeSupport(state: LearningState, level: Exclude<SupportLevel, 0>): LearningTransition {
  if (isProofMode(state)) {
    return reject(state, "invalid_event_for_stage");
  }
  if (state.context.consumedSupport.some((support) => support.level === level)) {
    return reject(state, "support_already_consumed");
  }
  if (!state.context.authorizedSupport) {
    return reject(state, "support_not_authorized");
  }
  if (state.context.authorizedSupport.level !== level) {
    return reject(state, "support_level_mismatch");
  }
  return accept(
    next(state, state.stage, {
      consumedSupport: [...state.context.consumedSupport, state.context.authorizedSupport],
      authorizedSupport: undefined,
    }),
  );
}

function toLearningInterpretation(interpretation: ValidatedInterpretation): LearningInterpretation | undefined {
  if (interpretation.source === "fallback") {
    return neutralFallback(interpretation.fallback_reason ?? "ambiguous_input").interpretation;
  }
  if (
    interpretation.abstain ||
    interpretation.hypotheses.length === 0 ||
    !PROBES[interpretation.recommended_probe_id] ||
    !LEVEL_1_QUESTION_IDS.includes(interpretation.recommended_level_1_question_id) ||
    !interpretation.hypotheses.every((hypothesis) => PROBES[interpretation.recommended_probe_id].compatibleHypotheses.includes(hypothesis.id))
  ) {
    return undefined;
  }
  return {
    source: "model",
    recommendedProbeId: interpretation.recommended_probe_id,
    recommendedLevel1QuestionId: interpretation.recommended_level_1_question_id,
  };
}

function neutralFallback(reason: FallbackReason): Pick<LearningContext, "interpretation" | "selectedProbeId"> {
  return {
    interpretation: {
      source: "fallback",
      recommendedProbeId: "neutral_core_probe",
      recommendedLevel1QuestionId: "neutral_observation_prompt",
      fallbackReason: reason,
    },
    selectedProbeId: "neutral_core_probe",
  };
}

function next(state: LearningState, stage: LearningStage, patch: Partial<LearningContext> = {}): LearningState {
  return { stage, context: { ...state.context, ...patch } };
}

function accept(state: LearningState): LearningTransition {
  return { accepted: true, state };
}

function reject(state: LearningState, reason: TransitionRejectionReason): LearningTransition {
  return { accepted: false, state, reason };
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function isMeaningful(value: string): boolean {
  return value.length >= 3;
}

function quote(value: string | undefined, dontKnow: boolean): string {
  if (dontKnow) {
    return "I genuinely don't know.";
  }
  return value?.slice(0, 180) ?? "Not recorded";
}
