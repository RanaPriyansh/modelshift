import { describe, expect, it } from "vitest";

import { PROPORTIONAL_REASONING_WORLD } from "../worlds";
import { proportionalReasoningTransferValidator } from "../deterministic-validators";
import {
  createInitialRatioWorldState,
  transitionRatioWorld,
  type RatioWorldEvent,
  type RatioWorldState,
} from "../../worlds/proportional-reasoning";
import { lintWorldRuntimePack } from "./linter";
import {
  proportionalReasoningWorldRuntimeAdapter,
} from "./proportional-reasoning";
import { deriveCanonicalValidatorOutcome } from "./protocol";
import { createWorldRuntimeSession, dispatchWorldRuntimeCommand } from "./runtime";

function advance(state: RatioWorldState, event: RatioWorldEvent): RatioWorldState {
  const result = transitionRatioWorld(state, event);
  expect(result.accepted, result.accepted ? undefined : result.reason).toBe(true);
  return result.state;
}

function completeToProof(events: readonly RatioWorldEvent[] = []): RatioWorldEvent[] {
  return [
    { type: "COMMIT_INITIAL", predictionId: "same_strength", confidence: 65 },
    { type: "COMMIT_EXPLANATION", explanation: "Both recipes leave one more cup of water than concentrate." },
    { type: "COMMIT_TEST_PREDICTION", predictionId: "same_strength" },
    { type: "RUN_EXPERIMENT" },
    ...events,
    { type: "BEGIN_RECONSTRUCTION" },
    {
      type: "SUBMIT_RECONSTRUCTION",
      reconstruction: "A ratio stays proportional only when both quantities scale by the same factor.",
    },
    { type: "ACKNOWLEDGE_WITHDRAWAL" },
  ];
}

function successfulTransfer(): RatioWorldEvent {
  return {
    type: "SUBMIT_TRANSFER",
    choiceId: "32_km",
    explanation: "12 is four times 3, so I scale the real 8 km by the same factor to get 32 km.",
    confidence: 85,
  };
}

describe("Proportional Reasoning World runtime adapter", () => {
  it("uses the existing package identity and preserves legacy source incompleteness", () => {
    const lint = lintWorldRuntimePack(PROPORTIONAL_REASONING_WORLD);
    expect(lint.ok).toBe(true);
    if (!lint.ok) return;
    expect(lint.pack?.manifest.version).toBe("1.0.2");
    expect(lint.pack?.release.contentVersion).toBe("1.0.0");
    expect(lint.pack?.runtime.returnProof.enabled).toBe(false);
  });

  it("is reducer-equivalent and records the exact authored semantic trace", () => {
    let domainState = createInitialRatioWorldState();
    let runtime = createWorldRuntimeSession(proportionalReasoningWorldRuntimeAdapter);
    const events = [
      ...completeToProof([{ type: "REQUEST_SUPPORT" }]),
      successfulTransfer(),
    ];

    for (const event of events) {
      const domain = transitionRatioWorld(domainState, event);
      expect(domain.accepted).toBe(true);
      if (!domain.accepted) return;
      domainState = domain.state;

      const dispatched = dispatchWorldRuntimeCommand(proportionalReasoningWorldRuntimeAdapter, runtime, {
        kind: "domain",
        event,
      });
      expect(dispatched.accepted).toBe(true);
      if (!dispatched.accepted) return;
      runtime = dispatched.session;
      expect(runtime.state).toEqual(domainState);
    }

    expect(runtime.semanticTrace).toEqual([
      "encounter",
      "commit_model",
      "interpret_two_readings",
      "name_disagreement",
      "commit_test_prediction",
      "run_separating_experience",
      "governed_support",
      "reconstruct",
      "withdraw_instructional_ai",
      "cold_transfer",
      "bounded_result",
    ]);
    expect(runtime.receipt).toMatchObject({
      kind: "forge.runtime.bounded-local-attempt",
      authority: { proofAuthority: "honour_based", persistence: "not_persisted", isDurable: false },
      world: {
        id: "world.proportional-reasoning",
        version: "1.0.2",
        contentVersion: "1.0.0",
        capabilityId: "capability.proportional-reasoning.compare-and-scale",
        proofClaimId: "proof.proportional-reasoning.independent-transfer",
        taskFamilyId: "task-family.proportional-reasoning.map-scale-transfer.v1",
      },
      validator: { id: "validator.proportional-reasoning-transfer.v1", outcome: "pass", disposition: "demonstrated" },
      cognitiveSupport: [{ source: "authored", tier: "attention", stage: "governed_support" }],
      sourceProvenanceStatus: "incomplete",
      responseDigest: null,
    });
    expect(runtime.receipt?.sourceBindings).toEqual([
      expect.objectContaining({
        domainSourceRef: "legacy.openstax.ratios-and-rate",
        sourceItemId: "source.openstax.ratios-and-rate",
        sourceSnapshotDigest: null,
        status: "legacy_metadata_only",
      }),
    ]);
    expect(JSON.stringify(runtime.receipt)).not.toContain("12 is four times 3");
    expect(runtime.receipt?.protocol.semanticTrace).toEqual(runtime.semanticTrace);
    expect(runtime.semanticTrace).not.toContain("return_or_apply");
  });

  it("derives the runtime outcome from the canonical validator, including lucky and malformed attempts", () => {
    expect(proportionalReasoningTransferValidator.validate({})).toMatchObject({
      inputStatus: "invalid",
      passed: false,
      score: 0,
      evidence: [],
    });
    expect(deriveCanonicalValidatorOutcome(proportionalReasoningTransferValidator.validate({}))).toBe("not_scored");
    expect(deriveCanonicalValidatorOutcome(proportionalReasoningTransferValidator.validate({
      choiceId: "24_km",
      explanation: "I preserved the same proportional relationship by scaling both quantities.",
      confidence: 70,
    }))).toBe("fail");
    expect(deriveCanonicalValidatorOutcome(proportionalReasoningTransferValidator.validate({
      choiceId: "32_km",
      explanation: "I picked 32 from the list.",
      confidence: 20,
    }))).toBe("fail");
  });

  it("blocks support, model action, and experience replay during proof while preserving typed access", () => {
    let runtime = createWorldRuntimeSession(proportionalReasoningWorldRuntimeAdapter);
    for (const event of completeToProof()) {
      const dispatched = dispatchWorldRuntimeCommand(proportionalReasoningWorldRuntimeAdapter, runtime, { kind: "domain", event });
      expect(dispatched.accepted).toBe(true);
      if (!dispatched.accepted) return;
      runtime = dispatched.session;
    }
    expect(runtime.phase).toBe("proof");

    for (const command of [
      { kind: "domain" as const, event: { type: "REQUEST_SUPPORT" } as RatioWorldEvent },
      { kind: "model_action" as const, actionId: "action.proportional-reasoning.model" },
      { kind: "experience_replay" as const, actionId: "action.proportional-reasoning.replay" },
    ]) {
      const rejected = dispatchWorldRuntimeCommand(proportionalReasoningWorldRuntimeAdapter, runtime, command);
      expect(rejected).toMatchObject({ accepted: false, reason: "proof_action_blocked" });
      if (rejected.accepted) return;
      runtime = rejected.session;
    }

    const access = dispatchWorldRuntimeCommand(proportionalReasoningWorldRuntimeAdapter, runtime, {
      kind: "access_accommodation",
      accommodationId: "access.proportional-reasoning.text-alternatives",
    });
    expect(access).toMatchObject({ accepted: true, effects: ["access_recorded"] });
    if (!access.accepted) return;
    runtime = access.session;
    expect(runtime.accessAccommodations).toEqual([
      expect.objectContaining({
        accommodationId: "access.proportional-reasoning.text-alternatives",
        stage: "cold_transfer",
        constructPreservation: "preserves_construct",
        answerChanging: false,
      }),
    ]);
    expect(runtime.proofBlockedActions).toEqual(["instructional_support", "model_action", "experience_replay"]);
  });

  it("rejects unknown runtime actions and preserves rejected domain state for a valid retry", () => {
    const initial = createWorldRuntimeSession(proportionalReasoningWorldRuntimeAdapter);
    expect(dispatchWorldRuntimeCommand(proportionalReasoningWorldRuntimeAdapter, initial, {
      kind: "model_action",
      actionId: "action.proportional-reasoning.unknown-model",
    })).toMatchObject({ accepted: false, reason: "unknown_runtime_action" });
    expect(dispatchWorldRuntimeCommand(proportionalReasoningWorldRuntimeAdapter, initial, {
      kind: "experience_replay",
      actionId: "action.proportional-reasoning.replay",
    })).toMatchObject({ accepted: false, reason: "runtime_action_unavailable" });

    let domain = createInitialRatioWorldState();
    for (const event of completeToProof()) domain = advance(domain, event);
    const malformed: RatioWorldEvent = {
      type: "SUBMIT_TRANSFER",
      choiceId: "32_km",
      explanation: "short",
      confidence: 60,
    };
    const rejectedByDomain = transitionRatioWorld(domain, malformed);
    expect(rejectedByDomain).toMatchObject({ accepted: false, reason: "explanation_too_short", state: domain });
    let runtime = createWorldRuntimeSession(proportionalReasoningWorldRuntimeAdapter, "attempt.ratio-malformed");
    for (const event of completeToProof()) {
      const advanced = dispatchWorldRuntimeCommand(proportionalReasoningWorldRuntimeAdapter, runtime, { kind: "domain", event });
      expect(advanced.accepted).toBe(true);
      if (!advanced.accepted) return;
      runtime = advanced.session;
    }
    const rejectedByRuntime = dispatchWorldRuntimeCommand(proportionalReasoningWorldRuntimeAdapter, runtime, { kind: "domain", event: malformed });
    expect(rejectedByRuntime).toMatchObject({ accepted: false, reason: "domain_rejected", session: { receipt: null } });
  });

  it("resets the complete runtime session without retaining proof or a receipt", () => {
    let runtime = createWorldRuntimeSession(proportionalReasoningWorldRuntimeAdapter);
    for (const event of [...completeToProof(), successfulTransfer()]) {
      const dispatched = dispatchWorldRuntimeCommand(proportionalReasoningWorldRuntimeAdapter, runtime, { kind: "domain", event });
      expect(dispatched.accepted).toBe(true);
      if (!dispatched.accepted) return;
      runtime = dispatched.session;
    }
    const reset = dispatchWorldRuntimeCommand(proportionalReasoningWorldRuntimeAdapter, runtime, {
      kind: "domain",
      event: { type: "RESET" },
    });
    expect(reset).toMatchObject({
      accepted: true,
      session: { state: createInitialRatioWorldState(), receipt: null, proof: null, semanticTrace: ["encounter"] },
    });
  });
});
