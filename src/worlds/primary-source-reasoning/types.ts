export const EVIDENCE_CATEGORIES = [
  "observation",
  "catalog_fact",
  "inference",
  "open_question",
] as const;

export type EvidenceCategory = (typeof EVIDENCE_CATEGORIES)[number];

export type PrimarySourceStage =
  | "MYSTERY"
  | "EXPLAIN"
  | "COMPILER"
  | "TEST"
  | "RECONSTRUCT"
  | "WITHDRAWAL"
  | "COLD_TRANSFER"
  | "RESULT";

export type MysteryChoiceId = "visible_detail" | "catalog_detail" | "purpose_claim";

export type WorkedStatementId =
  | "philadelphia-visible-detail"
  | "philadelphia-catalog-fact"
  | "philadelphia-purpose-inference"
  | "philadelphia-open-question";

export type TransferStatementId =
  | "washington-visible-detail"
  | "washington-catalog-fact"
  | "washington-relationship-inference"
  | "washington-open-question";

export type ReconstructionChoiceId =
  | "image_proves_context"
  | "layers_bound_claims"
  | "catalog_is_only_inference";

export type TestPredictionId =
  | "catalog_distinguishes_evidence_layers"
  | "photograph_establishes_full_context";

export type SupportLevel = 1 | 2 | 3;

export type AssignmentMap<StatementId extends string> = Partial<
  Record<StatementId, EvidenceCategory>
>;

export interface CategoryDefinition {
  id: EvidenceCategory;
  label: string;
  shortLabel: string;
  description: string;
}

export interface ClassificationStatement<StatementId extends string> {
  id: StatementId;
  text: string;
  correctCategory: EvidenceCategory;
}

export interface TransferSubmission {
  taskId: "loc.washington-street-1937.transfer";
  assignments: Record<TransferStatementId, EvidenceCategory>;
}

export interface TransferEvaluation {
  validatorId: "validator.primary-source-reasoning-transfer.v1";
  taskId: "loc.washington-street-1937.transfer";
  valid: boolean;
  passed: boolean;
  score: number;
  code:
    | "transfer.demonstrated"
    | "transfer.partial"
    | "transfer.not-demonstrated"
    | "transfer.invalid";
  evidence: string;
  correctCount: 0 | 1 | 2 | 3 | 4;
  assignments: Record<TransferStatementId, EvidenceCategory> | null;
  correctness: Record<TransferStatementId, boolean> | null;
}

export interface PrimarySourceProofRecord {
  worldId: "world.primary-source-reasoning";
  worldVersion: "1.0.1";
  capabilityId: "capability.historical-literacy.observation-inference";
  proofClaimId: "proof.primary-source-reasoning.independent-transfer";
  validatorId: "validator.primary-source-reasoning-transfer.v1";
  taskId: "loc.washington-street-1937.transfer";
  initialModelId: MysteryChoiceId;
  separatingTest: {
    sourceId: "loc.90706156";
    catalogOpened: true;
    classificationsCorrect: true;
  };
  assistance: {
    explanationSampleUsed: boolean;
    levelsUsed: readonly SupportLevel[];
    wasAvailableDuringProof: false;
  };
  independentTransfer: {
    sourceId: "loc.2017716911";
    confidence: number;
    score: number;
    correctCount: 0 | 1 | 2 | 3 | 4;
    passed: boolean;
    code: TransferEvaluation["code"];
  };
  demonstrated: string;
  notYetTested: readonly string[];
}

export interface PrimarySourceWorldState {
  stage: PrimarySourceStage;
  initialChoiceId: MysteryChoiceId | null;
  confidence: number | null;
  initialExplanation: string;
  explanationSampleUsed: boolean;
  interpretationResponse: "accepted" | "corrected" | null;
  compilerCorrection: string;
  testPredictionId: TestPredictionId | null;
  catalogOpened: boolean;
  workedAssignments: AssignmentMap<WorkedStatementId>;
  workedTestPassed: boolean;
  workedTestAttempts: number;
  supportUsed: readonly SupportLevel[];
  reconstructionChoiceId: ReconstructionChoiceId | null;
  reconstructionText: string;
  transferAssignments: AssignmentMap<TransferStatementId>;
  transferConfidence: number | null;
  transferExplanation: string;
  transferSubmitted: boolean;
  transferEvaluation: TransferEvaluation | null;
  proof: PrimarySourceProofRecord | null;
}

export type PrimarySourceWorldEvent =
  | { type: "COMMIT_INITIAL"; choiceId: MysteryChoiceId; confidence: number }
  | { type: "USE_EXPLANATION_SAMPLE" }
  | { type: "COMMIT_EXPLANATION"; explanation: string }
  | {
      type: "ACCEPT_INTERPRETATIONS";
      response: "accepted" | "corrected";
      correction?: string;
    }
  | { type: "COMMIT_TEST_PREDICTION"; predictionId: TestPredictionId }
  | { type: "OPEN_CATALOG" }
  | {
      type: "SET_WORKED_ASSIGNMENT";
      statementId: WorkedStatementId;
      category: EvidenceCategory;
    }
  | { type: "SUBMIT_WORKED_TEST" }
  | { type: "REQUEST_SUPPORT" }
  | {
      type: "SUBMIT_RECONSTRUCTION";
      choiceId: ReconstructionChoiceId;
      reconstruction: string;
    }
  | { type: "ACKNOWLEDGE_WITHDRAWAL" }
  | {
      type: "SET_TRANSFER_ASSIGNMENT";
      statementId: TransferStatementId;
      category: EvidenceCategory;
    }
  | { type: "SUBMIT_TRANSFER"; confidence: number; explanation: string }
  | { type: "RESET" };

export type TransitionRejectReason =
  | "invalid_event_for_stage"
  | "invalid_initial_choice"
  | "invalid_confidence"
  | "explanation_too_short"
  | "compiler_correction_too_short"
  | "invalid_test_prediction"
  | "test_prediction_required"
  | "catalog_must_open_first"
  | "invalid_statement"
  | "invalid_category"
  | "classification_incomplete"
  | "classification_mismatch"
  | "support_ceiling_reached"
  | "reconstruction_too_short"
  | "reconstruction_mismatch"
  | "transfer_incomplete"
  | "transfer_explanation_too_short"
  | "transfer_already_submitted";

export type PrimarySourceTransitionResult =
  | { accepted: true; state: PrimarySourceWorldState }
  | {
      accepted: false;
      reason: TransitionRejectReason;
      state: PrimarySourceWorldState;
    };
