import {
  ARGUMENT_EVIDENCE_CAPABILITY_ID,
  ARGUMENT_EVIDENCE_PROOF_CLAIM_ID,
  ARGUMENT_EVIDENCE_RESULT_BOUNDARIES,
  ARGUMENT_EVIDENCE_VALIDATOR_ID,
  ARGUMENT_EVIDENCE_WORLD_ID,
  ARGUMENT_EVIDENCE_WORLD_VERSION,
} from "./content";
import type {
  ArgumentEvidenceProofRecord,
  ArgumentEvidenceTransitionRejectReason,
  ArgumentEvidenceTransitionResult,
  ArgumentEvidenceWorldEvent,
  ArgumentEvidenceWorldState,
} from "./types";
import { makeArgumentEvidenceTransferSubmission, validateArgumentEvidenceTransfer } from "./validator";

export function createInitialArgumentEvidenceState(): ArgumentEvidenceWorldState {
  return {
    stage: "MYSTERY",
    initialRuleId: null,
    initialConfidence: null,
    initialExplanation: "",
    compilerResponse: null,
    compilerCorrection: "",
    disagreementNamed: false,
    testPredictionId: null,
    comparisonRevealed: false,
    workedEvidenceItemId: null,
    workedRelationId: null,
    workedTestAttempts: 0,
    supportUsed: [],
    reconstructionRuleId: null,
    reconstructionText: "",
    transferEvidenceItemId: null,
    transferMechanismId: null,
    transferLimitationId: null,
    transferConfidence: null,
    transferSubmitted: false,
    transferEvaluation: null,
    proof: null,
  };
}

function accept(state: ArgumentEvidenceWorldState): ArgumentEvidenceTransitionResult {
  return { accepted: true, state };
}

function reject(
  state: ArgumentEvidenceWorldState,
  reason: ArgumentEvidenceTransitionRejectReason,
): ArgumentEvidenceTransitionResult {
  return { accepted: false, reason, state };
}

function validConfidence(confidence: number): boolean {
  return Number.isInteger(confidence) && confidence >= 0 && confidence <= 100;
}

function proofFor(state: ArgumentEvidenceWorldState): ArgumentEvidenceProofRecord | null {
  const submission = makeArgumentEvidenceTransferSubmission(state);
  const evaluation = state.transferEvaluation;
  if (!state.initialRuleId || !submission || !evaluation) return null;
  return {
    worldId: ARGUMENT_EVIDENCE_WORLD_ID,
    worldVersion: ARGUMENT_EVIDENCE_WORLD_VERSION,
    capabilityId: ARGUMENT_EVIDENCE_CAPABILITY_ID,
    proofClaimId: ARGUMENT_EVIDENCE_PROOF_CLAIM_ID,
    validatorId: ARGUMENT_EVIDENCE_VALIDATOR_ID,
    taskId: submission.taskId,
    initialRuleId: state.initialRuleId,
    assistance: { levelsUsed: state.supportUsed, wasAvailableDuringProof: false },
    independentTransfer: {
      evidenceItemId: submission.evidenceItemId,
      mechanismId: submission.mechanismId,
      limitationId: submission.limitationId,
      passed: evaluation.passed,
      code: evaluation.code,
    },
    demonstrated: evaluation.passed
      ? ARGUMENT_EVIDENCE_RESULT_BOUNDARIES.demonstrated
      : ARGUMENT_EVIDENCE_RESULT_BOUNDARIES.notDemonstrated,
    notYetTested: ARGUMENT_EVIDENCE_RESULT_BOUNDARIES.notYetTested,
  };
}

export function transitionArgumentEvidenceWorld(
  state: ArgumentEvidenceWorldState,
  event: ArgumentEvidenceWorldEvent,
): ArgumentEvidenceTransitionResult {
  if (event.type === "RESET") return accept(createInitialArgumentEvidenceState());

  if (state.stage === "MYSTERY" && event.type === "COMMIT_INITIAL") {
    if (!validConfidence(event.confidence)) return reject(state, "invalid_confidence");
    return accept({ ...state, stage: "EXPLAIN", initialRuleId: event.ruleId, initialConfidence: event.confidence });
  }
  if (state.stage === "EXPLAIN" && event.type === "COMMIT_EXPLANATION") {
    if (event.text.trim().length < 12) return reject(state, "explanation_too_short");
    return accept({ ...state, stage: "COMPILER", initialExplanation: event.text.trim() });
  }
  if (state.stage === "COMPILER" && event.type === "RESPOND_TO_TWO_READINGS") {
    if (event.response === "correct" && (event.correction?.trim().length ?? 0) < 12) {
      return reject(state, "compiler_correction_too_short");
    }
    return accept({ ...state, compilerResponse: event.response, compilerCorrection: event.correction?.trim() ?? "" });
  }
  if (state.stage === "COMPILER" && event.type === "NAME_DISAGREEMENT") {
    if (!state.compilerResponse) return reject(state, "invalid_event_for_stage");
    return accept({ ...state, disagreementNamed: true });
  }
  if (state.stage === "COMPILER" && event.type === "COMMIT_TEST_PREDICTION") {
    if (!state.disagreementNamed) return reject(state, "disagreement_required");
    return accept({ ...state, stage: "TEST", testPredictionId: event.predictionId });
  }
  if (state.stage === "TEST" && event.type === "REVEAL_SEPARATING_COMPARISON") {
    return accept({ ...state, comparisonRevealed: true });
  }
  if (state.stage === "TEST" && event.type === "SET_WORKED_EVIDENCE_ITEM") {
    if (!state.comparisonRevealed) return reject(state, "comparison_not_revealed");
    return accept({ ...state, workedEvidenceItemId: event.evidenceItemId });
  }
  if (state.stage === "TEST" && event.type === "SET_WORKED_RELATION") {
    if (!state.comparisonRevealed) return reject(state, "comparison_not_revealed");
    return accept({ ...state, workedRelationId: event.relationId });
  }
  if (state.stage === "TEST" && event.type === "SUBMIT_WORKED_COMPARISON") {
    if (!state.comparisonRevealed) return reject(state, "comparison_not_revealed");
    if (!state.workedEvidenceItemId || !state.workedRelationId) return reject(state, "worked_classification_incomplete");
    const attempts = state.workedTestAttempts + 1;
    if (state.workedEvidenceItemId !== "roof.outcome-linked" || state.workedRelationId !== "supports_with_limit") {
      return reject({ ...state, workedTestAttempts: attempts }, "worked_classification_mismatch");
    }
    return accept({ ...state, stage: "SUPPORT", workedTestAttempts: attempts });
  }
  if (state.stage === "SUPPORT" && event.type === "CONSUME_AUTHORED_SUPPORT") {
    const nextLevel = state.supportUsed.length + 1;
    if (event.level !== nextLevel || event.level > 3) return reject(state, "support_level_out_of_order");
    return accept({ ...state, supportUsed: [...state.supportUsed, event.level] as const });
  }
  if (state.stage === "SUPPORT" && event.type === "CONTINUE_TO_RECONSTRUCTION") {
    return accept({ ...state, stage: "RECONSTRUCT" });
  }
  if (state.stage === "RECONSTRUCT" && event.type === "SUBMIT_RECONSTRUCTION") {
    if (event.ruleId !== "outcome_relation") return reject(state, "reconstruction_mismatch");
    if (event.text.trim().length < 12) return reject(state, "reconstruction_too_short");
    return accept({ ...state, stage: "WITHDRAWAL", reconstructionRuleId: event.ruleId, reconstructionText: event.text.trim() });
  }
  if (state.stage === "WITHDRAWAL" && event.type === "ACKNOWLEDGE_WITHDRAWAL") {
    return accept({ ...state, stage: "COLD_TRANSFER" });
  }
  if (state.stage === "COLD_TRANSFER" && event.type === "SET_TRANSFER_EVIDENCE_ITEM") {
    if (state.transferSubmitted) return reject(state, "transfer_already_submitted");
    return accept({ ...state, transferEvidenceItemId: event.evidenceItemId });
  }
  if (state.stage === "COLD_TRANSFER" && event.type === "SET_TRANSFER_MECHANISM") {
    if (state.transferSubmitted) return reject(state, "transfer_already_submitted");
    return accept({ ...state, transferMechanismId: event.mechanismId });
  }
  if (state.stage === "COLD_TRANSFER" && event.type === "SET_TRANSFER_LIMITATION") {
    if (state.transferSubmitted) return reject(state, "transfer_already_submitted");
    return accept({ ...state, transferLimitationId: event.limitationId });
  }
  if (state.stage === "COLD_TRANSFER" && event.type === "SET_TRANSFER_CONFIDENCE") {
    if (state.transferSubmitted) return reject(state, "transfer_already_submitted");
    if (!validConfidence(event.confidence)) return reject(state, "invalid_confidence");
    return accept({ ...state, transferConfidence: event.confidence });
  }
  if (state.stage === "COLD_TRANSFER" && event.type === "SUBMIT_TRANSFER") {
    if (state.transferSubmitted) return reject(state, "transfer_already_submitted");
    const submission = makeArgumentEvidenceTransferSubmission(state);
    if (!submission || state.transferConfidence === null) return reject(state, "transfer_incomplete");
    const transferEvaluation = validateArgumentEvidenceTransfer(submission);
    const resultState = { ...state, stage: "RESULT" as const, transferSubmitted: true, transferEvaluation };
    return accept({ ...resultState, proof: proofFor(resultState) });
  }
  return reject(state, "invalid_event_for_stage");
}
