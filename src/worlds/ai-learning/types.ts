export type EvidenceLearningStage =
  | "encounter"
  | "evidence"
  | "difference"
  | "readings"
  | "reconstruct"
  | "transfer"
  | "result";

export type StanceId = "agree" | "depends" | "disagree";
export type EvidenceId = "bastani-pnas" | "tutor-copilot";
export type DifferenceId = "delivery-role" | "model-brand" | "sample-size" | "same-outcome";
export type ReadingId = "performance-is-learning" | "design-changes-effect";
export type ReadingVerdict = "fits" | "overreaches";
export type BoundedClaimId = "ai-always-helps" | "ai-always-harms" | "conditions-shape-outcomes";
export type TransferChoiceId = "always-helps" | "always-harms" | "bounded-measures" | "same-measure";
export type TransferOpenQuestionId = "color-choice" | "held-constant" | "reader-preference";

export type EvidenceLearningError =
  | "invalid-transition"
  | "stance-required"
  | "confidence-invalid"
  | "reason-too-short"
  | "evidence-not-reviewed"
  | "difference-required"
  | "difference-mismatch"
  | "readings-incomplete"
  | "readings-mismatch"
  | "claim-required"
  | "claim-overreaches"
  | "transfer-incomplete";

export interface EncounterInput {
  stanceId: StanceId | null;
  confidence: number;
  reason: string;
}

export interface TransferSubmission {
  choiceId: TransferChoiceId;
  openQuestionId: TransferOpenQuestionId;
  submitted: true;
}

export interface TransferScore {
  choiceCorrect: boolean;
  openQuestionCorrect: boolean;
  points: 0 | 1 | 2;
  outcome: "held" | "partial" | "not-yet";
}

export interface EvidenceLearningRecord {
  startedWith: string;
  testedWith: string;
  supportUsed: string;
  didAlone: string;
  stillOpen: string;
  returnProof: string;
}

export interface EvidenceLearningState {
  stage: EvidenceLearningStage;
  encounter: EncounterInput;
  committedEncounter: EncounterInput | null;
  reviewedEvidenceIds: readonly EvidenceId[];
  differenceId: DifferenceId | null;
  readingVerdicts: Partial<Record<ReadingId, ReadingVerdict>>;
  boundedClaimId: BoundedClaimId | null;
  transferChoiceId: TransferChoiceId | null;
  transferOpenQuestionId: TransferOpenQuestionId | null;
  transferSubmission: TransferSubmission | null;
  transferScore: TransferScore | null;
  record: EvidenceLearningRecord | null;
  lastError: EvidenceLearningError | null;
}

export type EvidenceLearningAction =
  | { type: "SET_STANCE"; stanceId: StanceId }
  | { type: "SET_CONFIDENCE"; confidence: number }
  | { type: "SET_REASON"; reason: string }
  | { type: "COMMIT_ENCOUNTER" }
  | { type: "REVIEW_EVIDENCE"; evidenceId: EvidenceId }
  | { type: "CONTINUE_FROM_EVIDENCE" }
  | { type: "SET_DIFFERENCE"; differenceId: DifferenceId }
  | { type: "COMMIT_DIFFERENCE" }
  | { type: "SET_READING_VERDICT"; readingId: ReadingId; verdict: ReadingVerdict }
  | { type: "COMMIT_READINGS" }
  | { type: "SET_BOUNDED_CLAIM"; claimId: BoundedClaimId }
  | { type: "COMMIT_BOUNDED_CLAIM" }
  | { type: "SET_TRANSFER_CHOICE"; choiceId: TransferChoiceId }
  | { type: "SET_TRANSFER_OPEN_QUESTION"; openQuestionId: TransferOpenQuestionId }
  | { type: "SUBMIT_TRANSFER" };

export interface ValidationSuccess {
  ok: true;
}

export interface ValidationFailure {
  ok: false;
  error: EvidenceLearningError;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;
