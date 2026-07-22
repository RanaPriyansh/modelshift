import { describe, expect, it } from "vitest";

import { PRIMARY_SOURCE_REASONING_WORLD } from "../worlds";
import { evaluatePathwayReviewPacket } from "../pathways";
import {
  createInitialPrimarySourceState,
  transitionPrimarySourceWorld,
  validatePrimarySourceTransfer,
  type PrimarySourceWorldEvent,
} from "../../worlds/primary-source-reasoning";
import {
  primarySourceWorldRuntimeAdapter,
  projectPrimarySourceTransferValidation,
} from "./primary-source";
import type { CanonicalValidatorProjection, WorldRuntimeAdapter } from "./protocol";
import { createWorldRuntimeSession, dispatchWorldRuntimeCommand } from "./runtime";

const WORKED_ASSIGNMENTS = [
  ["philadelphia-visible-detail", "observation"],
  ["philadelphia-catalog-fact", "catalog_fact"],
  ["philadelphia-purpose-inference", "inference"],
  ["philadelphia-open-question", "open_question"],
] as const;

const TRANSFER_ASSIGNMENTS = [
  ["washington-visible-detail", "observation"],
  ["washington-catalog-fact", "catalog_fact"],
  ["washington-relationship-inference", "inference"],
  ["washington-open-question", "open_question"],
] as const;

function completeToProof(events: PrimarySourceWorldEvent[] = []): PrimarySourceWorldEvent[] {
  return [
    { type: "COMMIT_INITIAL", choiceId: "visible_detail", confidence: 70 },
    { type: "COMMIT_EXPLANATION", explanation: "Another viewer can verify the visible details before making a larger historical claim." },
    { type: "ACCEPT_INTERPRETATIONS", response: "accepted" },
    { type: "COMMIT_TEST_PREDICTION", predictionId: "catalog_distinguishes_evidence_layers" },
    { type: "OPEN_CATALOG" },
    ...WORKED_ASSIGNMENTS.map(([statementId, category]) => ({ type: "SET_WORKED_ASSIGNMENT" as const, statementId, category })),
    ...events,
    { type: "SUBMIT_WORKED_TEST" },
    {
      type: "SUBMIT_RECONSTRUCTION",
      choiceId: "layers_bound_claims",
      reconstruction: "I will keep each historical claim inside the evidence layer that can actually establish it.",
    },
    { type: "ACKNOWLEDGE_WITHDRAWAL" },
  ];
}

function transferEvent(): PrimarySourceWorldEvent {
  return {
    type: "SUBMIT_TRANSFER",
    confidence: 85,
    explanation: "The photograph, the catalog, an inference, and the unanswered question each have different evidence limits.",
  };
}

describe("Primary Source World runtime adapter", () => {
  it("is reducer-equivalent and emits a bounded local receipt from the domain validator", () => {
    let domainState = createInitialPrimarySourceState();
    let runtime = createWorldRuntimeSession(primarySourceWorldRuntimeAdapter);
    const events = [
      ...completeToProof([{ type: "REQUEST_SUPPORT" }]),
      ...TRANSFER_ASSIGNMENTS.map(([statementId, category]) => ({ type: "SET_TRANSFER_ASSIGNMENT" as const, statementId, category })),
      transferEvent(),
    ];

    for (const event of events) {
      const domain = transitionPrimarySourceWorld(domainState, event);
      expect(domain.accepted).toBe(true);
      if (!domain.accepted) return;
      domainState = domain.state;

      const dispatched = dispatchWorldRuntimeCommand(primarySourceWorldRuntimeAdapter, runtime, { kind: "domain", event });
      expect(dispatched.accepted).toBe(true);
      if (!dispatched.accepted) return;
      runtime = dispatched.session;
      expect(runtime.state).toEqual(domainState);
    }

    expect(runtime.phase).toBe("bounded_result");
    expect(runtime.state.proof).toEqual(domainState.proof);
    expect(runtime.cognitiveSupport).toEqual([
      expect.objectContaining({ stage: "governed_support", source: "authored", tier: "attention" }),
    ]);
    expect(runtime.receipt).toMatchObject({
      kind: "forge.runtime.bounded-local-attempt",
      authority: {
        proofAuthority: "honour_based",
        persistence: "not_persisted",
        isDurable: false,
      },
      world: {
        id: "world.primary-source-reasoning",
        proofClaimId: "proof.primary-source-reasoning.independent-transfer",
        taskFamilyId: "task-family.primary-source-reasoning.cold-transfer.v1",
      },
      validator: {
        id: "validator.primary-source-reasoning-transfer.v1",
        outcome: "pass",
        disposition: "demonstrated",
      },
      sourceProvenanceStatus: "incomplete",
      responseDigest: null,
    });
    expect(runtime.receipt?.authority.limitation).toMatch(/not server-enforced, durable, tamper-resistant/i);
    expect(runtime.receipt?.sourceBindings.map((binding) => binding.sourceItemId)).toEqual(
      PRIMARY_SOURCE_REASONING_WORLD.manifest.sources.map((source) => source.id),
    );
    expect(runtime.receipt?.sourceBindings.every((binding) => binding.sourceSnapshotDigest === null)).toBe(true);
    expect(JSON.stringify(runtime.receipt)).not.toContain("The photograph, the catalog");
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
    expect(runtime.receipt?.protocol.semanticTrace).toEqual(runtime.semanticTrace);
    expect(runtime.semanticTrace).not.toContain("return_or_apply");
    const packetCOutcome = evaluatePathwayReviewPacket(runtime.receipt);
    expect(packetCOutcome.status).toBe("needs-evidence");
    expect(packetCOutcome.issues.map((issue) => issue.code)).toContain("schema.invalid");
  });

  it("projects the authoritative domain validator without prefix inference", () => {
    expect(validatePrimarySourceTransfer({})).toMatchObject({ code: "transfer.invalid", valid: false });
    expect(projectPrimarySourceTransferValidation({})).toEqual({
      outcome: "not_scored",
      criteria: ["The transfer payload did not match the authored four-category task."],
    });
    expect(projectPrimarySourceTransferValidation({
      taskId: "loc.washington-street-1937.transfer",
      assignments: {
        "washington-visible-detail": "observation",
        "washington-catalog-fact": "observation",
        "washington-relationship-inference": "observation",
        "washington-open-question": "observation",
      },
    })).toEqual({
      outcome: "fail",
      criteria: ["On this unfamiliar photograph, the learner distinguished some evidence layers, but the four-part boundary did not yet hold independently."],
    });
  });

  it("derives disposition in the runtime even if an adapter injects an incoherent value", () => {
    type State = { readonly finished: boolean };
    type Event = { readonly type: "FINISH" };
    const maliciousAdapter: WorldRuntimeAdapter<State, Event, { readonly attempt: "bounded" }> = {
      pack: primarySourceWorldRuntimeAdapter.pack,
      createInitialState: () => ({ finished: false }),
      reduce: () => ({ accepted: true, state: { finished: true } }),
      phase: (state) => state.finished ? "bounded_result" : "learning",
      initialSemanticStage: () => "encounter",
      semanticStages: () => ["bounded_result"],
      stage: (state) => state.finished ? "bounded_result" : "encounter",
      classify: () => "learner_operation",
      supportEvent: () => null,
      proof: (state) => state.finished ? { attempt: "bounded" } : null,
      projectValidator: () => ({
        outcome: "fail",
        criteria: ["criterion.synthetic"],
        disposition: "demonstrated",
      } as unknown as CanonicalValidatorProjection),
      remainsUntested: () => [],
    };
    const submitted = dispatchWorldRuntimeCommand(
      maliciousAdapter,
      createWorldRuntimeSession(maliciousAdapter),
      { kind: "domain", event: { type: "FINISH" } },
    );
    expect(submitted).toMatchObject({
      accepted: true,
      session: { receipt: { validator: { outcome: "fail", disposition: "not_demonstrated" } } },
    });
  });

  it("preserves a stateful rejected domain transition for a retry", () => {
    let domainState = createInitialPrimarySourceState();
    let runtime = createWorldRuntimeSession(primarySourceWorldRuntimeAdapter);
    const setup: PrimarySourceWorldEvent[] = [
      { type: "COMMIT_INITIAL", choiceId: "visible_detail", confidence: 70 },
      { type: "COMMIT_EXPLANATION", explanation: "Another viewer can verify the visible details before making a larger historical claim." },
      { type: "ACCEPT_INTERPRETATIONS", response: "accepted" },
      { type: "COMMIT_TEST_PREDICTION", predictionId: "catalog_distinguishes_evidence_layers" },
      { type: "OPEN_CATALOG" },
      ...WORKED_ASSIGNMENTS.map(([statementId]) => ({ type: "SET_WORKED_ASSIGNMENT" as const, statementId, category: "observation" as const })),
    ];
    for (const event of setup) {
      const domain = transitionPrimarySourceWorld(domainState, event);
      expect(domain.accepted).toBe(true);
      if (!domain.accepted) return;
      domainState = domain.state;
      const dispatched = dispatchWorldRuntimeCommand(primarySourceWorldRuntimeAdapter, runtime, { kind: "domain", event });
      expect(dispatched.accepted).toBe(true);
      if (!dispatched.accepted) return;
      runtime = dispatched.session;
    }

    const attempt: PrimarySourceWorldEvent = { type: "SUBMIT_WORKED_TEST" };
    const rejectedByDomain = transitionPrimarySourceWorld(domainState, attempt);
    expect(rejectedByDomain).toMatchObject({ accepted: false, reason: "classification_mismatch", state: { workedTestAttempts: 1 } });
    const rejectedByRuntime = dispatchWorldRuntimeCommand(primarySourceWorldRuntimeAdapter, runtime, { kind: "domain", event: attempt });
    expect(rejectedByRuntime).toMatchObject({ accepted: false, reason: "domain_rejected", domainReason: "classification_mismatch" });
    if (rejectedByRuntime.accepted || rejectedByDomain.accepted) return;
    expect(rejectedByRuntime.session.state).toEqual(rejectedByDomain.state);
    expect(rejectedByRuntime.session.state.workedTestAttempts).toBe(1);
  });

  it("rejects cognitive help, model actions, and replay in proof while preserving access", () => {
    let runtime = createWorldRuntimeSession(primarySourceWorldRuntimeAdapter);
    for (const event of completeToProof()) {
      const dispatched = dispatchWorldRuntimeCommand(primarySourceWorldRuntimeAdapter, runtime, { kind: "domain", event });
      expect(dispatched.accepted).toBe(true);
      if (!dispatched.accepted) return;
      runtime = dispatched.session;
    }
    expect(runtime.phase).toBe("proof");

    const support = dispatchWorldRuntimeCommand(primarySourceWorldRuntimeAdapter, runtime, {
      kind: "domain",
      event: { type: "REQUEST_SUPPORT" },
    });
    expect(support).toMatchObject({ accepted: false, reason: "proof_action_blocked" });
    if (support.accepted) return;
    runtime = support.session;

    const model = dispatchWorldRuntimeCommand(primarySourceWorldRuntimeAdapter, runtime, {
      kind: "model_action",
      actionId: "action.primary-source.model",
    });
    expect(model).toMatchObject({ accepted: false, reason: "proof_action_blocked" });
    if (model.accepted) return;
    runtime = model.session;

    const replay = dispatchWorldRuntimeCommand(primarySourceWorldRuntimeAdapter, runtime, {
      kind: "experience_replay",
      actionId: "action.primary-source.replay",
    });
    expect(replay).toMatchObject({ accepted: false, reason: "proof_action_blocked" });
    if (replay.accepted) return;
    runtime = replay.session;

    const access = dispatchWorldRuntimeCommand(primarySourceWorldRuntimeAdapter, runtime, {
      kind: "access_accommodation",
      accommodationId: "alternative.primary-source.image-description",
    });
    expect(access).toMatchObject({ accepted: true, effects: ["access_recorded"] });
    if (!access.accepted) return;
    runtime = access.session;
    expect(runtime.accessAccommodations).toEqual([
      {
        accommodationId: "alternative.primary-source.image-description",
        stage: "cold_transfer",
        kind: "text_alternative",
        modality: "textual",
        representation: "text_description",
        constructPreservation: "preserves_construct",
        answerChanging: false,
        policyVersion: "1.0.0",
        nonvisualAlternative: true,
      },
    ]);

    for (const [statementId, category] of TRANSFER_ASSIGNMENTS) {
      const assignment = dispatchWorldRuntimeCommand(primarySourceWorldRuntimeAdapter, runtime, {
        kind: "domain",
        event: { type: "SET_TRANSFER_ASSIGNMENT", statementId, category },
      });
      expect(assignment.accepted).toBe(true);
      if (!assignment.accepted) return;
      runtime = assignment.session;
    }
    const submitted = dispatchWorldRuntimeCommand(primarySourceWorldRuntimeAdapter, runtime, {
      kind: "domain",
      event: transferEvent(),
    });
    expect(submitted.accepted).toBe(true);
    if (!submitted.accepted) return;
    expect(submitted.session.receipt?.protocol.instructionalActionsRejectedDuringProof).toEqual([
      "instructional_support",
      "model_action",
      "experience_replay",
    ]);
    expect(submitted.session.receipt?.accessAccommodations).toHaveLength(1);
  });

  it("validates runtime action IDs and rejects non-preserving accommodations", () => {
    const initial = createWorldRuntimeSession(primarySourceWorldRuntimeAdapter);
    expect(dispatchWorldRuntimeCommand(primarySourceWorldRuntimeAdapter, initial, {
      kind: "model_action",
      actionId: "action.primary-source.unknown-model",
    })).toMatchObject({ accepted: false, reason: "unknown_runtime_action" });
    expect(dispatchWorldRuntimeCommand(primarySourceWorldRuntimeAdapter, initial, {
      kind: "model_action",
      actionId: "action.primary-source.model",
    })).toMatchObject({ accepted: false, reason: "model_action_disallowed" });
    expect(dispatchWorldRuntimeCommand(primarySourceWorldRuntimeAdapter, initial, {
      kind: "experience_replay",
      actionId: "action.primary-source.replay",
    })).toMatchObject({ accepted: false, reason: "runtime_action_unavailable" });

    const nonPreservingAdapter = {
      ...primarySourceWorldRuntimeAdapter,
      pack: {
        ...primarySourceWorldRuntimeAdapter.pack,
        runtime: {
          ...primarySourceWorldRuntimeAdapter.pack.runtime,
          access: {
            ...primarySourceWorldRuntimeAdapter.pack.runtime.access,
            accommodations: primarySourceWorldRuntimeAdapter.pack.runtime.access.accommodations.map((accommodation, index) =>
              index === 0
                ? { ...accommodation, constructPreservation: "changes_construct", answerChanging: true }
                : accommodation,
            ),
          },
        },
      },
    } as typeof primarySourceWorldRuntimeAdapter;
    const rejectedAccess = dispatchWorldRuntimeCommand(
      nonPreservingAdapter,
      createWorldRuntimeSession(nonPreservingAdapter),
      { kind: "access_accommodation", accommodationId: "access.primary-source.text-alternatives" },
    );
    expect(rejectedAccess).toMatchObject({ accepted: false, reason: "access_not_construct_preserving" });
  });
});
