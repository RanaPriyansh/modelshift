import { EVIDENCE_IDS, PLAUSIBLE_READINGS, READING_VERDICTS } from "./content";
import type {
  EvidenceId,
  EvidenceLearningAction,
  EvidenceLearningError,
  EvidenceLearningState,
} from "./types";
import {
  deriveLearningRecord,
  scoreColdTransfer,
  validateBoundedClaim,
  validateDifference,
  validateEncounter,
  validateEvidenceReview,
  validateReadings,
  validateTestPrediction,
  validateTransferSubmission,
} from "./validator";

export const initialEvidenceLearningState: EvidenceLearningState = {
  stage: "encounter",
  encounter: { stanceId: null, confidence: 60, reason: "" },
  committedEncounter: null,
  acceptedTwoReadings: false,
  testPredictionId: null,
  reviewedEvidenceIds: [],
  differenceId: null,
  readingVerdicts: {},
  boundedClaimId: null,
  transferChoiceId: null,
  transferOpenQuestionId: null,
  transferSubmission: null,
  transferScore: null,
  record: null,
  lastError: null,
};

function reject(state: EvidenceLearningState, lastError: EvidenceLearningError): EvidenceLearningState {
  return { ...state, lastError };
}

function atStage(state: EvidenceLearningState, stage: EvidenceLearningState["stage"]): boolean {
  return state.stage === stage;
}

function addReviewedEvidence(ids: readonly EvidenceId[], evidenceId: EvidenceId): readonly EvidenceId[] {
  return ids.includes(evidenceId) ? ids : [...ids, evidenceId];
}

export function evidenceLearningReducer(
  state: EvidenceLearningState,
  action: EvidenceLearningAction,
): EvidenceLearningState {
  switch (action.type) {
    case "SET_STANCE":
      return atStage(state, "encounter")
        ? { ...state, encounter: { ...state.encounter, stanceId: action.stanceId }, lastError: null }
        : reject(state, "invalid-transition");
    case "SET_CONFIDENCE":
      return atStage(state, "encounter")
        ? { ...state, encounter: { ...state.encounter, confidence: action.confidence }, lastError: null }
        : reject(state, "invalid-transition");
    case "SET_REASON":
      return atStage(state, "encounter")
        ? { ...state, encounter: { ...state.encounter, reason: action.reason }, lastError: null }
        : reject(state, "invalid-transition");
    case "COMMIT_ENCOUNTER": {
      if (!atStage(state, "encounter")) return reject(state, "invalid-transition");
      const result = validateEncounter(state.encounter);
      if (!result.ok) return reject(state, result.error);
      return {
        ...state,
        stage: "compiler",
        committedEncounter: { ...state.encounter, reason: state.encounter.reason.trim() },
        lastError: null,
      };
    }
    case "ACCEPT_TWO_READINGS":
      return atStage(state, "compiler")
        ? { ...state, acceptedTwoReadings: true, lastError: null }
        : reject(state, "invalid-transition");
    case "COMMIT_TEST_PREDICTION": {
      if (!atStage(state, "compiler")) return reject(state, "invalid-transition");
      const result = validateTestPrediction(state.acceptedTwoReadings, action.predictionId);
      return result.ok
        ? { ...state, testPredictionId: action.predictionId, stage: "evidence", lastError: null }
        : reject(state, result.error);
    }
    case "REVIEW_EVIDENCE":
      if (!atStage(state, "evidence") || !EVIDENCE_IDS.includes(action.evidenceId)) return reject(state, "invalid-transition");
      return {
        ...state,
        reviewedEvidenceIds: addReviewedEvidence(state.reviewedEvidenceIds, action.evidenceId),
        lastError: null,
      };
    case "CONTINUE_FROM_EVIDENCE": {
      if (!atStage(state, "evidence")) return reject(state, "invalid-transition");
      const result = validateEvidenceReview(state.reviewedEvidenceIds);
      return result.ok ? { ...state, stage: "difference", lastError: null } : reject(state, result.error);
    }
    case "SET_DIFFERENCE":
      return atStage(state, "difference")
        ? { ...state, differenceId: action.differenceId, lastError: null }
        : reject(state, "invalid-transition");
    case "COMMIT_DIFFERENCE": {
      if (!atStage(state, "difference")) return reject(state, "invalid-transition");
      const result = validateDifference(state.differenceId);
      return result.ok ? { ...state, stage: "readings", lastError: null } : reject(state, result.error);
    }
    case "SET_READING_VERDICT":
      if (
        !atStage(state, "readings") ||
        !PLAUSIBLE_READINGS.some((reading) => reading.id === action.readingId) ||
        !READING_VERDICTS.some((verdict) => verdict.id === action.verdict)
      ) {
        return reject(state, "invalid-transition");
      }
      return {
        ...state,
        readingVerdicts: { ...state.readingVerdicts, [action.readingId]: action.verdict },
        lastError: null,
      };
    case "COMMIT_READINGS": {
      if (!atStage(state, "readings")) return reject(state, "invalid-transition");
      const result = validateReadings(state.readingVerdicts);
      return result.ok ? { ...state, stage: "reconstruct", lastError: null } : reject(state, result.error);
    }
    case "SET_BOUNDED_CLAIM":
      return atStage(state, "reconstruct")
        ? { ...state, boundedClaimId: action.claimId, lastError: null }
        : reject(state, "invalid-transition");
    case "COMMIT_BOUNDED_CLAIM": {
      if (!atStage(state, "reconstruct")) return reject(state, "invalid-transition");
      const result = validateBoundedClaim(state.boundedClaimId);
      return result.ok ? { ...state, stage: "withdrawal", lastError: null } : reject(state, result.error);
    }
    case "ACKNOWLEDGE_WITHDRAWAL":
      return atStage(state, "withdrawal")
        ? { ...state, stage: "transfer", lastError: null }
        : reject(state, "invalid-transition");
    case "SET_TRANSFER_CHOICE":
      return atStage(state, "transfer")
        ? { ...state, transferChoiceId: action.choiceId, lastError: null }
        : reject(state, "invalid-transition");
    case "SET_TRANSFER_OPEN_QUESTION":
      return atStage(state, "transfer")
        ? { ...state, transferOpenQuestionId: action.openQuestionId, lastError: null }
        : reject(state, "invalid-transition");
    case "SUBMIT_TRANSFER": {
      if (!atStage(state, "transfer")) return reject(state, "invalid-transition");
      const result = validateTransferSubmission(state.transferChoiceId, state.transferOpenQuestionId);
      if (!result.ok) return reject(state, result.error);
      if (!state.committedEncounter || !state.differenceId || !state.boundedClaimId || !state.transferChoiceId || !state.transferOpenQuestionId) {
        return reject(state, "invalid-transition");
      }
      const transferScore = scoreColdTransfer(state.transferChoiceId, state.transferOpenQuestionId);
      const record = deriveLearningRecord({
        encounter: state.committedEncounter,
        differenceId: state.differenceId,
        boundedClaimId: state.boundedClaimId,
        transferChoiceId: state.transferChoiceId,
        transferOpenQuestionId: state.transferOpenQuestionId,
        transferScore,
      });
      return {
        ...state,
        stage: "result",
        transferSubmission: {
          choiceId: state.transferChoiceId,
          openQuestionId: state.transferOpenQuestionId,
          submitted: true,
        },
        transferScore,
        record,
        lastError: null,
      };
    }
    case "RESET":
      return initialEvidenceLearningState;
    default:
      return state;
  }
}
