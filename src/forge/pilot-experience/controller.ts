import { deepFreeze } from "../deep-freeze";
import { canonicalJson, sha256Digest } from "../events";

/**
 * A fixture-only controller for the W6 adult journey. It deliberately has no
 * route, storage, identity, provider, or evidence-upgrade capability.
 *
 * The caller supplies already-reviewed opaque references. Parsing them here
 * only preserves their identity for replay and matching; it never validates,
 * resolves, issues, or authorizes those references.
 */
export const ADULT_PILOT_EXPERIENCE_SCHEMA_VERSION = "adult-pilot-experience.v1" as const;
export const ADULT_PILOT_EXPERIENCE_STATE_VERSION = "adult-pilot-experience-state.v1" as const;
export const ADULT_PILOT_EXPERIENCE_EVENT_VERSION = "adult-pilot-experience-event.v1" as const;
export const ADULT_PILOT_EXPERIENCE_RECEIPT_VERSION = "adult-pilot-experience-receipt.v1" as const;
export const ADULT_PILOT_EXPERIENCE_CONTROLLER_VERSION = "1.0.0" as const;

export const ADULT_PILOT_STAGES = [
  "intent",
  "map-inspection",
  "map-decision",
  "route-declined",
  "route-review-required",
  "initial-model",
  "readings",
  "separating-operation",
  "reviewed-route",
  "reconstruction",
  "practice",
  "project",
  "critique",
  "individual-defence",
  "support-withdrawal",
  "proof",
  "bounded-result",
  "delayed-return",
  "completed",
] as const;
export type AdultPilotStage = (typeof ADULT_PILOT_STAGES)[number];

export const ADULT_PILOT_ACTION_TYPES = [
  "CAPTURE_INTENT",
  "INSPECT_CANDIDATE_MAP",
  "DECIDE_MAP_PROPOSAL",
  "COMMIT_INITIAL_MODEL",
  "PRESENT_TWO_UNCERTAIN_READINGS",
  "RESPOND_TO_READING",
  "SELECT_SEPARATING_OPERATION",
  "ACTIVATE_REVIEWED_ROUTE",
  "COMMIT_RECONSTRUCTION",
  "COMMIT_PRACTICE",
  "COMMIT_PROJECT",
  "COMMIT_CRITIQUE",
  "COMMIT_INDIVIDUAL_DEFENCE",
  "WITHDRAW_INSTRUCTIONAL_SUPPORT",
  "RECORD_ACCESSIBILITY_CONTROL",
  "SUBMIT_COLD_TRANSFER",
  "RECORD_BOUNDED_RESULT",
  "SCHEDULE_DELAYED_RETURN",
  "RECORD_DELAYED_RETURN",
] as const;
export type AdultPilotActionType = (typeof ADULT_PILOT_ACTION_TYPES)[number];

export const ADULT_PILOT_EVENT_TYPES = [
  "fixture.intent-captured",
  "fixture.candidate-map-inspected",
  "fixture.map-proposal-decided",
  "fixture.initial-model-committed",
  "fixture.two-readings-presented",
  "fixture.reading-responded",
  "fixture.separating-operation-selected",
  "fixture.reviewed-route-activated",
  "fixture.reconstruction-committed",
  "fixture.practice-committed",
  "fixture.project-committed",
  "fixture.critique-committed",
  "fixture.individual-defence-committed",
  "fixture.instructional-support-withdrawn",
  "fixture.accessibility-control-recorded",
  "fixture.cold-transfer-submitted",
  "fixture.bounded-result-recorded",
  "fixture.delayed-return-scheduled",
  "fixture.delayed-return-recorded",
] as const;
export type AdultPilotEventType = (typeof ADULT_PILOT_EVENT_TYPES)[number];

const ACTION_EVENT_TYPES: Readonly<Record<AdultPilotActionType, AdultPilotEventType>> = {
  CAPTURE_INTENT: "fixture.intent-captured",
  INSPECT_CANDIDATE_MAP: "fixture.candidate-map-inspected",
  DECIDE_MAP_PROPOSAL: "fixture.map-proposal-decided",
  COMMIT_INITIAL_MODEL: "fixture.initial-model-committed",
  PRESENT_TWO_UNCERTAIN_READINGS: "fixture.two-readings-presented",
  RESPOND_TO_READING: "fixture.reading-responded",
  SELECT_SEPARATING_OPERATION: "fixture.separating-operation-selected",
  ACTIVATE_REVIEWED_ROUTE: "fixture.reviewed-route-activated",
  COMMIT_RECONSTRUCTION: "fixture.reconstruction-committed",
  COMMIT_PRACTICE: "fixture.practice-committed",
  COMMIT_PROJECT: "fixture.project-committed",
  COMMIT_CRITIQUE: "fixture.critique-committed",
  COMMIT_INDIVIDUAL_DEFENCE: "fixture.individual-defence-committed",
  WITHDRAW_INSTRUCTIONAL_SUPPORT: "fixture.instructional-support-withdrawn",
  RECORD_ACCESSIBILITY_CONTROL: "fixture.accessibility-control-recorded",
  SUBMIT_COLD_TRANSFER: "fixture.cold-transfer-submitted",
  RECORD_BOUNDED_RESULT: "fixture.bounded-result-recorded",
  SCHEDULE_DELAYED_RETURN: "fixture.delayed-return-scheduled",
  RECORD_DELAYED_RETURN: "fixture.delayed-return-recorded",
};

const ID = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const MAX_ID_LENGTH = 160;
const MAX_PROSE_LENGTH = 2_400;
const MILLISECONDS_PER_UTC_DAY = 86_400_000;
const POLLUTION_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const STATE_BRAND = new WeakSet<object>();
const REPLAY_HANDLES = new WeakMap<object, PrivateReplayJournal>();

declare const ADULT_PILOT_REPLAY_HANDLE_BRAND: unique symbol;

type OwnDataRecord = Readonly<Record<string, unknown>>;
type ActionBase = Readonly<{ type: AdultPilotActionType; actionId: string }>;
type MapProposalDecision =
  | Readonly<{ decision: "accept"; consequence: "route-retained" }>
  | Readonly<{ decision: "reject"; consequence: "route-declined" }>
  | Readonly<{ decision: "edit"; consequence: "route-requires-review" }>;

export type ReviewedFixtureRefs = Readonly<{
  schemaVersion: typeof ADULT_PILOT_EXPERIENCE_SCHEMA_VERSION;
  audience: "adult-fixture";
  journeyId: string;
  startedAt: string;
  authorityRef: string;
  capabilityMapRef: string;
  resourceRef: string;
  representationRef: string;
  projectRef: string;
  practiceRef: string;
  worldRuntimeRef: string;
  evidenceContractRef: string;
  reviewedRouteRef: string;
  activeCheckpointRef: string;
  separatingOperationRef: string;
  coldTransferRef: string;
}>;

export type AdultPilotExperienceAction =
  | (ActionBase & Readonly<{ type: "CAPTURE_INTENT"; intentWording: string; practicalOutcomeWording: string }>)
  | (ActionBase & Readonly<{ type: "INSPECT_CANDIDATE_MAP"; mapRef: string; provenance: "authored" | "fixture" | "graph-derived" | "model-proposal"; gapVisibility: "visible" }>)
  | (ActionBase & MapProposalDecision & Readonly<{ type: "DECIDE_MAP_PROPOSAL"; learnerWording: string }>)
  | (ActionBase & Readonly<{ type: "COMMIT_INITIAL_MODEL"; modelKind: "mechanism" | "strategy" | "plan"; learnerWording: string }>)
  | (ActionBase & Readonly<{ type: "PRESENT_TWO_UNCERTAIN_READINGS"; proposer: "authored" | "ai-proposal"; readings: readonly [Readonly<{ id: string; wording: string }>, Readonly<{ id: string; wording: string }>]; pointOfDisagreement: string }>)
  | (ActionBase & Readonly<{ type: "RESPOND_TO_READING"; readingId: string; response: "accept" | "reject" }>)
  | (ActionBase & Readonly<{ type: "RESPOND_TO_READING"; readingId: string; response: "correct"; correctedWording: string }>)
  | (ActionBase & Readonly<{ type: "SELECT_SEPARATING_OPERATION"; selectedOperationRef: string; selectedBy: "learner" }>)
  | (ActionBase & Readonly<{ type: "ACTIVATE_REVIEWED_ROUTE"; routeRef: string; resourceRef: string; activeCheckpointRef: string }>)
  | (ActionBase & Readonly<{ type: "COMMIT_RECONSTRUCTION" | "COMMIT_PRACTICE" | "COMMIT_PROJECT" | "COMMIT_CRITIQUE" | "COMMIT_INDIVIDUAL_DEFENCE"; learnerWording: string }>)
  | (ActionBase & Readonly<{ type: "WITHDRAW_INSTRUCTIONAL_SUPPORT"; withdrawal: "explicit" }>)
  | (ActionBase & Readonly<{ type: "RECORD_ACCESSIBILITY_CONTROL"; control: "captions" | "high-contrast" | "keyboard-navigation" | "magnification" | "screen-reader" | "text-to-speech" }>)
  | (ActionBase & Readonly<{ type: "SUBMIT_COLD_TRANSFER"; transferRef: string; learnerWording: string }>)
  | (ActionBase & Readonly<{ type: "RECORD_BOUNDED_RESULT"; source: "reviewed-fixture-validator"; result: "demonstrated_this_attempt" | "repair_needed" | "untested"; conditionsRef: string }>)
  | (ActionBase & Readonly<{ type: "SCHEDULE_DELAYED_RETURN"; scheduledAt: string; dueAt: string; delayDays: number; dueAttemptId: string }>)
  | (ActionBase & Readonly<{ type: "RECORD_DELAYED_RETURN"; dueAttemptId: string; attemptedAt: string; result: "demonstrated_this_attempt" | "repair_needed" | "untested" }>);

type Workspace = Readonly<{
  intent: Readonly<{ intentWording: string; practicalOutcomeWording: string }> | null;
  map: Readonly<{ mapRef: string; provenance: "authored" | "fixture" | "graph-derived" | "model-proposal"; gapVisibility: "visible"; decision: "accept" | "reject" | "edit"; learnerWording: string; consequence: "route-retained" | "route-declined" | "route-requires-review" }> | null;
  initialModel: Readonly<{ modelKind: "mechanism" | "strategy" | "plan"; learnerWording: string }> | null;
  readings: readonly Readonly<{ id: string; wording: string; response: "accept" | "reject" | "correct" | null }> [];
  pointOfDisagreement: string | null;
  selectedOperationRef: string | null;
  route: Readonly<{ routeRef: string; resourceRef: string; activeCheckpointRef: string }> | null;
  reconstruction: string | null;
  practice: string | null;
  project: string | null;
  critique: string | null;
  individualDefence: string | null;
}>;

export type AdultPilotExperienceState = Readonly<{
  schemaVersion: typeof ADULT_PILOT_EXPERIENCE_STATE_VERSION;
  controllerVersion: typeof ADULT_PILOT_EXPERIENCE_CONTROLLER_VERSION;
  fixture: ReviewedFixtureRefs;
  stage: AdultPilotStage;
  sequence: number;
  seenActionIds: readonly string[];
  workspace: Workspace | null;
  proofBoundary: Readonly<{
    instructionalSupport: "available" | "unmounted";
    solutionBearingState: "available" | "invalidated";
    accessibilityControls: readonly ("captions" | "high-contrast" | "keyboard-navigation" | "magnification" | "screen-reader" | "text-to-speech")[];
  }>;
  boundedResult: Readonly<{
    result: "demonstrated_this_attempt" | "repair_needed" | "untested";
    claimScope: "this-attempt-under-stated-conditions";
    evidenceUpgrade: false;
    capabilityUpgrade: false;
  }> | null;
  delayedReturn: Readonly<{
    scheduledAt: string;
    dueAt: string;
    delayDays: number;
    dueAttemptId: string;
    attemptedAt: string | null;
    result: "demonstrated_this_attempt" | "repair_needed" | "untested" | null;
  }> | null;
}>;

export type AdultPilotCreateResult =
  | Readonly<{ ok: true; state: AdultPilotExperienceState }>
  | Readonly<{ ok: false; reason: "adult-fixture-required" | "invalid-fixture-input" }>;

export type AdultPilotTransition =
  | Readonly<{ accepted: true; state: AdultPilotExperienceState }>
  | Readonly<{ accepted: false; state: AdultPilotExperienceState | null; reason: AdultPilotRejectReason }>;

type InternalAdultPilotTransition =
  | Readonly<{ accepted: true; state: AdultPilotExperienceState; action: AdultPilotExperienceAction }>
  | Readonly<{ accepted: false; state: AdultPilotExperienceState; reason: AdultPilotRejectReason }>;

export type AdultPilotRejectReason =
  | "untrusted-state"
  | "invalid-action"
  | "duplicate-action"
  | "stage-mismatch"
  | "reference-mismatch"
  | "two-readings-required"
  | "reading-response-invalid"
  | "proof-help-forbidden"
  | "invalid-bounded-result"
  | "invalid-delayed-return";

export type AdultPilotExperienceEventV1 = Readonly<{
  schemaVersion: typeof ADULT_PILOT_EXPERIENCE_EVENT_VERSION;
  sequence: number;
  actionId: string;
  eventType: AdultPilotEventType;
  /** Receipt-safe payload. It never contains learner prose or external payloads. */
  receipt: Readonly<Record<string, unknown>>;
  stateDigest: string;
  eventDigest: string;
}>;

/** Opaque process-local capability for replaying the separate receipt-safe event list. */
export type AdultPilotReplayHandle = Readonly<{
  readonly [ADULT_PILOT_REPLAY_HANDLE_BRAND]: "adult-pilot-replay-handle.v1";
}>;

export type AdultPilotExperiencePublicState = Readonly<{
  schemaVersion: typeof ADULT_PILOT_EXPERIENCE_STATE_VERSION;
  controllerVersion: typeof ADULT_PILOT_EXPERIENCE_CONTROLLER_VERSION;
  fixture: Readonly<Record<string, unknown>>;
  stage: AdultPilotStage;
  sequence: number;
  seenActionIds: readonly string[];
  workspace: Readonly<Record<string, unknown>> | null;
  proofBoundary: AdultPilotExperienceState["proofBoundary"];
  boundedResult: AdultPilotExperienceState["boundedResult"];
  delayedReturn: AdultPilotExperienceState["delayedReturn"];
}>;

export type AdultPilotExperienceReceiptV1 = Readonly<{
  schemaVersion: typeof ADULT_PILOT_EXPERIENCE_RECEIPT_VERSION;
  controllerVersion: typeof ADULT_PILOT_EXPERIENCE_CONTROLLER_VERSION;
  journeyId: string;
  stage: AdultPilotStage;
  eventDigests: readonly string[];
  finalStateDigest: string;
  capabilityUpgrade: false;
  evidenceUpgrade: false;
  limitation: "fixture-only-non-authorizing-this-attempt";
}>;

export type AdultPilotExperienceCompilation = Readonly<{
  ok: true;
  state: AdultPilotExperiencePublicState;
  events: readonly AdultPilotExperienceEventV1[];
  receipt: AdultPilotExperienceReceiptV1;
  replayHandle: AdultPilotReplayHandle;
}> | Readonly<{
  ok: false;
  state: AdultPilotExperiencePublicState;
  events: readonly AdultPilotExperienceEventV1[];
  rejectedAt: number;
  reason: AdultPilotRejectReason;
}>;

export type AdultPilotReplayResult = Readonly<{
  ok: true;
  state: AdultPilotExperiencePublicState;
  receipt: AdultPilotExperienceReceiptV1;
}> | Readonly<{
  ok: false;
  state: AdultPilotExperiencePublicState | null;
  index: number;
  reason: "invalid-event" | "invalid-replay-handle" | "replay-handle-mismatch" | "event-receipt-mismatch" | "event-digest-mismatch" | "state-digest-mismatch" | "adult-fixture-required" | "invalid-fixture-input" | AdultPilotRejectReason;
}>;

type PrivateReplayEvent = Readonly<{
  sequence: number;
  actionId: string;
  eventType: AdultPilotEventType;
  action: AdultPilotExperienceAction;
}>;

type PrivateReplayJournal = Readonly<{
  fixtureCanonical: string;
  events: readonly PrivateReplayEvent[];
}>;

function ownDataRecord(value: unknown): OwnDataRecord | null {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return null;
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key !== "string" || POLLUTION_KEYS.has(key))) return null;
    const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of keys as string[]) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor) || descriptor.get || descriptor.set) return null;
      result[key] = descriptor.value;
    }
    return result;
  } catch {
    return null;
  }
}

function ownArray(value: unknown): readonly unknown[] | null {
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return null;
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => key !== "length" && (typeof key !== "string" || !/^(0|[1-9]\d*)$/.test(key)))) return null;
    const result: unknown[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !("value" in descriptor) || descriptor.get || descriptor.set) return null;
      result.push(descriptor.value);
    }
    return result;
  } catch {
    return null;
  }
}

function receiptValue(value: unknown, depth = 0): unknown | undefined {
  if (depth > 16 || value === null || typeof value === "boolean") return depth > 16 ? undefined : value;
  if (typeof value === "string") return value.length <= 4_096 && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value) ? value : undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  const values = ownArray(value);
  if (values) {
    if (values.length > 256) return undefined;
    const parsed = values.map((entry) => receiptValue(entry, depth + 1));
    return parsed.some((entry) => entry === undefined) ? undefined : deepFreeze(parsed);
  }
  const record = ownDataRecord(value);
  if (!record || Object.keys(record).length > 64) return undefined;
  const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const [key, entry] of Object.entries(record)) {
    const parsed = receiptValue(entry, depth + 1);
    if (parsed === undefined) return undefined;
    result[key] = parsed;
  }
  return deepFreeze(result);
}

function receiptRecord(value: unknown): Readonly<Record<string, unknown>> | null {
  const parsed = receiptValue(value);
  return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Readonly<Record<string, unknown>> : null;
}

function hasExactKeys(record: OwnDataRecord, expected: readonly string[]): boolean {
  const actual = Reflect.ownKeys(record);
  return actual.length === expected.length
    && actual.every((key) => typeof key === "string" && expected.includes(key) && !POLLUTION_KEYS.has(key));
}

function opaque(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_ID_LENGTH && value.trim() === value && ID.test(value) ? value : null;
}

function prose(value: unknown): string | null {
  return typeof value === "string" && value.length <= MAX_PROSE_LENGTH && value.trim().length > 0 && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value) ? value : null;
}

function timestamp(value: unknown): string | null {
  if (typeof value !== "string" || !TIMESTAMP.test(value)) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value ? value : null;
}

function exactUtcWholeDayDelay(scheduledAt: string, dueAt: string, delayDays: number): boolean {
  const elapsed = Date.parse(dueAt) - Date.parse(scheduledAt);
  return elapsed > 0 && elapsed % MILLISECONDS_PER_UTC_DAY === 0 && elapsed / MILLISECONDS_PER_UTC_DAY === delayDays;
}

function enumValue<T extends string>(value: unknown, values: readonly T[]): T | null {
  return typeof value === "string" && (values as readonly string[]).includes(value) ? value as T : null;
}

function parseFixture(value: unknown): ReviewedFixtureRefs | null {
  const record = ownDataRecord(value);
  const fields = [
    "schemaVersion", "audience", "journeyId", "startedAt", "authorityRef", "capabilityMapRef", "resourceRef", "representationRef",
    "projectRef", "practiceRef", "worldRuntimeRef", "evidenceContractRef", "reviewedRouteRef", "activeCheckpointRef", "separatingOperationRef", "coldTransferRef",
  ] as const;
  if (!record || !hasExactKeys(record, fields)) return null;
  if (record.schemaVersion !== ADULT_PILOT_EXPERIENCE_SCHEMA_VERSION || record.audience !== "adult-fixture") return null;
  const startedAt = timestamp(record.startedAt);
  const refs = fields.slice(2).filter((field) => field !== "startedAt").map((field) => [field, opaque(record[field])]);
  if (!startedAt || refs.some(([, ref]) => !ref)) return null;
  return deepFreeze({
    schemaVersion: ADULT_PILOT_EXPERIENCE_SCHEMA_VERSION,
    audience: "adult-fixture",
    journeyId: refs[0]![1]!,
    startedAt,
    authorityRef: refs[1]![1]!,
    capabilityMapRef: refs[2]![1]!,
    resourceRef: refs[3]![1]!,
    representationRef: refs[4]![1]!,
    projectRef: refs[5]![1]!,
    practiceRef: refs[6]![1]!,
    worldRuntimeRef: refs[7]![1]!,
    evidenceContractRef: refs[8]![1]!,
    reviewedRouteRef: refs[9]![1]!,
    activeCheckpointRef: refs[10]![1]!,
    separatingOperationRef: refs[11]![1]!,
    coldTransferRef: refs[12]![1]!,
  });
}

function parseReadings(value: unknown): readonly [Readonly<{ id: string; wording: string }>, Readonly<{ id: string; wording: string }>] | null {
  const values = ownArray(value);
  if (!values || values.length !== 2) return null;
  const parsed = values.map((entry) => {
    const record = ownDataRecord(entry);
    if (!record || !hasExactKeys(record, ["id", "wording"])) return null;
    const id = opaque(record.id);
    const wording = prose(record.wording);
    return id && wording ? deepFreeze({ id, wording }) : null;
  });
  if (parsed.some((entry) => !entry) || parsed[0]!.id === parsed[1]!.id || parsed[0]!.wording === parsed[1]!.wording) return null;
  return deepFreeze([parsed[0]!, parsed[1]!]);
}

function actionRecord(value: unknown, type: AdultPilotActionType, keys: readonly string[]): OwnDataRecord | null {
  const record = ownDataRecord(value);
  return record && record.type === type && hasExactKeys(record, keys) && opaque(record.actionId) ? record : null;
}

function parseAction(value: unknown): AdultPilotExperienceAction | null {
  const base = ownDataRecord(value);
  const type = base ? enumValue(base.type, ADULT_PILOT_ACTION_TYPES) : null;
  if (!base || !type) return null;
  const withBase = (keys: readonly string[]) => actionRecord(value, type, ["type", "actionId", ...keys]);
  const actionId = opaque(base.actionId);
  if (!actionId) return null;
  switch (type) {
    case "CAPTURE_INTENT": {
      const record = withBase(["intentWording", "practicalOutcomeWording"]);
      const intentWording = record && prose(record.intentWording); const practicalOutcomeWording = record && prose(record.practicalOutcomeWording);
      return record && intentWording && practicalOutcomeWording ? deepFreeze({ type, actionId, intentWording, practicalOutcomeWording }) : null;
    }
    case "INSPECT_CANDIDATE_MAP": {
      const record = withBase(["mapRef", "provenance", "gapVisibility"]);
      const mapRef = record && opaque(record.mapRef); const provenance = record && enumValue(record.provenance, ["authored", "fixture", "graph-derived", "model-proposal"] as const);
      return record && mapRef && provenance && record.gapVisibility === "visible" ? deepFreeze({ type, actionId, mapRef, provenance, gapVisibility: "visible" as const }) : null;
    }
    case "DECIDE_MAP_PROPOSAL": {
      const record = withBase(["decision", "learnerWording", "consequence"]);
      const decision = record && enumValue(record.decision, ["accept", "reject", "edit"] as const); const learnerWording = record && prose(record.learnerWording);
      const consequence = record && enumValue(record.consequence, ["route-retained", "route-declined", "route-requires-review"] as const);
      const expectedConsequence = decision === "accept" ? "route-retained" : decision === "reject" ? "route-declined" : decision === "edit" ? "route-requires-review" : null;
      return record && decision && learnerWording && consequence && consequence === expectedConsequence ? deepFreeze({ type, actionId, decision, learnerWording, consequence } as AdultPilotExperienceAction) : null;
    }
    case "COMMIT_INITIAL_MODEL": {
      const record = withBase(["modelKind", "learnerWording"]);
      const modelKind = record && enumValue(record.modelKind, ["mechanism", "strategy", "plan"] as const); const learnerWording = record && prose(record.learnerWording);
      return record && modelKind && learnerWording ? deepFreeze({ type, actionId, modelKind, learnerWording }) : null;
    }
    case "PRESENT_TWO_UNCERTAIN_READINGS": {
      const record = withBase(["proposer", "readings", "pointOfDisagreement"]);
      const proposer = record && enumValue(record.proposer, ["authored", "ai-proposal"] as const); const readings = record && parseReadings(record.readings); const pointOfDisagreement = record && prose(record.pointOfDisagreement);
      return record && proposer && readings && pointOfDisagreement ? deepFreeze({ type, actionId, proposer, readings, pointOfDisagreement }) : null;
    }
    case "RESPOND_TO_READING": {
      const ordinary = withBase(["readingId", "response"]);
      const corrected = withBase(["readingId", "response", "correctedWording"]);
      const record = ordinary ?? corrected; const readingId = record && opaque(record.readingId); const response = record && enumValue(record.response, ["accept", "reject", "correct"] as const);
      const correctedWording = corrected && prose(corrected.correctedWording);
      if (!record || !readingId || !response || (response === "correct" && (!corrected || !correctedWording)) || (response !== "correct" && !ordinary)) return null;
      return response === "correct" ? deepFreeze({ type, actionId, readingId, response, correctedWording: correctedWording! }) : deepFreeze({ type, actionId, readingId, response });
    }
    case "SELECT_SEPARATING_OPERATION": {
      const record = withBase(["selectedOperationRef", "selectedBy"]); const selectedOperationRef = record && opaque(record.selectedOperationRef);
      return record && selectedOperationRef && record.selectedBy === "learner" ? deepFreeze({ type, actionId, selectedOperationRef, selectedBy: "learner" as const }) : null;
    }
    case "ACTIVATE_REVIEWED_ROUTE": {
      const record = withBase(["routeRef", "resourceRef", "activeCheckpointRef"]); const routeRef = record && opaque(record.routeRef); const resourceRef = record && opaque(record.resourceRef); const activeCheckpointRef = record && opaque(record.activeCheckpointRef);
      return record && routeRef && resourceRef && activeCheckpointRef ? deepFreeze({ type, actionId, routeRef, resourceRef, activeCheckpointRef }) : null;
    }
    case "COMMIT_RECONSTRUCTION": case "COMMIT_PRACTICE": case "COMMIT_PROJECT": case "COMMIT_CRITIQUE": case "COMMIT_INDIVIDUAL_DEFENCE": {
      const record = withBase(["learnerWording"]); const learnerWording = record && prose(record.learnerWording);
      return record && learnerWording ? deepFreeze({ type, actionId, learnerWording }) : null;
    }
    case "WITHDRAW_INSTRUCTIONAL_SUPPORT": {
      const record = withBase(["withdrawal"]); return record && record.withdrawal === "explicit" ? deepFreeze({ type, actionId, withdrawal: "explicit" as const }) : null;
    }
    case "RECORD_ACCESSIBILITY_CONTROL": {
      const record = withBase(["control"]); const control = record && enumValue(record.control, ["captions", "high-contrast", "keyboard-navigation", "magnification", "screen-reader", "text-to-speech"] as const);
      return record && control ? deepFreeze({ type, actionId, control }) : null;
    }
    case "SUBMIT_COLD_TRANSFER": {
      const record = withBase(["transferRef", "learnerWording"]); const transferRef = record && opaque(record.transferRef); const learnerWording = record && prose(record.learnerWording);
      return record && transferRef && learnerWording ? deepFreeze({ type, actionId, transferRef, learnerWording }) : null;
    }
    case "RECORD_BOUNDED_RESULT": {
      const record = withBase(["source", "result", "conditionsRef"]); const result = record && enumValue(record.result, ["demonstrated_this_attempt", "repair_needed", "untested"] as const); const conditionsRef = record && opaque(record.conditionsRef);
      return record && record.source === "reviewed-fixture-validator" && result && conditionsRef ? deepFreeze({ type, actionId, source: "reviewed-fixture-validator" as const, result, conditionsRef }) : null;
    }
    case "SCHEDULE_DELAYED_RETURN": {
      const record = withBase(["scheduledAt", "dueAt", "delayDays", "dueAttemptId"]); const scheduledAt = record && timestamp(record.scheduledAt); const dueAt = record && timestamp(record.dueAt); const dueAttemptId = record && opaque(record.dueAttemptId);
      return record && scheduledAt && dueAt && dueAttemptId && typeof record.delayDays === "number" && Number.isInteger(record.delayDays) && record.delayDays >= 1 && record.delayDays <= 365 ? deepFreeze({ type, actionId, scheduledAt, dueAt, delayDays: record.delayDays, dueAttemptId }) : null;
    }
    case "RECORD_DELAYED_RETURN": {
      const record = withBase(["dueAttemptId", "attemptedAt", "result"]); const dueAttemptId = record && opaque(record.dueAttemptId); const attemptedAt = record && timestamp(record.attemptedAt); const result = record && enumValue(record.result, ["demonstrated_this_attempt", "repair_needed", "untested"] as const);
      return record && dueAttemptId && attemptedAt && result ? deepFreeze({ type, actionId, dueAttemptId, attemptedAt, result }) : null;
    }
  }
}

function emptyWorkspace(): Workspace {
  return deepFreeze({ intent: null, map: null, initialModel: null, readings: [], pointOfDisagreement: null, selectedOperationRef: null, route: null, reconstruction: null, practice: null, project: null, critique: null, individualDefence: null });
}

function registerState(state: AdultPilotExperienceState): AdultPilotExperienceState {
  STATE_BRAND.add(state as object);
  return deepFreeze(state);
}

function nextState(state: AdultPilotExperienceState, patch: Omit<AdultPilotExperienceState, "schemaVersion" | "controllerVersion" | "fixture" | "sequence" | "seenActionIds">, actionId: string): AdultPilotExperienceState {
  return registerState({ ...patch, schemaVersion: state.schemaVersion, controllerVersion: state.controllerVersion, fixture: state.fixture, sequence: state.sequence + 1, seenActionIds: [...state.seenActionIds, actionId] });
}

function reject(state: AdultPilotExperienceState, reason: AdultPilotRejectReason): InternalAdultPilotTransition {
  return deepFreeze({ accepted: false, state, reason });
}

function workspaceWith(workspace: Workspace, patch: Partial<Workspace>): Workspace {
  return deepFreeze({ ...workspace, ...patch });
}

function expectedStage(type: AdultPilotActionType): AdultPilotStage | null {
  const stages: Readonly<Partial<Record<AdultPilotActionType, AdultPilotStage>>> = {
    CAPTURE_INTENT: "intent", INSPECT_CANDIDATE_MAP: "map-inspection", DECIDE_MAP_PROPOSAL: "map-decision", COMMIT_INITIAL_MODEL: "initial-model",
    PRESENT_TWO_UNCERTAIN_READINGS: "readings", RESPOND_TO_READING: "readings", SELECT_SEPARATING_OPERATION: "separating-operation", ACTIVATE_REVIEWED_ROUTE: "reviewed-route",
    COMMIT_RECONSTRUCTION: "reconstruction", COMMIT_PRACTICE: "practice", COMMIT_PROJECT: "project", COMMIT_CRITIQUE: "critique",
    COMMIT_INDIVIDUAL_DEFENCE: "individual-defence", WITHDRAW_INSTRUCTIONAL_SUPPORT: "support-withdrawal", SUBMIT_COLD_TRANSFER: "proof",
    RECORD_BOUNDED_RESULT: "bounded-result", SCHEDULE_DELAYED_RETURN: "delayed-return", RECORD_DELAYED_RETURN: "delayed-return",
  };
  return stages[type] ?? null;
}

/** Create a new local state. The literal adult fixture mode is not identity evidence. */
export function createAdultPilotExperienceState(value: unknown): AdultPilotCreateResult {
  const record = ownDataRecord(value);
  if (record && Object.prototype.hasOwnProperty.call(record, "audience") && record.audience !== "adult-fixture") return deepFreeze({ ok: false, reason: "adult-fixture-required" });
  const fixture = parseFixture(value);
  if (!fixture) return deepFreeze({ ok: false, reason: "invalid-fixture-input" });
  return deepFreeze({ ok: true, state: registerState({
    schemaVersion: ADULT_PILOT_EXPERIENCE_STATE_VERSION,
    controllerVersion: ADULT_PILOT_EXPERIENCE_CONTROLLER_VERSION,
    fixture,
    stage: "intent",
    sequence: 0,
    seenActionIds: [],
    workspace: emptyWorkspace(),
    proofBoundary: { instructionalSupport: "available", solutionBearingState: "available", accessibilityControls: [] },
    boundedResult: null,
    delayedReturn: null,
  }) });
}

/**
 * Pure reducer. Any rejected transition returns the exact same trusted state
 * object, so illegal, reordered, duplicate, or stale calls cannot mutate it.
 */
function reduceParsedAdultPilotExperience(state: AdultPilotExperienceState, action: AdultPilotExperienceAction): InternalAdultPilotTransition {
  if (state.seenActionIds.includes(action.actionId)) return reject(state, "duplicate-action");

  if (action.type === "RECORD_ACCESSIBILITY_CONTROL") {
    if (state.stage !== "proof") return reject(state, "stage-mismatch");
    const controls = state.proofBoundary.accessibilityControls.includes(action.control) ? state.proofBoundary.accessibilityControls : [...state.proofBoundary.accessibilityControls, action.control].sort();
    return deepFreeze({ accepted: true, action, state: nextState(state, { ...state, proofBoundary: { ...state.proofBoundary, accessibilityControls: controls } }, action.actionId) });
  }

  if (state.stage === "proof" && action.type !== "SUBMIT_COLD_TRANSFER") return reject(state, "proof-help-forbidden");
  if (expectedStage(action.type) !== state.stage) return reject(state, "stage-mismatch");
  const workspace = state.workspace;
  if (!workspace && state.stage !== "proof" && state.stage !== "bounded-result" && state.stage !== "delayed-return") return reject(state, "proof-help-forbidden");

  let next: AdultPilotExperienceState;
  switch (action.type) {
    case "CAPTURE_INTENT":
      next = nextState(state, { ...state, stage: "map-inspection", workspace: workspaceWith(workspace!, { intent: { intentWording: action.intentWording, practicalOutcomeWording: action.practicalOutcomeWording } }) }, action.actionId); break;
    case "INSPECT_CANDIDATE_MAP":
      if (action.mapRef !== state.fixture.capabilityMapRef) return reject(state, "reference-mismatch");
      next = nextState(state, { ...state, stage: "map-decision", workspace: workspaceWith(workspace!, { map: { mapRef: action.mapRef, provenance: action.provenance, gapVisibility: action.gapVisibility, decision: "reject", learnerWording: "", consequence: "route-declined" } }) }, action.actionId); break;
    case "DECIDE_MAP_PROPOSAL":
      if (!workspace!.map) return reject(state, "stage-mismatch");
      if (action.decision === "reject") {
        next = nextState(state, { ...state, stage: "route-declined", workspace: null }, action.actionId); break;
      }
      if (action.decision === "edit") {
        next = nextState(state, { ...state, stage: "route-review-required", workspace: null }, action.actionId); break;
      }
      next = nextState(state, { ...state, stage: "initial-model", workspace: workspaceWith(workspace!, { map: { ...workspace!.map, decision: action.decision, learnerWording: action.learnerWording, consequence: action.consequence } }) }, action.actionId); break;
    case "COMMIT_INITIAL_MODEL":
      next = nextState(state, { ...state, stage: "readings", workspace: workspaceWith(workspace!, { initialModel: { modelKind: action.modelKind, learnerWording: action.learnerWording } }) }, action.actionId); break;
    case "PRESENT_TWO_UNCERTAIN_READINGS":
      if (workspace!.readings.length !== 0 || workspace!.pointOfDisagreement !== null) return reject(state, "stage-mismatch");
      next = nextState(state, { ...state, stage: "readings", workspace: workspaceWith(workspace!, { readings: action.readings.map((reading) => ({ ...reading, response: null })), pointOfDisagreement: action.pointOfDisagreement }) }, action.actionId); break;
    case "RESPOND_TO_READING": {
      const reading = workspace!.readings.find((entry) => entry.id === action.readingId);
      if (!reading || reading.response !== null) return reject(state, "reading-response-invalid");
      const readings = workspace!.readings.map((entry) => entry.id !== action.readingId ? entry : deepFreeze({ ...entry, wording: action.response === "correct" ? action.correctedWording : entry.wording, response: action.response }));
      const allResponded = readings.every((entry) => entry.response !== null);
      next = nextState(state, { ...state, stage: allResponded ? "separating-operation" : "readings", workspace: workspaceWith(workspace!, { readings }) }, action.actionId); break;
    }
    case "SELECT_SEPARATING_OPERATION":
      if (action.selectedBy !== "learner" || action.selectedOperationRef !== state.fixture.separatingOperationRef) return reject(state, "reference-mismatch");
      if (workspace!.readings.length !== 2 || workspace!.readings.some((entry) => entry.response === null)) return reject(state, "two-readings-required");
      next = nextState(state, { ...state, stage: "reviewed-route", workspace: workspaceWith(workspace!, { selectedOperationRef: action.selectedOperationRef }) }, action.actionId); break;
    case "ACTIVATE_REVIEWED_ROUTE":
      if (action.routeRef !== state.fixture.reviewedRouteRef || action.resourceRef !== state.fixture.resourceRef || action.activeCheckpointRef !== state.fixture.activeCheckpointRef) return reject(state, "reference-mismatch");
      next = nextState(state, { ...state, stage: "reconstruction", workspace: workspaceWith(workspace!, { route: { routeRef: action.routeRef, resourceRef: action.resourceRef, activeCheckpointRef: action.activeCheckpointRef } }) }, action.actionId); break;
    case "COMMIT_RECONSTRUCTION":
      next = nextState(state, { ...state, stage: "practice", workspace: workspaceWith(workspace!, { reconstruction: action.learnerWording }) }, action.actionId); break;
    case "COMMIT_PRACTICE":
      next = nextState(state, { ...state, stage: "project", workspace: workspaceWith(workspace!, { practice: action.learnerWording }) }, action.actionId); break;
    case "COMMIT_PROJECT":
      next = nextState(state, { ...state, stage: "critique", workspace: workspaceWith(workspace!, { project: action.learnerWording }) }, action.actionId); break;
    case "COMMIT_CRITIQUE":
      next = nextState(state, { ...state, stage: "individual-defence", workspace: workspaceWith(workspace!, { critique: action.learnerWording }) }, action.actionId); break;
    case "COMMIT_INDIVIDUAL_DEFENCE":
      next = nextState(state, { ...state, stage: "support-withdrawal", workspace: workspaceWith(workspace!, { individualDefence: action.learnerWording }) }, action.actionId); break;
    case "WITHDRAW_INSTRUCTIONAL_SUPPORT":
      next = nextState(state, { ...state, stage: "proof", workspace: null, proofBoundary: { instructionalSupport: "unmounted", solutionBearingState: "invalidated", accessibilityControls: [] } }, action.actionId); break;
    case "SUBMIT_COLD_TRANSFER":
      if (action.transferRef !== state.fixture.coldTransferRef) return reject(state, "reference-mismatch");
      if (state.proofBoundary.instructionalSupport !== "unmounted" || state.proofBoundary.solutionBearingState !== "invalidated") return reject(state, "proof-help-forbidden");
      next = nextState(state, { ...state, stage: "bounded-result" }, action.actionId); break;
    case "RECORD_BOUNDED_RESULT":
      if (action.source !== "reviewed-fixture-validator" || action.conditionsRef !== state.fixture.evidenceContractRef) return reject(state, "invalid-bounded-result");
      next = nextState(state, { ...state, stage: "delayed-return", boundedResult: { result: action.result, claimScope: "this-attempt-under-stated-conditions", evidenceUpgrade: false, capabilityUpgrade: false } }, action.actionId); break;
    case "SCHEDULE_DELAYED_RETURN":
      if (state.delayedReturn) return reject(state, "invalid-delayed-return");
      if (Date.parse(action.scheduledAt) < Date.parse(state.fixture.startedAt) || !exactUtcWholeDayDelay(action.scheduledAt, action.dueAt, action.delayDays)) return reject(state, "invalid-delayed-return");
      next = nextState(state, { ...state, delayedReturn: { scheduledAt: action.scheduledAt, dueAt: action.dueAt, delayDays: action.delayDays, dueAttemptId: action.dueAttemptId, attemptedAt: null, result: null } }, action.actionId); break;
    case "RECORD_DELAYED_RETURN":
      if (!state.delayedReturn || action.dueAttemptId !== state.delayedReturn.dueAttemptId || Date.parse(action.attemptedAt) < Date.parse(state.delayedReturn.dueAt)) return reject(state, "invalid-delayed-return");
      next = nextState(state, { ...state, stage: "completed", delayedReturn: { ...state.delayedReturn, attemptedAt: action.attemptedAt, result: action.result } }, action.actionId); break;
  }
  return deepFreeze({ accepted: true, action, state: next! });
}

/**
 * Pure public reducer. The state is local controller state; accepted public
 * transitions intentionally do not echo raw learner actions.
 */
export function reduceAdultPilotExperience(stateValue: unknown, actionValue: unknown): AdultPilotTransition {
  if (stateValue === null || typeof stateValue !== "object" || !STATE_BRAND.has(stateValue)) {
    return deepFreeze({ accepted: false, state: null, reason: "untrusted-state" });
  }
  const state = stateValue as AdultPilotExperienceState;
  const action = parseAction(actionValue);
  if (!action) return deepFreeze({ accepted: false, state, reason: "invalid-action" });
  const transition = reduceParsedAdultPilotExperience(state, action);
  return transition.accepted ? deepFreeze({ accepted: true, state: transition.state }) : transition;
}

function safeFixture(fixture: ReviewedFixtureRefs): Readonly<Record<string, unknown>> {
  return deepFreeze({
    schemaVersion: fixture.schemaVersion, audience: fixture.audience, journeyId: fixture.journeyId, startedAt: fixture.startedAt,
    authorityRef: fixture.authorityRef, capabilityMapRef: fixture.capabilityMapRef, resourceRef: fixture.resourceRef, representationRef: fixture.representationRef,
    projectRef: fixture.projectRef, practiceRef: fixture.practiceRef, worldRuntimeRef: fixture.worldRuntimeRef, evidenceContractRef: fixture.evidenceContractRef,
    reviewedRouteRef: fixture.reviewedRouteRef, activeCheckpointRef: fixture.activeCheckpointRef, separatingOperationRef: fixture.separatingOperationRef, coldTransferRef: fixture.coldTransferRef,
  });
}

async function textDigest(value: string): Promise<string> { return sha256Digest(value); }

async function safeWorkspace(workspace: Workspace | null): Promise<Readonly<Record<string, unknown>> | null> {
  if (!workspace) return null;
  const readingRows = await Promise.all(workspace.readings.map(async (reading) => ({ id: reading.id, wordingDigest: await textDigest(reading.wording), response: reading.response })));
  return deepFreeze({
    intent: workspace.intent ? { intentWordingDigest: await textDigest(workspace.intent.intentWording), practicalOutcomeWordingDigest: await textDigest(workspace.intent.practicalOutcomeWording) } : null,
    map: workspace.map ? { mapRef: workspace.map.mapRef, provenance: workspace.map.provenance, gapVisibility: workspace.map.gapVisibility, decision: workspace.map.decision, learnerWordingDigest: await textDigest(workspace.map.learnerWording), consequence: workspace.map.consequence } : null,
    initialModel: workspace.initialModel ? { modelKind: workspace.initialModel.modelKind, learnerWordingDigest: await textDigest(workspace.initialModel.learnerWording) } : null,
    readings: readingRows,
    pointOfDisagreementDigest: workspace.pointOfDisagreement ? await textDigest(workspace.pointOfDisagreement) : null,
    selectedOperationRef: workspace.selectedOperationRef,
    route: workspace.route,
    reconstructionDigest: workspace.reconstruction ? await textDigest(workspace.reconstruction) : null,
    practiceDigest: workspace.practice ? await textDigest(workspace.practice) : null,
    projectDigest: workspace.project ? await textDigest(workspace.project) : null,
    critiqueDigest: workspace.critique ? await textDigest(workspace.critique) : null,
    individualDefenceDigest: workspace.individualDefence ? await textDigest(workspace.individualDefence) : null,
  });
}

async function publicState(state: AdultPilotExperienceState): Promise<AdultPilotExperiencePublicState> {
  return deepFreeze({
    schemaVersion: state.schemaVersion, controllerVersion: state.controllerVersion, fixture: safeFixture(state.fixture), stage: state.stage, sequence: state.sequence,
    seenActionIds: state.seenActionIds, workspace: await safeWorkspace(state.workspace), proofBoundary: state.proofBoundary,
    boundedResult: state.boundedResult, delayedReturn: state.delayedReturn,
  });
}

async function stateDigest(state: AdultPilotExperienceState): Promise<string> { return sha256Digest(canonicalJson(await publicState(state))); }

async function safeActionReceipt(action: AdultPilotExperienceAction): Promise<Readonly<Record<string, unknown>>> {
  switch (action.type) {
    case "CAPTURE_INTENT": return deepFreeze({ type: action.type, intentWordingDigest: await textDigest(action.intentWording), practicalOutcomeWordingDigest: await textDigest(action.practicalOutcomeWording) });
    case "DECIDE_MAP_PROPOSAL": return deepFreeze({ type: action.type, decision: action.decision, learnerWordingDigest: await textDigest(action.learnerWording), consequence: action.consequence });
    case "COMMIT_INITIAL_MODEL": return deepFreeze({ type: action.type, modelKind: action.modelKind, learnerWordingDigest: await textDigest(action.learnerWording) });
    case "PRESENT_TWO_UNCERTAIN_READINGS": {
      const readingCommitments = await Promise.all(action.readings.map(async (reading) => ({ id: reading.id, wordingDigest: await textDigest(reading.wording) })));
      return deepFreeze({ type: action.type, proposer: action.proposer, readingsDigest: await sha256Digest(canonicalJson(readingCommitments)), pointOfDisagreementDigest: await textDigest(action.pointOfDisagreement) });
    }
    case "RESPOND_TO_READING": return deepFreeze({ type: action.type, readingId: action.readingId, response: action.response, ...(action.response === "correct" ? { correctedWordingDigest: await textDigest(action.correctedWording) } : {}) });
    case "COMMIT_RECONSTRUCTION": case "COMMIT_PRACTICE": case "COMMIT_PROJECT": case "COMMIT_CRITIQUE": case "COMMIT_INDIVIDUAL_DEFENCE": return deepFreeze({ type: action.type, learnerWordingDigest: await textDigest(action.learnerWording) });
    case "SUBMIT_COLD_TRANSFER": return deepFreeze({ type: action.type, transferRef: action.transferRef, learnerWordingDigest: await textDigest(action.learnerWording) });
    default: {
      const { actionId: _actionId, ...safe } = action;
      void _actionId;
      return deepFreeze(safe);
    }
  }
}

async function createEvent(sequence: number, action: AdultPilotExperienceAction, state: AdultPilotExperienceState): Promise<AdultPilotExperienceEventV1> {
  const receipt = await safeActionReceipt(action);
  const resultingStateDigest = await stateDigest(state);
  const eventType = ACTION_EVENT_TYPES[action.type];
  const eventDigest = await sha256Digest(canonicalJson({ schemaVersion: ADULT_PILOT_EXPERIENCE_EVENT_VERSION, sequence, actionId: action.actionId, eventType, receipt, stateDigest: resultingStateDigest }));
  return deepFreeze({ schemaVersion: ADULT_PILOT_EXPERIENCE_EVENT_VERSION, sequence, actionId: action.actionId, eventType, receipt, stateDigest: resultingStateDigest, eventDigest });
}

async function createReceipt(state: AdultPilotExperienceState, events: readonly AdultPilotExperienceEventV1[]): Promise<AdultPilotExperienceReceiptV1> {
  return deepFreeze({ schemaVersion: ADULT_PILOT_EXPERIENCE_RECEIPT_VERSION, controllerVersion: ADULT_PILOT_EXPERIENCE_CONTROLLER_VERSION, journeyId: state.fixture.journeyId, stage: state.stage, eventDigests: events.map((event) => event.eventDigest), finalStateDigest: await stateDigest(state), capabilityUpgrade: false, evidenceUpgrade: false, limitation: "fixture-only-non-authorizing-this-attempt" });
}

function createReplayHandle(fixture: ReviewedFixtureRefs, events: readonly PrivateReplayEvent[]): AdultPilotReplayHandle {
  const handle = Object.freeze(Object.create(null)) as object;
  REPLAY_HANDLES.set(handle, deepFreeze({ fixtureCanonical: canonicalJson(safeFixture(fixture)), events }));
  return handle as AdultPilotReplayHandle;
}

function replayJournal(value: unknown): PrivateReplayJournal | null {
  return value !== null && (typeof value === "object" || typeof value === "function") ? REPLAY_HANDLES.get(value as object) ?? null : null;
}

/** Compile raw local actions into receipt-safe events and an opaque in-process replay handle. */
export async function compileAdultPilotExperience(fixture: unknown, actions: readonly unknown[]): Promise<AdultPilotExperienceCompilation | Readonly<{ ok: false; state: null; events: readonly []; rejectedAt: -1; reason: "invalid-fixture-input" | "adult-fixture-required" }>> {
  const created = createAdultPilotExperienceState(fixture);
  if (!created.ok) return deepFreeze({ ok: false, state: null, events: [], rejectedAt: -1, reason: created.reason });
  let state = created.state;
  const events: AdultPilotExperienceEventV1[] = [];
  const privateEvents: PrivateReplayEvent[] = [];
  for (let index = 0; index < actions.length; index += 1) {
    const action = parseAction(actions[index]);
    if (!action) return deepFreeze({ ok: false, state: await publicState(state), events: deepFreeze(events), rejectedAt: index, reason: "invalid-action" });
    const transition = reduceParsedAdultPilotExperience(state, action);
    if (!transition.accepted) return deepFreeze({ ok: false, state: await publicState(state), events: deepFreeze(events), rejectedAt: index, reason: transition.reason });
    state = transition.state;
    const event = await createEvent(state.sequence, transition.action, state);
    events.push(event);
    privateEvents.push(deepFreeze({ sequence: event.sequence, actionId: event.actionId, eventType: event.eventType, action: transition.action }));
  }
  return deepFreeze({ ok: true, state: await publicState(state), events: deepFreeze(events), receipt: await createReceipt(state, events), replayHandle: createReplayHandle(created.state.fixture, deepFreeze(privateEvents)) });
}

function parseEvent(value: unknown): AdultPilotExperienceEventV1 | null {
  const record = ownDataRecord(value);
  const keys = ["schemaVersion", "sequence", "actionId", "eventType", "receipt", "stateDigest", "eventDigest"];
  if (!record || !hasExactKeys(record, keys) || record.schemaVersion !== ADULT_PILOT_EXPERIENCE_EVENT_VERSION || typeof record.sequence !== "number" || !Number.isInteger(record.sequence) || record.sequence < 1) return null;
  const actionId = opaque(record.actionId); const eventType = enumValue(record.eventType, ADULT_PILOT_EVENT_TYPES); const stateDigestValue = typeof record.stateDigest === "string" ? record.stateDigest : null; const eventDigest = typeof record.eventDigest === "string" ? record.eventDigest : null;
  const receipt = receiptRecord(record.receipt);
  if (!actionId || !eventType || !stateDigestValue || !eventDigest || !receipt) return null;
  return deepFreeze({ schemaVersion: ADULT_PILOT_EXPERIENCE_EVENT_VERSION, sequence: record.sequence, actionId, eventType, receipt, stateDigest: stateDigestValue, eventDigest });
}

/** Replays a receipt-safe event list only through its exact in-process opaque handle. */
export async function replayAdultPilotExperience(fixture: unknown, events: readonly unknown[], handle: unknown): Promise<AdultPilotReplayResult> {
  const created = createAdultPilotExperienceState(fixture);
  if (!created.ok) return deepFreeze({ ok: false, state: null, index: -1, reason: created.reason });
  const journal = replayJournal(handle);
  if (!journal) return deepFreeze({ ok: false, state: await publicState(created.state), index: -1, reason: "invalid-replay-handle" });
  if (journal.fixtureCanonical !== canonicalJson(safeFixture(created.state.fixture)) || events.length !== journal.events.length) {
    return deepFreeze({ ok: false, state: await publicState(created.state), index: -1, reason: "replay-handle-mismatch" });
  }
  let state = created.state;
  const accepted: AdultPilotExperienceEventV1[] = [];
  for (let index = 0; index < events.length; index += 1) {
    const event = parseEvent(events[index]);
    const privateEvent = journal.events[index];
    if (!event) return deepFreeze({ ok: false, state: await publicState(state), index, reason: "invalid-event" });
    if (!privateEvent || event.sequence !== index + 1 || event.sequence !== privateEvent.sequence || event.actionId !== privateEvent.actionId || event.eventType !== privateEvent.eventType) {
      return deepFreeze({ ok: false, state: await publicState(state), index, reason: "replay-handle-mismatch" });
    }
    const expectedReceipt = await safeActionReceipt(privateEvent.action);
    if (canonicalJson(expectedReceipt) !== canonicalJson(event.receipt)) {
      return deepFreeze({ ok: false, state: await publicState(state), index, reason: "event-receipt-mismatch" });
    }
    const recomputedDigest = await sha256Digest(canonicalJson({ schemaVersion: event.schemaVersion, sequence: event.sequence, actionId: event.actionId, eventType: event.eventType, receipt: event.receipt, stateDigest: event.stateDigest }));
    if (recomputedDigest !== event.eventDigest) return deepFreeze({ ok: false, state: await publicState(state), index, reason: "event-digest-mismatch" });
    const transition = reduceParsedAdultPilotExperience(state, privateEvent.action);
    if (!transition.accepted) return deepFreeze({ ok: false, state: await publicState(state), index, reason: transition.reason });
    state = transition.state;
    if (await stateDigest(state) !== event.stateDigest) return deepFreeze({ ok: false, state: await publicState(state), index, reason: "state-digest-mismatch" });
    accepted.push(event);
  }
  return deepFreeze({ ok: true, state: await publicState(state), receipt: await createReceipt(state, accepted) });
}
