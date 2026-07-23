import "server-only";

import { deepFreeze } from "../deep-freeze";

/**
 * This is intentionally not the FORGE event journal. Its aggregate and event
 * names are fixture-only so the accepted world_run|world_package envelope and
 * readers retain their closed vocabulary unchanged.
 */
export const PILOT_FIXTURE_EVENT_SCHEMA_VERSION = "pilot-authority-fixture-event.v1" as const;
export const PILOT_FIXTURE_AGGREGATE_TYPE = "pilot_authority_fixture" as const;

const EVENT_KINDS = [
  "candidate-recorded",
  "review-recorded",
  "publication-recorded",
  "entitlement-revoked",
  "candidate-withdrawn",
  "candidate-incident-held",
  "candidate-tombstoned",
] as const;
export type PilotFixtureEventKind = (typeof EVENT_KINDS)[number];

export interface PilotFixtureJournalEventV1 {
  readonly schemaVersion: typeof PILOT_FIXTURE_EVENT_SCHEMA_VERSION;
  readonly eventId: string;
  readonly aggregate: Readonly<{
    type: typeof PILOT_FIXTURE_AGGREGATE_TYPE;
    id: string;
    tenantId: string;
  }>;
  readonly sequence: number;
  readonly occurredAt: string;
  readonly kind: PilotFixtureEventKind;
  readonly payload: Readonly<{
    candidateId: string | null;
    entitlementId: string | null;
    referenceId: string;
    reasonCode: string | null;
  }>;
}

export type PilotFixtureJournalRejectReason =
  | "untrusted_event"
  | "malformed_event"
  | "unknown_aggregate"
  | "unknown_event"
  | "duplicate_event"
  | "out_of_order"
  | "cross_tenant"
  | "stale_event"
  | "terminal_state";

export type PilotFixtureJournalReplay =
  | Readonly<{
      ok: true;
      events: readonly PilotFixtureJournalEventV1[];
      state: PilotFixtureJournalState;
    }>
  | Readonly<{
      ok: false;
      failedIndex: number;
      reason: PilotFixtureJournalRejectReason;
      state: PilotFixtureJournalState;
    }>;

export interface PilotFixtureJournalState {
  readonly tenantId: string | null;
  readonly aggregateId: string | null;
  readonly lastSequence: number;
  readonly lastOccurredAt: string | null;
  readonly candidateIds: readonly string[];
  readonly reviewedCandidateIds: readonly string[];
  readonly reviewReferenceIds: readonly string[];
  readonly publicationReferenceIds: readonly string[];
  readonly revokedEntitlementIds: readonly string[];
  readonly withdrawnCandidateIds: readonly string[];
  readonly incidentHeldCandidateIds: readonly string[];
  readonly tombstonedCandidateIds: readonly string[];
}

const EVENTS = new WeakSet<object>();
const ID = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

type OwnDataRecord = Readonly<Record<string, unknown>>;

function recordOf(value: unknown, expectedKeys: readonly string[]): OwnDataRecord | null {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return null;
    const keys = Reflect.ownKeys(value);
    if (keys.length !== expectedKeys.length || keys.some((key) => typeof key !== "string" || !expectedKeys.includes(key))) return null;
    const output: Record<string, unknown> = {};
    for (const key of expectedKeys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor) || descriptor.get || descriptor.set) return null;
      output[key] = descriptor.value;
    }
    return output;
  } catch {
    return null;
  }
}

function arrayOf(value: unknown): readonly unknown[] | null {
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > 256) return null;
    const output: unknown[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !("value" in descriptor) || descriptor.get || descriptor.set) return null;
      output.push(descriptor.value);
    }
    return output;
  } catch {
    return null;
  }
}

function idOf(value: unknown): string | null {
  return typeof value === "string" && value.length <= 160 && ID.test(value) ? value : null;
}

function timestampOf(value: unknown): string | null {
  if (typeof value !== "string" || !TIMESTAMP.test(value)) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value ? value : null;
}

function nullableId(value: unknown): string | null | undefined {
  return value === null ? null : idOf(value) ?? undefined;
}

function parseEvent(value: unknown): PilotFixtureJournalEventV1 | null {
  const record = recordOf(value, ["schemaVersion", "eventId", "aggregate", "sequence", "occurredAt", "kind", "payload"]);
  if (!record || record.schemaVersion !== PILOT_FIXTURE_EVENT_SCHEMA_VERSION || typeof record.kind !== "string" || !EVENT_KINDS.includes(record.kind as PilotFixtureEventKind)) return null;
  const eventId = idOf(record.eventId);
  const aggregateRecord = recordOf(record.aggregate, ["type", "id", "tenantId"]);
  const aggregateId = aggregateRecord ? idOf(aggregateRecord.id) : null;
  const tenantId = aggregateRecord ? idOf(aggregateRecord.tenantId) : null;
  const sequence = record.sequence;
  if (!eventId || !aggregateRecord || aggregateRecord.type !== PILOT_FIXTURE_AGGREGATE_TYPE || !aggregateId || !tenantId || typeof sequence !== "number" || !Number.isInteger(sequence) || sequence < 1 || sequence > 10_000) return null;
  const occurredAt = timestampOf(record.occurredAt);
  const payload = recordOf(record.payload, ["candidateId", "entitlementId", "referenceId", "reasonCode"]);
  const candidateId = payload ? nullableId(payload.candidateId) : undefined;
  const entitlementId = payload ? nullableId(payload.entitlementId) : undefined;
  const referenceId = payload ? idOf(payload.referenceId) : null;
  const reasonCode = payload ? nullableId(payload.reasonCode) : undefined;
  if (!occurredAt || candidateId === undefined || entitlementId === undefined || !referenceId || reasonCode === undefined) return null;
  const kind = record.kind as PilotFixtureEventKind;
  const needsCandidate = kind !== "entitlement-revoked";
  if ((needsCandidate && candidateId === null) || (!needsCandidate && entitlementId === null) || ((kind === "candidate-withdrawn" || kind === "candidate-incident-held" || kind === "candidate-tombstoned" || kind === "entitlement-revoked") && reasonCode === null)) return null;
  return deepFreeze({
    schemaVersion: PILOT_FIXTURE_EVENT_SCHEMA_VERSION,
    eventId,
    aggregate: deepFreeze({ type: PILOT_FIXTURE_AGGREGATE_TYPE, id: aggregateId, tenantId }),
    sequence,
    occurredAt,
    kind,
    payload: deepFreeze({ candidateId, entitlementId, referenceId, reasonCode }),
  });
}

/** Test-only event issuance. JSON, cloned, or hand-branded values cannot replay. */
export function testOnlyMintPilotFixtureJournalEvent(value: unknown): PilotFixtureJournalEventV1 | null {
  const event = parseEvent(value);
  if (event) EVENTS.add(event);
  return event;
}

export function emptyPilotFixtureJournalState(): PilotFixtureJournalState {
  return deepFreeze({
    tenantId: null,
    aggregateId: null,
    lastSequence: 0,
    lastOccurredAt: null,
    candidateIds: [],
    reviewedCandidateIds: [],
    reviewReferenceIds: [],
    publicationReferenceIds: [],
    revokedEntitlementIds: [],
    withdrawnCandidateIds: [],
    incidentHeldCandidateIds: [],
    tombstonedCandidateIds: [],
  });
}

function withState(state: PilotFixtureJournalState, patch: Partial<PilotFixtureJournalState>): PilotFixtureJournalState {
  return deepFreeze({ ...state, ...patch });
}

function contains(values: readonly string[], value: string | null): boolean {
  return value !== null && values.includes(value);
}

function terminal(state: PilotFixtureJournalState, candidateId: string | null): boolean {
  return contains(state.withdrawnCandidateIds, candidateId) || contains(state.incidentHeldCandidateIds, candidateId) || contains(state.tombstonedCandidateIds, candidateId);
}

function appendUnique(values: readonly string[], value: string): readonly string[] {
  return values.includes(value) ? values : [...values, value].sort();
}

function appendEvent(state: PilotFixtureJournalState, event: PilotFixtureJournalEventV1): PilotFixtureJournalState | PilotFixtureJournalRejectReason {
  const candidateId = event.payload.candidateId;
  if (event.kind !== "candidate-recorded" && event.kind !== "entitlement-revoked" && terminal(state, candidateId)) return "terminal_state";
  const base = { tenantId: event.aggregate.tenantId, aggregateId: event.aggregate.id, lastSequence: event.sequence, lastOccurredAt: event.occurredAt };
  switch (event.kind) {
    case "candidate-recorded":
      if (terminal(state, candidateId) || contains(state.candidateIds, candidateId)) return "terminal_state";
      return withState(state, { ...base, candidateIds: appendUnique(state.candidateIds, candidateId!) });
    case "review-recorded":
      if (!contains(state.candidateIds, candidateId)) return "out_of_order";
      return withState(state, {
        ...base,
        reviewedCandidateIds: appendUnique(state.reviewedCandidateIds, candidateId!),
        reviewReferenceIds: appendUnique(state.reviewReferenceIds, event.payload.referenceId),
      });
    case "publication-recorded":
      if (!contains(state.candidateIds, candidateId) || !contains(state.reviewedCandidateIds, candidateId)) return "out_of_order";
      return withState(state, { ...base, publicationReferenceIds: appendUnique(state.publicationReferenceIds, event.payload.referenceId) });
    case "entitlement-revoked":
      return withState(state, { ...base, revokedEntitlementIds: appendUnique(state.revokedEntitlementIds, event.payload.entitlementId!) });
    case "candidate-withdrawn":
      if (!contains(state.candidateIds, candidateId)) return "out_of_order";
      return withState(state, { ...base, withdrawnCandidateIds: appendUnique(state.withdrawnCandidateIds, candidateId!) });
    case "candidate-incident-held":
      if (!contains(state.candidateIds, candidateId)) return "out_of_order";
      return withState(state, { ...base, incidentHeldCandidateIds: appendUnique(state.incidentHeldCandidateIds, candidateId!) });
    case "candidate-tombstoned":
      if (!contains(state.candidateIds, candidateId)) return "out_of_order";
      return withState(state, { ...base, tombstonedCandidateIds: appendUnique(state.tombstonedCandidateIds, candidateId!) });
  }
}

/** Deterministic reader for only sealed fixture events; it never writes the accepted journal. */
export function replayPilotFixtureJournal(value: unknown): PilotFixtureJournalReplay {
  const values = arrayOf(value);
  let state = emptyPilotFixtureJournalState();
  if (!values) return deepFreeze({ ok: false, failedIndex: 0, reason: "malformed_event", state });
  const accepted: PilotFixtureJournalEventV1[] = [];
  const eventIds = new Set<string>();
  for (let index = 0; index < values.length; index += 1) {
    const event = values[index];
    if (!EVENTS.has(event as object)) return deepFreeze({ ok: false, failedIndex: index, reason: "untrusted_event", state });
    const parsed = event as PilotFixtureJournalEventV1;
    if (parsed.aggregate.type !== PILOT_FIXTURE_AGGREGATE_TYPE) return deepFreeze({ ok: false, failedIndex: index, reason: "unknown_aggregate", state });
    if (!EVENT_KINDS.includes(parsed.kind)) return deepFreeze({ ok: false, failedIndex: index, reason: "unknown_event", state });
    if (eventIds.has(parsed.eventId)) return deepFreeze({ ok: false, failedIndex: index, reason: "duplicate_event", state });
    if (state.tenantId !== null && parsed.aggregate.tenantId !== state.tenantId) return deepFreeze({ ok: false, failedIndex: index, reason: "cross_tenant", state });
    if (state.aggregateId !== null && parsed.aggregate.id !== state.aggregateId) return deepFreeze({ ok: false, failedIndex: index, reason: "unknown_aggregate", state });
    if (parsed.sequence !== state.lastSequence + 1) return deepFreeze({ ok: false, failedIndex: index, reason: "out_of_order", state });
    if (state.lastOccurredAt !== null && Date.parse(parsed.occurredAt) < Date.parse(state.lastOccurredAt)) return deepFreeze({ ok: false, failedIndex: index, reason: "stale_event", state });
    const next = appendEvent(state, parsed);
    if (typeof next === "string") return deepFreeze({ ok: false, failedIndex: index, reason: next, state });
    state = next;
    accepted.push(parsed);
    eventIds.add(parsed.eventId);
  }
  return deepFreeze({ ok: true, events: accepted, state });
}

/** Models the old accepted reader's closed aggregate vocabulary without importing or changing it. */
export function readAcceptedForgeJournalAggregate(value: unknown): Readonly<{ accepted: false; reason: "unknown_aggregate" }> {
  void value;
  return deepFreeze({ accepted: false, reason: "unknown_aggregate" });
}

export function isFixturePilotJournalEvent(value: unknown): value is PilotFixtureJournalEventV1 {
  return typeof value === "object" && value !== null && EVENTS.has(value);
}
