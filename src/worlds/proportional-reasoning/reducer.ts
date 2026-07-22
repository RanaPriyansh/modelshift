import { PROPORTIONAL_REASONING_CONTENT } from "./content";
import type {
  RatioEvidenceRecord,
  RatioTransitionRejection,
  RatioTransitionResult,
  RatioWorldEvent,
  RatioWorldState,
} from "./model";
import {
  evaluateTransfer,
  isIndependentProportionalTransferDemonstrated,
  isExperimentView,
  isInitialPredictionId,
  isMeaningfulExplanation,
  isSeparatingTestPredictionId,
  isTransferChoiceId,
  isValidConfidence,
  validateReconstruction,
} from "./validator";

export function createInitialRatioWorldState(): RatioWorldState {
  return Object.freeze({
    stage: "MYSTERY",
    initialPredictionId: null,
    initialConfidence: null,
    initialExplanation: "",
    testPredictionId: null,
    experimentRun: false,
    experimentView: "parts",
    supportUsed: Object.freeze([]),
    reconstruction: "",
    transferSubmitted: false,
    proof: null,
  });
}

function accept(state: RatioWorldState): RatioTransitionResult {
  return { accepted: true, state: Object.freeze(state) };
}

function reject(state: RatioWorldState, reason: RatioTransitionRejection): RatioTransitionResult {
  return { accepted: false, state, reason };
}

export function transitionRatioWorld(state: RatioWorldState, event: RatioWorldEvent): RatioTransitionResult {
  if (event.type === "RESET") return accept(createInitialRatioWorldState());

  switch (state.stage) {
    case "MYSTERY": {
      if (event.type !== "COMMIT_INITIAL") return reject(state, "invalid_event_for_stage");
      if (!isInitialPredictionId(event.predictionId)) return reject(state, "invalid_prediction");
      if (!isValidConfidence(event.confidence)) return reject(state, "invalid_confidence");
      return accept({ ...state, stage: "EXPLAIN", initialPredictionId: event.predictionId, initialConfidence: event.confidence });
    }
    case "EXPLAIN": {
      if (event.type !== "COMMIT_EXPLANATION") return reject(state, "invalid_event_for_stage");
      if (!isMeaningfulExplanation(event.explanation)) return reject(state, "explanation_too_short");
      return accept({ ...state, stage: "COMPILER", initialExplanation: event.explanation.trim() });
    }
    case "COMPILER": {
      if (event.type !== "COMMIT_TEST_PREDICTION") return reject(state, "invalid_event_for_stage");
      if (!isSeparatingTestPredictionId(event.predictionId)) return reject(state, "invalid_test_prediction");
      return accept({ ...state, stage: "EXPERIMENT", testPredictionId: event.predictionId });
    }
    case "EXPERIMENT": {
      if (event.type === "RUN_EXPERIMENT") return accept({ ...state, experimentRun: true, experimentView: "common_water" });
      if (event.type === "SET_EXPERIMENT_VIEW") {
        if (!isExperimentView(event.view)) return reject(state, "invalid_experiment_view");
        if (!state.experimentRun && event.view !== "parts") return reject(state, "experiment_must_run_first");
        return accept({ ...state, experimentView: event.view });
      }
      if (event.type === "REQUEST_SUPPORT") {
        if (!state.experimentRun) return reject(state, "experiment_must_run_first");
        if (state.supportUsed.length >= PROPORTIONAL_REASONING_CONTENT.cues.length) return reject(state, "support_ceiling_reached");
        const nextLevel = (state.supportUsed.length + 1) as 1 | 2 | 3;
        return accept({ ...state, supportUsed: Object.freeze([...state.supportUsed, nextLevel]) });
      }
      if (event.type === "BEGIN_RECONSTRUCTION") {
        if (!state.experimentRun) return reject(state, "experiment_must_run_first");
        return accept({ ...state, stage: "RECONSTRUCT" });
      }
      return reject(state, "invalid_event_for_stage");
    }
    case "RECONSTRUCT": {
      if (event.type === "REQUEST_SUPPORT") {
        if (state.supportUsed.length >= PROPORTIONAL_REASONING_CONTENT.cues.length) return reject(state, "support_ceiling_reached");
        const nextLevel = (state.supportUsed.length + 1) as 1 | 2 | 3;
        return accept({ ...state, supportUsed: Object.freeze([...state.supportUsed, nextLevel]) });
      }
      if (event.type !== "SUBMIT_RECONSTRUCTION") return reject(state, "invalid_event_for_stage");
      if (!validateReconstruction(event.reconstruction)) return reject(state, "reconstruction_not_ready");
      return accept({ ...state, stage: "WITHDRAWAL", reconstruction: event.reconstruction.trim() });
    }
    case "WITHDRAWAL": {
      if (event.type !== "ACKNOWLEDGE_WITHDRAWAL") return reject(state, "invalid_event_for_stage");
      return accept({ ...state, stage: "COLD_TRANSFER" });
    }
    case "COLD_TRANSFER": {
      if (state.transferSubmitted) return reject(state, "transfer_already_submitted");
      if (event.type !== "SUBMIT_TRANSFER") return reject(state, "invalid_event_for_stage");
      if (!isTransferChoiceId(event.choiceId)) return reject(state, "invalid_transfer_choice");
      if (!isValidConfidence(event.confidence)) return reject(state, "invalid_confidence");
      if (!isMeaningfulExplanation(event.explanation)) return reject(state, "explanation_too_short");
      const proof = evaluateTransfer(event.choiceId, event.explanation, event.confidence);
      return accept({ ...state, stage: "EVIDENCE", transferSubmitted: true, proof });
    }
    case "EVIDENCE":
      return reject(state, "transfer_already_submitted");
  }
}

export function deriveRatioEvidence(state: RatioWorldState): RatioEvidenceRecord | null {
  if (
    state.stage !== "EVIDENCE" ||
    !state.proof ||
    !state.initialPredictionId ||
    !state.testPredictionId ||
    state.initialConfidence === null
  ) return null;
  const relationshipMechanismDemonstrated = isIndependentProportionalTransferDemonstrated(state.proof);
  return Object.freeze({
    capabilityId: "capability.proportional-reasoning.compare-and-scale",
    before: Object.freeze({
      predictionId: state.initialPredictionId,
      confidence: state.initialConfidence,
      explanation: state.initialExplanation,
    }),
    separatingTest: Object.freeze({
      predictionId: state.testPredictionId,
      exactComparison: "2/3 < 5/6",
      commonWaterComparison: "4/6 < 5/6",
      observed: state.experimentRun,
    }),
    assistance: Object.freeze({
      levelsUsed: Object.freeze([...state.supportUsed]),
      wasAvailableDuringProof: false,
    }),
    independentTransfer: Object.freeze({
      choiceId: state.proof.choiceId,
      answerCorrect: state.proof.answerCorrect,
      explanationProvided: state.proof.explanation.length > 0,
      mechanismSignals: state.proof.mechanismSignals,
      relationshipMechanismDemonstrated,
      confidence: state.proof.confidence,
    }),
    demonstrated: relationshipMechanismDemonstrated
      ? "On this new map-scale problem, the learner selected the exact proportional result and explained a relevant relationship without support."
      : state.proof.answerCorrect
        ? "On this new map-scale problem, the learner selected the exact proportional result without support; the explanation did not yet show how the relationship was preserved."
        : "This new map-scale problem did not yet provide evidence of an exact independent proportional result.",
    notYetTested: Object.freeze([
      "Delayed retention after assistance has faded",
      "Transfer across a wider range of proportional and non-proportional situations",
      "Independent setup when no answer choices are provided",
    ]),
    returnProof: Object.freeze({
      scheduled: false,
      afterDays: PROPORTIONAL_REASONING_CONTENT.returnProof.afterDays,
    }),
  });
}
