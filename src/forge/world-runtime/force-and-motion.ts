import { TRANSFER } from "../../content/scenarios";
import {
  createInitialLearningState,
  deriveEvidenceCard,
  transitionLearningState,
  type EvidenceCard,
  type LearningEvent,
  type LearningState,
} from "../../domain/learning";
import { FORCE_AND_MOTION_WORLD, forceAndMotionTransferValidator } from "../worlds";
import type { WorldRuntimeActionKind, WorldRuntimeStage } from "../contracts";
import type {
  CanonicalSupportEvent,
  CanonicalValidatorProjection,
  RuntimePhase,
  WorldRuntimeAdapter,
} from "./protocol";

export interface ForceAndMotionRuntimeProof {
  /** The existing validator's exact payload; learner prose never enters it. */
  readonly validatorInput: unknown;
  readonly submissionCriterion: string;
  readonly evidence: EvidenceCard;
}

const STAGE_MAP: Record<LearningState["stage"], WorldRuntimeStage> = {
  HOOK: "encounter",
  PREDICT: "encounter",
  EXPLAIN: "commit_model",
  INTERPRET: "commit_model",
  PROBE_PREDICT: "name_disagreement",
  EXPERIMENT: "commit_test_prediction",
  REFLECT: "run_separating_experience",
  RECONSTRUCT: "run_separating_experience",
  COLD_TRANSFER: "cold_transfer",
  PROOF_RESULT: "bounded_result",
};

function representationSupport(source: "model" | "authored"): CanonicalSupportEvent {
  return {
    actionId: "action.force-and-motion.interpretation",
    stage: "interpret_two_readings",
    source,
    tier: "representation",
  };
}

function authoredSupportTier(level: 1 | 2 | 3): CanonicalSupportEvent["tier"] {
  if (level === 1) return "attention";
  if (level === 2) return "representation";
  return "repair";
}

function transferSubmissionCriterion(state: LearningState): string {
  return state.context.transferDontKnow
    ? "Submitted an explicit uncertainty for the authored transfer task."
    : "Submitted an explanation for the authored transfer task.";
}

function toRuntimeProof(state: LearningState): ForceAndMotionRuntimeProof | null {
  if (state.stage !== "PROOF_RESULT") return null;
  const validatorInput = state.context.transferChoiceId
    ? { taskId: TRANSFER.id, selectedAnswer: state.context.transferChoiceId }
    : { taskId: TRANSFER.id };
  return {
    validatorInput,
    submissionCriterion: transferSubmissionCriterion(state),
    evidence: deriveEvidenceCard(state),
  };
}

/**
 * The existing validator checks only the authored graph choice. Keep the
 * explanation requirement as a truthful submission criterion, never a claim
 * that the current validator evaluated causal explanation quality.
 */
export function projectForceAndMotionTransferValidation(
  input: unknown,
  submissionCriterion = "An explanation or explicit uncertainty submission was not available.",
): CanonicalValidatorProjection {
  const result = forceAndMotionTransferValidator.validate(input);
  if (result.code === "invalid.transfer-input") {
    return {
      outcome: "not_scored",
      criteria: [
        "The transfer payload did not match the authored cargo-pod task.",
        submissionCriterion,
      ],
    };
  }
  return {
    outcome: result.passed ? "pass" : "fail",
    criteria: [
      result.passed
        ? "Selected the authored constant-velocity transfer answer."
        : "Did not select the authored constant-velocity transfer answer.",
      submissionCriterion,
    ],
  };
}

export const forceAndMotionWorldRuntimeAdapter: WorldRuntimeAdapter<
  LearningState,
  LearningEvent,
  ForceAndMotionRuntimeProof
> = Object.freeze({
  pack: FORCE_AND_MOTION_WORLD as typeof FORCE_AND_MOTION_WORLD & {
    readonly runtime: NonNullable<typeof FORCE_AND_MOTION_WORLD.runtime>;
  },
  createInitialState: createInitialLearningState,
  reduce: transitionLearningState,
  phase(state: LearningState): RuntimePhase {
    if (state.stage === "COLD_TRANSFER") return "proof";
    return state.stage === "PROOF_RESULT" ? "bounded_result" : "learning";
  },
  initialSemanticStage() {
    return "encounter";
  },
  semanticStages(event: LearningEvent): readonly WorldRuntimeStage[] {
    switch (event.type) {
      case "COMMIT_EXPLANATION":
        return ["commit_model"];
      case "RESOLVE_INTERPRETATION":
      case "INTERPRETATION_FAILED":
        return ["interpret_two_readings", "name_disagreement"];
      case "COMMIT_PROBE_PREDICTION":
        return ["commit_test_prediction"];
      case "RUN_EXPERIMENT":
        return ["run_separating_experience"];
      case "CONSUME_SUPPORT":
        return ["governed_support"];
      case "SUBMIT_RECONSTRUCTION":
        return ["reconstruct"];
      case "CONTINUE_TO_COLD_TRANSFER":
        return ["withdraw_instructional_ai", "cold_transfer"];
      case "SUBMIT_TRANSFER":
        return ["bounded_result"];
      default:
        return [];
    }
  },
  stage(state: LearningState): WorldRuntimeStage {
    return STAGE_MAP[state.stage];
  },
  classify(event: LearningEvent): WorldRuntimeActionKind {
    if (event.type === "RESOLVE_INTERPRETATION" || event.type === "INTERPRETATION_FAILED" || event.type === "CONSUME_SUPPORT") {
      return "instructional_support";
    }
    if (event.type === "REPLAY_EXPERIMENT") return "experience_replay";
    if (event.type === "RESET") return "reset";
    return "learner_operation";
  },
  supportEvent(event: LearningEvent, state: LearningState): CanonicalSupportEvent | null {
    if (event.type === "RESOLVE_INTERPRETATION") {
      return representationSupport(event.interpretation.source === "model" ? "model" : "authored");
    }
    if (event.type === "INTERPRETATION_FAILED") return representationSupport("authored");
    if (event.type !== "CONSUME_SUPPORT") return null;
    const support = state.context.consumedSupport.at(-1);
    if (!support) return null;
    return {
      actionId: "action.force-and-motion.support",
      stage: "governed_support",
      source: "authored",
      tier: authoredSupportTier(support.level),
    };
  },
  proof: toRuntimeProof,
  projectValidator(proof: ForceAndMotionRuntimeProof): CanonicalValidatorProjection {
    return projectForceAndMotionTransferValidation(proof.validatorInput, proof.submissionCriterion);
  },
  remainsUntested(proof: ForceAndMotionRuntimeProof): readonly string[] {
    return [
      `Delayed retention: ${proof.evidence.later}.`,
      "Transfer beyond this one authored cargo-pod task was not tested.",
      "Reliability across repeated attempts was not tested.",
      "Causal explanation quality beyond the validator's authored-choice signal was not tested.",
      "Representative learner and accessibility validity were not tested.",
    ];
  },
});
