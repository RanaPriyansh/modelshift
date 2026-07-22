import { describe, expect, it } from "vitest";

import { PRIMARY_SOURCE_REASONING_WORLD } from "../worlds";
import {
  createInitialPrimarySourceState,
  transitionPrimarySourceWorld,
  type PrimarySourceWorldEvent,
} from "../../worlds/primary-source-reasoning";
import { primarySourceWorldRuntimeAdapter } from "./primary-source";
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
      kind: "forge.runtime.bounded-attempt",
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
        constructPreserving: true,
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
});
