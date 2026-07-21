import { describe, expect, it } from "vitest";
import {
  BOUNDED_CLAIMS,
  COLD_TRANSFER,
  CORRECT_BOUNDED_CLAIM_ID,
  CORRECT_DIFFERENCE_ID,
  EVIDENCE_IDS,
  PLAUSIBLE_READINGS,
  REVIEWED_EVIDENCE,
} from "./content";
import {
  deriveLearningRecord,
  scoreColdTransfer,
  validateBoundedClaim,
  validateDifference,
  validateEncounter,
  validateEvidenceReview,
  validateReadings,
  validateTransferSubmission,
} from "./validator";

describe("AI learning authored content", () => {
  it("pins the two requested primary sources and keeps authored IDs unique", () => {
    expect(REVIEWED_EVIDENCE.map((source) => source.href)).toEqual([
      "https://www.pnas.org/doi/10.1073/pnas.2422633122",
      "https://arxiv.org/abs/2410.03017",
    ]);
    expect(new Set(EVIDENCE_IDS).size).toBe(EVIDENCE_IDS.length);
    expect(new Set(PLAUSIBLE_READINGS.map((reading) => reading.id)).size).toBe(PLAUSIBLE_READINGS.length);
    expect(new Set(BOUNDED_CLAIMS.map((claim) => claim.id)).size).toBe(BOUNDED_CLAIMS.length);
  });
});

describe("deterministic evidence validators", () => {
  it("requires a known stance, bounded integer confidence, and inspectable reason", () => {
    expect(validateEncounter({ stanceId: null, confidence: 60, reason: "A long enough reason that can be inspected." })).toEqual({ ok: false, error: "stance-required" });
    expect(validateEncounter({ stanceId: "depends", confidence: 60.5, reason: "A long enough reason that can be inspected." })).toEqual({ ok: false, error: "confidence-invalid" });
    expect(validateEncounter({ stanceId: "depends", confidence: 101, reason: "A long enough reason that can be inspected." })).toEqual({ ok: false, error: "confidence-invalid" });
    expect(validateEncounter({ stanceId: "depends", confidence: 60, reason: "Too short" })).toEqual({ ok: false, error: "reason-too-short" });
    expect(validateEncounter({ stanceId: "depends", confidence: 60, reason: "The way a tool is used probably changes the outcome." })).toEqual({ ok: true });
  });

  it("cannot satisfy review with duplicates or one source", () => {
    expect(validateEvidenceReview(["bastani-pnas", "bastani-pnas"])).toEqual({ ok: false, error: "evidence-not-reviewed" });
    expect(validateEvidenceReview(["bastani-pnas", "tutor-copilot"])).toEqual({ ok: true });
  });

  it("accepts only the authored structural contrast", () => {
    expect(validateDifference(null)).toEqual({ ok: false, error: "difference-required" });
    expect(validateDifference("sample-size")).toEqual({ ok: false, error: "difference-mismatch" });
    expect(validateDifference(CORRECT_DIFFERENCE_ID)).toEqual({ ok: true });
  });

  it("requires both authored reading verdicts to match", () => {
    expect(validateReadings({ "performance-is-learning": "overreaches" })).toEqual({ ok: false, error: "readings-incomplete" });
    expect(validateReadings({ "performance-is-learning": "fits", "design-changes-effect": "fits" })).toEqual({ ok: false, error: "readings-mismatch" });
    expect(validateReadings({ "performance-is-learning": "overreaches", "design-changes-effect": "fits" })).toEqual({ ok: true });
  });

  it("rejects universal reconstructions and requires both cold-transfer decisions", () => {
    expect(validateBoundedClaim("ai-always-helps")).toEqual({ ok: false, error: "claim-overreaches" });
    expect(validateBoundedClaim(CORRECT_BOUNDED_CLAIM_ID)).toEqual({ ok: true });
    expect(validateTransferSubmission("bounded-measures", null)).toEqual({ ok: false, error: "transfer-incomplete" });
    expect(validateTransferSubmission("bounded-measures", "held-constant")).toEqual({ ok: true });
  });
});

describe("cold-transfer scoring and record", () => {
  it.each([
    ["bounded-measures", "held-constant", 2, "held"],
    ["bounded-measures", "color-choice", 1, "partial"],
    ["always-helps", "held-constant", 1, "partial"],
    ["always-harms", "reader-preference", 0, "not-yet"],
  ] as const)("scores authored IDs only: %s + %s", (choice, open, points, outcome) => {
    expect(scoreColdTransfer(choice, open)).toMatchObject({ points, outcome });
  });

  it("derives all six requested evidence-record fields without inflating the claim", () => {
    const score = scoreColdTransfer(COLD_TRANSFER.correctChoiceId, COLD_TRANSFER.correctOpenQuestionId);
    const record = deriveLearningRecord({
      encounter: {
        stanceId: "depends",
        confidence: 65,
        reason: "Different access patterns likely create different learning outcomes.",
      },
      differenceId: CORRECT_DIFFERENCE_ID,
      boundedClaimId: CORRECT_BOUNDED_CLAIM_ID,
      transferChoiceId: COLD_TRANSFER.correctChoiceId,
      transferOpenQuestionId: COLD_TRANSFER.correctOpenQuestionId,
      transferScore: score,
    });

    expect(Object.keys(record)).toEqual([
      "startedWith",
      "testedWith",
      "supportUsed",
      "didAlone",
      "stillOpen",
      "returnProof",
    ]);
    expect(record.startedWith).toContain("65% confidence");
    expect(record.supportUsed).toContain("none during the cold transfer");
    expect(record.returnProof).toContain("not proof of durable learning");
  });
});
