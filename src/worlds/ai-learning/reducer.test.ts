import { describe, expect, it } from "vitest";
import { CORRECT_BOUNDED_CLAIM_ID, CORRECT_DIFFERENCE_ID } from "./content";
import { evidenceLearningReducer, initialEvidenceLearningState } from "./reducer";
import type { EvidenceLearningAction, EvidenceLearningState } from "./types";

function reduce(state: EvidenceLearningState, ...actions: EvidenceLearningAction[]): EvidenceLearningState {
  return actions.reduce(evidenceLearningReducer, state);
}

function committedEncounter(): EvidenceLearningState {
  return reduce(
    initialEvidenceLearningState,
    { type: "SET_STANCE", stanceId: "depends" },
    { type: "SET_CONFIDENCE", confidence: 70 },
    { type: "SET_REASON", reason: "I expect the access design and later measurement to matter." },
    { type: "COMMIT_ENCOUNTER" },
  );
}

function openedEvidence(): EvidenceLearningState {
  return reduce(
    committedEncounter(),
    { type: "ACCEPT_TWO_READINGS" },
    { type: "COMMIT_TEST_PREDICTION", predictionId: "design-changes-effect" },
  );
}

describe("evidenceLearningReducer", () => {
  it("fails closed on a skipped stage", () => {
    const next = evidenceLearningReducer(initialEvidenceLearningState, { type: "CONTINUE_FROM_EVIDENCE" });
    expect(next.stage).toBe("encounter");
    expect(next.lastError).toBe("invalid-transition");
  });

  it("commits an immutable snapshot of the starting answer", () => {
    const before = initialEvidenceLearningState;
    const next = committedEncounter();
    expect(before).toEqual(initialEvidenceLearningState);
    expect(next.stage).toBe("compiler");
    expect(next.committedEncounter).toEqual({
      stanceId: "depends",
      confidence: 70,
      reason: "I expect the access design and later measurement to matter.",
    });
  });

  it("does not let duplicate review events unlock comparison", () => {
    const next = reduce(
      openedEvidence(),
      { type: "REVIEW_EVIDENCE", evidenceId: "bastani-pnas" },
      { type: "REVIEW_EVIDENCE", evidenceId: "bastani-pnas" },
      { type: "CONTINUE_FROM_EVIDENCE" },
    );
    expect(next.reviewedEvidenceIds).toEqual(["bastani-pnas"]);
    expect(next.stage).toBe("evidence");
    expect(next.lastError).toBe("evidence-not-reviewed");
  });

  it("keeps authored retry checks before proof and never advances a mismatch", () => {
    const difference = reduce(
      openedEvidence(),
      { type: "REVIEW_EVIDENCE", evidenceId: "bastani-pnas" },
      { type: "REVIEW_EVIDENCE", evidenceId: "tutor-copilot" },
      { type: "CONTINUE_FROM_EVIDENCE" },
      { type: "SET_DIFFERENCE", differenceId: "sample-size" },
      { type: "COMMIT_DIFFERENCE" },
    );
    expect(difference.stage).toBe("difference");
    expect(difference.lastError).toBe("difference-mismatch");

    const readings = reduce(
      difference,
      { type: "SET_DIFFERENCE", differenceId: CORRECT_DIFFERENCE_ID },
      { type: "COMMIT_DIFFERENCE" },
      { type: "SET_READING_VERDICT", readingId: "performance-is-learning", verdict: "fits" },
      { type: "SET_READING_VERDICT", readingId: "design-changes-effect", verdict: "fits" },
      { type: "COMMIT_READINGS" },
    );
    expect(readings.stage).toBe("readings");
    expect(readings.lastError).toBe("readings-mismatch");
  });

  it("runs the full deterministic loop and locks the first transfer submission", () => {
    let state = reduce(
      openedEvidence(),
      { type: "REVIEW_EVIDENCE", evidenceId: "bastani-pnas" },
      { type: "REVIEW_EVIDENCE", evidenceId: "tutor-copilot" },
      { type: "CONTINUE_FROM_EVIDENCE" },
      { type: "SET_DIFFERENCE", differenceId: CORRECT_DIFFERENCE_ID },
      { type: "COMMIT_DIFFERENCE" },
      { type: "SET_READING_VERDICT", readingId: "performance-is-learning", verdict: "overreaches" },
      { type: "SET_READING_VERDICT", readingId: "design-changes-effect", verdict: "fits" },
      { type: "COMMIT_READINGS" },
      { type: "SET_BOUNDED_CLAIM", claimId: CORRECT_BOUNDED_CLAIM_ID },
      { type: "COMMIT_BOUNDED_CLAIM" },
      { type: "ACKNOWLEDGE_WITHDRAWAL" },
      { type: "SET_TRANSFER_CHOICE", choiceId: "bounded-measures" },
      { type: "SET_TRANSFER_OPEN_QUESTION", openQuestionId: "held-constant" },
      { type: "SUBMIT_TRANSFER" },
    );

    expect(state.stage).toBe("result");
    expect(state.transferSubmission).toEqual({
      choiceId: "bounded-measures",
      openQuestionId: "held-constant",
      submitted: true,
    });
    expect(state.transferScore).toMatchObject({ points: 2, outcome: "held" });
    expect(state.record).not.toBeNull();

    const firstRecord = state.record;
    state = evidenceLearningReducer(state, { type: "SUBMIT_TRANSFER" });
    expect(state.stage).toBe("result");
    expect(state.lastError).toBe("invalid-transition");
    expect(state.record).toEqual(firstRecord);
  });

  it("requires the two-reading acknowledgement and a prediction before source evidence can appear", () => {
    const rejected = evidenceLearningReducer(committedEncounter(), {
      type: "COMMIT_TEST_PREDICTION",
      predictionId: null,
    });
    expect(rejected).toMatchObject({ stage: "compiler", lastError: "readings-acceptance-required" });

    const stillClosed = reduce(
      rejected,
      { type: "ACCEPT_TWO_READINGS" },
      { type: "COMMIT_TEST_PREDICTION", predictionId: null },
    );
    expect(stillClosed).toMatchObject({ stage: "compiler", lastError: "test-prediction-required" });

    const opened = reduce(
      stillClosed,
      { type: "COMMIT_TEST_PREDICTION", predictionId: "performance-is-learning" },
    );
    expect(opened.stage).toBe("evidence");
  });

  it("enters an explicit withdrawal state and resets to an isolated encounter", () => {
    const withdrawal = reduce(
      openedEvidence(),
      { type: "REVIEW_EVIDENCE", evidenceId: "bastani-pnas" },
      { type: "REVIEW_EVIDENCE", evidenceId: "tutor-copilot" },
      { type: "CONTINUE_FROM_EVIDENCE" },
      { type: "SET_DIFFERENCE", differenceId: CORRECT_DIFFERENCE_ID },
      { type: "COMMIT_DIFFERENCE" },
      { type: "SET_READING_VERDICT", readingId: "performance-is-learning", verdict: "overreaches" },
      { type: "SET_READING_VERDICT", readingId: "design-changes-effect", verdict: "fits" },
      { type: "COMMIT_READINGS" },
      { type: "SET_BOUNDED_CLAIM", claimId: CORRECT_BOUNDED_CLAIM_ID },
      { type: "COMMIT_BOUNDED_CLAIM" },
    );
    expect(withdrawal.stage).toBe("withdrawal");
    expect(evidenceLearningReducer(withdrawal, { type: "ACKNOWLEDGE_WITHDRAWAL" }).stage).toBe("transfer");
    expect(evidenceLearningReducer(withdrawal, { type: "RESET" })).toEqual(initialEvidenceLearningState);
  });
});
