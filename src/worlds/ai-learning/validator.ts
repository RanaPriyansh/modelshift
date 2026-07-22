import {
  BOUNDED_CLAIMS,
  COLD_TRANSFER,
  CORRECT_BOUNDED_CLAIM_ID,
  CORRECT_DIFFERENCE_ID,
  EVIDENCE_IDS,
  PLAUSIBLE_READINGS,
  STANCES,
} from "./content";
import type {
  BoundedClaimId,
  DifferenceId,
  EvidenceId,
  EvidenceLearningRecord,
  EncounterInput,
  ReadingId,
  ReadingVerdict,
  TestPredictionId,
  TransferChoiceId,
  TransferOpenQuestionId,
  TransferScore,
  ValidationResult,
} from "./types";

const valid = (): ValidationResult => ({ ok: true });
const invalid = (error: Exclude<ValidationResult, { ok: true }>["error"]): ValidationResult => ({ ok: false, error });

export function validateEncounter(input: EncounterInput): ValidationResult {
  if (!input.stanceId || !STANCES.some((stance) => stance.id === input.stanceId)) return invalid("stance-required");
  if (!Number.isInteger(input.confidence) || input.confidence < 0 || input.confidence > 100) return invalid("confidence-invalid");
  if (input.reason.trim().length < 24) return invalid("reason-too-short");
  return valid();
}

export function validateTestPrediction(
  acceptedTwoReadings: boolean,
  predictionId: TestPredictionId | null,
): ValidationResult {
  if (!acceptedTwoReadings) return invalid("readings-acceptance-required");
  if (!predictionId || !PLAUSIBLE_READINGS.some((reading) => reading.id === predictionId)) {
    return invalid("test-prediction-required");
  }
  return valid();
}

export function validateEvidenceReview(reviewedEvidenceIds: readonly EvidenceId[]): ValidationResult {
  const reviewed = new Set(reviewedEvidenceIds);
  if (reviewed.size !== EVIDENCE_IDS.length || EVIDENCE_IDS.some((id) => !reviewed.has(id))) {
    return invalid("evidence-not-reviewed");
  }
  return valid();
}

export function validateDifference(differenceId: DifferenceId | null): ValidationResult {
  if (!differenceId) return invalid("difference-required");
  return differenceId === CORRECT_DIFFERENCE_ID ? valid() : invalid("difference-mismatch");
}

export function validateReadings(verdicts: Partial<Record<ReadingId, ReadingVerdict>>): ValidationResult {
  if (PLAUSIBLE_READINGS.some((reading) => !verdicts[reading.id])) return invalid("readings-incomplete");
  if (PLAUSIBLE_READINGS.some((reading) => verdicts[reading.id] !== reading.correctVerdict)) {
    return invalid("readings-mismatch");
  }
  return valid();
}

export function validateBoundedClaim(claimId: BoundedClaimId | null): ValidationResult {
  if (!claimId || !BOUNDED_CLAIMS.some((claim) => claim.id === claimId)) return invalid("claim-required");
  return claimId === CORRECT_BOUNDED_CLAIM_ID ? valid() : invalid("claim-overreaches");
}

export function validateTransferSubmission(
  choiceId: TransferChoiceId | null,
  openQuestionId: TransferOpenQuestionId | null,
): ValidationResult {
  if (!choiceId || !openQuestionId) return invalid("transfer-incomplete");
  return valid();
}

export function scoreColdTransfer(
  choiceId: TransferChoiceId,
  openQuestionId: TransferOpenQuestionId,
): TransferScore {
  const choiceCorrect = choiceId === COLD_TRANSFER.correctChoiceId;
  const openQuestionCorrect = openQuestionId === COLD_TRANSFER.correctOpenQuestionId;
  const points = (Number(choiceCorrect) + Number(openQuestionCorrect)) as 0 | 1 | 2;
  return {
    choiceCorrect,
    openQuestionCorrect,
    points,
    outcome: points === 2 ? "held" : points === 1 ? "partial" : "not-yet",
  };
}

export function deriveLearningRecord(input: {
  encounter: EncounterInput;
  differenceId: DifferenceId;
  boundedClaimId: BoundedClaimId;
  transferChoiceId: TransferChoiceId;
  transferOpenQuestionId: TransferOpenQuestionId;
  transferScore: TransferScore;
}): EvidenceLearningRecord {
  const stance = STANCES.find((item) => item.id === input.encounter.stanceId)?.label ?? "Unrecorded stance";
  const claim = BOUNDED_CLAIMS.find((item) => item.id === input.boundedClaimId)?.label ?? "Unrecorded claim";
  const transferChoice = COLD_TRANSFER.choices.find((item) => item.id === input.transferChoiceId)?.label ?? "Unrecorded transfer choice";
  const openQuestion = COLD_TRANSFER.openQuestions.find((item) => item.id === input.transferOpenQuestionId)?.label ?? "Unrecorded uncertainty";

  return {
    startedWith: `${stance} · ${input.encounter.confidence}% confidence · “${input.encounter.reason.trim()}”`,
    testedWith: `Two reviewed source briefs, the direct-student versus tutor-mediated contrast, and two cross-source readings. Reconstructed claim: ${claim}`,
    supportUsed: "No instructional support was consumed. Reviewed source briefs and fixed links were available before the evidence desk closed; none were available during the cold transfer.",
    didAlone: `${transferChoice} Still-open choice: ${openQuestion}`,
    stillOpen: "The two AI studies differ in population, subject, delivery, and outcome definition; neither comparison by itself isolates every mechanism. The transfer set also changes more than one study feature.",
    returnProof:
      input.transferScore.outcome === "held"
        ? "Held once: the bounded-reading pattern transferred to an unfamiliar authored transfer-fixture pair in a single unaided submission. This is one immediate performance trace, not proof of durable learning. A reviewed delayed task family and scheduler are not published."
        : input.transferScore.outcome === "partial"
          ? "Partially held: one of the two bounded-reading decisions transferred. This attempt remains recorded; a reviewed delayed task family and scheduler are not published."
          : "Not yet: the bounded-reading pattern did not transfer on this source set. This attempt remains recorded; a reviewed delayed task family and scheduler are not published.",
  };
}
