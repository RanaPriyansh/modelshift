import { describe, expect, it } from "vitest";

import { argumentEvidenceTransferValidator } from "../deterministic-validators";
import { ARGUMENT_EVIDENCE_WORLD } from "../worlds";
import { type ArgumentEvidenceWorldEvent } from "../../worlds/argument-evidence";
import { argumentEvidenceWorldRuntimeAdapter } from "./argument-evidence";
import { createWorldRuntimeSession, dispatchWorldRuntimeCommand } from "./runtime";

const toProof: readonly ArgumentEvidenceWorldEvent[] = [
  { type: "COMMIT_INITIAL", ruleId: "same_topic_counts", confidence: 65 },
  { type: "COMMIT_EXPLANATION", text: "The outcome relation matters more than a shared topic when testing the exact claim." },
  { type: "RESPOND_TO_TWO_READINGS", response: "accept" },
  { type: "NAME_DISAGREEMENT" },
  { type: "COMMIT_TEST_PREDICTION", predictionId: "outcome_linked_changes_credibility" },
  { type: "REVEAL_SEPARATING_COMPARISON" },
  { type: "SET_WORKED_EVIDENCE_ITEM", evidenceItemId: "roof.outcome-linked" },
  { type: "SET_WORKED_RELATION", relationId: "supports_with_limit" },
  { type: "SUBMIT_WORKED_COMPARISON" },
  { type: "CONSUME_AUTHORED_SUPPORT", level: 1 },
  { type: "CONSUME_AUTHORED_SUPPORT", level: 2 },
  { type: "CONTINUE_TO_RECONSTRUCTION" },
  { type: "SUBMIT_RECONSTRUCTION", ruleId: "outcome_relation", text: "Evidence changes credibility when it compares the named outcome for the exact claim." },
  { type: "ACKNOWLEDGE_WITHDRAWAL" },
];

function run(events: readonly ArgumentEvidenceWorldEvent[]) {
  let runtime = createWorldRuntimeSession(argumentEvidenceWorldRuntimeAdapter);
  for (const event of events) {
    const result = dispatchWorldRuntimeCommand(argumentEvidenceWorldRuntimeAdapter, runtime, { kind: "domain", event });
    expect(result.accepted, result.accepted ? undefined : result.reason).toBe(true);
    runtime = result.session;
  }
  return runtime;
}

describe("Argument & Evidence runtime adapter", () => {
  it("emits canonical stages, only bounded validator input, and the three exact support facts", () => {
    const runtime = run([
      ...toProof,
      { type: "SET_TRANSFER_EVIDENCE_ITEM", evidenceItemId: "bus.outcome-linked" },
      { type: "SET_TRANSFER_MECHANISM", mechanismId: "compares_named_outcome" },
      { type: "SET_TRANSFER_LIMITATION", limitationId: "other_changes_not_ruled_out" },
      { type: "SET_TRANSFER_CONFIDENCE", confidence: 89 },
      { type: "SUBMIT_TRANSFER" },
    ]);
    expect(runtime).toMatchObject({ phase: "bounded_result", receipt: { validator: { outcome: "pass", disposition: "demonstrated" }, sourceProvenanceStatus: "incomplete" } });
    expect(runtime.semanticTrace).toEqual(["encounter", "commit_model", "interpret_two_readings", "name_disagreement", "commit_test_prediction", "run_separating_experience", "governed_support", "reconstruct", "withdraw_instructional_ai", "cold_transfer", "bounded_result"]);
    expect(runtime.cognitiveSupport).toEqual([
      expect.objectContaining({ actionId: "action.argument-evidence.support.attention", tier: "attention" }),
      expect.objectContaining({ actionId: "action.argument-evidence.support.cue", tier: "cue" }),
    ]);
    expect(JSON.stringify(runtime.receipt)).not.toContain("The outcome relation matters");
    expect(JSON.stringify(runtime.receipt)).not.toContain("confidence");
  });

  it("blocks support, model, and replay after withdrawal while preserving access", () => {
    const runtime = run(toProof);
    expect(runtime.phase).toBe("proof");
    expect(dispatchWorldRuntimeCommand(argumentEvidenceWorldRuntimeAdapter, runtime, { kind: "domain", event: { type: "CONSUME_AUTHORED_SUPPORT", level: 3 } })).toMatchObject({ accepted: false, reason: "proof_action_blocked" });
    expect(dispatchWorldRuntimeCommand(argumentEvidenceWorldRuntimeAdapter, runtime, { kind: "model_action", actionId: "action.argument-evidence.model" })).toMatchObject({ accepted: false, reason: "proof_action_blocked" });
    expect(dispatchWorldRuntimeCommand(argumentEvidenceWorldRuntimeAdapter, runtime, { kind: "experience_replay", actionId: "action.argument-evidence.replay" })).toMatchObject({ accepted: false, reason: "proof_action_blocked" });
    const firstAccess = dispatchWorldRuntimeCommand(argumentEvidenceWorldRuntimeAdapter, runtime, { kind: "access_accommodation", accommodationId: "access.argument-evidence.text-table" });
    expect(firstAccess).toMatchObject({ accepted: true, session: { accessAccommodations: [expect.objectContaining({ accommodationId: "access.argument-evidence.text-table" })] } });
    const duplicateAccess = dispatchWorldRuntimeCommand(argumentEvidenceWorldRuntimeAdapter, firstAccess.session, { kind: "access_accommodation", accommodationId: "access.argument-evidence.text-table" });
    expect(duplicateAccess).toMatchObject({ accepted: true, session: { accessAccommodations: [expect.objectContaining({ accommodationId: "access.argument-evidence.text-table" })] } });
    expect(duplicateAccess.session.accessAccommodations).toHaveLength(1);
  });

  it("keeps the package executable but unavailable with a pending non-network fixture locator", () => {
    expect(ARGUMENT_EVIDENCE_WORLD).toMatchObject({
      release: { status: "released" },
      manifest: { availability: { status: "unavailable" }, sources: [{ url: "forge-asset:/worlds/argument-evidence/authored-fixture.json", review: { status: "pending" } }] },
    });
    expect(argumentEvidenceTransferValidator.validate({})).toEqual({ inputStatus: "invalid", passed: false, score: 0, code: "invalid.transfer-input", evidence: [] });
  });
});
