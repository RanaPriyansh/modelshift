import { describe, expect, it } from "vitest";

import { argumentEvidenceTransferValidator } from "../deterministic-validators";
import { ARGUMENT_EVIDENCE_WORLD } from "../worlds";
import {
  ARGUMENT_EVIDENCE_AUTHORED_FIXTURE,
  type ArgumentEvidenceWorldEvent,
} from "../../worlds/argument-evidence";
import { argumentEvidenceWorldRuntimeAdapter } from "./argument-evidence";
import { createWorldRuntimeSession, dispatchWorldRuntimeCommand } from "./runtime";

const toProof: readonly ArgumentEvidenceWorldEvent[] = [
  { type: "COMMIT_INITIAL", ruleId: ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.compiler.readings[0].id, confidence: 65 },
  { type: "COMMIT_EXPLANATION", text: "The outcome relation matters more than a shared topic when testing the exact claim." },
  { type: "RESPOND_TO_TWO_READINGS", response: "reject" },
  { type: "NAME_DISAGREEMENT" },
  { type: "COMMIT_TEST_PREDICTION", predictionId: ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.compiler.readings[1].prediction },
  { type: "REVEAL_SEPARATING_COMPARISON" },
  { type: "SET_WORKED_EVIDENCE_ITEM", evidenceItemId: ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.worked.expected.evidenceItemId },
  { type: "SET_WORKED_RELATION", relationId: ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.worked.expected.relationId },
  { type: "SUBMIT_WORKED_COMPARISON" },
  { type: "CONSUME_AUTHORED_SUPPORT", level: 1 },
  { type: "CONSUME_AUTHORED_SUPPORT", level: 2 },
  { type: "CONSUME_AUTHORED_SUPPORT", level: 3 },
  { type: "CONTINUE_TO_RECONSTRUCTION" },
  { type: "SUBMIT_RECONSTRUCTION", ruleId: ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.reconstruction.expectedRuleId, text: "Evidence changes credibility when it compares the named outcome for the exact claim." },
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
    const expected = ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.transfer.expected;
    const runtime = run([
      ...toProof,
      { type: "SET_TRANSFER_EVIDENCE_ITEM", evidenceItemId: expected.evidenceItemId },
      { type: "SET_TRANSFER_MECHANISM", mechanismId: expected.mechanismId },
      { type: "SET_TRANSFER_LIMITATION", limitationId: expected.limitationId },
      { type: "SET_TRANSFER_CONFIDENCE", confidence: 89 },
      { type: "SUBMIT_TRANSFER" },
    ]);
    expect(runtime).toMatchObject({ phase: "bounded_result", receipt: { validator: { outcome: "pass", disposition: "demonstrated" }, sourceProvenanceStatus: "incomplete" } });
    expect(runtime.semanticTrace).toEqual(["encounter", "commit_model", "interpret_two_readings", "name_disagreement", "commit_test_prediction", "run_separating_experience", "governed_support", "reconstruct", "withdraw_instructional_ai", "cold_transfer", "bounded_result"]);
    expect(runtime.cognitiveSupport).toEqual([
      expect.objectContaining({ actionId: "action.argument-evidence.support.attention", tier: "attention" }),
      expect.objectContaining({ actionId: "action.argument-evidence.support.cue", tier: "cue" }),
      expect.objectContaining({ actionId: "action.argument-evidence.support.representation", tier: "representation" }),
    ]);
    expect(JSON.stringify(runtime.receipt)).not.toContain("The outcome relation matters");
    expect(JSON.stringify(runtime.receipt)).not.toContain("confidence");
  });

  it("totally classifies hostile domain inputs and rejects them without state, trace, or support mutation", () => {
    const runtime = createWorldRuntimeSession(argumentEvidenceWorldRuntimeAdapter);
    const hostileEvents: unknown[] = [
      null,
      [],
      { type: "UNKNOWN" },
      { type: "RESET", extra: true },
      { type: "COMMIT_INITIAL", ruleId: ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.compiler.readings[0].id, confidence: Number.NaN },
    ];
    for (const event of hostileEvents) {
      const typedEvent = event as ArgumentEvidenceWorldEvent;
      expect(() => argumentEvidenceWorldRuntimeAdapter.classify(typedEvent)).not.toThrow();
      expect(() => argumentEvidenceWorldRuntimeAdapter.supportEvent(typedEvent, runtime.state)).not.toThrow();
      expect(() => argumentEvidenceWorldRuntimeAdapter.semanticStages(typedEvent, runtime.state, runtime.state)).not.toThrow();
      const result = dispatchWorldRuntimeCommand(
        argumentEvidenceWorldRuntimeAdapter,
        runtime,
        { kind: "domain", event: typedEvent },
      );
      expect(result).toMatchObject({ accepted: false, reason: "domain_rejected", domainReason: "invalid_event_shape" });
      expect(result.session.state).toBe(runtime.state);
      expect(result.session.semanticTrace).toBe(runtime.semanticTrace);
      expect(result.session.cognitiveSupport).toBe(runtime.cognitiveSupport);
      expect(result.session).toEqual(runtime);
    }
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
      manifest: { availability: { status: "unavailable" }, sources: [{ url: "forge-internal:source.argument-evidence.authored-fixture", review: { status: "pending" } }] },
    });
    expect(argumentEvidenceTransferValidator.validate({})).toEqual({ inputStatus: "invalid", passed: false, score: 0, code: "invalid.transfer-input", evidence: [] });
  });
});
