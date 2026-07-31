import "server-only";

import {
  createWorldRuntimeSession,
  dispatchWorldRuntimeCommand,
  sourceCorroborationWorldRuntimeAdapter,
  type BoundedLocalWorldRuntimeReceipt,
} from "../world-runtime";
import type {
  EvidenceLearningAction,
  TransferChoiceId,
  TransferOpenQuestionId,
} from "../../worlds/ai-learning";

const PRE_PROOF_EVENTS = Object.freeze([
  { type: "SET_STANCE", stanceId: "depends" },
  { type: "SET_CONFIDENCE", confidence: 70 },
  {
    type: "SET_REASON",
    reason:
      "The access design and later measurement probably change the result.",
  },
  { type: "COMMIT_ENCOUNTER" },
  { type: "ACCEPT_TWO_READINGS" },
  {
    type: "COMMIT_TEST_PREDICTION",
    predictionId: "design-changes-effect",
  },
  { type: "REVIEW_EVIDENCE", evidenceId: "bastani-pnas" },
  { type: "REVIEW_EVIDENCE", evidenceId: "tutor-copilot" },
  { type: "CONTINUE_FROM_EVIDENCE" },
  { type: "SET_DIFFERENCE", differenceId: "delivery-role" },
  { type: "COMMIT_DIFFERENCE" },
  {
    type: "SET_READING_VERDICT",
    readingId: "performance-is-learning",
    verdict: "overreaches",
  },
  {
    type: "SET_READING_VERDICT",
    readingId: "design-changes-effect",
    verdict: "fits",
  },
  { type: "COMMIT_READINGS" },
  {
    type: "SET_BOUNDED_CLAIM",
    claimId: "conditions-shape-outcomes",
  },
  { type: "COMMIT_BOUNDED_CLAIM" },
  { type: "ACKNOWLEDGE_WITHDRAWAL" },
] as const satisfies readonly EvidenceLearningAction[]);

/**
 * Runs the real canonical source-corroboration state machine for one closed
 * synthetic research result. The returned receipt retains its private
 * process-local attestation.
 */
export function createUniversityPostAttemptFixtureReceipt(
  choiceId: TransferChoiceId,
  openQuestionId: TransferOpenQuestionId,
): BoundedLocalWorldRuntimeReceipt {
  const attemptSuffix = `${choiceId}-${openQuestionId}`.replaceAll("_", "-");
  let session = createWorldRuntimeSession(
    sourceCorroborationWorldRuntimeAdapter,
    `attempt.university-repair-${attemptSuffix}`,
  );
  const events: readonly EvidenceLearningAction[] = [
    ...PRE_PROOF_EVENTS,
    { type: "SET_TRANSFER_CHOICE", choiceId },
    { type: "SET_TRANSFER_OPEN_QUESTION", openQuestionId },
    { type: "SUBMIT_TRANSFER" },
  ];
  for (const event of events) {
    const result = dispatchWorldRuntimeCommand(
      sourceCorroborationWorldRuntimeAdapter,
      session,
      { kind: "domain", event },
    );
    if (!result.accepted) {
      throw new Error(
        `Synthetic repair receipt failed at ${event.type}: ${result.reason}.`,
      );
    }
    session = result.session;
  }
  if (!session.receipt) {
    throw new Error("Synthetic repair runtime produced no receipt.");
  }
  return session.receipt;
}
