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
    expect(next.stage).toBe("evidence");
    expect(next.committedEncounter).toEqual({
      stanceId: "depends",
      confidence: 70,
      reason: "I expect the access design and later measurement to matter.",
    });
  });

  it("does not let duplicate review events unlock comparison", () => {
    const next = reduce(
      committedEncounter(),
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
      committedEncounter(),
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
      committedEncounter(),
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
});
