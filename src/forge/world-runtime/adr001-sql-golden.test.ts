import { afterEach, describe, expect, it, vi } from "vitest";

import goldenEvents from "../fixtures/adr001-source-corroboration-compiler-v2.json";
import { compileWorldRuntimeReceiptToAdr001 } from "./adr001-event-compiler";
import { sourceCorroborationWorldRuntimeAdapter } from "./source-corroboration";
import { createWorldRuntimeSession, dispatchWorldRuntimeCommand } from "./runtime";

async function compileGoldenChain() {
  let session = createWorldRuntimeSession(
    sourceCorroborationWorldRuntimeAdapter,
    "attempt.00000000-0000-4000-8000-000000000001",
  );
  const commands = [
    { type: "SET_STANCE", stanceId: "depends" },
    { type: "SET_CONFIDENCE", confidence: 70 },
    { type: "SET_REASON", reason: "The access design and later measurement probably change the result." },
    { type: "COMMIT_ENCOUNTER" },
    { type: "ACCEPT_TWO_READINGS" },
    { type: "COMMIT_TEST_PREDICTION", predictionId: "design-changes-effect" },
    { type: "REVIEW_EVIDENCE", evidenceId: "bastani-pnas" },
    { type: "REVIEW_EVIDENCE", evidenceId: "tutor-copilot" },
    { type: "CONTINUE_FROM_EVIDENCE" },
    { type: "SET_DIFFERENCE", differenceId: "delivery-role" },
    { type: "COMMIT_DIFFERENCE" },
    { type: "SET_READING_VERDICT", readingId: "performance-is-learning", verdict: "overreaches" },
    { type: "SET_READING_VERDICT", readingId: "design-changes-effect", verdict: "fits" },
    { type: "COMMIT_READINGS" },
    { type: "SET_BOUNDED_CLAIM", claimId: "conditions-shape-outcomes" },
    { type: "COMMIT_BOUNDED_CLAIM" },
    { type: "ACKNOWLEDGE_WITHDRAWAL" },
    { type: "SET_TRANSFER_CHOICE", choiceId: "bounded-measures" },
    { type: "SET_TRANSFER_OPEN_QUESTION", openQuestionId: "held-constant" },
    { type: "SUBMIT_TRANSFER" },
  ] as const;

  for (const event of commands) {
    const dispatched = dispatchWorldRuntimeCommand(sourceCorroborationWorldRuntimeAdapter, session, {
      kind: "domain",
      event,
    });
    expect(dispatched.accepted).toBe(true);
    if (!dispatched.accepted) throw new Error(dispatched.reason);
    session = dispatched.session;
  }
  if (!session.receipt || !session.proof) throw new Error("Source-corroboration fixture did not complete.");
  return compileWorldRuntimeReceiptToAdr001({
    receipt: session.receipt,
    validatorInput: sourceCorroborationWorldRuntimeAdapter.validatorInput(session.proof),
  });
}

afterEach(() => vi.useRealTimers());

describe("ADR-001 SQL golden chain", () => {
  it("exactly emits the checked-in deterministic compiler chain", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-22T19:53:00.000Z"));
    const compiled = await compileGoldenChain();
    expect(compiled).toMatchObject({ ok: true });
    if (!compiled.ok) return;
    expect(compiled.events).toEqual(goldenEvents);
  });
});
