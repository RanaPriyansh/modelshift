import {
  PRIMARY_SOURCE_REASONING_WORLD,
  primarySourceReasoningTransferValidator,
} from "../worlds";
import type { WorldRuntimeActionKind, WorldRuntimeStage } from "../contracts";
import {
  createInitialPrimarySourceState,
  transitionPrimarySourceWorld,
  type PrimarySourceProofRecord,
  type PrimarySourceStage,
  type PrimarySourceWorldEvent,
  type PrimarySourceWorldState,
  type TransferSubmission,
} from "../../worlds/primary-source-reasoning";
import type {
  CanonicalSupportEvent,
  RuntimePhase,
  WorldRuntimeAdapter,
} from "./protocol";

export interface PrimarySourceRuntimeProof {
  readonly record: PrimarySourceProofRecord;
  readonly submission: TransferSubmission;
}

const STAGE_MAP: Record<PrimarySourceStage, WorldRuntimeStage> = {
  MYSTERY: "encounter",
  EXPLAIN: "commit_model",
  COMPILER: "interpret_two_readings",
  TEST: "run_separating_experience",
  RECONSTRUCT: "reconstruct",
  WITHDRAWAL: "withdraw_instructional_ai",
  COLD_TRANSFER: "cold_transfer",
  RESULT: "bounded_result",
};

function supportTier(level: number): CanonicalSupportEvent["tier"] {
  if (level === 1) return "attention";
  if (level === 2) return "representation";
  return "repair";
}

function toRuntimeProof(state: PrimarySourceWorldState): PrimarySourceRuntimeProof | null {
  const evaluation = state.transferEvaluation;
  const assignments = evaluation?.assignments;
  if (!state.proof || !assignments) return null;
  return {
    record: state.proof,
    submission: {
      taskId: evaluation.taskId,
      assignments,
    },
  };
}

export const primarySourceWorldRuntimeAdapter: WorldRuntimeAdapter<
  PrimarySourceWorldState,
  PrimarySourceWorldEvent,
  PrimarySourceRuntimeProof
> = Object.freeze({
  pack: PRIMARY_SOURCE_REASONING_WORLD as typeof PRIMARY_SOURCE_REASONING_WORLD & {
    readonly runtime: NonNullable<typeof PRIMARY_SOURCE_REASONING_WORLD.runtime>;
  },
  createInitialState: createInitialPrimarySourceState,
  reduce: transitionPrimarySourceWorld,
  phase(state: PrimarySourceWorldState): RuntimePhase {
    if (state.stage === "COLD_TRANSFER") return "proof";
    return state.stage === "RESULT" ? "bounded_result" : "learning";
  },
  stage(state: PrimarySourceWorldState): WorldRuntimeStage {
    return STAGE_MAP[state.stage];
  },
  classify(event: PrimarySourceWorldEvent): WorldRuntimeActionKind {
    if (event.type === "REQUEST_SUPPORT" || event.type === "USE_EXPLANATION_SAMPLE") return "instructional_support";
    if (event.type === "RESET") return "reset";
    return "learner_operation";
  },
  supportEvent(event: PrimarySourceWorldEvent, state: PrimarySourceWorldState): CanonicalSupportEvent | null {
    if (event.type === "USE_EXPLANATION_SAMPLE") {
      return {
        actionId: "action.primary-source.support",
        stage: "commit_model",
        source: "authored",
        tier: "example",
      };
    }
    if (event.type !== "REQUEST_SUPPORT") return null;
    const level = state.supportUsed.at(-1);
    if (!level) return null;
    return {
      actionId: "action.primary-source.support",
      stage: "governed_support",
      source: "authored",
      tier: supportTier(level),
    };
  },
  proof: toRuntimeProof,
  validateProof(proof: PrimarySourceRuntimeProof) {
    return primarySourceReasoningTransferValidator.validate(proof.submission);
  },
  remainsUntested(proof: PrimarySourceRuntimeProof) {
    return proof.record.notYetTested;
  },
});
