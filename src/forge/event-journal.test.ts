import { describe, expect, it } from "vitest";

import {
  ForgeEventJournal,
  decodeForgeEventJournal,
  encodeForgeEventJournal,
  replayForgeEvents,
} from "./event-journal";
import { sealForgeEvent, type ForgeEvent, type ForgeEventType } from "./events";

const DIGEST_A = `sha256:${"a".repeat(64)}`;
const DIGEST_B = `sha256:${"b".repeat(64)}`;
const DIGEST_C = `sha256:${"c".repeat(64)}`;
let eventSequence = 100;

function uuid(sequence = eventSequence++): string {
  return `00000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`;
}

interface EventOverrides {
  readonly aggregate_version?: number;
  readonly causation_id?: string | null;
  readonly correlation_id?: string;
  readonly event_id?: string;
  readonly idempotency_key?: string;
}

function aggregateBuilder(aggregateType: "world_run" | "world_package", aggregateId: string, correlationId: string) {
  const events: ForgeEvent[] = [];
  return {
    events,
    async next(eventType: ForgeEventType, payload: unknown, overrides: EventOverrides = {}): Promise<ForgeEvent> {
      const prior = events.at(-1);
      const eventId = overrides.event_id ?? uuid();
      const version = overrides.aggregate_version ?? events.length + 1;
      const event = await sealForgeEvent({
        event_id: eventId,
        event_type: eventType,
        schema_version: 1,
        aggregate: { type: aggregateType, id: aggregateId, version },
        actor: { type: aggregateType === "world_run" ? "learner" : "system", id: "actor.fixture.001" },
        authority: { policy_version: "policy.2026.07", consent_grant_ids: ["consent.fixture.001"] },
        occurred_at: "2026-07-22T08:00:00.000Z",
        recorded_at: "2026-07-22T08:00:01.000Z",
        correlation_id: overrides.correlation_id ?? correlationId,
        causation_id:
          "causation_id" in overrides ? overrides.causation_id : prior?.event_id ?? null,
        idempotency_key: overrides.idempotency_key ?? `idempotency.fixture.${eventId}`,
        payload,
      });
      events.push(event);
      return event;
    },
  };
}

const startedPayload = {
  world_id: "world.force-and-motion",
  world_version: "1.0.0",
  content_version: "1.0.0",
  capability_id: "capability.inertia",
  proof_claim_id: "proof.inertia.transfer",
  validator_id: "validator.inertia.v1",
  validator_version: "1.0.0",
  package_integrity_hash: DIGEST_A,
  assistance_mode: "hints_only",
  source_ids: ["source.newton.first-law"],
  proof_authority: "server_enforced",
} as const;

const attemptPayload = {
  phase: "initial",
  stage_id: "stage.prediction",
  selection_ids: ["choice.keeps-moving"],
  response_digest: null,
  explicit_uncertainty: false,
} as const;

const assistancePayload = {
  assistance_id: "assistance.attention.001",
  stage_id: "stage.experiment",
  kind: "attention-cue",
  source: "authored",
  content_reference: "cue.compare-velocity",
  policy_decision: "allowed",
  protected_operation_overlap: 0,
} as const;

const proofPayload = {
  task_id: "task.transfer.001",
  task_version: "1.0.0",
  transfer_family_id: "transfer.graph-to-story",
  selection_ids: ["choice.constant-velocity"],
  response_digest: DIGEST_B,
  assistance_access: "removed",
  proof_nonce_digest: DIGEST_C,
} as const;

async function completedRun() {
  const builder = aggregateBuilder("world_run", "run.complete.001", "correlation.run.complete.001");
  const started = await builder.next("world_run.started", startedPayload);
  const attempt = await builder.next("attempt.committed", attemptPayload);
  const assistance = await builder.next("assistance.recorded", assistancePayload);
  const paused = await builder.next("world_run.paused", {
    stage_id: "stage.experiment",
    reason_code: "learner.break",
  });
  const resumed = await builder.next("world_run.resumed", { stage_id: "stage.experiment" });
  const proof = await builder.next("proof.submitted", proofPayload);
  const evidence = await builder.next("evidence.recorded", {
    evidence_id: "evidence.inertia.001",
    result: "proved",
    validator_id: startedPayload.validator_id,
    validator_version: startedPayload.validator_version,
    source_ids: startedPayload.source_ids,
    assistance_event_ids: [assistance.event_id],
    remains_untested: ["retention.delayed"],
  });
  const completed = await builder.next("world_run.completed", {
    result: "proved",
    evidence_id: "evidence.inertia.001",
    next_review_at: "2026-08-22T08:00:00.000Z",
  });
  return { builder, started, attempt, assistance, paused, resumed, proof, evidence, completed };
}

describe("FORGE append-only event journal", () => {
  it("replays a complete run to the same deterministic projection", async () => {
    const fixture = await completedRun();
    const journal = new ForgeEventJournal();

    for (const event of fixture.builder.events) {
      const result = await journal.append(event);
      expect(result).toMatchObject({ accepted: true, disposition: "appended" });
    }

    const projection = journal.projection("world_run", "run.complete.001");
    expect(projection).toMatchObject({
      aggregate_type: "world_run",
      version: 8,
      status: "completed",
      world_version: "1.0.0",
      proof_authority: "server_enforced",
      attempt_event_ids: [fixture.attempt.event_id],
      assistance_event_ids: [fixture.assistance.event_id],
      proof_event_id: fixture.proof.event_id,
      completion_event_id: fixture.completed.event_id,
      evidence: { event_id: fixture.evidence.event_id, evidence_id: "evidence.inertia.001", result: "proved" },
    });

    const replay = await replayForgeEvents(journal.events());
    expect(replay.ok).toBe(true);
    if (replay.ok) {
      expect(replay.journal.projections()).toEqual(journal.projections());
      expect(replay.journal.events()).toEqual(journal.events());
    }
    expect(Object.isFrozen(journal.events())).toBe(true);
    expect(Object.isFrozen(journal.events()[0])).toBe(true);
    expect(Object.isFrozen(projection)).toBe(true);
  });

  it("treats an exact idempotent retry as a no-op and rejects both collision classes", async () => {
    const builder = aggregateBuilder("world_run", "run.idempotency.001", "correlation.run.idempotency.001");
    const started = await builder.next("world_run.started", startedPayload);
    const journal = new ForgeEventJournal();

    await expect(journal.append(started)).resolves.toMatchObject({ accepted: true, disposition: "appended" });
    await expect(journal.append(started)).resolves.toMatchObject({ accepted: true, disposition: "duplicate" });
    expect(journal.size).toBe(1);

    const unsigned = Object.fromEntries(
      Object.entries(started).filter(([key]) => key !== "integrity_hash"),
    );
    const reusedIdempotency = await sealForgeEvent({ ...unsigned, event_id: uuid() });
    await expect(journal.append(reusedIdempotency)).resolves.toMatchObject({
      accepted: false,
      reason: "idempotency_collision",
    });

    const reusedEventId = await sealForgeEvent({
      ...unsigned,
      idempotency_key: "idempotency.fixture.different-key",
    });
    await expect(journal.append(reusedEventId)).resolves.toMatchObject({ accepted: false, reason: "event_id_collision" });
    expect(journal.size).toBe(1);
  });

  it("rejects version gaps, correlation changes, and non-linear causation", async () => {
    const journal = new ForgeEventJournal();
    const builder = aggregateBuilder("world_run", "run.sequence.001", "correlation.run.sequence.001");
    const started = await builder.next("world_run.started", startedPayload);
    await journal.append(started);

    const gap = await builder.next("attempt.committed", attemptPayload, { aggregate_version: 3 });
    await expect(journal.append(gap)).resolves.toMatchObject({ accepted: false, reason: "aggregate_version_conflict" });

    const changedCorrelationBuilder = aggregateBuilder(
      "world_run",
      "run.changed-correlation.001",
      "correlation.run.changed.001",
    );
    const first = await changedCorrelationBuilder.next("world_run.started", startedPayload);
    const changedCorrelation = await changedCorrelationBuilder.next("attempt.committed", attemptPayload, {
      correlation_id: "correlation.illegal.change",
    });
    const changedCorrelationJournal = new ForgeEventJournal();
    await changedCorrelationJournal.append(first);
    await expect(changedCorrelationJournal.append(changedCorrelation)).resolves.toMatchObject({
      accepted: false,
      reason: "correlation_mismatch",
    });

    const causationBuilder = aggregateBuilder("world_run", "run.causation.001", "correlation.run.causation.001");
    const causeFirst = await causationBuilder.next("world_run.started", startedPayload);
    const wrongCause = await causationBuilder.next("attempt.committed", attemptPayload, { causation_id: uuid() });
    const causationJournal = new ForgeEventJournal();
    await causationJournal.append(causeFirst);
    await expect(causationJournal.append(wrongCause)).resolves.toMatchObject({
      accepted: false,
      reason: "causation_mismatch",
    });
  });

  it("rejects out-of-order proof and support transitions", async () => {
    const builder = aggregateBuilder("world_run", "run.transitions.001", "correlation.run.transitions.001");
    const started = await builder.next("world_run.started", startedPayload);
    const evidenceBeforeProof = await builder.next("evidence.recorded", {
      evidence_id: "evidence.invalid.001",
      result: "proved",
      validator_id: startedPayload.validator_id,
      validator_version: startedPayload.validator_version,
      source_ids: [],
      assistance_event_ids: [],
      remains_untested: [],
    });
    const journal = new ForgeEventJournal();
    await journal.append(started);
    await expect(journal.append(evidenceBeforeProof)).resolves.toMatchObject({
      accepted: false,
      reason: "forbidden_transition",
    });

    const proofBuilder = aggregateBuilder("world_run", "run.no-support.001", "correlation.run.no-support.001");
    const proofStart = await proofBuilder.next("world_run.started", startedPayload);
    const proof = await proofBuilder.next("proof.submitted", proofPayload);
    const lateAssistance = await proofBuilder.next("assistance.recorded", assistancePayload);
    const proofJournal = new ForgeEventJournal();
    await proofJournal.append(proofStart);
    await proofJournal.append(proof);
    await expect(proofJournal.append(lateAssistance)).resolves.toMatchObject({
      accepted: false,
      reason: "forbidden_transition",
    });
  });

  it("binds evidence to the pinned validator and same-run assistance", async () => {
    const unknownSupportBuilder = aggregateBuilder(
      "world_run",
      "run.evidence-reference.001",
      "correlation.run.evidence-reference.001",
    );
    const start = await unknownSupportBuilder.next("world_run.started", startedPayload);
    const proof = await unknownSupportBuilder.next("proof.submitted", proofPayload);
    const evidence = await unknownSupportBuilder.next("evidence.recorded", {
      evidence_id: "evidence.reference.001",
      result: "proved",
      validator_id: startedPayload.validator_id,
      validator_version: startedPayload.validator_version,
      source_ids: [],
      assistance_event_ids: [uuid()],
      remains_untested: [],
    });
    const journal = new ForgeEventJournal();
    await journal.append(start);
    await journal.append(proof);
    await expect(journal.append(evidence)).resolves.toMatchObject({
      accepted: false,
      reason: "invalid_event_reference",
    });

    const validatorBuilder = aggregateBuilder("world_run", "run.validator.001", "correlation.run.validator.001");
    const validatorStart = await validatorBuilder.next("world_run.started", startedPayload);
    const validatorProof = await validatorBuilder.next("proof.submitted", proofPayload);
    const wrongValidator = await validatorBuilder.next("evidence.recorded", {
      evidence_id: "evidence.validator.001",
      result: "not_proved",
      validator_id: "validator.other.v1",
      validator_version: "1.0.0",
      source_ids: [],
      assistance_event_ids: [],
      remains_untested: [],
    });
    const validatorJournal = new ForgeEventJournal();
    await validatorJournal.append(validatorStart);
    await validatorJournal.append(validatorProof);
    await expect(validatorJournal.append(wrongValidator)).resolves.toMatchObject({
      accepted: false,
      reason: "aggregate_identity_mismatch",
    });
  });

  it("appends corrections without rewriting historical events", async () => {
    const fixture = await completedRun();
    const journal = new ForgeEventJournal();
    for (const event of fixture.builder.events) await journal.append(event);
    const originalEvidence = journal.events().find((event) => event.event_id === fixture.evidence.event_id);

    const correction = await fixture.builder.next("world_run.corrected", {
      supersedes_event_id: fixture.evidence.event_id,
      reason_code: "validator.rule-revised",
      correction_reference: "review.correction.001",
    });
    await expect(journal.append(correction)).resolves.toMatchObject({ accepted: true, disposition: "appended" });

    expect(journal.events().find((event) => event.event_id === fixture.evidence.event_id)).toBe(originalEvidence);
    expect(journal.projection("world_run", "run.complete.001")).toMatchObject({
      status: "completed",
      corrected_event_ids: [fixture.evidence.event_id],
      corrections: [{ event_id: correction.event_id, supersedes_event_id: fixture.evidence.event_id }],
    });

    const duplicateCorrection = await fixture.builder.next("world_run.corrected", {
      supersedes_event_id: fixture.evidence.event_id,
      reason_code: "validator.rule-revised-again",
      correction_reference: "review.correction.002",
    });
    await expect(journal.append(duplicateCorrection)).resolves.toMatchObject({
      accepted: false,
      reason: "invalid_event_reference",
    });
  });

  it("preserves disabled and superseded package history during replay", async () => {
    const oldRelease = aggregateBuilder("world_package", "package.motion.1-0-0", "correlation.package.motion.1-0-0");
    const oldPublished = await oldRelease.next("world_package.published", {
      world_id: "world.force-and-motion",
      world_version: "1.0.0",
      content_version: "1.0.0",
      bundle_integrity_hash: DIGEST_A,
    });
    const superseded = await oldRelease.next("world_package.superseded", {
      world_id: "world.force-and-motion",
      world_version: "1.0.0",
      successor_version: "2.0.0",
      successor_bundle_integrity_hash: DIGEST_B,
    });

    const newRelease = aggregateBuilder("world_package", "package.motion.2-0-0", "correlation.package.motion.2-0-0");
    const newPublished = await newRelease.next("world_package.published", {
      world_id: "world.force-and-motion",
      world_version: "2.0.0",
      content_version: "2.0.0",
      bundle_integrity_hash: DIGEST_B,
    });
    const disabledRelease = aggregateBuilder(
      "world_package",
      "package.archived.1-0-0",
      "correlation.package.archived.1-0-0",
    );
    const disabledPublished = await disabledRelease.next("world_package.published", {
      world_id: "world.archived-example",
      world_version: "1.0.0",
      content_version: "1.0.0",
      bundle_integrity_hash: DIGEST_C,
    });
    const disabled = await disabledRelease.next("world_package.disabled", {
      world_id: "world.archived-example",
      world_version: "1.0.0",
      reason_code: "safety.review-required",
    });

    const replay = await replayForgeEvents([
      oldPublished,
      newPublished,
      disabledPublished,
      superseded,
      disabled,
    ]);
    expect(replay.ok).toBe(true);
    if (!replay.ok) return;
    expect(replay.journal.projection("world_package", "package.motion.1-0-0")).toMatchObject({
      status: "superseded",
      world_version: "1.0.0",
      successor_version: "2.0.0",
    });
    expect(replay.journal.projection("world_package", "package.motion.2-0-0")).toMatchObject({
      status: "published",
      world_version: "2.0.0",
    });
    expect(replay.journal.projection("world_package", "package.archived.1-0-0")).toMatchObject({
      status: "disabled",
      disabled_reason_code: "safety.review-required",
    });
  });

  it("recovers local persistence fail-closed across malformed, tampered, and invalid sequences", async () => {
    const builder = aggregateBuilder("world_run", "run.persistence.001", "correlation.run.persistence.001");
    const started = await builder.next("world_run.started", startedPayload);
    const journal = new ForgeEventJournal();
    await journal.append(started);

    await expect(decodeForgeEventJournal(null)).resolves.toMatchObject({ status: "empty", journal: { size: 0 } });
    await expect(decodeForgeEventJournal(encodeForgeEventJournal(journal))).resolves.toMatchObject({
      status: "ok",
      journal: { size: 1 },
    });
    await expect(decodeForgeEventJournal("{not-json")).resolves.toMatchObject({
      status: "reset_malformed",
      journal: { size: 0 },
    });
    await expect(
      decodeForgeEventJournal(
        JSON.stringify({
          format: "forge-event-journal",
          journal_version: 2,
          event_schema_version: 1,
          events: [],
        }),
      ),
    ).resolves.toMatchObject({ status: "reset_unknown_version", journal: { size: 0 } });

    const tampered = structuredClone(started);
    if (tampered.event_type !== "world_run.started") throw new Error("fixture type changed");
    tampered.payload.world_version = "9.0.0";
    await expect(
      decodeForgeEventJournal(
        JSON.stringify({
          format: "forge-event-journal",
          journal_version: 1,
          event_schema_version: 1,
          events: [tampered],
        }),
      ),
    ).resolves.toMatchObject({ status: "reset_tampered", journal: { size: 0 } });

    await expect(
      decodeForgeEventJournal(
        JSON.stringify({
          format: "forge-event-journal",
          journal_version: 1,
          event_schema_version: 1,
          events: [started, started],
        }),
      ),
    ).resolves.toMatchObject({ status: "reset_invalid_sequence", journal: { size: 0 } });
  });
});
