import { deepFreeze } from "../../forge/deep-freeze";
import {
  completeStudySessionFromRuntimeReceipt,
  startOrReuseStudySession,
  studySessionSchema,
  type StudySessionV1,
} from "../../forge/continuity";
import type { BoundedLocalWorldRuntimeReceipt } from "../../forge/world-runtime";
import {
  recordWorldRuntimeReceipt,
  type EvidenceEntry,
  type RecordWorldRuntimeReceiptResult,
} from "../forge-evidence";
import {
  ensureDeviceDelayedReturn,
  projectDeviceDelayedReturn,
} from "./delayed-return-store";
import type {
  DeviceContinuityRecordV1,
  DeviceContinuityStore,
} from "./device-store";

type ReceiptRecorder = (
  receipt: BoundedLocalWorldRuntimeReceipt,
) => RecordWorldRuntimeReceiptResult;

function currentRevision(record: DeviceContinuityRecordV1) {
  return record.revisions.find(
    (revision) => revision.revisionId === record.currentRevisionId,
  ) ?? null;
}

function exactEvidenceEntry(
  result: RecordWorldRuntimeReceiptResult,
  receipt: BoundedLocalWorldRuntimeReceipt,
): EvidenceEntry | null {
  const evidenceEntryId = `proof.${receipt.attemptId}`;
  const entry = result.ledger.entries.find((candidate) => candidate.id === evidenceEntryId);
  if (
    !entry
    || entry.recordedAt !== receipt.recordedAt
    || entry.capabilityId !== receipt.world.capabilityId
    || entry.source.kind !== "authored_activity"
    || entry.source.refId !== receipt.world.id
    || entry.proof.conditionId !== receipt.world.proofClaimId
    || entry.proof.mode !== "independent_transfer"
    || entry.proof.assistanceAccess !== "removed"
  ) {
    return null;
  }
  return entry;
}

function readableRecord(
  store: DeviceContinuityStore,
  recordId: string,
) {
  const read = store.read();
  if (
    read.status === "storage_unavailable"
    || read.status === "storage_error"
    || read.status === "reset_malformed"
    || read.status === "reset_unknown_version"
  ) {
    return null;
  }
  return read.ledger.records.find((record) => record.recordId === recordId) ?? null;
}

export type StartDeviceStudySessionResult =
  | Readonly<{
      ok: true;
      operation: "created" | "reused";
      session: Readonly<StudySessionV1>;
      record: Readonly<DeviceContinuityRecordV1>;
    }>
  | Readonly<{
      ok: false;
      reason:
        | "continuity_unavailable"
        | "record_not_found"
        | "invalid_record"
        | "start_refused"
        | "persistence_failed";
    }>;

export async function startDeviceStudySession(input: {
  store: DeviceContinuityStore;
  recordId: string;
  nodeId: string;
  sessionId: string;
  startedAt: string;
}): Promise<StartDeviceStudySessionResult> {
  const record = readableRecord(input.store, input.recordId);
  if (!record) {
    const read = input.store.read();
    return deepFreeze({
      ok: false as const,
      reason: read.status === "ok" || read.status === "empty"
        ? "record_not_found" as const
        : "continuity_unavailable" as const,
    });
  }
  const revision = currentRevision(record);
  const state = record.activityStates.find((candidate) => candidate.nodeId === input.nodeId);
  if (!revision || !state || Date.parse(input.startedAt) < Date.parse(record.updatedAt)) {
    return deepFreeze({ ok: false as const, reason: "invalid_record" as const });
  }
  const started = await startOrReuseStudySession({
    recordId: record.recordId,
    revision,
    nodeId: input.nodeId,
    activityState: state,
    existingSessions: record.studySessions,
    sessionId: input.sessionId,
    startedAt: input.startedAt,
  });
  if (!started.ok) {
    return deepFreeze({ ok: false as const, reason: "start_refused" as const });
  }
  if (started.operation === "reused") {
    return deepFreeze({
      ok: true as const,
      operation: "reused" as const,
      session: started.session,
      record,
    });
  }

  const nextRecord = {
    ...record,
    activityStates: record.activityStates.map((candidate) =>
      candidate.nodeId === started.activityState.nodeId
        ? started.activityState
        : candidate),
    studySessions: [...record.studySessions, started.session],
    updatedAt: started.session.updatedAt,
  };
  const persisted = input.store.upsert(nextRecord);
  if (!persisted.ok) {
    return deepFreeze({ ok: false as const, reason: "persistence_failed" as const });
  }
  const saved = persisted.ledger.records.find(
    (candidate) => candidate.recordId === record.recordId,
  );
  if (!saved) {
    return deepFreeze({ ok: false as const, reason: "persistence_failed" as const });
  }
  return deepFreeze({
    ok: true as const,
    operation: "created" as const,
    session: started.session,
    record: saved,
  });
}

export type CompleteDeviceStudySessionResult =
  | Readonly<{
      ok: true;
      operation: "completed" | "reused";
      session: Readonly<StudySessionV1>;
      evidenceEntryId: string;
      delayedReturnId: string | null;
      record: Readonly<DeviceContinuityRecordV1>;
    }>
  | Readonly<{
      ok: false;
      reason:
        | "continuity_unavailable"
        | "session_not_found"
        | "invalid_session"
        | "invalid_runtime_receipt"
        | "evidence_not_recorded"
        | "delayed_return_not_scheduled"
        | "persistence_failed";
    }>;

export async function completeDeviceStudySession(input: {
  store: DeviceContinuityStore;
  sessionId: string;
  receipt: BoundedLocalWorldRuntimeReceipt;
  completedAt: string;
  recordReceipt?: ReceiptRecorder;
}): Promise<CompleteDeviceStudySessionResult> {
  const read = input.store.read();
  if (
    read.status === "storage_unavailable"
    || read.status === "storage_error"
    || read.status === "reset_malformed"
    || read.status === "reset_unknown_version"
  ) {
    return deepFreeze({ ok: false as const, reason: "continuity_unavailable" as const });
  }
  const matches = read.ledger.records.flatMap((record) =>
    record.studySessions
      .filter((session) => session.sessionId === input.sessionId)
      .map((session) => ({ record, session })));
  if (matches.length !== 1) {
    return deepFreeze({ ok: false as const, reason: "session_not_found" as const });
  }
  const { record, session } = matches[0]!;
  const correlationAlreadyUsedElsewhere = read.ledger.records.some((candidateRecord) =>
    candidateRecord.studySessions.some((candidateSession) =>
      candidateSession.sessionId !== session.sessionId
      && (
        candidateSession.runtimeCorrelation?.attemptId === input.receipt.attemptId
        || candidateSession.runtimeCorrelation?.evidenceEntryId
          === `proof.${input.receipt.attemptId}`
      )));
  if (correlationAlreadyUsedElsewhere) {
    return deepFreeze({ ok: false as const, reason: "invalid_session" as const });
  }
  const revision = record.revisions.find(
    (candidate) => candidate.revisionId === session.pathRevisionId,
  );
  if (!revision) {
    return deepFreeze({ ok: false as const, reason: "invalid_session" as const });
  }

  if (session.status === "completed") {
    const projected = (input.recordReceipt ?? recordWorldRuntimeReceipt)(input.receipt);
    const evidence = exactEvidenceEntry(projected, input.receipt);
    if (
      !evidence
      || (
        !projected.ok
        && projected.reason !== "duplicate_entry"
      )
      || session.runtimeCorrelation?.attemptId !== input.receipt.attemptId
      || session.runtimeCorrelation.evidenceEntryId !== evidence.id
    ) {
      return deepFreeze({ ok: false as const, reason: "invalid_runtime_receipt" as const });
    }
    const delayedReturn = ensureDeviceDelayedReturn({
      store: input.store,
      record,
      session,
      evidenceEntries: projected.ledger.entries,
    });
    if (!delayedReturn.ok) {
      return deepFreeze({ ok: false as const, reason: "delayed_return_not_scheduled" as const });
    }
    const refreshed = readableRecord(input.store, record.recordId);
    if (!refreshed) {
      return deepFreeze({ ok: false as const, reason: "persistence_failed" as const });
    }
    return deepFreeze({
      ok: true as const,
      operation: "reused" as const,
      session,
      evidenceEntryId: evidence.id,
      delayedReturnId: delayedReturn.task?.returnId ?? null,
      record: refreshed,
    });
  }

  const evidenceEntryId = `proof.${input.receipt.attemptId}`;
  const completion = await completeStudySessionFromRuntimeReceipt({
    revision,
    activityStates: record.activityStates,
    session,
    receipt: input.receipt,
    evidenceEntryId,
    completedAt: input.completedAt,
  });
  if (!completion.ok) {
    return deepFreeze({
      ok: false as const,
      reason: completion.reason === "invalid_runtime_receipt"
        || completion.reason === "receipt_binding_mismatch"
        ? "invalid_runtime_receipt" as const
        : "invalid_session" as const,
    });
  }

  const projected = (input.recordReceipt ?? recordWorldRuntimeReceipt)(input.receipt);
  const projectionFailure = projected.ok ? null : projected.reason;
  if (
    (projectionFailure !== null && projectionFailure !== "duplicate_entry")
    || !exactEvidenceEntry(projected, input.receipt)
  ) {
    return deepFreeze({
      ok: false as const,
      reason: projectionFailure === "invalid_runtime_receipt"
        ? "invalid_runtime_receipt" as const
        : "evidence_not_recorded" as const,
    });
  }

  const completedRecord = {
    ...record,
    activityStates: [...completion.activityStates],
    studySessions: record.studySessions.map((candidate) =>
      candidate.sessionId === completion.session.sessionId
        ? completion.session
        : candidate),
    updatedAt: completion.session.updatedAt,
  };
  const parsedSession = studySessionSchema.safeParse(completion.session);
  if (!parsedSession.success) {
    return deepFreeze({ ok: false as const, reason: "invalid_session" as const });
  }
  const delayedReturn = projectDeviceDelayedReturn({
    record: completedRecord,
    session: parsedSession.data,
    evidenceEntries: projected.ledger.entries,
  });
  if (!delayedReturn.ok) {
    return deepFreeze({ ok: false as const, reason: "delayed_return_not_scheduled" as const });
  }
  // Completion and any eligible delayed return share one validated continuity
  // envelope. No readable state can expose a completed session before its
  // deterministic return task exists.
  const persisted = input.store.upsert(delayedReturn.record);
  if (!persisted.ok) {
    return deepFreeze({ ok: false as const, reason: "persistence_failed" as const });
  }
  const saved = persisted.ledger.records.find(
    (candidate) => candidate.recordId === record.recordId,
  );
  if (!saved) {
    return deepFreeze({ ok: false as const, reason: "persistence_failed" as const });
  }
  return deepFreeze({
    ok: true as const,
    operation: "completed" as const,
    session: parsedSession.data,
    evidenceEntryId: completion.evidenceEntryId,
    delayedReturnId: delayedReturn.task?.returnId ?? null,
    record: saved,
  });
}
