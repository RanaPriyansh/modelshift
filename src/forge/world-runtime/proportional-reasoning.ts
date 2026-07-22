import { PROPORTIONAL_REASONING_WORLD, proportionalReasoningTransferValidator } from "../worlds";
import type { WorldRuntimeActionKind, WorldRuntimeStage } from "../contracts";
import {
  createInitialRatioWorldState,
  deriveRatioEvidence,
  transitionRatioWorld,
  type RatioProof,
  type RatioWorldEvent,
  type RatioWorldState,
} from "../../worlds/proportional-reasoning";
import type {
  CanonicalSupportEvent,
  CanonicalValidatorProjection,
  RuntimePhase,
  WorldRuntimeAdapter,
} from "./protocol";

const STAGE_MAP: Record<RatioWorldState["stage"], WorldRuntimeStage> = {
  MYSTERY: "encounter",
  EXPLAIN: "commit_model",
  COMPILER: "interpret_two_readings",
  EXPERIMENT: "run_separating_experience",
  RECONSTRUCT: "reconstruct",
  WITHDRAWAL: "withdraw_instructional_ai",
  COLD_TRANSFER: "cold_transfer",
  EVIDENCE: "bounded_result",
};

export function projectProportionalReasoningTransferValidation(input: unknown): CanonicalValidatorProjection {
  const result = proportionalReasoningTransferValidator.validate(input);
  if (result.code === "invalid.transfer-input") {
    return {
      outcome: "not_scored",
      criteria: ["The transfer payload did not match the authored map-scale task."],
    };
  }
  return {
    outcome: result.passed ? "pass" : "fail",
    criteria: result.evidence,
  };
}

function supportTier(level: number): CanonicalSupportEvent["tier"] {
  if (level === 1) return "attention";
  if (level === 2) return "representation";
  return "repair";
}

export const proportionalReasoningWorldRuntimeAdapter: WorldRuntimeAdapter<
  RatioWorldState,
  RatioWorldEvent,
  RatioProof
> = Object.freeze({
  pack: PROPORTIONAL_REASONING_WORLD as typeof PROPORTIONAL_REASONING_WORLD & {
    readonly runtime: NonNullable<typeof PROPORTIONAL_REASONING_WORLD.runtime>;
  },
  createInitialState: createInitialRatioWorldState,
  reduce: transitionRatioWorld,
  phase(state: RatioWorldState): RuntimePhase {
    if (state.stage === "COLD_TRANSFER") return "proof";
    return state.stage === "EVIDENCE" ? "bounded_result" : "learning";
  },
  initialSemanticStage() {
    return "encounter";
  },
  semanticStages(event: RatioWorldEvent): readonly WorldRuntimeStage[] {
    switch (event.type) {
      case "COMMIT_INITIAL":
        return ["commit_model"];
      case "COMMIT_EXPLANATION":
        return ["interpret_two_readings"];
      case "COMMIT_TEST_PREDICTION":
        return ["name_disagreement", "commit_test_prediction"];
      case "RUN_EXPERIMENT":
        return ["run_separating_experience"];
      case "REQUEST_SUPPORT":
        return ["governed_support"];
      case "SUBMIT_RECONSTRUCTION":
        return ["reconstruct"];
      case "ACKNOWLEDGE_WITHDRAWAL":
        return ["withdraw_instructional_ai", "cold_transfer"];
      case "SUBMIT_TRANSFER":
        return ["bounded_result"];
      default:
        return [];
    }
  },
  stage(state: RatioWorldState): WorldRuntimeStage {
    return STAGE_MAP[state.stage];
  },
  classify(event: RatioWorldEvent): WorldRuntimeActionKind {
    if (event.type === "REQUEST_SUPPORT") return "instructional_support";
    if (event.type === "RESET") return "reset";
    return "learner_operation";
  },
  supportEvent(event: RatioWorldEvent, state: RatioWorldState): CanonicalSupportEvent | null {
    if (event.type !== "REQUEST_SUPPORT") return null;
    const level = state.supportUsed.at(-1);
    if (!level) return null;
    return {
      actionId: "action.proportional-reasoning.support",
      stage: "governed_support",
      source: "authored",
      tier: supportTier(level),
    };
  },
  proof(state: RatioWorldState): RatioProof | null {
    return state.proof;
  },
  projectValidator(proof: RatioProof): CanonicalValidatorProjection {
    return projectProportionalReasoningTransferValidation({
      choiceId: proof.choiceId,
      explanation: proof.explanation,
      confidence: proof.confidence,
    });
  },
  remainsUntested(proof: RatioProof): readonly string[] {
    const state = {
      ...createInitialRatioWorldState(),
      stage: "EVIDENCE" as const,
      initialPredictionId: "same_strength" as const,
      initialConfidence: 0,
      testPredictionId: "same_strength" as const,
      experimentRun: true,
      proof,
      transferSubmitted: true,
    };
    return deriveRatioEvidence(state)?.notYetTested ?? [];
  },
});
