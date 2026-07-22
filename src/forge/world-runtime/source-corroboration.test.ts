import { describe, expect, it } from "vitest";

import {
  createWorldRuntimeSession,
  dispatchWorldRuntimeCommand,
  type WorldRuntimeSession,
} from "./runtime";
import {
  projectSourceCorroborationTransferValidation,
  sourceCorroborationWorldRuntimeAdapter,
  type SourceCorroborationRuntimeProof,
} from "./source-corroboration";
import type { EvidenceLearningAction, EvidenceLearningState } from "../../worlds/ai-learning";

type SourceCorroborationRuntimeSession = WorldRuntimeSession<
  EvidenceLearningState,
  SourceCorroborationRuntimeProof
>;

function advance(
  runtime: SourceCorroborationRuntimeSession,
  event: EvidenceLearningAction,
) {
  const result = dispatchWorldRuntimeCommand(sourceCorroborationWorldRuntimeAdapter, runtime, { kind: "domain", event });
  expect(result.accepted).toBe(true);
  if (!result.accepted) throw new Error(result.reason);
  return result.session;
}

function completeToProof() {
  let runtime = createWorldRuntimeSession(sourceCorroborationWorldRuntimeAdapter);
  const events: readonly EvidenceLearningAction[] = [
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
  ];
  for (const event of events) runtime = advance(runtime, event);
  return runtime;
}

describe("source corroboration World runtime adapter", () => {
  it("binds the existing package with disabled return proof, exact proof locks, and preserved access", () => {
    const binding = sourceCorroborationWorldRuntimeAdapter.pack.runtime;
    expect(sourceCorroborationWorldRuntimeAdapter.pack.manifest.returnProof).toMatchObject({
      enabled: false,
      reason: "No reviewed delayed task family or scheduler is published.",
    });
    expect(binding.returnProof).toEqual({
      enabled: false,
      policyId: "policy.source-corroboration.return-proof.unavailable.v1",
    });
    expect(binding.actions.map((action) => action.kind)).toEqual([
      "learner_operation",
      "instructional_support",
      "model_action",
      "experience_replay",
      "access_accommodation",
      "reset",
    ]);
    expect(binding.proof.blockedActionKinds).toEqual(["instructional_support", "model_action", "experience_replay"]);
    expect(binding.access.accommodations.map((accommodation) => accommodation.id)).toEqual([
      "access.source-corroboration.text-alternatives",
      "access.source-corroboration.keyboard-operation",
      "access.source-corroboration.reduced-motion",
    ]);
  });

  it("requires the repaired compiler/prediction path and emits the exact canonical trace", () => {
    let runtime = completeToProof();
    expect(runtime.phase).toBe("proof");
    expect(runtime.semanticTrace).toEqual([
      "encounter",
      "commit_model",
      "interpret_two_readings",
      "name_disagreement",
      "commit_test_prediction",
      "run_separating_experience",
      "reconstruct",
      "withdraw_instructional_ai",
      "cold_transfer",
    ]);

    runtime = advance(runtime, { type: "SET_TRANSFER_CHOICE", choiceId: "bounded-measures" });
    runtime = advance(runtime, { type: "SET_TRANSFER_OPEN_QUESTION", openQuestionId: "held-constant" });
    runtime = advance(runtime, { type: "SUBMIT_TRANSFER" });

    expect(runtime.semanticTrace).toEqual([
      "encounter",
      "commit_model",
      "interpret_two_readings",
      "name_disagreement",
      "commit_test_prediction",
      "run_separating_experience",
      "reconstruct",
      "withdraw_instructional_ai",
      "cold_transfer",
      "bounded_result",
    ]);
    expect(runtime.receipt).toMatchObject({
      world: { id: "world.source-corroboration", version: "1.0.1", contentVersion: "1.0.0" },
      protocol: { version: "1.0.1" },
      authority: { proofAuthority: "honour_based", persistence: "not_persisted", isDurable: false },
      validator: {
        outcome: "pass",
        disposition: "demonstrated",
        criteria: ["choice:bounded-measures", "open-question:held-constant"],
      },
      cognitiveSupport: [],
      sourceProvenanceStatus: "incomplete",
    });
    expect(runtime.receipt?.sourceBindings).toEqual([
      expect.objectContaining({ domainSourceRef: "source.bastani-pnas.genai-learning-2025", status: "legacy_metadata_only" }),
      expect.objectContaining({ domainSourceRef: "source.tutor-copilot.arxiv-2024", status: "legacy_metadata_only" }),
    ]);
    expect(runtime.receipt?.remainsUntested.join(" ")).toMatch(/delayed retention.*populations.*contexts.*Causal isolation/i);
    expect(JSON.stringify(runtime.receipt)).not.toContain("The access design and later measurement");
  });

  it("rejects skipped compiler actions and keeps neutral mismatch attempts out of support provenance", () => {
    const initial = createWorldRuntimeSession(sourceCorroborationWorldRuntimeAdapter);
    const skipped = dispatchWorldRuntimeCommand(sourceCorroborationWorldRuntimeAdapter, initial, {
      kind: "domain",
      event: { type: "ACCEPT_TWO_READINGS" },
    });
    expect(skipped).toMatchObject({ accepted: false, reason: "domain_rejected", domainReason: "invalid-transition" });
    expect(skipped.session.semanticTrace).toEqual(["encounter"]);

    let runtime = createWorldRuntimeSession(sourceCorroborationWorldRuntimeAdapter);
    for (const event of [
      { type: "SET_STANCE", stanceId: "depends" },
      { type: "SET_CONFIDENCE", confidence: 60 },
      { type: "SET_REASON", reason: "The outcome could depend on how the tool is introduced." },
      { type: "COMMIT_ENCOUNTER" },
      { type: "ACCEPT_TWO_READINGS" },
      { type: "COMMIT_TEST_PREDICTION", predictionId: "performance-is-learning" },
      { type: "REVIEW_EVIDENCE", evidenceId: "bastani-pnas" },
      { type: "REVIEW_EVIDENCE", evidenceId: "tutor-copilot" },
      { type: "CONTINUE_FROM_EVIDENCE" },
      { type: "SET_DIFFERENCE", differenceId: "sample-size" },
      { type: "COMMIT_DIFFERENCE" },
    ] as const satisfies readonly EvidenceLearningAction[]) {
      const result = dispatchWorldRuntimeCommand(sourceCorroborationWorldRuntimeAdapter, runtime, { kind: "domain", event });
      runtime = result.session;
    }
    expect(runtime.state).toMatchObject({ stage: "difference", lastError: "difference-mismatch" });
    expect(runtime.cognitiveSupport).toEqual([]);
  });

  it("projects held as pass, partial and wrong as fail, and malformed as not scored", () => {
    expect(projectSourceCorroborationTransferValidation({
      choiceId: "bounded-measures",
      openQuestionId: "held-constant",
    })).toEqual({
      outcome: "pass",
      criteria: ["choice:bounded-measures", "open-question:held-constant"],
    });
    expect(projectSourceCorroborationTransferValidation({
      choiceId: "bounded-measures",
      openQuestionId: "color-choice",
    }).outcome).toBe("fail");
    expect(projectSourceCorroborationTransferValidation({
      choiceId: "always-harms",
      openQuestionId: "reader-preference",
    }).outcome).toBe("fail");
    expect(projectSourceCorroborationTransferValidation({})).toEqual({
      outcome: "not_scored",
      criteria: ["The transfer payload did not match the authored two-decision source-corroboration task."],
    });
  });

  it("blocks model and replay actions during proof while preserving access and can reset an emitted receipt", () => {
    let runtime = completeToProof();
    for (const command of [
      { kind: "model_action" as const, actionId: "action.source-corroboration.model" },
      { kind: "experience_replay" as const, actionId: "action.source-corroboration.replay" },
    ]) {
      const rejected = dispatchWorldRuntimeCommand(sourceCorroborationWorldRuntimeAdapter, runtime, command);
      expect(rejected).toMatchObject({ accepted: false, reason: "proof_action_blocked" });
      runtime = rejected.session;
    }
    const access = dispatchWorldRuntimeCommand(sourceCorroborationWorldRuntimeAdapter, runtime, {
      kind: "access_accommodation",
      accommodationId: "access.source-corroboration.keyboard-operation",
    });
    expect(access).toMatchObject({ accepted: true, effects: ["access_recorded"] });
    if (!access.accepted) return;
    runtime = access.session;

    runtime = advance(runtime, { type: "SET_TRANSFER_CHOICE", choiceId: "always-helps" });
    runtime = advance(runtime, { type: "SET_TRANSFER_OPEN_QUESTION", openQuestionId: "reader-preference" });
    runtime = advance(runtime, { type: "SUBMIT_TRANSFER" });
    expect(runtime.receipt).toMatchObject({ validator: { outcome: "fail", disposition: "not_demonstrated" } });

    const reset = dispatchWorldRuntimeCommand(sourceCorroborationWorldRuntimeAdapter, runtime, {
      kind: "domain",
      event: { type: "RESET" },
    });
    expect(reset).toMatchObject({
      accepted: true,
      session: { receipt: null, proof: null, semanticTrace: ["encounter"], state: { stage: "encounter" } },
    });
  });
});
