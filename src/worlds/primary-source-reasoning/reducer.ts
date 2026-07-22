import {
  CORRECT_RECONSTRUCTION_CHOICE_ID,
  MYSTERY_CHOICES,
  PRIMARY_SOURCE_CAPABILITY_ID,
  PRIMARY_SOURCE_CONTENT,
  PRIMARY_SOURCE_PROOF_CLAIM_ID,
  PRIMARY_SOURCE_VALIDATOR_ID,
  PRIMARY_SOURCE_WORLD_ID,
  PRIMARY_SOURCE_WORLD_VERSION,
  RESULT_BOUNDARIES,
  SUPPORT_LADDER,
  TRANSFER_STATEMENTS,
  TEST_PREDICTIONS,
  WORKED_STATEMENTS,
} from "./content";
import {
  EVIDENCE_CATEGORIES,
  type AssignmentMap,
  type EvidenceCategory,
  type PrimarySourceProofRecord,
  type PrimarySourceTransitionResult,
  type PrimarySourceWorldEvent,
  type PrimarySourceWorldState,
  type SupportLevel,
  type TransitionRejectReason,
  type WorkedStatementId,
} from "./types";
import {
  makeTransferSubmission,
  validatePrimarySourceTransfer,
} from "./validator";

export function createInitialPrimarySourceState(): PrimarySourceWorldState {
  return {
    stage: "MYSTERY",
    initialChoiceId: null,
    confidence: null,
    initialExplanation: "",
    explanationSampleUsed: false,
    interpretationResponse: null,
    compilerCorrection: "",
    testPredictionId: null,
    catalogOpened: false,
    workedAssignments: {},
    workedTestPassed: false,
    workedTestAttempts: 0,
    supportUsed: [],
    reconstructionChoiceId: null,
    reconstructionText: "",
    transferAssignments: {},
    transferConfidence: null,
    transferExplanation: "",
    transferSubmitted: false,
    transferEvaluation: null,
    proof: null,
  };
}

function accept(state: PrimarySourceWorldState): PrimarySourceTransitionResult {
  return { accepted: true, state };
}

function reject(
  state: PrimarySourceWorldState,
  reason: TransitionRejectReason,
): PrimarySourceTransitionResult {
  return { accepted: false, reason, state };
}

function hasAllAssignments<StatementId extends string>(
  ids: readonly StatementId[],
  assignments: AssignmentMap<StatementId>,
): assignments is Record<StatementId, EvidenceCategory> {
  return ids.every((id) => Boolean(assignments[id]));
}

function scoreWorkedAssignments(
  assignments: Record<WorkedStatementId, EvidenceCategory>,
): boolean {
  return WORKED_STATEMENTS.every(
    (statement) => assignments[statement.id] === statement.correctCategory,
  );
}

function deriveProof(
  state: PrimarySourceWorldState,
): PrimarySourceProofRecord | null {
  if (
    state.stage !== "RESULT" ||
    !state.initialChoiceId ||
    !state.transferEvaluation
  ) {
    return null;
  }

  const transfer = state.transferEvaluation;
  return {
    worldId: PRIMARY_SOURCE_WORLD_ID,
    worldVersion: PRIMARY_SOURCE_WORLD_VERSION,
    capabilityId: PRIMARY_SOURCE_CAPABILITY_ID,
    proofClaimId: PRIMARY_SOURCE_PROOF_CLAIM_ID,
    validatorId: PRIMARY_SOURCE_VALIDATOR_ID,
    taskId: transfer.taskId,
    initialModelId: state.initialChoiceId,
    separatingTest: {
      sourceId: PRIMARY_SOURCE_CONTENT.mystery.sourceId,
      catalogOpened: true,
      classificationsCorrect: true,
    },
    assistance: {
      explanationSampleUsed: state.explanationSampleUsed,
      levelsUsed: [...state.supportUsed],
      wasAvailableDuringProof: false,
    },
    independentTransfer: {
      sourceId: PRIMARY_SOURCE_CONTENT.transfer.sourceId,
      confidence: state.transferConfidence ?? 0,
      score: transfer.score,
      correctCount: transfer.correctCount,
      passed: transfer.passed,
      code: transfer.code,
    },
    demonstrated: transfer.evidence,
    notYetTested: [...RESULT_BOUNDARIES.notYetTested],
  };
}

export function derivePrimarySourceEvidence(
  state: PrimarySourceWorldState,
): PrimarySourceProofRecord | null {
  return state.proof ?? deriveProof(state);
}

export function transitionPrimarySourceWorld(
  state: PrimarySourceWorldState,
  event: PrimarySourceWorldEvent,
): PrimarySourceTransitionResult {
  if (event.type === "RESET") return accept(createInitialPrimarySourceState());

  if (state.stage === "MYSTERY") {
    if (event.type !== "COMMIT_INITIAL") {
      return reject(state, "invalid_event_for_stage");
    }
    if (!MYSTERY_CHOICES.some((choice) => choice.id === event.choiceId)) {
      return reject(state, "invalid_initial_choice");
    }
    if (
      !Number.isInteger(event.confidence) ||
      event.confidence < 0 ||
      event.confidence > 100
    ) {
      return reject(state, "invalid_confidence");
    }
    return accept({
      ...state,
      stage: "EXPLAIN",
      initialChoiceId: event.choiceId,
      confidence: event.confidence,
    });
  }

  if (state.stage === "EXPLAIN") {
    if (event.type === "USE_EXPLANATION_SAMPLE") {
      return accept({ ...state, explanationSampleUsed: true });
    }
    if (event.type !== "COMMIT_EXPLANATION") {
      return reject(state, "invalid_event_for_stage");
    }
    const explanation = event.explanation.trim();
    if (explanation.length < 24) {
      return reject(state, "explanation_too_short");
    }
    return accept({
      ...state,
      stage: "COMPILER",
      initialExplanation: explanation,
    });
  }

  if (state.stage === "COMPILER") {
    if (event.type !== "ACCEPT_INTERPRETATIONS") {
      return reject(state, "invalid_event_for_stage");
    }
    const correction = event.correction?.trim() ?? "";
    if (event.response === "corrected" && correction.length < 16) {
      return reject(state, "compiler_correction_too_short");
    }
    return accept({
      ...state,
      stage: "TEST",
      interpretationResponse: event.response,
      compilerCorrection: event.response === "corrected" ? correction : "",
    });
  }

  if (state.stage === "TEST") {
    if (event.type === "COMMIT_TEST_PREDICTION") {
      if (state.catalogOpened) return reject(state, "invalid_event_for_stage");
      if (!TEST_PREDICTIONS.some((prediction) => prediction.id === event.predictionId)) {
        return reject(state, "invalid_test_prediction");
      }
      return accept({ ...state, testPredictionId: event.predictionId });
    }

    if (event.type === "OPEN_CATALOG") {
      if (!state.testPredictionId) return reject(state, "test_prediction_required");
      return accept({ ...state, catalogOpened: true });
    }

    if (event.type === "SET_WORKED_ASSIGNMENT") {
      if (!state.catalogOpened) return reject(state, "catalog_must_open_first");
      if (!WORKED_STATEMENTS.some((statement) => statement.id === event.statementId)) {
        return reject(state, "invalid_statement");
      }
      if (!EVIDENCE_CATEGORIES.includes(event.category)) {
        return reject(state, "invalid_category");
      }
      return accept({
        ...state,
        workedAssignments: {
          ...state.workedAssignments,
          [event.statementId]: event.category,
        },
      });
    }

    if (event.type === "REQUEST_SUPPORT") {
      if (!state.catalogOpened) return reject(state, "catalog_must_open_first");
      if (state.supportUsed.length >= SUPPORT_LADDER.length) {
        return reject(state, "support_ceiling_reached");
      }
      const level = (state.supportUsed.length + 1) as SupportLevel;
      return accept({ ...state, supportUsed: [...state.supportUsed, level] });
    }

    if (event.type === "SUBMIT_WORKED_TEST") {
      if (!state.catalogOpened) return reject(state, "catalog_must_open_first");
      const ids = WORKED_STATEMENTS.map((statement) => statement.id);
      if (!hasAllAssignments(ids, state.workedAssignments)) {
        return reject(state, "classification_incomplete");
      }
      if (!scoreWorkedAssignments(state.workedAssignments)) {
        return {
          accepted: false,
          reason: "classification_mismatch",
          state: {
            ...state,
            workedTestAttempts: state.workedTestAttempts + 1,
          },
        };
      }
      return accept({
        ...state,
        stage: "RECONSTRUCT",
        workedTestPassed: true,
        workedTestAttempts: state.workedTestAttempts + 1,
      });
    }

    return reject(state, "invalid_event_for_stage");
  }

  if (state.stage === "RECONSTRUCT") {
    if (event.type === "REQUEST_SUPPORT") {
      if (state.supportUsed.length >= SUPPORT_LADER_LENGTH) {
        return reject(state, "support_ceiling_reached");
      }
      const level = (state.supportUsed.length + 1) as SupportLevel;
      return accept({ ...state, supportUsed: [...state.supportUsed, level] });
    }

    if (event.type !== "SUBMIT_RECONSTRUCTION") {
      return reject(state, "invalid_event_for_stage");
    }
    const reconstruction = event.reconstruction.trim();
    if (reconstruction.length < 24) {
      return reject(state, "reconstruction_too_short");
    }
    if (event.choiceId !== CORRECT_RECONSTRUCTION_CHOICE_ID) {
      return reject(state, "reconstruction_mismatch");
    }
    return accept({
      ...state,
      stage: "WITHDRAWAL",
      reconstructionChoiceId: event.choiceId,
      reconstructionText: reconstruction,
    });
  }

  if (state.stage === "WITHDRAWAL") {
    if (event.type !== "ACKNOWLEDGE_WITHDRAWAL") {
      return reject(state, "invalid_event_for_stage");
    }
    return accept({ ...state, stage: "COLD_TRANSFER" });
  }

  if (state.stage === "COLD_TRANSFER") {
    if (event.type === "SET_TRANSFER_ASSIGNMENT") {
      if (
        !TRANSFER_STATEMENTS.some(
          (statement) => statement.id === event.statementId,
        )
      ) {
        return reject(state, "invalid_statement");
      }
      if (!EVIDENCE_CATEGORIES.includes(event.category)) {
        return reject(state, "invalid_category");
      }
      return accept({
        ...state,
        transferAssignments: {
          ...state.transferAssignments,
          [event.statementId]: event.category,
        },
      });
    }

    if (event.type === "SUBMIT_TRANSFER") {
      if (state.transferSubmitted) {
        return reject(state, "transfer_already_submitted");
      }
      const submission = makeTransferSubmission(state.transferAssignments);
      if (!submission) return reject(state, "transfer_incomplete");
      if (
        !Number.isInteger(event.confidence) ||
        event.confidence < 0 ||
        event.confidence > 100
      ) {
        return reject(state, "invalid_confidence");
      }
      const transferExplanation = event.explanation.trim();
      if (transferExplanation.length < 24) {
        return reject(state, "transfer_explanation_too_short");
      }
      const evaluation = validatePrimarySourceTransfer(submission);
      const resultState: PrimarySourceWorldState = {
        ...state,
        stage: "RESULT",
        transferSubmitted: true,
        transferConfidence: event.confidence,
        transferExplanation,
        transferEvaluation: evaluation,
        proof: null,
      };
      return accept({ ...resultState, proof: deriveProof(resultState) });
    }

    return reject(state, "invalid_event_for_stage");
  }

  if (state.stage === "RESULT") {
    if (event.type === "SUBMIT_TRANSFER") {
      return reject(state, "transfer_already_submitted");
    }
    return reject(state, "invalid_event_for_stage");
  }

  return reject(state, "invalid_event_for_stage");
}

const SUPPORT_LADER_LENGTH = SUPPORT_LADDER.length;
