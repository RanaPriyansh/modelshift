import { describe, expect, it } from "vitest";

import {
  createInitialLearningState,
  deriveEvidenceCard,
  INVALID_EVENT_STATE_MATRIX,
  LEARNING_EVENT_TYPES,
  type LearningEvent,
  type LearningEventType,
  type LearningState,
  transitionLearningState,
} from "./index";

const validModelInterpretation = {
  schema_version: "1.0" as const,
  source: "model" as const,
  hypotheses: [
    {
      id: "continuous_force_required" as const,
      support: "high" as const,
      evidence_spans: ["needs a push"],
      rationale: "The explanation links ongoing motion to an ongoing push.",
    },
  ],
  missing_distinctions: ["zero_net_force_means_zero_acceleration" as const],
  recommended_probe_id: "brief_vs_continuous_force" as const,
  recommended_level_1_question_id: "compare_force_and_velocity_graphs" as const,
  abstain: false,
  abstain_reason: "none" as const,
};

function eventFor(type: LearningEventType): LearningEvent {
  switch (type) {
    case "RESET":
      return { type };
    case "START":
      return { type };
    case "COMMIT_PREDICTION":
      return { type, predictionId: "gradually_slows", confidence: 55 };
    case "COMMIT_EXPLANATION":
      return { type, explanation: "It needs a push." };
    case "RESOLVE_INTERPRETATION":
      return { type, interpretation: validModelInterpretation };
    case "INTERPRETATION_FAILED":
      return { type, reason: "timeout" };
    case "COMMIT_PROBE_PREDICTION":
      return { type, predictionId: "brief_velocity_constant" };
    case "RUN_EXPERIMENT":
    case "REPLAY_EXPERIMENT":
    case "OBSERVE_EXPERIMENT":
    case "CONTINUE_TO_COLD_TRANSFER":
      return { type };
    case "SUBMIT_REFLECTION":
      return { type, reflection: "The force ended but its velocity stayed flat." };
    case "SUBMIT_RECONSTRUCTION":
      return { type, reconstruction: "Zero net force means zero acceleration." };
    case "REQUEST_SUPPORT":
      return { type, level: 1, reason: "stuck" };
    case "CONSUME_SUPPORT":
      return { type, level: 1 };
    case "SUBMIT_TRANSFER":
      return { type, choiceId: "stays_constant_after_force", explanation: "The velocity is flat after force is zero." };
  }
}

function stateAt(stage: LearningState["stage"]): LearningState {
  const state = createInitialLearningState();
  return { ...state, stage };
}

function advance(state: LearningState, event: LearningEvent): LearningState {
  const result = transitionLearningState(state, event);
  expect(result.accepted).toBe(true);
  return result.state;
}

describe("invalid event/state matrix", () => {
  it("lists every and only categorically invalid event for every stage", () => {
    for (const [stage, invalidEvents] of Object.entries(INVALID_EVENT_STATE_MATRIX) as [LearningState["stage"], readonly LearningEventType[]][]) {
      const validEvents = LEARNING_EVENT_TYPES.filter((event) => !invalidEvents.includes(event));
      expect(invalidEvents).toHaveLength(LEARNING_EVENT_TYPES.length - validEvents.length);
      for (const eventType of invalidEvents) {
        const state = stateAt(stage);
        const result = transitionLearningState(state, eventFor(eventType));
        expect(result.accepted).toBe(false);
        if (!result.accepted) {
          expect(result.state).toBe(state);
        }
      }
    }
  });

  it("fails closed for every disallowed route through proof mode", () => {
    const proof = stateAt("COLD_TRANSFER");
    for (const type of ["REQUEST_SUPPORT", "CONSUME_SUPPORT", "REPLAY_EXPERIMENT", "RESOLVE_INTERPRETATION", "INTERPRETATION_FAILED"] as const) {
      expect(transitionLearningState(proof, eventFor(type))).toMatchObject({ accepted: false, reason: "invalid_event_for_stage" });
    }
  });
});

describe("learning transitions", () => {
  it("rejects skipped prediction, bad confidence, and blank explanation without an explicit uncertainty choice", () => {
    const initial = createInitialLearningState();
    expect(transitionLearningState(initial, { type: "COMMIT_EXPLANATION", explanation: "motion" })).toMatchObject({
      accepted: false,
      reason: "invalid_event_for_stage",
    });
    const predicting = advance(initial, { type: "START" });
    expect(transitionLearningState(predicting, { type: "COMMIT_PREDICTION", predictionId: "gradually_slows", confidence: 101 })).toMatchObject({
      accepted: false,
      reason: "confidence_out_of_range",
    });
    const explaining = advance(predicting, { type: "COMMIT_PREDICTION", predictionId: "gradually_slows", confidence: 55 });
    expect(transitionLearningState(explaining, { type: "COMMIT_EXPLANATION", explanation: " " })).toMatchObject({
      accepted: false,
      reason: "meaningful_explanation_or_dont_know_required",
    });
    expect(transitionLearningState(explaining, { type: "COMMIT_EXPLANATION", explanation: "", dontKnow: true })).toMatchObject({ accepted: true });
  });

  it("takes API failure through the ordinary neutral fallback", () => {
    let state = advance(createInitialLearningState(), { type: "START" });
    state = advance(state, { type: "COMMIT_PREDICTION", predictionId: "gradually_slows", confidence: 55 });
    state = advance(state, { type: "COMMIT_EXPLANATION", explanation: "It needs a continuing push." });
    state = advance(state, { type: "INTERPRETATION_FAILED", reason: "timeout" });
    expect(state).toMatchObject({
      stage: "PROBE_PREDICT",
      context: {
        selectedProbeId: "neutral_core_probe",
        interpretation: {
          source: "fallback",
          hypothesisIds: ["continuous_force_required", "scientific_or_near_scientific"],
          fallbackReason: "timeout",
          providerId: null,
          modelId: null,
          policyId: "policy.force-and-motion.interpretation.v1",
        },
      },
    });
  });

  it("preserves a non-first accepted model reading, removes duplicates, and pads the selected probe to exactly two authored IDs", () => {
    const modelWithDuplicate = {
      ...validModelInterpretation,
      hypotheses: [
        {
          id: "force_equals_velocity" as const,
          support: "high" as const,
          evidence_spans: ["needs a push"],
          rationale: "The explanation treats force as current speed.",
        },
        {
          id: "force_equals_velocity" as const,
          support: "medium" as const,
          evidence_spans: ["needs a push"],
          rationale: "The same reading appears twice.",
        },
      ],
      recommended_probe_id: "brief_vs_continuous_force" as const,
      recommended_level_1_question_id: "compare_force_and_velocity_graphs" as const,
      providerId: "openai" as const,
      modelId: "gpt-5.6-sol",
      policyId: "policy.force-and-motion.interpretation.v1" as const,
    };
    const result = transitionLearningState(stateAt("INTERPRET"), {
      type: "RESOLVE_INTERPRETATION",
      interpretation: modelWithDuplicate,
    });
    expect(result).toMatchObject({
      accepted: true,
      state: {
        context: {
          interpretation: {
            hypothesisIds: ["force_equals_velocity", "continuous_force_required"],
            providerId: "openai",
            modelId: "gpt-5.6-sol",
            policyId: "policy.force-and-motion.interpretation.v1",
          },
        },
      },
    });
  });

  it("rejects a probe unless it is compatible with every interpreted hypothesis", () => {
    const interpretation = {
      ...validModelInterpretation,
      recommended_probe_id: "friction_contrast" as const,
      recommended_level_1_question_id: "what_differs_between_cases" as const,
      hypotheses: [
        validModelInterpretation.hypotheses[0],
        {
          ...validModelInterpretation.hypotheses[0],
          id: "force_equals_velocity" as const,
          support: "medium" as const,
        },
      ],
    };
    expect(transitionLearningState(stateAt("INTERPRET"), { type: "RESOLVE_INTERPRETATION", interpretation })).toMatchObject({
      accepted: false,
      reason: "invalid_model_interpretation",
    });
  });

  it("requires a probe prediction before the experiment and observation/reflection before reconstruction", () => {
    const experiment = stateAt("EXPERIMENT");
    expect(transitionLearningState(experiment, { type: "SUBMIT_RECONSTRUCTION", reconstruction: "zero force means flat velocity" })).toMatchObject({
      accepted: false,
      reason: "invalid_event_for_stage",
    });
    const probePrediction = stateAt("PROBE_PREDICT");
    expect(transitionLearningState(probePrediction, { type: "RUN_EXPERIMENT" })).toMatchObject({ accepted: false, reason: "invalid_event_for_stage" });
  });

  it("authorizes support by attempt/request, records it only on consumption, and rejects duplicates", () => {
    const base: LearningState = {
      stage: "EXPERIMENT",
      context: { ...createInitialLearningState().context, probePredictionId: "brief_velocity_constant" },
    };
    const authorized = advance(base, { type: "REQUEST_SUPPORT", level: 1, reason: "stuck" });
    expect(authorized.context.consumedSupport).toHaveLength(0);
    const consumed = advance(authorized, { type: "CONSUME_SUPPORT", level: 1 });
    expect(consumed.context.consumedSupport).toEqual([{ level: 1, reason: "stuck" }]);
    expect(transitionLearningState(consumed, { type: "REQUEST_SUPPORT", level: 1, reason: "stuck" })).toMatchObject({
      accepted: false,
      reason: "support_already_consumed",
    });
  });

  it("runs the complete deterministic flow, locks the transfer, and derives truthful result evidence", () => {
    let state = advance(createInitialLearningState(), { type: "START" });
    state = advance(state, { type: "COMMIT_PREDICTION", predictionId: "gradually_slows", confidence: 70 });
    state = advance(state, { type: "COMMIT_EXPLANATION", explanation: "Without force, motion fades." });
    state = advance(state, { type: "RESOLVE_INTERPRETATION", interpretation: validModelInterpretation });
    state = advance(state, { type: "COMMIT_PROBE_PREDICTION", predictionId: "brief_velocity_constant" });
    state = advance(state, { type: "RUN_EXPERIMENT" });
    state = advance(state, { type: "OBSERVE_EXPERIMENT" });
    state = advance(state, { type: "SUBMIT_REFLECTION", reflection: "The velocity stayed constant after the force ended." });
    state = advance(state, { type: "SUBMIT_RECONSTRUCTION", reconstruction: "Zero net force means zero acceleration." });
    expect(transitionLearningState(state, { type: "SUBMIT_TRANSFER", choiceId: "stays_constant_after_force", explanation: "It stays flat." })).toMatchObject({
      accepted: false,
      reason: "invalid_event_for_stage",
    });
    state = advance(state, { type: "CONTINUE_TO_COLD_TRANSFER" });
    state = advance(state, { type: "SUBMIT_TRANSFER", choiceId: "stays_constant_after_force", explanation: "Velocity is constant once force returns to zero." });
    expect(state.stage).toBe("PROOF_RESULT");
    expect(transitionLearningState(state, { type: "SUBMIT_TRANSFER", choiceId: "returns_to_zero", explanation: "Changed answer." })).toMatchObject({
      accepted: false,
      reason: "transfer_already_submitted",
    });
    expect(deriveEvidenceCard(state)).toMatchObject({
      before: { predictionId: "gradually_slows" },
      test: { probeId: "brief_vs_continuous_force" },
      support: { kind: "none" },
      alone: { choiceId: "stays_constant_after_force", correct: true },
      later: "not tested yet",
    });
  });
});
