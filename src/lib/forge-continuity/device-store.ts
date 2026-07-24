import { z } from "zod";

import { deepFreeze } from "../../forge/deep-freeze";
import { canonicalJson } from "../../forge/events";
import { exceedsUtf8ByteLimit } from "../storage/raw-byte-limit";
import {
  activityStateSchema,
  learnerOwnedGoalSchema,
  learningPathRevisionSchema,
  pathDecisionSchema,
  type ActivityStateV1,
  type LearnerOwnedGoalV1,
  type LearningPathRevisionV1,
  type PathDecisionV1,
} from "../../forge/continuity/contracts";
import {
  studySessionSchema,
  type StudySessionV1,
} from "../../forge/continuity/study-session";
import {
  delayedReturnTaskSchema,
  type DelayedReturnTaskV1,
} from "../../forge/continuity/delayed-return";

z.config({ jitless: true });

export const DEVICE_CONTINUITY_FORMAT = "forge-device-continuity" as const;
export const DEVICE_CONTINUITY_SCHEMA_VERSION = 1 as const;
export const DEVICE_CONTINUITY_EXPORT_FORMAT = "forge-device-continuity-export" as const;
export const MAX_DEVICE_CONTINUITY_RECORDS = 50;
export const MAX_DEVICE_CONTINUITY_RAW_BYTES = 5 * 1024 * 1024;

const timestampSchema = z.string().datetime({ offset: true });
const recordIdSchema = z.string().trim().max(180).regex(/^continuity-record\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/);

export const deviceContinuityRecordSchema = z.strictObject({
  recordId: recordIdSchema,
  goal: learnerOwnedGoalSchema,
  revisions: z.array(learningPathRevisionSchema).min(1).max(100),
  decisions: z.array(pathDecisionSchema).max(100),
  activityStates: z.array(activityStateSchema).max(128),
  studySessions: z.array(studySessionSchema).max(128).default([]),
  delayedReturnTasks: z.array(delayedReturnTaskSchema).max(128).default([]),
  currentRevisionId: z.string().trim().max(180).regex(/^path-revision\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/),
  updatedAt: timestampSchema,
}).superRefine((record, context) => {
  const first = record.revisions[0];
  if (!first) return;
  const revisionIds = new Set<string>();
  const revisionNumbers = new Set<number>();
  const ordered = [...record.revisions].sort((left, right) => left.revisionNumber - right.revisionNumber);
  record.revisions.forEach((revision, index) => {
    if (revision.pathId !== first.pathId || revision.goalRef.goalId !== record.goal.goalId) {
      context.addIssue({
        code: "custom",
        path: ["revisions", index],
        message: "Every revision must belong to this record's exact path and learner-owned goal.",
      });
    }
    if (revisionIds.has(revision.revisionId) || revisionNumbers.has(revision.revisionNumber)) {
      context.addIssue({ code: "custom", path: ["revisions", index], message: "Revision identities and numbers must be unique." });
    }
    revisionIds.add(revision.revisionId);
    revisionNumbers.add(revision.revisionNumber);
  });
  ordered.forEach((revision, index) => {
    if (revision.revisionNumber !== index + 1 ||
      (index === 0 ? revision.supersedesRevisionId !== null : revision.supersedesRevisionId !== ordered[index - 1]!.revisionId)) {
      context.addIssue({
        code: "custom",
        path: ["revisions", record.revisions.indexOf(revision)],
        message: "Stored path revisions must form one contiguous immutable predecessor chain.",
      });
    }
  });
  if (!revisionIds.has(record.currentRevisionId)) {
    context.addIssue({ code: "custom", path: ["currentRevisionId"], message: "Current revision must exist in this record." });
  } else if (record.currentRevisionId !== ordered.at(-1)?.revisionId) {
    context.addIssue({ code: "custom", path: ["currentRevisionId"], message: "Current revision must be the latest immutable revision." });
  }

  const decisionIds = new Set<string>();
  record.decisions.forEach((decision, index) => {
    if (decisionIds.has(decision.decisionId) ||
      decision.pathId !== first.pathId ||
      !revisionIds.has(decision.baseRevisionId) ||
      !revisionIds.has(decision.resultRevisionId)) {
      context.addIssue({
        code: "custom",
        path: ["decisions", index],
        message: "Decisions must be unique and bind two revisions in this exact path history.",
      });
    }
    decisionIds.add(decision.decisionId);
  });

  const stateNodeIds = new Set<string>();
  const current = record.revisions.find((revision) => revision.revisionId === record.currentRevisionId);
  record.activityStates.forEach((state, index) => {
    if (!current ||
      stateNodeIds.has(state.nodeId) ||
      state.pathId !== current.pathId ||
      state.pathRevisionId !== current.revisionId ||
      !current.nodes.some((node) => node.nodeId === state.nodeId)) {
      context.addIssue({
        code: "custom",
        path: ["activityStates", index],
        message: "Activity states must be unique and bind the current immutable revision.",
      });
    }
    stateNodeIds.add(state.nodeId);
  });
  if (current?.status === "accepted") {
    if (
      record.activityStates.length !== current.nodes.length ||
      current.nodes.some((node) => !stateNodeIds.has(node.nodeId))
    ) {
      context.addIssue({
        code: "custom",
        path: ["activityStates"],
        message: "An accepted path must store exactly one activity state for every current node.",
      });
    }
  } else if (record.activityStates.length > 0) {
    context.addIssue({
      code: "custom",
      path: ["activityStates"],
      message: "A non-accepted path cannot carry executable activity state.",
    });
  }

  const sessionIds = new Set<string>();
  const sessionBindings = new Set<string>();
  record.studySessions.forEach((session, index) => {
    const revision = record.revisions.find(
      (candidate) => candidate.revisionId === session.pathRevisionId,
    );
    const node = revision?.nodes.find((candidate) => candidate.nodeId === session.nodeId);
    const binding = `${session.pathRevisionId}:${session.nodeId}`;
    if (
      sessionIds.has(session.sessionId)
      || sessionBindings.has(binding)
      || session.recordId !== record.recordId
      || !revision
      || revision.status !== "accepted"
      || !revision.executionAllowed
      || revision.revisionDigest !== session.pathRevisionDigest
      || revision.pathId !== session.pathId
      || !node
      || (node.activity.kind !== "modelshift_world"
        && node.activity.kind !== "reviewed_world_activity")
      || node.activity.activityId !== session.activityId
      || canonicalJson(node.activity.worldRef) !== canonicalJson(session.worldRef)
      || Date.parse(session.updatedAt) > Date.parse(record.updatedAt)
    ) {
      context.addIssue({
        code: "custom",
        path: ["studySessions", index],
        message: "Study sessions must uniquely bind an exact accepted revision, node, activity, and World.",
      });
    }
    sessionIds.add(session.sessionId);
    sessionBindings.add(binding);

    if (session.pathRevisionId !== record.currentRevisionId) {
      if (session.status === "active") {
        context.addIssue({
          code: "custom",
          path: ["studySessions", index, "status"],
          message: "Only the current accepted revision may retain an active study session.",
        });
      }
      return;
    }
    const state = record.activityStates.find((candidate) => candidate.nodeId === session.nodeId);
    if (
      !state
      || (session.status === "active" && state.status !== "in_progress")
      || (session.status === "completed" && state.status !== "completed")
    ) {
      context.addIssue({
        code: "custom",
        path: ["studySessions", index],
        message: "Current study-session status must exactly match its activity projection.",
      });
    }
  });

  if (current?.status === "accepted") {
    record.activityStates.forEach((state, index) => {
      const matching = record.studySessions.filter((session) =>
        session.pathRevisionId === current.revisionId
        && session.nodeId === state.nodeId);
      if (
        (state.status === "in_progress"
          && (matching.length !== 1 || matching[0]?.status !== "active"))
        || (state.status === "completed"
          && (matching.length !== 1 || matching[0]?.status !== "completed"))
      ) {
        context.addIssue({
          code: "custom",
          path: ["activityStates", index, "status"],
          message: "In-progress and completed activities require one exact local study session.",
        });
      }
    });
  }

  const returnIds = new Set<string>();
  const returnSessionIds = new Set<string>();
  const returnEvidenceIds = new Set<string>();
  record.delayedReturnTasks.forEach((task, index) => {
    const session = record.studySessions.find((candidate) => candidate.sessionId === task.studySessionId);
    if (
      returnIds.has(task.returnId)
      || returnSessionIds.has(task.studySessionId)
      || returnEvidenceIds.has(task.originEvidenceEntryId)
      || !session
      || session.status !== "completed"
      || session.recordId !== task.recordId
      || session.pathId !== task.pathId
      || session.pathRevisionId !== task.pathRevisionId
      || session.nodeId !== task.nodeId
      || session.worldRef.worldId !== task.worldId
      || session.worldRef.worldVersion !== task.worldVersion
      || session.runtimeCorrelation?.evidenceEntryId !== task.originEvidenceEntryId
      || session.runtimeCorrelation.receiptRecordedAt !== task.scheduledAt
      || Date.parse(task.completedAt ?? task.scheduledAt) > Date.parse(record.updatedAt)
    ) {
      context.addIssue({
        code: "custom",
        path: ["delayedReturnTasks", index],
        message: "A delayed return must uniquely bind one completed exact local session and its genuine evidence receipt.",
      });
    }
    returnIds.add(task.returnId);
    returnSessionIds.add(task.studySessionId);
    returnEvidenceIds.add(task.originEvidenceEntryId);
  });
});

export type DeviceContinuityRecordV1 = z.infer<typeof deviceContinuityRecordSchema>;

export const deviceContinuityLedgerSchema = z.strictObject({
  format: z.literal(DEVICE_CONTINUITY_FORMAT),
  schemaVersion: z.literal(DEVICE_CONTINUITY_SCHEMA_VERSION),
  records: z.array(deviceContinuityRecordSchema).max(MAX_DEVICE_CONTINUITY_RECORDS),
}).superRefine((ledger, context) => {
  const ids = new Set<string>();
  ledger.records.forEach((record, index) => {
    if (ids.has(record.recordId)) {
      context.addIssue({ code: "custom", path: ["records", index, "recordId"], message: "Device continuity record IDs must be unique." });
    }
    ids.add(record.recordId);
  });
  const sessionIds = new Set<string>();
  const correlatedAttemptIds = new Set<string>();
  const correlatedEvidenceIds = new Set<string>();
  const delayedReturnIds = new Set<string>();
  const delayedReturnSessionIds = new Set<string>();
  const delayedReturnEvidenceIds = new Set<string>();
  ledger.records.forEach((record, recordIndex) => {
    record.studySessions.forEach((session, sessionIndex) => {
      if (sessionIds.has(session.sessionId)) {
        context.addIssue({
          code: "custom",
          path: ["records", recordIndex, "studySessions", sessionIndex, "sessionId"],
          message: "Study-session identities must be unique across this device ledger.",
        });
      }
      sessionIds.add(session.sessionId);
      const correlation = session.runtimeCorrelation;
      if (
        correlation
        && (
          correlatedAttemptIds.has(correlation.attemptId)
          || correlatedEvidenceIds.has(correlation.evidenceEntryId)
        )
      ) {
        context.addIssue({
          code: "custom",
          path: ["records", recordIndex, "studySessions", sessionIndex, "runtimeCorrelation"],
          message: "One runtime attempt and evidence identity may close exactly one study session.",
        });
      }
      if (correlation) {
        correlatedAttemptIds.add(correlation.attemptId);
        correlatedEvidenceIds.add(correlation.evidenceEntryId);
      }
    });
    record.delayedReturnTasks.forEach((task, taskIndex) => {
      if (
        delayedReturnIds.has(task.returnId)
        || delayedReturnSessionIds.has(task.studySessionId)
        || delayedReturnEvidenceIds.has(task.returnEvidenceEntryId)
      ) {
        context.addIssue({
          code: "custom",
          path: ["records", recordIndex, "delayedReturnTasks", taskIndex],
          message: "A delayed-return identity, session, and retention evidence identity may occur only once on a device.",
        });
      }
      delayedReturnIds.add(task.returnId);
      delayedReturnSessionIds.add(task.studySessionId);
      delayedReturnEvidenceIds.add(task.returnEvidenceEntryId);
    });
  });
});

export type DeviceContinuityLedgerV1 = z.infer<typeof deviceContinuityLedgerSchema>;

export const deviceContinuityExportSchema = z.strictObject({
  format: z.literal(DEVICE_CONTINUITY_EXPORT_FORMAT),
  schemaVersion: z.literal(DEVICE_CONTINUITY_SCHEMA_VERSION),
  dataClass: z.literal("learner-owned-local-copy"),
  exportedAt: timestampSchema,
  records: z.array(deviceContinuityRecordSchema).max(MAX_DEVICE_CONTINUITY_RECORDS),
});
export type DeviceContinuityExportV1 = z.infer<typeof deviceContinuityExportSchema>;

export type DeviceContinuityDecodeStatus = "empty" | "ok" | "reset_unknown_version" | "reset_malformed";

export function emptyDeviceContinuityLedger(): DeviceContinuityLedgerV1 {
  return { format: DEVICE_CONTINUITY_FORMAT, schemaVersion: DEVICE_CONTINUITY_SCHEMA_VERSION, records: [] };
}

export function decodeDeviceContinuityLedger(
  raw: string | null,
): Readonly<{ ledger: DeviceContinuityLedgerV1; status: DeviceContinuityDecodeStatus }> {
  if (raw === null) return deepFreeze({ ledger: emptyDeviceContinuityLedger(), status: "empty" as const });
  if (exceedsUtf8ByteLimit(raw, MAX_DEVICE_CONTINUITY_RAW_BYTES)) {
    return deepFreeze({ ledger: emptyDeviceContinuityLedger(), status: "reset_malformed" as const });
  }
  if (raw.trim() === "") return deepFreeze({ ledger: emptyDeviceContinuityLedger(), status: "empty" as const });
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return deepFreeze({ ledger: emptyDeviceContinuityLedger(), status: "reset_malformed" as const });
  }
  if (typeof value !== "object" || value === null ||
    !("schemaVersion" in value) ||
    (value as { schemaVersion?: unknown }).schemaVersion !== DEVICE_CONTINUITY_SCHEMA_VERSION) {
    return deepFreeze({ ledger: emptyDeviceContinuityLedger(), status: "reset_unknown_version" as const });
  }
  const parsed = deviceContinuityLedgerSchema.safeParse(value);
  return parsed.success
    ? deepFreeze({ ledger: parsed.data, status: "ok" as const })
    : deepFreeze({ ledger: emptyDeviceContinuityLedger(), status: "reset_malformed" as const });
}

export function encodeDeviceContinuityLedger(ledger: unknown): string | null {
  const parsed = deviceContinuityLedgerSchema.safeParse(ledger);
  if (!parsed.success) return null;
  const encoded = JSON.stringify(parsed.data);
  return exceedsUtf8ByteLimit(encoded, MAX_DEVICE_CONTINUITY_RAW_BYTES) ? null : encoded;
}

export type DeviceContinuityPersistenceRead =
  | Readonly<{ ok: true; value: string | null }>
  | Readonly<{ ok: false; reason: "unavailable" | "read_failed" }>;
export type DeviceContinuityPersistenceWrite =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; reason: "unavailable" | "write_failed" }>;

export interface DeviceContinuityPersistence {
  read(): DeviceContinuityPersistenceRead;
  write(value: string): DeviceContinuityPersistenceWrite;
  remove(): DeviceContinuityPersistenceWrite;
}

export type DeviceContinuityReadStatus = DeviceContinuityDecodeStatus | "storage_unavailable" | "storage_error";
export type DeviceContinuityReadResult = Readonly<{ ledger: DeviceContinuityLedgerV1; status: DeviceContinuityReadStatus }>;

export type DeviceContinuityMutationResult =
  | Readonly<{ ok: true; ledger: DeviceContinuityLedgerV1; operation: "saved" | "upserted" | "deleted" | "cleared" }>
  | Readonly<{
      ok: false;
      ledger: DeviceContinuityLedgerV1;
      reason:
        | "invalid_record"
        | "record_exists"
        | "record_not_found"
        | "history_rewrite"
        | "limit_exceeded"
        | "recovery_required"
        | "storage_unavailable"
        | "storage_error";
    }>;

export type DeviceContinuityExportResult =
  | Readonly<{ ok: true; value: DeviceContinuityExportV1 }>
  | Readonly<{ ok: false; reason: "invalid_export_time" | "recovery_required" | "storage_unavailable" | "storage_error" }>;

export type DeviceContinuityRecoveryExportResult =
  | Readonly<{
      ok: true;
      raw: string;
      status: Extract<DeviceContinuityDecodeStatus, "reset_malformed" | "reset_unknown_version">;
    }>
  | Readonly<{ ok: false; reason: "no_recovery_data" | "storage_unavailable" | "storage_error" }>;

export interface DeviceContinuityStore {
  read(): DeviceContinuityReadResult;
  save(record: unknown): DeviceContinuityMutationResult;
  upsert(record: unknown): DeviceContinuityMutationResult;
  delete(recordId: string): DeviceContinuityMutationResult;
  clear(): DeviceContinuityMutationResult;
  export(exportedAt: string): DeviceContinuityExportResult;
  exportUnreadable(): DeviceContinuityRecoveryExportResult;
}

export function createDeviceContinuityRecord(value: {
  recordId: string;
  goal: LearnerOwnedGoalV1;
  revisions: readonly LearningPathRevisionV1[];
  decisions?: readonly PathDecisionV1[];
  activityStates?: readonly ActivityStateV1[];
  studySessions?: readonly StudySessionV1[];
  delayedReturnTasks?: readonly DelayedReturnTaskV1[];
  currentRevisionId: string;
  updatedAt: string;
}): Readonly<DeviceContinuityRecordV1> {
  return deepFreeze(deviceContinuityRecordSchema.parse({
    ...value,
    revisions: [...value.revisions],
    decisions: [...(value.decisions ?? [])],
    activityStates: [...(value.activityStates ?? [])],
    studySessions: [...(value.studySessions ?? [])],
    delayedReturnTasks: [...(value.delayedReturnTasks ?? [])],
  }));
}

export function createDeviceContinuityStore(persistence: DeviceContinuityPersistence): DeviceContinuityStore {
  const read = (): DeviceContinuityReadResult => {
    const persisted = persistence.read();
    if (!persisted.ok) {
      return deepFreeze({
        ledger: emptyDeviceContinuityLedger(),
        status: persisted.reason === "unavailable" ? "storage_unavailable" as const : "storage_error" as const,
      });
    }
    const decoded = decodeDeviceContinuityLedger(persisted.value);
    // A read is observational. Unknown or malformed learner-owned data remains
    // untouched until the learner explicitly exports or clears it.
    return decoded;
  };

  const writeLedger = (
    before: DeviceContinuityLedgerV1,
    records: readonly DeviceContinuityRecordV1[],
    operation: Extract<DeviceContinuityMutationResult, { ok: true }>["operation"],
  ): DeviceContinuityMutationResult => {
    const parsed = deviceContinuityLedgerSchema.safeParse({
      format: DEVICE_CONTINUITY_FORMAT,
      schemaVersion: DEVICE_CONTINUITY_SCHEMA_VERSION,
      records,
    });
    if (!parsed.success) {
      return deepFreeze({
        ok: false as const,
        ledger: before,
        reason: records.length > MAX_DEVICE_CONTINUITY_RECORDS ? "limit_exceeded" as const : "invalid_record" as const,
      });
    }
    const encoded = encodeDeviceContinuityLedger(parsed.data);
    if (encoded === null) return deepFreeze({ ok: false as const, ledger: before, reason: "storage_error" as const });
    const saved = persistence.write(encoded);
    if (!saved.ok) {
      return deepFreeze({
        ok: false as const,
        ledger: before,
        reason: saved.reason === "unavailable" ? "storage_unavailable" as const : "storage_error" as const,
      });
    }
    return deepFreeze({ ok: true as const, ledger: parsed.data, operation });
  };

  const mutateRecord = (value: unknown, mode: "save" | "upsert"): DeviceContinuityMutationResult => {
    const before = read();
    if (before.status === "storage_unavailable" || before.status === "storage_error") {
      return deepFreeze({ ok: false as const, ledger: before.ledger, reason: before.status });
    }
    if (before.status === "reset_malformed" || before.status === "reset_unknown_version") {
      return deepFreeze({ ok: false as const, ledger: before.ledger, reason: "recovery_required" as const });
    }
    const parsed = deviceContinuityRecordSchema.safeParse(value);
    if (!parsed.success) return deepFreeze({ ok: false as const, ledger: before.ledger, reason: "invalid_record" as const });
    const existingIndex = before.ledger.records.findIndex((record) => record.recordId === parsed.data.recordId);
    if (mode === "save" && existingIndex >= 0) {
      return deepFreeze({ ok: false as const, ledger: before.ledger, reason: "record_exists" as const });
    }
    const records = [...before.ledger.records];
    if (existingIndex >= 0) {
      const existing = records[existingIndex]!;
      const revisionById = new Map(parsed.data.revisions.map((revision) => [revision.revisionId, revision]));
      const decisionById = new Map(parsed.data.decisions.map((decision) => [decision.decisionId, decision]));
      const stateByNode = new Map(parsed.data.activityStates.map((state) => [state.nodeId, state]));
      const sessionById = new Map(parsed.data.studySessions.map((session) => [session.sessionId, session]));
      const delayedReturnById = new Map(parsed.data.delayedReturnTasks.map((task) => [task.returnId, task]));
      const rewritesRevision = existing.revisions.some((revision) => {
        const next = revisionById.get(revision.revisionId);
        return !next || canonicalJson(next) !== canonicalJson(revision);
      });
      const rewritesDecision = existing.decisions.some((decision) => {
        const next = decisionById.get(decision.decisionId);
        return !next || canonicalJson(next) !== canonicalJson(decision);
      });
      const rewritesState = existing.activityStates.some((state) => {
        const next = stateByNode.get(state.nodeId);
        return !next ||
          next.stateVersion < state.stateVersion ||
          (next.stateVersion === state.stateVersion && canonicalJson(next) !== canonicalJson(state));
      });
      const rewritesSession = existing.studySessions.some((session) => {
        const next = sessionById.get(session.sessionId);
        return !next
          || next.recordId !== session.recordId
          || next.pathId !== session.pathId
          || next.pathRevisionId !== session.pathRevisionId
          || next.pathRevisionDigest !== session.pathRevisionDigest
          || next.nodeId !== session.nodeId
          || next.activityId !== session.activityId
          || canonicalJson(next.worldRef) !== canonicalJson(session.worldRef)
          || next.startedAt !== session.startedAt
          || next.sessionVersion < session.sessionVersion
          || (
            next.sessionVersion === session.sessionVersion
            && canonicalJson(next) !== canonicalJson(session)
          )
          || (session.status === "completed" && next.status !== "completed");
      });
      const rewritesDelayedReturn = existing.delayedReturnTasks.some((task) => {
        const next = delayedReturnById.get(task.returnId);
        if (!next) return true;
        const immutableTask = {
          ...task,
          status: "scheduled" as const,
          completedAt: null,
        };
        const comparableNext = {
          ...next,
          status: "scheduled" as const,
          completedAt: null,
        };
        return canonicalJson(immutableTask) !== canonicalJson(comparableNext)
          || (task.status === "completed" && canonicalJson(next) !== canonicalJson(task))
          || (task.status === "scheduled" && next.status !== "scheduled" && next.status !== "completed");
      });
      if (rewritesRevision || rewritesDecision || rewritesState || rewritesSession || rewritesDelayedReturn ||
        Date.parse(parsed.data.updatedAt) < Date.parse(existing.updatedAt)) {
        return deepFreeze({ ok: false as const, ledger: before.ledger, reason: "history_rewrite" as const });
      }
      records[existingIndex] = parsed.data;
    }
    else records.push(parsed.data);
    return writeLedger(before.ledger, records, mode === "save" ? "saved" : "upserted");
  };

  return {
    read,
    save: (record) => mutateRecord(record, "save"),
    upsert: (record) => mutateRecord(record, "upsert"),
    delete: (recordId) => {
      const before = read();
      if (before.status === "storage_unavailable" || before.status === "storage_error") {
        return deepFreeze({ ok: false as const, ledger: before.ledger, reason: before.status });
      }
      if (before.status === "reset_malformed" || before.status === "reset_unknown_version") {
        return deepFreeze({ ok: false as const, ledger: before.ledger, reason: "recovery_required" as const });
      }
      const records = before.ledger.records.filter((record) => record.recordId !== recordId);
      if (records.length === before.ledger.records.length) {
        return deepFreeze({ ok: false as const, ledger: before.ledger, reason: "record_not_found" as const });
      }
      return writeLedger(before.ledger, records, "deleted");
    },
    clear: () => {
      const before = read();
      if (before.status === "storage_unavailable" || before.status === "storage_error") {
        return deepFreeze({ ok: false as const, ledger: before.ledger, reason: before.status });
      }
      const removed = persistence.remove();
      if (!removed.ok) {
        return deepFreeze({
          ok: false as const,
          ledger: before.ledger,
          reason: removed.reason === "unavailable" ? "storage_unavailable" as const : "storage_error" as const,
        });
      }
      return deepFreeze({ ok: true as const, ledger: emptyDeviceContinuityLedger(), operation: "cleared" as const });
    },
    export: (exportedAt) => {
      if (!timestampSchema.safeParse(exportedAt).success) {
        return deepFreeze({ ok: false as const, reason: "invalid_export_time" as const });
      }
      const current = read();
      if (current.status === "storage_unavailable" || current.status === "storage_error") {
        return deepFreeze({
          ok: false as const,
          reason: current.status === "storage_unavailable" ? "storage_unavailable" as const : "storage_error" as const,
        });
      }
      if (current.status === "reset_malformed" || current.status === "reset_unknown_version") {
        return deepFreeze({ ok: false as const, reason: "recovery_required" as const });
      }
      return deepFreeze({
        ok: true as const,
        value: deviceContinuityExportSchema.parse({
          format: DEVICE_CONTINUITY_EXPORT_FORMAT,
          schemaVersion: DEVICE_CONTINUITY_SCHEMA_VERSION,
          dataClass: "learner-owned-local-copy",
          exportedAt,
          records: current.ledger.records,
        }),
      });
    },
    exportUnreadable: () => {
      const persisted = persistence.read();
      if (!persisted.ok) {
        return deepFreeze({
          ok: false as const,
          reason: persisted.reason === "unavailable" ? "storage_unavailable" as const : "storage_error" as const,
        });
      }
      if (persisted.value === null || persisted.value.trim() === "") {
        return deepFreeze({ ok: false as const, reason: "no_recovery_data" as const });
      }
      const decoded = decodeDeviceContinuityLedger(persisted.value);
      if (decoded.status !== "reset_malformed" && decoded.status !== "reset_unknown_version") {
        return deepFreeze({ ok: false as const, reason: "no_recovery_data" as const });
      }
      return deepFreeze({ ok: true as const, raw: persisted.value, status: decoded.status });
    },
  };
}
