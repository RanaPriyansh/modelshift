import { ARGUMENT_EVIDENCE_WORLD } from "../worlds";
import type { DeterministicValidationResult, WorldRuntimeActionKind, WorldRuntimeStage } from "../contracts";
import {
  createInitialArgumentEvidenceState,
  makeArgumentEvidenceTransferSubmission,
  transitionArgumentEvidenceWorld,
  type ArgumentEvidenceProofRecord,
  type ArgumentEvidenceStage,
  type ArgumentEvidenceWorldEvent,
  type ArgumentEvidenceWorldState,
} from "../../worlds/argument-evidence";
import type { CanonicalSupportEvent, RuntimePhase, WorldRuntimeAdapter } from "./protocol";

export interface ArgumentEvidenceRuntimeProof {
  readonly record: ArgumentEvidenceProofRecord;
  readonly submission: NonNullable<ReturnType<typeof makeArgumentEvidenceTransferSubmission>>;
}

const STAGE_MAP: Record<ArgumentEvidenceStage, WorldRuntimeStage> = {
  MYSTERY: "encounter",
  EXPLAIN: "commit_model",
  COMPILER: "interpret_two_readings",
  TEST: "run_separating_experience",
  SUPPORT: "governed_support",
  RECONSTRUCT: "reconstruct",
  WITHDRAWAL: "withdraw_instructional_ai",
  COLD_TRANSFER: "cold_transfer",
  RESULT: "bounded_result",
};

function proof(state: ArgumentEvidenceWorldState): ArgumentEvidenceRuntimeProof | null {
  const submission = makeArgumentEvidenceTransferSubmission(state);
  return state.proof && submission ? { record: state.proof, submission } : null;
}

function supportEvent(level: 1 | 2 | 3): CanonicalSupportEvent {
  const suffix = level === 1 ? "attention" : level === 2 ? "cue" : "representation";
  const tier = level === 1 ? "attention" : level === 2 ? "cue" : "representation";
  return {
    actionId: `action.argument-evidence.support.${suffix}`,
    stage: "governed_support",
    source: "authored",
    tier,
    policyId: "policy.argument-evidence.authored-support.v1",
    providerId: null,
    modelId: null,
    fallbackReason: null,
  };
}

export const argumentEvidenceWorldRuntimeAdapter: WorldRuntimeAdapter<
  ArgumentEvidenceWorldState,
  ArgumentEvidenceWorldEvent,
  ArgumentEvidenceRuntimeProof
> = Object.freeze({
  pack: ARGUMENT_EVIDENCE_WORLD as typeof ARGUMENT_EVIDENCE_WORLD & { readonly runtime: NonNullable<typeof ARGUMENT_EVIDENCE_WORLD.runtime> },
  createInitialState: createInitialArgumentEvidenceState,
  reduce: transitionArgumentEvidenceWorld,
  phase(state: ArgumentEvidenceWorldState): RuntimePhase {
    return state.stage === "COLD_TRANSFER" ? "proof" : state.stage === "RESULT" ? "bounded_result" : "learning";
  },
  stage: (state: ArgumentEvidenceWorldState) => STAGE_MAP[state.stage],
  initialSemanticStage: () => "encounter",
  semanticStages(event: ArgumentEvidenceWorldEvent): readonly WorldRuntimeStage[] {
    switch (event.type) {
      case "COMMIT_INITIAL": return ["commit_model"] as const;
      case "RESPOND_TO_TWO_READINGS": return ["interpret_two_readings"] as const;
      case "NAME_DISAGREEMENT": return ["name_disagreement"] as const;
      case "COMMIT_TEST_PREDICTION": return ["commit_test_prediction"] as const;
      case "REVEAL_SEPARATING_COMPARISON": return ["run_separating_experience"] as const;
      case "CONSUME_AUTHORED_SUPPORT": return ["governed_support"] as const;
      case "SUBMIT_RECONSTRUCTION": return ["reconstruct"] as const;
      case "ACKNOWLEDGE_WITHDRAWAL": return ["withdraw_instructional_ai", "cold_transfer"] as const;
      case "SUBMIT_TRANSFER": return ["bounded_result"] as const;
      default: return [];
    }
  },
  classify(event: ArgumentEvidenceWorldEvent): WorldRuntimeActionKind {
    if (event.type === "CONSUME_AUTHORED_SUPPORT") return "instructional_support";
    return event.type === "RESET" ? "reset" : "learner_operation";
  },
  supportEvent(event: ArgumentEvidenceWorldEvent): CanonicalSupportEvent | null {
    return event.type === "CONSUME_AUTHORED_SUPPORT" ? supportEvent(event.level) : null;
  },
  proof,
  validatorInput: (value: ArgumentEvidenceRuntimeProof) => value.submission,
  validatorCriteria: (result: DeterministicValidationResult) => result.evidence,
});
