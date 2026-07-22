import { SOURCE_CORROBORATION_WORLD } from "../worlds";
import type {
  DeterministicValidationResult,
  WorldRuntimeActionKind,
  WorldRuntimeStage,
} from "../contracts";
import {
  evidenceLearningReducer,
  initialEvidenceLearningState,
  type EvidenceLearningAction,
  type EvidenceLearningState,
  type TransferSubmission,
} from "../../worlds/ai-learning";
import type {
  CanonicalSupportEvent,
  DomainTransition,
  RuntimePhase,
  WorldRuntimeAdapter,
} from "./protocol";

export interface SourceCorroborationRuntimeProof {
  readonly submission: TransferSubmission;
}

const STAGE_MAP: Record<EvidenceLearningState["stage"], WorldRuntimeStage> = {
  encounter: "encounter",
  compiler: "interpret_two_readings",
  evidence: "run_separating_experience",
  difference: "run_separating_experience",
  readings: "run_separating_experience",
  reconstruct: "reconstruct",
  withdrawal: "withdraw_instructional_ai",
  transfer: "cold_transfer",
  result: "bounded_result",
};

function toRuntimeProof(state: EvidenceLearningState): SourceCorroborationRuntimeProof | null {
  return state.transferSubmission ? { submission: state.transferSubmission } : null;
}

export const sourceCorroborationWorldRuntimeAdapter: WorldRuntimeAdapter<
  EvidenceLearningState,
  EvidenceLearningAction,
  SourceCorroborationRuntimeProof
> = Object.freeze({
  pack: SOURCE_CORROBORATION_WORLD as typeof SOURCE_CORROBORATION_WORLD & {
    readonly runtime: NonNullable<typeof SOURCE_CORROBORATION_WORLD.runtime>;
  },
  createInitialState: () => initialEvidenceLearningState,
  reduce(
    state: EvidenceLearningState,
    event: EvidenceLearningAction,
  ): DomainTransition<EvidenceLearningState> {
    const nextState = evidenceLearningReducer(state, event);
    if (nextState.lastError) return { accepted: false, state: nextState, reason: nextState.lastError };
    return { accepted: true, state: nextState };
  },
  phase(state: EvidenceLearningState): RuntimePhase {
    if (state.stage === "transfer") return "proof";
    return state.stage === "result" ? "bounded_result" : "learning";
  },
  initialSemanticStage() {
    return "encounter";
  },
  semanticStages(event: EvidenceLearningAction): readonly WorldRuntimeStage[] {
    switch (event.type) {
      case "COMMIT_ENCOUNTER":
        return ["commit_model"];
      case "ACCEPT_TWO_READINGS":
        return ["interpret_two_readings", "name_disagreement"];
      case "COMMIT_TEST_PREDICTION":
        return ["commit_test_prediction"];
      case "CONTINUE_FROM_EVIDENCE":
        return ["run_separating_experience"];
      case "COMMIT_BOUNDED_CLAIM":
        return ["reconstruct"];
      case "ACKNOWLEDGE_WITHDRAWAL":
        return ["withdraw_instructional_ai", "cold_transfer"];
      case "SUBMIT_TRANSFER":
        return ["bounded_result"];
      default:
        return [];
    }
  },
  stage(state: EvidenceLearningState) {
    return STAGE_MAP[state.stage];
  },
  classify(event: EvidenceLearningAction): WorldRuntimeActionKind {
    return event.type === "RESET" ? "reset" : "learner_operation";
  },
  supportEvent(): CanonicalSupportEvent | null {
    // Ordinary authored validation is neutral and is not silently recorded as
    // cognitive help. No support is consumed in this flow.
    return null;
  },
  proof: toRuntimeProof,
  validatorInput(proof: SourceCorroborationRuntimeProof) {
    return {
      choiceId: proof.submission.choiceId,
      openQuestionId: proof.submission.openQuestionId,
    };
  },
  validatorCriteria(result: DeterministicValidationResult) {
    return result.evidence;
  },
});
