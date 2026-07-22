import { z } from "zod";

import {
  ADR001_FORGE_EVENT_SCHEMA_VERSION,
  FORGE_EVENT_SCHEMA_VERSION,
  FORGE_EVENT_SCHEMA_VERSIONS,
  canonicalJson,
  forgeEventSchema,
  parseForgeEvent,
  verifyForgeEventIntegrity,
  type ForgeEvent,
  type ForgeEventSchemaVersion,
  type ForgeV2Event,
} from "./events";

export const FORGE_EVENT_JOURNAL_FORMAT = "forge-event-journal" as const;
export const FORGE_EVENT_JOURNAL_VERSION = 1 as const;
export const MAX_LOCAL_JOURNAL_EVENTS = 10_000;

export type WorldRunStatus =
  | "active"
  | "paused"
  | "proof_submitted"
  | "evidence_recorded"
  | "completed";

export interface WorldRunProjection {
  readonly aggregate_type: "world_run";
  readonly aggregate_id: string;
  readonly version: number;
  readonly correlation_id: string;
  readonly last_event_id: string;
  readonly status: WorldRunStatus;
  readonly world_id: string;
  readonly world_version: string;
  readonly content_version: string;
  readonly package_integrity_hash: string;
  readonly proof_authority: "honour_based" | "server_enforced" | "human_observed";
  readonly attempt_event_ids: readonly string[];
  readonly assistance_event_ids: readonly string[];
  readonly proof_event_id: string | null;
  readonly evidence: {
    readonly event_id: string;
    readonly evidence_id: string;
    readonly result: "proved" | "not_proved" | "open_question";
  } | null;
  readonly completion_event_id: string | null;
  readonly corrected_event_ids: readonly string[];
  readonly corrections: ReadonlyArray<{
    readonly event_id: string;
    readonly supersedes_event_id: string;
    readonly reason_code: string;
    readonly correction_reference: string;
  }>;
}

export interface Adr001WorldRunProjection {
  readonly schema_version: 2;
  readonly aggregate_type: "world_run";
  readonly aggregate_id: string;
  readonly version: number;
  readonly correlation_id: string;
  readonly last_event_id: string;
  readonly status: WorldRunStatus;
  readonly world_id: string;
  readonly world_version: string;
  readonly content_version: string;
  readonly package_integrity_hash: string;
  readonly validator_id: string;
  readonly validator_version: string;
  readonly proof_authority: "honour_based" | "server_enforced" | "human_observed";
  readonly assistance_event_ids: readonly string[];
  readonly proof_event_id: string | null;
  readonly evidence: {
    readonly event_id: string;
    readonly evidence_id: string;
    readonly disposition: "demonstrated" | "not_demonstrated" | "open_question" | "not_evaluated" | "invalidated";
    readonly validator_outcome: "pass" | "fail" | "inconclusive" | "not_scored";
  } | null;
  readonly completion_event_id: string | null;
  readonly corrected_event_ids: readonly string[];
  readonly corrections: ReadonlyArray<{
    readonly event_id: string;
    readonly supersedes_event_id: string;
    readonly correction_id: string;
    readonly replacement_disposition: "demonstrated" | "not_demonstrated" | "open_question" | "not_evaluated" | "invalidated";
  }>;
}

export interface WorldPackageProjection {
  readonly aggregate_type: "world_package";
  readonly aggregate_id: string;
  readonly version: number;
  readonly correlation_id: string;
  readonly last_event_id: string;
  readonly status: "published" | "disabled" | "superseded";
  readonly world_id: string;
  readonly world_version: string;
  readonly content_version: string;
  readonly bundle_integrity_hash: string;
  readonly published_event_id: string;
  readonly disabled_reason_code: string | null;
  readonly successor_version: string | null;
  readonly successor_bundle_integrity_hash: string | null;
}

export type ForgeAggregateProjection = WorldRunProjection | Adr001WorldRunProjection | WorldPackageProjection;

export const FORGE_JOURNAL_REJECTION_CODES = [
  "invalid_event",
  "integrity_mismatch",
  "event_id_collision",
  "idempotency_collision",
  "aggregate_version_conflict",
  "correlation_mismatch",
  "causation_mismatch",
  "forbidden_transition",
  "aggregate_identity_mismatch",
  "invalid_event_reference",
  "schema_version_mismatch",
] as const;

export type ForgeJournalRejectionCode = (typeof FORGE_JOURNAL_REJECTION_CODES)[number];

export type ForgeJournalAppendResult =
  | {
      readonly accepted: true;
      readonly disposition: "appended" | "duplicate";
      readonly event: ForgeEvent;
      readonly projection: ForgeAggregateProjection;
    }
  | {
      readonly accepted: false;
      readonly reason: ForgeJournalRejectionCode;
      readonly message: string;
    };

export type ForgeJournalReplayResult =
  | { readonly ok: true; readonly journal: ForgeEventJournal }
  | {
      readonly ok: false;
      readonly journal: ForgeEventJournal;
      readonly failed_index: number;
      readonly reason: ForgeJournalRejectionCode;
      readonly message: string;
    };

export type ForgeEventJournalDecodeStatus =
  | "empty"
  | "ok"
  | "reset_unknown_version"
  | "reset_malformed"
  | "reset_tampered"
  | "reset_invalid_sequence";

export interface ForgeEventJournalDecodeResult {
  readonly status: ForgeEventJournalDecodeStatus;
  readonly journal: ForgeEventJournal;
}

const persistedJournalSchema = z.strictObject({
  format: z.literal(FORGE_EVENT_JOURNAL_FORMAT),
  journal_version: z.literal(FORGE_EVENT_JOURNAL_VERSION),
  event_schema_version: z.union(FORGE_EVENT_SCHEMA_VERSIONS.map((version) => z.literal(version)) as [z.ZodLiteral<1>, z.ZodLiteral<2>]),
  events: z.array(z.unknown()).max(MAX_LOCAL_JOURNAL_EVENTS),
});

function aggregateKey(event: ForgeEvent): string {
  return `${event.aggregate.type}:${event.aggregate.id}`;
}

function reject(reason: ForgeJournalRejectionCode, message: string): ForgeJournalAppendResult {
  return { accepted: false, reason, message };
}

export class ForgeEventJournal {
  readonly #events: ForgeEvent[] = [];
  readonly #eventsById = new Map<string, ForgeEvent>();
  readonly #eventsByIdempotencyKey = new Map<string, ForgeEvent>();
  readonly #eventsByAggregate = new Map<string, ForgeEvent[]>();
  readonly #projections = new Map<string, ForgeAggregateProjection>();
  #eventSchemaVersion: ForgeEventSchemaVersion | null;

  constructor(options: { readonly eventSchemaVersion?: ForgeEventSchemaVersion } = {}) {
    this.#eventSchemaVersion = options.eventSchemaVersion ?? null;
  }

  get size(): number {
    return this.#events.length;
  }

  get eventSchemaVersion(): ForgeEventSchemaVersion | null {
    return this.#eventSchemaVersion;
  }

  events(): readonly ForgeEvent[] {
    return Object.freeze([...this.#events]);
  }

  projection(aggregateType: ForgeEvent["aggregate"]["type"], aggregateId: string): ForgeAggregateProjection | undefined {
    return this.#projections.get(`${aggregateType}:${aggregateId}`);
  }

  projections(): readonly ForgeAggregateProjection[] {
    return Object.freeze([...this.#projections.values()]);
  }

  async append(value: unknown): Promise<ForgeJournalAppendResult> {
    const parsed = forgeEventSchema.safeParse(value);
    if (!parsed.success) return reject("invalid_event", "The event does not match the strict FORGE envelope.");
    const event = parseForgeEvent(parsed.data);
    if (!(await verifyForgeEventIntegrity(event))) {
      return reject("integrity_mismatch", "The event SHA-256 integrity hash does not match its canonical envelope.");
    }
    if (this.#eventSchemaVersion !== null && event.schema_version !== this.#eventSchemaVersion) {
      return reject("schema_version_mismatch", "A journal cannot mix version 1 and ADR-001 version 2 events.");
    }

    const priorForIdempotency = this.#eventsByIdempotencyKey.get(event.idempotency_key);
    if (priorForIdempotency) {
      if (canonicalJson(priorForIdempotency) !== canonicalJson(event)) {
        return reject("idempotency_collision", "The idempotency key was already used for a different event.");
      }
      const projection = this.#projections.get(aggregateKey(event));
      if (!projection) return reject("invalid_event_reference", "The duplicate event has no aggregate projection.");
      return { accepted: true, disposition: "duplicate", event: priorForIdempotency, projection };
    }

    const priorForEventId = this.#eventsById.get(event.event_id);
    if (priorForEventId) {
      return reject("event_id_collision", "The event ID was already used with a different idempotency key.");
    }

    const key = aggregateKey(event);
    const aggregateEvents = this.#eventsByAggregate.get(key) ?? [];
    const projection = this.#projections.get(key);
    const sequencingIssue = validateSequence(event, aggregateEvents, projection);
    if (sequencingIssue) return sequencingIssue;

    const transition = projectEvent(projection, event, aggregateEvents);
    if (!transition.ok) return reject(transition.reason, transition.message);

    this.#events.push(event);
    this.#eventsById.set(event.event_id, event);
    this.#eventsByIdempotencyKey.set(event.idempotency_key, event);
    this.#eventsByAggregate.set(key, [...aggregateEvents, event]);
    this.#projections.set(key, deepFreeze(transition.projection));
    this.#eventSchemaVersion ??= event.schema_version;

    return { accepted: true, disposition: "appended", event, projection: transition.projection };
  }
}

function validateSequence(
  event: ForgeEvent,
  aggregateEvents: readonly ForgeEvent[],
  projection: ForgeAggregateProjection | undefined,
): Extract<ForgeJournalAppendResult, { accepted: false }> | null {
  const expectedVersion = aggregateEvents.length + 1;
  if (event.aggregate.version !== expectedVersion) {
    return reject(
      "aggregate_version_conflict",
      `Aggregate version ${event.aggregate.version} does not follow ${expectedVersion - 1}.`,
    ) as Extract<ForgeJournalAppendResult, { accepted: false }>;
  }

  const prior = aggregateEvents.at(-1);
  if (!prior) {
    if (event.causation_id !== null) {
      return reject("causation_mismatch", "The first aggregate event cannot have a cause.") as Extract<
        ForgeJournalAppendResult,
        { accepted: false }
      >;
    }
    return null;
  }

  if (!projection || event.correlation_id !== projection.correlation_id) {
    return reject("correlation_mismatch", "All events in one aggregate must preserve the correlation ID.") as Extract<
      ForgeJournalAppendResult,
      { accepted: false }
    >;
  }
  if (event.causation_id !== prior.event_id) {
    return reject("causation_mismatch", "An aggregate event must be caused by its immediately preceding event.") as Extract<
      ForgeJournalAppendResult,
      { accepted: false }
    >;
  }
  return null;
}

type ProjectionTransition =
  | { readonly ok: true; readonly projection: ForgeAggregateProjection }
  | { readonly ok: false; readonly reason: ForgeJournalRejectionCode; readonly message: string };

function projectEvent(
  current: ForgeAggregateProjection | undefined,
  event: ForgeEvent,
  aggregateEvents: readonly ForgeEvent[],
): ProjectionTransition {
  return event.aggregate.type === "world_run"
    ? projectWorldRunEvent(current, event, aggregateEvents)
    : projectWorldPackageEvent(current, event);
}

function projectWorldRunEvent(
  current: ForgeAggregateProjection | undefined,
  event: ForgeEvent,
  aggregateEvents: readonly ForgeEvent[],
): ProjectionTransition {
  if (event.schema_version === ADR001_FORGE_EVENT_SCHEMA_VERSION) {
    return projectAdr001WorldRunEvent(current, event, aggregateEvents);
  }
  if (current && "schema_version" in current) {
    return { ok: false, reason: "schema_version_mismatch", message: "A v1 run cannot follow an ADR-001 run." };
  }
  if (!current) {
    if (event.event_type !== "world_run.started") {
      return { ok: false, reason: "forbidden_transition", message: "A world run must begin with world_run.started." };
    }
    return {
      ok: true,
      projection: {
        aggregate_type: "world_run",
        aggregate_id: event.aggregate.id,
        version: event.aggregate.version,
        correlation_id: event.correlation_id,
        last_event_id: event.event_id,
        status: "active",
        world_id: event.payload.world_id,
        world_version: event.payload.world_version,
        content_version: event.payload.content_version,
        package_integrity_hash: event.payload.package_integrity_hash,
        proof_authority: event.payload.proof_authority,
        attempt_event_ids: [],
        assistance_event_ids: [],
        proof_event_id: null,
        evidence: null,
        completion_event_id: null,
        corrected_event_ids: [],
        corrections: [],
      },
    };
  }
  if (current.aggregate_type !== "world_run") {
    return { ok: false, reason: "aggregate_identity_mismatch", message: "Aggregate type changed during replay." };
  }

  const base = { ...current, version: event.aggregate.version, last_event_id: event.event_id };
  switch (event.event_type) {
    case "world_run.started":
    case "world_package.published":
    case "world_package.disabled":
    case "world_package.superseded":
      return { ok: false, reason: "forbidden_transition", message: `${event.event_type} is not valid for an existing run.` };
    case "attempt.committed":
      if (current.status !== "active") return forbiddenFrom(current.status, event.event_type);
      return { ok: true, projection: { ...base, attempt_event_ids: [...current.attempt_event_ids, event.event_id] } };
    case "assistance.recorded":
      if (current.status !== "active") return forbiddenFrom(current.status, event.event_type);
      return { ok: true, projection: { ...base, assistance_event_ids: [...current.assistance_event_ids, event.event_id] } };
    case "world_run.paused":
      if (current.status !== "active") return forbiddenFrom(current.status, event.event_type);
      return { ok: true, projection: { ...base, status: "paused" } };
    case "world_run.resumed":
      if (current.status !== "paused") return forbiddenFrom(current.status, event.event_type);
      return { ok: true, projection: { ...base, status: "active" } };
    case "proof.submitted":
      if (current.status !== "active") return forbiddenFrom(current.status, event.event_type);
      return { ok: true, projection: { ...base, status: "proof_submitted", proof_event_id: event.event_id } };
    case "evidence.recorded": {
      if (current.status !== "proof_submitted") return forbiddenFrom(current.status, event.event_type);
      const assistanceIds = new Set(current.assistance_event_ids);
      if (event.payload.assistance_event_ids.some((eventId) => !assistanceIds.has(eventId))) {
        return {
          ok: false,
          reason: "invalid_event_reference",
          message: "Evidence may reference only assistance events recorded in the same run.",
        };
      }
      const started = aggregateEvents[0];
      if (
        started?.event_type !== "world_run.started" ||
        event.payload.validator_id !== started.payload.validator_id ||
        event.payload.validator_version !== started.payload.validator_version
      ) {
        return {
          ok: false,
          reason: "aggregate_identity_mismatch",
          message: "Evidence validator identity must match the version pinned when the run started.",
        };
      }
      return {
        ok: true,
        projection: {
          ...base,
          status: "evidence_recorded",
          evidence: {
            event_id: event.event_id,
            evidence_id: event.payload.evidence_id,
            result: event.payload.result,
          },
        },
      };
    }
    case "world_run.completed":
      if (current.status !== "evidence_recorded" || !current.evidence) return forbiddenFrom(current.status, event.event_type);
      if (event.payload.evidence_id !== current.evidence.evidence_id || event.payload.result !== current.evidence.result) {
        return {
          ok: false,
          reason: "invalid_event_reference",
          message: "Run completion must reference the recorded evidence and preserve its bounded result.",
        };
      }
      return { ok: true, projection: { ...base, status: "completed", completion_event_id: event.event_id } };
    case "world_run.corrected": {
      if (current.status !== "completed") return forbiddenFrom(current.status, event.event_type);
      const target = aggregateEvents.find((candidate) => candidate.event_id === event.payload.supersedes_event_id);
      if (!target || target.event_type === "world_run.corrected") {
        return {
          ok: false,
          reason: "invalid_event_reference",
          message: "A correction must reference an earlier non-correction event in the same run.",
        };
      }
      if (current.corrected_event_ids.includes(target.event_id)) {
        return {
          ok: false,
          reason: "invalid_event_reference",
          message: "An event already has a correction; append a correction to the latest correction instead.",
        };
      }
      return {
        ok: true,
        projection: {
          ...base,
          corrected_event_ids: [...current.corrected_event_ids, target.event_id],
          corrections: [
            ...current.corrections,
            {
              event_id: event.event_id,
              supersedes_event_id: event.payload.supersedes_event_id,
              reason_code: event.payload.reason_code,
              correction_reference: event.payload.correction_reference,
            },
          ],
        },
      };
    }
  }
}

function isAdr001WorldRunProjection(value: ForgeAggregateProjection): value is Adr001WorldRunProjection {
  return value.aggregate_type === "world_run" && "schema_version" in value && value.schema_version === ADR001_FORGE_EVENT_SCHEMA_VERSION;
}

type Adr001StartedEvent = Extract<ForgeV2Event, { readonly event_type: "world_run.started" }>;
type Adr001ProofEvent = Extract<ForgeV2Event, { readonly event_type: "proof.submitted" }>;

function adr001StartedEvent(events: readonly ForgeEvent[]): Adr001StartedEvent | null {
  const started = events[0];
  return started
    && started.schema_version === ADR001_FORGE_EVENT_SCHEMA_VERSION
    && started.event_type === "world_run.started"
    ? started
    : null;
}

function adr001ProofEvent(events: readonly ForgeEvent[]): Adr001ProofEvent | null {
  const proof = events.find(
    (event): event is Adr001ProofEvent =>
      event.schema_version === ADR001_FORGE_EVENT_SCHEMA_VERSION && event.event_type === "proof.submitted",
  );
  return proof ?? null;
}

function sameReferences(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value) => right.includes(value));
}

function projectAdr001WorldRunEvent(
  current: ForgeAggregateProjection | undefined,
  event: ForgeV2Event,
  aggregateEvents: readonly ForgeEvent[],
): ProjectionTransition {
  if (!current) {
    if (event.event_type !== "world_run.started") {
      return { ok: false, reason: "forbidden_transition", message: "An ADR-001 world run must begin with world_run.started." };
    }
    return {
      ok: true,
      projection: {
        schema_version: ADR001_FORGE_EVENT_SCHEMA_VERSION,
        aggregate_type: "world_run",
        aggregate_id: event.aggregate.id,
        version: event.aggregate.version,
        correlation_id: event.correlation_id,
        last_event_id: event.event_id,
        status: "active",
        world_id: event.payload.world_id,
        world_version: event.payload.world_version,
        content_version: event.payload.content_version,
        package_integrity_hash: event.payload.package_integrity_hash,
        validator_id: event.payload.validator_id,
        validator_version: event.payload.validator_version,
        proof_authority: event.payload.proof_authority,
        assistance_event_ids: [],
        proof_event_id: null,
        evidence: null,
        completion_event_id: null,
        corrected_event_ids: [],
        corrections: [],
      },
    };
  }
  if (!isAdr001WorldRunProjection(current)) {
    return { ok: false, reason: "schema_version_mismatch", message: "An ADR-001 event cannot follow a version 1 aggregate." };
  }

  const base = { ...current, version: event.aggregate.version, last_event_id: event.event_id };
  switch (event.event_type) {
    case "world_run.started":
    case "world_package.published":
    case "world_package.disabled":
    case "world_package.superseded":
      return { ok: false, reason: "forbidden_transition", message: `${event.event_type} is not valid for an existing run.` };
    case "attempt.committed":
      if (current.status !== "active") return forbiddenFrom(current.status, event.event_type);
      return { ok: true, projection: base };
    case "assistance.recorded":
      if (current.status !== "active") return forbiddenFrom(current.status, event.event_type);
      return { ok: true, projection: { ...base, assistance_event_ids: [...current.assistance_event_ids, event.event_id] } };
    case "world_run.paused":
      if (current.status !== "active") return forbiddenFrom(current.status, event.event_type);
      return { ok: true, projection: { ...base, status: "paused" } };
    case "world_run.resumed":
      if (current.status !== "paused") return forbiddenFrom(current.status, event.event_type);
      return { ok: true, projection: { ...base, status: "active" } };
    case "proof.submitted":
      if (current.status !== "active") return forbiddenFrom(current.status, event.event_type);
      {
        const started = adr001StartedEvent(aggregateEvents);
        if (
          !started
          || event.payload.task_id !== started.payload.task_id
          || event.payload.task_version !== started.payload.task_version
          || event.payload.task_family_id !== started.payload.task_family_id
          || event.payload.representation_id !== started.payload.representation_id
          || event.payload.context_id !== started.payload.context_id
        ) {
          return {
            ok: false,
            reason: "aggregate_identity_mismatch",
            message: "ADR-001 proof task, representation, and context facts must match the run start.",
          };
        }
      }
      return { ok: true, projection: { ...base, status: "proof_submitted", proof_event_id: event.event_id } };
    case "evidence.recorded": {
      if (current.status !== "proof_submitted") return forbiddenFrom(current.status, event.event_type);
      if (!sameReferences(event.payload.cognitive_support_event_ids, current.assistance_event_ids)) {
        return {
          ok: false,
          reason: "invalid_event_reference",
          message: "ADR-001 evidence must reference every and only cognitive support event recorded in the same run.",
        };
      }
      const started = adr001StartedEvent(aggregateEvents);
      const proof = adr001ProofEvent(aggregateEvents);
      if (
        !started
        || !proof
        || event.payload.validator_id !== started.payload.validator_id
        || event.payload.validator_version !== started.payload.validator_version
        || event.payload.proof_authority !== started.payload.proof_authority
        || event.payload.task_id !== started.payload.task_id
        || event.payload.task_version !== started.payload.task_version
        || event.payload.task_family_id !== started.payload.task_family_id
        || event.payload.representation_id !== started.payload.representation_id
        || event.payload.context_id !== started.payload.context_id
        || event.payload.task_id !== proof.payload.task_id
        || event.payload.task_version !== proof.payload.task_version
        || event.payload.task_family_id !== proof.payload.task_family_id
        || event.payload.representation_id !== proof.payload.representation_id
        || event.payload.context_id !== proof.payload.context_id
        || event.payload.response_digest !== proof.payload.response_digest
        || event.payload.explicit_uncertainty !== proof.payload.explicit_uncertainty
        || !sameReferences(
          event.payload.access_accommodations.map((accommodation) => accommodation.accommodation_id),
          proof.payload.access_accommodations.map((accommodation) => accommodation.accommodation_id),
        )
        || canonicalJson(event.payload.access_accommodations) !== canonicalJson(proof.payload.access_accommodations)
        || event.payload.source_provenance_status !== started.payload.source_provenance_status
        || canonicalJson(event.payload.source_bindings) !== canonicalJson(started.payload.source_bindings)
      ) {
        return {
          ok: false,
          reason: "aggregate_identity_mismatch",
          message: "ADR-001 evidence must preserve the validator, task, proof, access, and source facts pinned by the run.",
        };
      }
      if (
        event.payload.disposition === "demonstrated"
        && aggregateEvents.some(
          (candidate) =>
            candidate.schema_version === ADR001_FORGE_EVENT_SCHEMA_VERSION
            && candidate.event_type === "assistance.recorded"
            && candidate.payload.protected_operation_overlap > 0,
        )
      ) {
        return {
          ok: false,
          reason: "invalid_event_reference",
          message: "Demonstrated evidence cannot follow cognitive support that overlaps a protected operation.",
        };
      }
      return {
        ok: true,
        projection: {
          ...base,
          status: "evidence_recorded",
          evidence: {
            event_id: event.event_id,
            evidence_id: event.payload.evidence_id,
            disposition: event.payload.disposition,
            validator_outcome: event.payload.validator_outcome,
          },
        },
      };
    }
    case "world_run.completed":
      if (current.status !== "evidence_recorded" || !current.evidence) return forbiddenFrom(current.status, event.event_type);
      if (
        event.payload.evidence_id !== current.evidence.evidence_id
        || event.payload.disposition !== current.evidence.disposition
      ) {
        return {
          ok: false,
          reason: "invalid_event_reference",
          message: "ADR-001 completion must reference the recorded evidence and preserve its disposition.",
        };
      }
      return { ok: true, projection: { ...base, status: "completed", completion_event_id: event.event_id } };
    case "world_run.corrected": {
      if (current.status !== "completed") return forbiddenFrom(current.status, event.event_type);
      if (event.actor.type !== "validator" && event.actor.type !== "human") {
        return {
          ok: false,
          reason: "invalid_event",
          message: "ADR-001 corrections require a validator or human actor.",
        };
      }
      const target = aggregateEvents.find((candidate) => candidate.event_id === event.payload.supersedes_event_id);
      if (!target || target.schema_version !== ADR001_FORGE_EVENT_SCHEMA_VERSION || target.event_type !== "evidence.recorded") {
        return {
          ok: false,
          reason: "invalid_event_reference",
          message: "ADR-001 corrections must supersede an earlier evidence event in the same run.",
        };
      }
      if (current.corrected_event_ids.includes(target.event_id)) {
        return {
          ok: false,
          reason: "invalid_event_reference",
          message: "An evidence event already has an ADR-001 correction.",
        };
      }
      return {
        ok: true,
        projection: {
          ...base,
          corrected_event_ids: [...current.corrected_event_ids, target.event_id],
          corrections: [
            ...current.corrections,
            {
              event_id: event.event_id,
              supersedes_event_id: event.payload.supersedes_event_id,
              correction_id: event.payload.correction_id,
              replacement_disposition: event.payload.replacement_disposition,
            },
          ],
        },
      };
    }
  }
}

function projectWorldPackageEvent(
  current: ForgeAggregateProjection | undefined,
  event: ForgeEvent,
): ProjectionTransition {
  if (event.schema_version !== FORGE_EVENT_SCHEMA_VERSION) {
    return {
      ok: false,
      reason: "invalid_event",
      message: "ADR-001 runtime projection does not create world-package events.",
    };
  }
  if (!current) {
    if (event.event_type !== "world_package.published") {
      return {
        ok: false,
        reason: "forbidden_transition",
        message: "A package release must begin with world_package.published.",
      };
    }
    return {
      ok: true,
      projection: {
        aggregate_type: "world_package",
        aggregate_id: event.aggregate.id,
        version: event.aggregate.version,
        correlation_id: event.correlation_id,
        last_event_id: event.event_id,
        status: "published",
        world_id: event.payload.world_id,
        world_version: event.payload.world_version,
        content_version: event.payload.content_version,
        bundle_integrity_hash: event.payload.bundle_integrity_hash,
        published_event_id: event.event_id,
        disabled_reason_code: null,
        successor_version: null,
        successor_bundle_integrity_hash: null,
      },
    };
  }
  if (current.aggregate_type !== "world_package") {
    return { ok: false, reason: "aggregate_identity_mismatch", message: "Aggregate type changed during replay." };
  }
  if (event.event_type !== "world_package.disabled" && event.event_type !== "world_package.superseded") {
    return forbiddenFrom(current.status, event.event_type);
  }
  if (current.status !== "published") return forbiddenFrom(current.status, event.event_type);
  if (event.payload.world_id !== current.world_id || event.payload.world_version !== current.world_version) {
    return {
      ok: false,
      reason: "aggregate_identity_mismatch",
      message: "Package lifecycle events must preserve the published world ID and version.",
    };
  }

  const base = { ...current, version: event.aggregate.version, last_event_id: event.event_id };
  if (event.event_type === "world_package.disabled") {
    return {
      ok: true,
      projection: { ...base, status: "disabled", disabled_reason_code: event.payload.reason_code },
    };
  }
  if (compareSemver(event.payload.successor_version, current.world_version) <= 0) {
    return {
      ok: false,
      reason: "forbidden_transition",
      message: "A successor package version must be greater than the published version.",
    };
  }
  return {
    ok: true,
    projection: {
      ...base,
      status: "superseded",
      successor_version: event.payload.successor_version,
      successor_bundle_integrity_hash: event.payload.successor_bundle_integrity_hash,
    },
  };
}

function forbiddenFrom(status: string, eventType: ForgeEvent["event_type"]): ProjectionTransition {
  return {
    ok: false,
    reason: "forbidden_transition",
    message: `${eventType} is forbidden while the aggregate is ${status}.`,
  };
}

function compareSemver(left: string, right: string): number {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    const difference = leftParts[index] - rightParts[index];
    if (difference !== 0) return difference;
  }
  return 0;
}

export async function replayForgeEvents(
  events: readonly unknown[],
  options: { readonly eventSchemaVersion?: ForgeEventSchemaVersion } = {},
): Promise<ForgeJournalReplayResult> {
  const journal = new ForgeEventJournal(options);
  for (let index = 0; index < events.length; index += 1) {
    const result = await journal.append(events[index]);
    if (!result.accepted) {
      return { ok: false, journal, failed_index: index, reason: result.reason, message: result.message };
    }
    if (result.disposition === "duplicate") {
      return {
        ok: false,
        journal,
        failed_index: index,
        reason: "idempotency_collision",
        message: "A persisted journal cannot contain duplicate physical event rows.",
      };
    }
  }
  return { ok: true, journal };
}

export function encodeForgeEventJournal(journal: ForgeEventJournal): string {
  return canonicalJson({
    format: FORGE_EVENT_JOURNAL_FORMAT,
    journal_version: FORGE_EVENT_JOURNAL_VERSION,
    event_schema_version: journal.eventSchemaVersion ?? FORGE_EVENT_SCHEMA_VERSION,
    events: journal.events(),
  });
}

export async function decodeForgeEventJournal(raw: string | null): Promise<ForgeEventJournalDecodeResult> {
  if (raw === null || raw.trim() === "") return { status: "empty", journal: new ForgeEventJournal() };

  let candidate: unknown;
  try {
    candidate = JSON.parse(raw);
  } catch {
    return { status: "reset_malformed", journal: new ForgeEventJournal() };
  }

  if (
    typeof candidate !== "object" ||
    candidate === null ||
    !("journal_version" in candidate) ||
    !("event_schema_version" in candidate) ||
    candidate.journal_version !== FORGE_EVENT_JOURNAL_VERSION ||
    !FORGE_EVENT_SCHEMA_VERSIONS.includes(candidate.event_schema_version as ForgeEventSchemaVersion)
  ) {
    return { status: "reset_unknown_version", journal: new ForgeEventJournal() };
  }

  const persisted = persistedJournalSchema.safeParse(candidate);
  if (!persisted.success) return { status: "reset_malformed", journal: new ForgeEventJournal() };

  const replay = await replayForgeEvents(persisted.data.events, {
    eventSchemaVersion: persisted.data.event_schema_version,
  });
  if (replay.ok) return { status: "ok", journal: replay.journal };
  if (replay.reason === "integrity_mismatch") {
    return { status: "reset_tampered", journal: new ForgeEventJournal() };
  }
  if (replay.reason === "invalid_event") {
    return { status: "reset_malformed", journal: new ForgeEventJournal() };
  }
  return { status: "reset_invalid_sequence", journal: new ForgeEventJournal() };
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}
