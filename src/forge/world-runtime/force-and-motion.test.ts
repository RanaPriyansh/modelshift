import { describe, expect, it } from "vitest";

import { FORCE_AND_MOTION_WORLD } from "../worlds";
import {
  createInitialLearningState,
  transitionLearningState,
  type LearningEvent,
} from "../../domain/learning";
import { lintWorldRuntimePack } from "./linter";
import { forceAndMotionWorldRuntimeAdapter } from "./force-and-motion";
import type { WorldRuntimeAdapter } from "./protocol";
import { createWorldRuntimeSession, dispatchWorldRuntimeCommand } from "./runtime";

const modelInterpretation = {
  schema_version: "1.0" as const,
  source: "model" as const,
  providerId: "openai" as const,
  modelId: "gpt-5.6-sol",
  policyId: "policy.force-and-motion.interpretation.v1" as const,
  hypotheses: [
    {
      id: "force_equals_velocity" as const,
      support: "high" as const,
      evidence_spans: ["push sets the speed"],
      rationale: "The explanation links force to the current speed.",
    },
  ],
  missing_distinctions: ["zero_net_force_means_zero_acceleration" as const],
  recommended_probe_id: "brief_vs_continuous_force" as const,
  recommended_level_1_question_id: "compare_force_and_velocity_graphs" as const,
  abstain: false,
  abstain_reason: "none" as const,
};

function completeToProof(
  interpretationEvent: Extract<LearningEvent, { type: "RESOLVE_INTERPRETATION" | "INTERPRETATION_FAILED" }> = {
    type: "RESOLVE_INTERPRETATION",
    interpretation: modelInterpretation,
  },
  events: readonly LearningEvent[] = [],
): readonly LearningEvent[] {
  return [
    { type: "START" },
    { type: "COMMIT_PREDICTION", predictionId: "gradually_slows", confidence: 65 },
    { type: "COMMIT_EXPLANATION", explanation: "A continuing push sets the speed." },
    interpretationEvent,
    { type: "COMMIT_PROBE_PREDICTION", predictionId: "brief_velocity_constant" },
    { type: "RUN_EXPERIMENT" },
    ...events,
    { type: "OBSERVE_EXPERIMENT" },
    { type: "SUBMIT_REFLECTION", reflection: "The brief push stops changing velocity when the force ends." },
    { type: "SUBMIT_RECONSTRUCTION", reconstruction: "Net force changes acceleration, and acceleration changes velocity." },
    { type: "CONTINUE_TO_COLD_TRANSFER" },
  ];
}

function transfer(choiceId: "returns_to_zero" | "stays_constant_after_force" | "keeps_accelerating" = "stays_constant_after_force"): LearningEvent {
  return {
    type: "SUBMIT_TRANSFER",
    choiceId,
    explanation: "The velocity is flat after the force returns to zero.",
  };
}

describe("Force & Motion World runtime adapter", () => {
  it("binds the existing Force pack without inventing source authority or return proof", () => {
    const lint = lintWorldRuntimePack(FORCE_AND_MOTION_WORLD);
    expect(lint.ok).toBe(true);
    if (!lint.ok) return;
    expect(lint.pack).toMatchObject({
      manifest: { version: "1.0.1" },
      release: { contentVersion: "1.0.0" },
      runtime: {
        protocolVersion: "1.0.2",
        evidence: { receiptSchemaVersion: "1.0.2" },
        support: { policyId: "policy.force-and-motion.interpretation.v1" },
        returnProof: { enabled: false },
        sourceBindings: [{
          domainSourceRef: "source.openstax.newtons-first-law",
          sourceItemId: "source.openstax.newtons-first-law",
          sourceSnapshotDigest: null,
          provenanceStatus: "legacy_metadata_only",
        }],
      },
    });
    expect(FORCE_AND_MOTION_WORLD.runtime.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "action.force-and-motion.interpretation", kind: "instructional_support" }),
      expect.objectContaining({ id: "action.force-and-motion.support", kind: "instructional_support" }),
    ]));
    expect(FORCE_AND_MOTION_WORLD.manifest.returnProof).toMatchObject({
      enabled: false,
      reason: "No reviewed delayed task family or scheduler is published.",
    });
  });

  it("is reducer-equivalent, preserves the ordered trace, and emits no learner prose in its local receipt", () => {
    let domain = createInitialLearningState();
    let runtime = createWorldRuntimeSession(forceAndMotionWorldRuntimeAdapter);
    const events = [
      ...completeToProof(),
      transfer(),
    ];

    for (const event of events) {
      const reduced = transitionLearningState(domain, event);
      expect(reduced.accepted, reduced.accepted ? undefined : reduced.reason).toBe(true);
      if (!reduced.accepted) return;
      domain = reduced.state;

      const dispatched = dispatchWorldRuntimeCommand(forceAndMotionWorldRuntimeAdapter, runtime, { kind: "domain", event });
      expect(dispatched.accepted).toBe(true);
      if (!dispatched.accepted) return;
      runtime = dispatched.session;
      expect(runtime.state).toEqual(domain);
    }

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
      authority: { proofAuthority: "honour_based", persistence: "not_persisted", isDurable: false },
      world: {
        id: "world.force-and-motion",
        version: "1.0.1",
        contentVersion: "1.0.0",
        taskFamilyId: "task-family.force-motion.cargo-pod-cold-transfer.v1",
      },
      validator: {
        id: "validator.force-motion-transfer.v1",
        outcome: "pass",
        disposition: "demonstrated",
        criteria: [
          "task:cargo_pod_force_graph",
          "answer:stays_constant_after_force",
          "explanation:submitted-not-evaluated",
        ],
      },
      cognitiveSupport: [{
        actionId: "action.force-and-motion.interpretation",
        source: "model",
        tier: "representation",
        stage: "interpret_two_readings",
        policyId: "policy.force-and-motion.interpretation.v1",
        providerId: "openai",
        modelId: "gpt-5.6-sol",
        fallbackReason: null,
      }],
      sourceProvenanceStatus: "incomplete",
      responseDigest: null,
    });
    expect(runtime.receipt?.remainsUntested).toEqual(expect.arrayContaining([
      "Delayed retention: not tested yet.",
      "Transfer beyond this one authored cargo-pod task was not tested.",
      "Causal explanation quality beyond the validator's authored-choice signal was not tested.",
    ]));
    expect(JSON.stringify(runtime.receipt)).not.toContain("The velocity is flat after the force returns to zero");
    expect(JSON.stringify(runtime.receipt)).not.toContain("A continuing push sets the speed");
  });

  it("records model, fallback payload, and direct fallback event as representation support before proof", () => {
    for (const interpretationEvent of [
      { type: "RESOLVE_INTERPRETATION" as const, interpretation: modelInterpretation },
      {
        type: "RESOLVE_INTERPRETATION" as const,
        interpretation: {
          ...modelInterpretation,
          source: "fallback" as const,
          providerId: null,
          modelId: null,
          fallback_reason: "timeout" as const,
          abstain: true,
          abstain_reason: "model_uncertain" as const,
          hypotheses: [{ id: "mixed_or_unclear" as const, support: "low" as const, evidence_spans: [], rationale: "Authored fallback." }],
          recommended_probe_id: "neutral_core_probe" as const,
          recommended_level_1_question_id: "neutral_observation_prompt" as const,
        },
      },
      { type: "INTERPRETATION_FAILED" as const, reason: "timeout" as const },
    ]) {
      let runtime = createWorldRuntimeSession(forceAndMotionWorldRuntimeAdapter);
      const setup: LearningEvent[] = [
        { type: "START" },
        { type: "COMMIT_PREDICTION", predictionId: "gradually_slows", confidence: 65 },
        { type: "COMMIT_EXPLANATION", explanation: "A continuing push sets the speed." },
        interpretationEvent,
      ];
      for (const event of setup) {
        const dispatched = dispatchWorldRuntimeCommand(forceAndMotionWorldRuntimeAdapter, runtime, { kind: "domain", event });
        expect(dispatched.accepted).toBe(true);
        if (!dispatched.accepted) return;
        runtime = dispatched.session;
      }
      const isModel = interpretationEvent.type === "RESOLVE_INTERPRETATION" && interpretationEvent.interpretation.source === "model";
      expect(runtime.cognitiveSupport).toEqual([{
        actionId: "action.force-and-motion.interpretation",
        stage: "interpret_two_readings",
        source: isModel ? "model" : "authored",
        tier: "representation",
        policyId: "policy.force-and-motion.interpretation.v1",
        providerId: isModel ? "openai" : null,
        modelId: isModel ? "gpt-5.6-sol" : null,
        fallbackReason: isModel ? null : "timeout",
      }]);
      expect(runtime.semanticTrace).toEqual(["encounter", "commit_model", "interpret_two_readings", "name_disagreement"]);
    }
  });

  it("rejects model support that is missing server-owned provider provenance", () => {
    let runtime = createWorldRuntimeSession(forceAndMotionWorldRuntimeAdapter);
    for (const event of [
      { type: "START" as const },
      { type: "COMMIT_PREDICTION" as const, predictionId: "gradually_slows" as const, confidence: 65 },
      { type: "COMMIT_EXPLANATION" as const, explanation: "A continuing push sets the speed." },
    ]) {
      const dispatched = dispatchWorldRuntimeCommand(forceAndMotionWorldRuntimeAdapter, runtime, { kind: "domain", event });
      expect(dispatched.accepted).toBe(true);
      if (!dispatched.accepted) return;
      runtime = dispatched.session;
    }

    const rejected = dispatchWorldRuntimeCommand(forceAndMotionWorldRuntimeAdapter, runtime, {
      kind: "domain",
      event: {
        type: "RESOLVE_INTERPRETATION",
        interpretation: { ...modelInterpretation, providerId: null, modelId: null },
      },
    });
    expect(rejected).toMatchObject({ accepted: false, reason: "runtime_support_mismatch" });
    expect(rejected.session.state.stage).toBe("INTERPRET");
    expect(rejected.session.cognitiveSupport).toEqual([]);
  });

  it("records authored support only after consumption and blocks support, model, and replay actions in proof while preserving typed access", () => {
    let runtime = createWorldRuntimeSession(forceAndMotionWorldRuntimeAdapter);
    for (const event of completeToProof(modelInterpretation.source === "model"
      ? { type: "RESOLVE_INTERPRETATION", interpretation: modelInterpretation }
      : { type: "INTERPRETATION_FAILED", reason: "timeout" }, [
      { type: "REQUEST_SUPPORT", level: 1, reason: "stuck" },
      { type: "CONSUME_SUPPORT", level: 1 },
    ])) {
      const dispatched = dispatchWorldRuntimeCommand(forceAndMotionWorldRuntimeAdapter, runtime, { kind: "domain", event });
      expect(dispatched.accepted).toBe(true);
      if (!dispatched.accepted) return;
      runtime = dispatched.session;
    }
    expect(runtime.cognitiveSupport).toEqual(expect.arrayContaining([{
      actionId: "action.force-and-motion.support",
      stage: "governed_support",
      source: "authored",
      tier: "attention",
      policyId: "policy.force-and-motion.interpretation.v1",
      providerId: null,
      modelId: null,
      fallbackReason: null,
    }]));
    for (const [level, tier] of [[1, "attention"], [2, "representation"], [3, "repair"]] as const) {
      const initial = createInitialLearningState();
      expect(forceAndMotionWorldRuntimeAdapter.supportEvent(
        { type: "CONSUME_SUPPORT", level },
        {
          stage: "EXPERIMENT",
          context: {
            ...initial.context,
            consumedSupport: [{ level, reason: level === 1 ? "stuck" : level === 2 ? "second_explicit_request" : "show_principle" }],
          },
        },
      )).toEqual({
        actionId: "action.force-and-motion.support",
        stage: "governed_support",
        source: "authored",
        tier,
        policyId: "policy.force-and-motion.interpretation.v1",
        providerId: null,
        modelId: null,
        fallbackReason: null,
      });
    }
    expect(runtime.phase).toBe("proof");

    for (const command of [
      { kind: "domain" as const, event: { type: "CONSUME_SUPPORT", level: 1 } as LearningEvent },
      { kind: "model_action" as const, actionId: "action.force-and-motion.model" },
      { kind: "domain" as const, event: { type: "REPLAY_EXPERIMENT" } as LearningEvent },
    ]) {
      const rejected = dispatchWorldRuntimeCommand(forceAndMotionWorldRuntimeAdapter, runtime, command);
      expect(rejected).toMatchObject({ accepted: false, reason: "proof_action_blocked" });
      if (!rejected.accepted) runtime = rejected.session;
    }

    const access = dispatchWorldRuntimeCommand(forceAndMotionWorldRuntimeAdapter, runtime, {
      kind: "access_accommodation",
      accommodationId: "access.force-and-motion.text-alternative",
    });
    expect(access).toMatchObject({ accepted: true, effects: ["access_recorded"] });
    if (!access.accepted) return;
    expect(access.session.accessAccommodations).toEqual([
      expect.objectContaining({ stage: "cold_transfer", constructPreservation: "preserves_construct", answerChanging: false }),
    ]);
  });

  it("uses only the canonical validator for correct, wrong, and malformed transfer input", () => {
    for (const [choiceId, outcome, disposition] of [
      ["stays_constant_after_force", "pass", "demonstrated"],
      ["returns_to_zero", "fail", "not_demonstrated"],
    ] as const) {
      let runtime = createWorldRuntimeSession(forceAndMotionWorldRuntimeAdapter);
      for (const event of [...completeToProof(), transfer(choiceId)]) {
        const dispatched = dispatchWorldRuntimeCommand(forceAndMotionWorldRuntimeAdapter, runtime, { kind: "domain", event });
        expect(dispatched.accepted).toBe(true);
        if (!dispatched.accepted) return;
        runtime = dispatched.session;
      }
      expect(runtime.receipt?.validator).toMatchObject({
        outcome,
        disposition,
        criteria: [
          "task:cargo_pod_force_graph",
          `answer:${choiceId}`,
          "explanation:submitted-not-evaluated",
        ],
      });
    }

    let malformed = createWorldRuntimeSession(forceAndMotionWorldRuntimeAdapter);
    for (const event of completeToProof()) {
      const dispatched = dispatchWorldRuntimeCommand(forceAndMotionWorldRuntimeAdapter, malformed, { kind: "domain", event });
      expect(dispatched.accepted).toBe(true);
      if (!dispatched.accepted) return;
      malformed = dispatched.session;
    }
    const rejected = dispatchWorldRuntimeCommand(forceAndMotionWorldRuntimeAdapter, malformed, {
      kind: "domain",
      event: { type: "SUBMIT_TRANSFER", explanation: "I don't know yet.", dontKnow: true },
    });
    expect(rejected).toMatchObject({ accepted: false, reason: "canonical_validator_input_invalid" });
    expect(rejected.session.receipt).toBeNull();
    expect(rejected.session.phase).toBe("proof");
  });

  it("rejects a forged or skipped trace and resets a completed attempt to a fresh encounter", () => {
    type State = { readonly advanced: boolean };
    type Event = { readonly type: "FORGE" };
    const forged: WorldRuntimeAdapter<State, Event, { readonly proof: true }> = {
      pack: forceAndMotionWorldRuntimeAdapter.pack,
      createInitialState: () => ({ advanced: false }),
      reduce: () => ({ accepted: true, state: { advanced: true } }),
      phase: (state) => state.advanced ? "bounded_result" : "learning",
      initialSemanticStage: () => "encounter",
      semanticStages: () => ["bounded_result"],
      stage: () => "encounter",
      classify: () => "learner_operation",
      supportEvent: () => null,
      proof: (state) => state.advanced ? { proof: true } : null,
      validatorInput: () => ({}),
      validatorCriteria: () => ["forged"],
      remainsUntested: () => [],
    };
    const forgedAttempt = dispatchWorldRuntimeCommand(forged, createWorldRuntimeSession(forged), {
      kind: "domain",
      event: { type: "FORGE" },
    });
    expect(forgedAttempt).toMatchObject({ accepted: false, reason: "runtime_trace_invalid" });

    let runtime = createWorldRuntimeSession(forceAndMotionWorldRuntimeAdapter);
    for (const event of [...completeToProof(), transfer("returns_to_zero")]) {
      const dispatched = dispatchWorldRuntimeCommand(forceAndMotionWorldRuntimeAdapter, runtime, { kind: "domain", event });
      expect(dispatched.accepted).toBe(true);
      if (!dispatched.accepted) return;
      runtime = dispatched.session;
    }
    const completedAttemptId = runtime.attemptId;
    const reset = dispatchWorldRuntimeCommand(forceAndMotionWorldRuntimeAdapter, runtime, {
      kind: "domain",
      event: { type: "RESET" },
    });
    expect(reset).toMatchObject({
      accepted: true,
      session: {
        state: createInitialLearningState(),
        semanticTrace: ["encounter"],
        receipt: null,
        proof: null,
      },
    });
    if (!reset.accepted) return;
    expect(reset.session.attemptId).not.toBe(completedAttemptId);
    expect(reset.session.attemptId).toMatch(/^attempt\./);
  });
});
