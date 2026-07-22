export type ArgumentEvidenceStage =
  | "MYSTERY"
  | "EXPLAIN"
  | "COMPILER"
  | "TEST"
  | "SUPPORT"
  | "RECONSTRUCT"
  | "WITHDRAWAL"
  | "COLD_TRANSFER"
  | "RESULT";

export type InitialRuleId = "same_topic_counts" | "outcome_relation_counts";
export type CompilerResponse = "accept" | "correct" | "reject";
export type TestPredictionId =
  | "both_cards_count_equally"
  | "outcome_linked_changes_credibility";
export type WorkedEvidenceItemId = "roof.same-topic" | "roof.outcome-linked";
export type WorkedRelationId = "same_topic_only" | "supports_with_limit";
export type ReconstructionRuleId = "outcome_relation";
export type TransferEvidenceItemId =
  | "bus.same-topic"
  | "bus.outcome-linked"
  | "bus.confounded";
export type TransferMechanismId =
  | "same_subject"
  | "compares_named_outcome"
  | "personal_reaction";
export type TransferLimitationId =
  | "none"
  | "other_changes_not_ruled_out"
  | "colour_not_measured";
export type SupportLevel = 1 | 2 | 3;

export interface ArgumentEvidenceTransferSubmission {
  readonly taskId: "bus_route_late_arrivals_table";
  readonly evidenceItemId: TransferEvidenceItemId;
  readonly mechanismId: TransferMechanismId;
  readonly limitationId: TransferLimitationId;
}

export interface ArgumentEvidenceTransferEvaluation {
  readonly inputStatus: "valid" | "invalid";
  readonly passed: boolean;
  readonly score: number;
  readonly code:
    | "transfer.demonstrated"
    | "transfer.not-demonstrated"
    | "invalid.transfer-input";
  readonly evidence: readonly string[];
}

export interface ArgumentEvidenceProofRecord {
  readonly worldId: "world.argument-evidence";
  readonly worldVersion: "1.0.0";
  readonly capabilityId: "capability.language-literacy.claim-evidence-relation";
  readonly proofClaimId: "proof.argument-evidence.independent-transfer";
  readonly validatorId: "validator.argument-evidence-transfer.v1";
  readonly taskId: "bus_route_late_arrivals_table";
  readonly initialRuleId: InitialRuleId;
  readonly assistance: {
    readonly levelsUsed: readonly SupportLevel[];
    readonly wasAvailableDuringProof: false;
  };
  readonly independentTransfer: {
    readonly evidenceItemId: TransferEvidenceItemId;
    readonly mechanismId: TransferMechanismId;
    readonly limitationId: TransferLimitationId;
    readonly passed: boolean;
    readonly code: ArgumentEvidenceTransferEvaluation["code"];
  };
  readonly demonstrated: string;
  readonly notYetTested: readonly string[];
}

export interface ArgumentEvidenceWorldState {
  readonly stage: ArgumentEvidenceStage;
  readonly initialRuleId: InitialRuleId | null;
  readonly initialConfidence: number | null;
  readonly initialExplanation: string;
  readonly compilerResponse: CompilerResponse | null;
  readonly compilerCorrection: string;
  readonly disagreementNamed: boolean;
  readonly testPredictionId: TestPredictionId | null;
  readonly comparisonRevealed: boolean;
  readonly workedEvidenceItemId: WorkedEvidenceItemId | null;
  readonly workedRelationId: WorkedRelationId | null;
  readonly workedTestAttempts: number;
  readonly supportUsed: readonly SupportLevel[];
  readonly reconstructionRuleId: ReconstructionRuleId | null;
  readonly reconstructionText: string;
  readonly transferEvidenceItemId: TransferEvidenceItemId | null;
  readonly transferMechanismId: TransferMechanismId | null;
  readonly transferLimitationId: TransferLimitationId | null;
  readonly transferConfidence: number | null;
  readonly transferSubmitted: boolean;
  readonly transferEvaluation: ArgumentEvidenceTransferEvaluation | null;
  readonly proof: ArgumentEvidenceProofRecord | null;
}

export type ArgumentEvidenceWorldEvent =
  | { readonly type: "COMMIT_INITIAL"; readonly ruleId: InitialRuleId; readonly confidence: number }
  | { readonly type: "COMMIT_EXPLANATION"; readonly text: string }
  | { readonly type: "RESPOND_TO_TWO_READINGS"; readonly response: CompilerResponse; readonly correction?: string }
  | { readonly type: "NAME_DISAGREEMENT" }
  | { readonly type: "COMMIT_TEST_PREDICTION"; readonly predictionId: TestPredictionId }
  | { readonly type: "REVEAL_SEPARATING_COMPARISON" }
  | { readonly type: "SET_WORKED_EVIDENCE_ITEM"; readonly evidenceItemId: WorkedEvidenceItemId }
  | { readonly type: "SET_WORKED_RELATION"; readonly relationId: WorkedRelationId }
  | { readonly type: "SUBMIT_WORKED_COMPARISON" }
  | { readonly type: "CONSUME_AUTHORED_SUPPORT"; readonly level: SupportLevel }
  | { readonly type: "CONTINUE_TO_RECONSTRUCTION" }
  | { readonly type: "SUBMIT_RECONSTRUCTION"; readonly ruleId: ReconstructionRuleId; readonly text: string }
  | { readonly type: "ACKNOWLEDGE_WITHDRAWAL" }
  | { readonly type: "SET_TRANSFER_EVIDENCE_ITEM"; readonly evidenceItemId: TransferEvidenceItemId }
  | { readonly type: "SET_TRANSFER_MECHANISM"; readonly mechanismId: TransferMechanismId }
  | { readonly type: "SET_TRANSFER_LIMITATION"; readonly limitationId: TransferLimitationId }
  | { readonly type: "SET_TRANSFER_CONFIDENCE"; readonly confidence: number }
  | { readonly type: "SUBMIT_TRANSFER" }
  | { readonly type: "RESET" };

export type ArgumentEvidenceTransitionRejectReason =
  | "invalid_event_shape"
  | "invalid_event_for_stage"
  | "invalid_confidence"
  | "explanation_too_short"
  | "compiler_correction_too_short"
  | "disagreement_required"
  | "test_prediction_required"
  | "comparison_not_revealed"
  | "worked_classification_incomplete"
  | "worked_classification_mismatch"
  | "support_level_out_of_order"
  | "reconstruction_mismatch"
  | "reconstruction_too_short"
  | "transfer_incomplete"
  | "transfer_already_submitted";

export type ArgumentEvidenceTransitionResult =
  | { readonly accepted: true; readonly state: ArgumentEvidenceWorldState }
  | { readonly accepted: false; readonly reason: ArgumentEvidenceTransitionRejectReason; readonly state: ArgumentEvidenceWorldState };
