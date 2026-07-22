import { describe, expect, it } from "vitest";

import goldenFixture from "./fixtures/adr001-primary-source-v2.json";
import {
  projectAdr001Correction,
  projectAdr001RuntimeAttempt,
  type Adr001RuntimeProjectionInput,
} from "./adr001-projector";
import { ForgeEventJournal, replayForgeEvents } from "./event-journal";
import { sealForgeEvent } from "./events";
import {
  createWorldRuntimeSession,
  dispatchWorldRuntimeCommand,
  primarySourceWorldRuntimeAdapter,
  type BoundedLocalWorldRuntimeReceipt,
} from "./world-runtime";
import type { PrimarySourceWorldEvent } from "../worlds/primary-source-reasoning";

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

function completedReceipt(): BoundedLocalWorldRuntimeReceipt {
  const events: PrimarySourceWorldEvent[] = [
    { type: "COMMIT_INITIAL", choiceId: "visible_detail", confidence: 70 },
    { type: "COMMIT_EXPLANATION", explanation: "Another viewer can verify the visible details before making a larger historical claim." },
    { type: "ACCEPT_INTERPRETATIONS", response: "accepted" },
    { type: "COMMIT_TEST_PREDICTION", predictionId: "catalog_distinguishes_evidence_layers" },
    { type: "OPEN_CATALOG" },
    ...WORKED_ASSIGNMENTS.map(([statementId, category]) => ({ type: "SET_WORKED_ASSIGNMENT" as const, statementId, category })),
    { type: "REQUEST_SUPPORT" },
    { type: "SUBMIT_WORKED_TEST" },
    {
      type: "SUBMIT_RECONSTRUCTION",
      choiceId: "layers_bound_claims",
      reconstruction: "I will keep each historical claim inside the evidence layer that can actually establish it.",
    },
    { type: "ACKNOWLEDGE_WITHDRAWAL" },
    ...TRANSFER_ASSIGNMENTS.map(([statementId, category]) => ({ type: "SET_TRANSFER_ASSIGNMENT" as const, statementId, category })),
    {
      type: "SUBMIT_TRANSFER",
      confidence: 85,
      explanation: "The photograph, the catalog, an inference, and the unanswered question each have different evidence limits.",
    },
  ];
  let session = createWorldRuntimeSession(primarySourceWorldRuntimeAdapter);
  for (const event of events) {
    const result = dispatchWorldRuntimeCommand(primarySourceWorldRuntimeAdapter, session, { kind: "domain", event });
    expect(result.accepted).toBe(true);
    if (!result.accepted) throw new Error(result.reason);
    session = result.session;
  }
  if (!session.receipt) throw new Error("Expected one completed runtime receipt.");
  return session.receipt;
}

function inputFor(receipt = completedReceipt()): Adr001RuntimeProjectionInput {
  return {
    receipt,
    attempt: {
      taskId: "loc.washington-street-1937.transfer",
      taskVersion: "1.0.0",
      taskFamilyId: "task-family.primary-source-reasoning.cold-transfer.v1",
      representationId: "representation.primary-source.evidence-layer-classification",
      contextId: "context.primary-source.unfamiliar-photograph",
      selectionIds: [
        "washington-catalog-fact",
        "washington-open-question",
        "washington-relationship-inference",
        "washington-visible-detail",
      ],
      responseDigest: null,
      explicitUncertainty: false,
      boundedClaim: "On an unfamiliar photograph, the learner independently classifies one observation, one catalog fact, one inference, and one open question after support is removed.",
    },
    run: {
      aggregateId: "run.primary-source.adr001-fixture",
      correlationId: "correlation.primary-source.adr001-fixture",
      actor: { type: "learner", id: "device.learner.fixture" },
      authority: { policyVersion: "policy.primary-source.runtime.1", consentGrantIds: [] },
      packageIntegrityHash: `sha256:${"a".repeat(64)}`,
      occurredAt: "2026-07-22T12:00:00.000Z",
      recordedAt: "2026-07-22T12:00:01.000Z",
      idempotencyNamespace: "idempotency.adr001.fixture",
      eventIds: {
        started: "10000000-0000-4000-8000-000000000001",
        assistance: ["10000000-0000-4000-8000-000000000002"],
        proof: "10000000-0000-4000-8000-000000000003",
        evidence: "10000000-0000-4000-8000-000000000004",
        completed: "10000000-0000-4000-8000-000000000005",
      },
      supportIds: ["support.primary-source.fixture.001"],
      evidenceId: "evidence.primary-source.fixture",
      proofNonceDigest: null,
      nextReviewAt: null,
    },
    integrity: {
      packageIntegrityMatches: true,
      proofAuthorityMatches: true,
      contaminationReasonCodes: [],
      constructChangingAccommodation: false,
    },
    failWithExplicitUncertaintyIsOpenQuestion: false,
  };
}

function receiptWithOutcome(
  outcome: BoundedLocalWorldRuntimeReceipt["validator"]["outcome"],
): BoundedLocalWorldRuntimeReceipt {
  const receipt = completedReceipt();
  return {
    ...receipt,
    validator: { ...receipt.validator, outcome, criteria: [`criterion.${outcome}`] },
  };
}

describe("ADR-001 runtime attempt projector", () => {
  it("emits the fixed-ID golden v2 event chain without raw learner text or a persistence side effect", async () => {
    const result = await projectAdr001RuntimeAttempt(inputFor());
    expect(result).toMatchObject({ ok: true, evidenceDisposition: "demonstrated" });
    if (!result.ok) return;

    expect(result.events).toEqual(goldenFixture);
    expect(result.events.map((event) => event.event_type)).toEqual([
      "world_run.started",
      "assistance.recorded",
      "proof.submitted",
      "evidence.recorded",
      "world_run.completed",
    ]);
    expect(result.events[3]?.payload).toMatchObject({
      source_provenance_status: "incomplete",
      cognitive_support_event_ids: ["10000000-0000-4000-8000-000000000002"],
      access_accommodation_ids: [],
      proof_authority: "honour_based",
    });
    expect(JSON.stringify(result.events)).not.toContain("The photograph, the catalog");
    expect(JSON.stringify(result.events)).not.toContain("raw_learner_text");
  });

  it.each([
    ["pass", "demonstrated"],
    ["fail", "not_demonstrated"],
    ["inconclusive", "open_question"],
    ["not_scored", "not_evaluated"],
  ] as const)("maps %s to %s", async (outcome, disposition) => {
    const result = await projectAdr001RuntimeAttempt(inputFor(receiptWithOutcome(outcome)));
    expect(result).toMatchObject({ ok: true, evidenceDisposition: disposition });
  });

  it("maps an authored uncertainty exception and integrity failures without strengthening the raw validator outcome", async () => {
    const uncertainty = await projectAdr001RuntimeAttempt({
      ...inputFor(receiptWithOutcome("fail")),
      attempt: { ...inputFor().attempt, explicitUncertainty: true },
      failWithExplicitUncertaintyIsOpenQuestion: true,
    });
    expect(uncertainty).toMatchObject({ ok: true, evidenceDisposition: "open_question" });

    const invalidated = await projectAdr001RuntimeAttempt({
      ...inputFor(),
      integrity: {
        packageIntegrityMatches: true,
        proofAuthorityMatches: true,
        contaminationReasonCodes: ["contamination.model-call"],
        constructChangingAccommodation: false,
      },
    });
    expect(invalidated).toMatchObject({ ok: true, evidenceDisposition: "invalidated" });

    const notEvaluated = await projectAdr001RuntimeAttempt({
      ...inputFor(),
      integrity: {
        packageIntegrityMatches: true,
        proofAuthorityMatches: true,
        contaminationReasonCodes: [],
        constructChangingAccommodation: true,
      },
    });
    expect(notEvaluated).toMatchObject({ ok: true, evidenceDisposition: "not_evaluated" });
  });

  it("is deterministic, replays idempotently, and rejects caller identity collisions", async () => {
    const first = await projectAdr001RuntimeAttempt(inputFor());
    const retry = await projectAdr001RuntimeAttempt(inputFor());
    expect(first).toEqual(retry);
    if (!first.ok) return;

    const journal = new ForgeEventJournal();
    for (const event of first.events) {
      await expect(journal.append(event)).resolves.toMatchObject({ accepted: true, disposition: "appended" });
    }
    for (const event of first.events) {
      await expect(journal.append(event)).resolves.toMatchObject({ accepted: true, disposition: "duplicate" });
    }
    expect(journal.eventSchemaVersion).toBe(2);
    expect(journal.projection("world_run", "run.primary-source.adr001-fixture")).toMatchObject({
      status: "completed",
      evidence: { disposition: "demonstrated", validator_outcome: "pass" },
    });
    await expect(replayForgeEvents(first.events)).resolves.toMatchObject({ ok: true });

    const collision = await projectAdr001RuntimeAttempt({
      ...inputFor(),
      run: {
        ...inputFor().run,
        eventIds: { ...inputFor().run.eventIds, proof: "10000000-0000-4000-8000-000000000001" },
      },
    });
    expect(collision).toMatchObject({ ok: false, code: "duplicate_event_id" });
  });

  it("rejects mixed v1/v2 streams and strict v2 raw-text fields", async () => {
    const projected = await projectAdr001RuntimeAttempt(inputFor());
    if (!projected.ok) return;
    const journal = new ForgeEventJournal();
    await journal.append(projected.events[0]);
    const v1 = await sealForgeEvent({
      event_id: "20000000-0000-4000-8000-000000000001",
      event_type: "world_run.started",
      schema_version: 1,
      aggregate: { type: "world_run", id: "run.legacy.fixture", version: 1 },
      actor: { type: "learner", id: "learner.legacy.fixture" },
      authority: { policy_version: "policy.legacy.1", consent_grant_ids: [] },
      occurred_at: "2026-07-22T12:00:00.000Z",
      recorded_at: "2026-07-22T12:00:01.000Z",
      correlation_id: "correlation.legacy.fixture",
      causation_id: null,
      idempotency_key: "idempotency.legacy.fixture.started",
      payload: {
        world_id: "world.primary-source-reasoning",
        world_version: "1.0.1",
        content_version: "1.0.1",
        capability_id: "capability.historical-literacy.observation-inference",
        proof_claim_id: "proof.primary-source-reasoning.independent-transfer",
        validator_id: "validator.primary-source-reasoning-transfer.v1",
        validator_version: "1.0.0",
        package_integrity_hash: `sha256:${"a".repeat(64)}`,
        assistance_mode: "closed",
        source_ids: ["source.loc.primary-source-analysis"],
        proof_authority: "honour_based",
      },
    });
    await expect(journal.append(v1)).resolves.toMatchObject({ accepted: false, reason: "schema_version_mismatch" });

    const unsigned = structuredClone(projected.events[0]) as unknown as Record<string, unknown> & { payload: Record<string, unknown> };
    delete unsigned.integrity_hash;
    await expect(sealForgeEvent({
      ...unsigned,
      payload: { ...unsigned.payload, raw_learner_text: "The photograph, the catalog, and my own answer." },
    })).rejects.toThrow();
  });

  it("appends a correction without mutating the historical evidence event", async () => {
    const projected = await projectAdr001RuntimeAttempt(inputFor());
    if (!projected.ok) return;
    const correction = await projectAdr001Correction({
      completedEvents: projected.events,
      actor: { type: "validator", id: "validator.primary-source.review.1" },
      authority: { policyVersion: "policy.primary-source.runtime.1", consentGrantIds: [] },
      occurredAt: "2026-07-23T12:00:00.000Z",
      recordedAt: "2026-07-23T12:00:01.000Z",
      eventId: "10000000-0000-4000-8000-000000000006",
      idempotencyKey: "idempotency.adr001.fixture.correction.1",
      correctionId: "correction.primary-source.fixture.001",
      reasonCode: "validator.rule-revised",
      correctionReference: "review.primary-source.fixture.001",
      replacementValidatorOutcome: "inconclusive",
      replacementDisposition: "open_question",
      replacementCriteria: ["criterion.revised"],
    });
    expect(correction).toMatchObject({ ok: true, evidenceDisposition: "open_question" });
    if (!correction.ok) return;

    const journal = new ForgeEventJournal();
    for (const event of projected.events) await journal.append(event);
    const original = journal.events().find((event) => event.event_type === "evidence.recorded");
    await expect(journal.append(correction.events[0])).resolves.toMatchObject({ accepted: true, disposition: "appended" });
    expect(journal.events().find((event) => event.event_type === "evidence.recorded")).toBe(original);
    expect(journal.projection("world_run", "run.primary-source.adr001-fixture")).toMatchObject({
      corrected_event_ids: ["10000000-0000-4000-8000-000000000004"],
      corrections: [{ replacement_disposition: "open_question" }],
    });
  });
});
