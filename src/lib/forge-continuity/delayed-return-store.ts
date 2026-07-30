import { canonicalJson } from "../../forge/events";
import {
  createForceMotionDelayedReturnTask,
  delayedReturnTaskSchema,
  delayedReturnTiming,
  type DelayedReturnTaskV1,
} from "../../forge/continuity/delayed-return";
import type { StudySessionV1 } from "../../forge/continuity/study-session";
import {
  createEvidenceLedgerStore,
  createLocalStorageEvidenceLedgerAdapter,
  type EvidenceEntry,
  type EvidenceLedgerMutationResult,
} from "../forge-evidence";
import {
  verifyForceMotionReturnAttemptReceipt,
  type ForceMotionReturnAttemptReceipt,
} from "../../forge/delayed-return/force-motion-return";
import { FORCE_AND_MOTION_WORLD } from "../../forge/worlds";
import { deepFreeze } from "../../forge/deep-freeze";
import type { DeviceContinuityRecordV1, DeviceContinuityStore } from "./device-store";

type ReturnEvidenceRecorder = (entry: EvidenceEntry) => EvidenceLedgerMutationResult;

function defaultReturnEvidenceRecorder(entry: EvidenceEntry): EvidenceLedgerMutationResult {
  return createEvidenceLedgerStore(createLocalStorageEvidenceLedgerAdapter()).append(entry);
}

function exactOriginEvidence(
  evidence: EvidenceEntry | null,
  session: StudySessionV1,
): boolean {
  return evidence !== null
    && evidence.id === session.runtimeCorrelation?.evidenceEntryId
    && evidence.recordedAt === session.runtimeCorrelation?.receiptRecordedAt
    && evidence.capabilityId === "capability.force-motion.zero-net-force"
    && evidence.source.kind === "authored_activity"
    && evidence.source.refId === "world.force-and-motion"
    && evidence.proof.conditionId === "proof.force-motion.independent-transfer"
    && evidence.proof.mode === "independent_transfer"
    && evidence.proof.assistanceAccess === "removed"
    && evidence.proof.outcome === "proved";
}

function findExactOriginEvidence(
  entries: readonly EvidenceEntry[],
  session: StudySessionV1,
): EvidenceEntry | null {
  const matches = entries.filter((entry) => entry.id === session.runtimeCorrelation?.evidenceEntryId);
  return matches.length === 1 && exactOriginEvidence(matches[0]!, session) ? matches[0]! : null;
}

function eligibleTask(
  record: DeviceContinuityRecordV1,
  session: StudySessionV1,
  originEvidence: EvidenceEntry | null,
): DelayedReturnTaskV1 | null {
  const policy = FORCE_AND_MOTION_WORLD.manifest.returnProof;
  if (!policy.enabled || !("taskFamilyId" in policy)) return null;
  if (
    policy.taskFamilyId !== "task-family.force-motion.delayed-velocity-return.v1"
    || session.status !== "completed"
    || session.worldRef.worldId !== FORCE_AND_MOTION_WORLD.manifest.id
    || session.worldRef.worldVersion !== FORCE_AND_MOTION_WORLD.manifest.version
    || !session.runtimeCorrelation
    || !exactOriginEvidence(originEvidence, session)
  ) {
    return null;
  }
  return createForceMotionDelayedReturnTask({
    recordId: record.recordId,
    pathId: session.pathId,
    pathRevisionId: session.pathRevisionId,
    nodeId: session.nodeId,
    studySessionId: session.sessionId,
    originEvidenceEntryId: session.runtimeCorrelation.evidenceEntryId,
    worldVersion: session.worldRef.worldVersion,
    scheduledAt: session.runtimeCorrelation.receiptRecordedAt,
  });
}

export type EnsureDelayedReturnResult =
  | Readonly<{ ok: true; task: Readonly<DelayedReturnTaskV1> | null; operation: "scheduled" | "reused" | "not_eligible" }>
  | Readonly<{ ok: false; reason: "invalid_origin" | "persistence_failed" }>;

type ProjectDelayedReturnResult =
  | Readonly<{
      ok: true;
      task: Readonly<DelayedReturnTaskV1> | null;
      operation: "scheduled" | "reused" | "not_eligible";
      record: Readonly<DeviceContinuityRecordV1>;
    }>
  | Readonly<{ ok: false; reason: "invalid_origin" }>;

/**
 * Purely projects the return task into the same record envelope as its
 * completed session. The caller decides when that complete envelope persists.
 */
export function projectDeviceDelayedReturn(input: {
  record: DeviceContinuityRecordV1;
  session: StudySessionV1;
  evidenceEntries: readonly EvidenceEntry[];
}): ProjectDelayedReturnResult {
  const originEvidence = findExactOriginEvidence(input.evidenceEntries, input.session);
  const task = eligibleTask(input.record, input.session, originEvidence);
  if (!task) {
    return deepFreeze({
      ok: true as const,
      task: null,
      operation: "not_eligible" as const,
      record: input.record,
    });
  }
  const matching = input.record.delayedReturnTasks.filter(
    (candidate) => candidate.studySessionId === input.session.sessionId,
  );
  if (matching.length === 1) {
    return canonicalJson(matching[0]) === canonicalJson(task)
      ? deepFreeze({
          ok: true as const,
          task: matching[0]!,
          operation: "reused" as const,
          record: input.record,
        })
      : deepFreeze({ ok: false as const, reason: "invalid_origin" as const });
  }
  if (matching.length > 1) {
    return deepFreeze({ ok: false as const, reason: "invalid_origin" as const });
  }
  return deepFreeze({
    ok: true as const,
    task,
    operation: "scheduled" as const,
    record: {
      ...input.record,
      delayedReturnTasks: [...input.record.delayedReturnTasks, task],
      // The receipt time is never allowed to rewrite the path's later state.
      updatedAt: input.record.updatedAt,
    },
  });
}

/**
 * Scheduling is intentionally called only from the study-session receipt
 * coordinator. There is no public "schedule a return" control: a task can
 * exist only when this exact completed session has an exact proved receipt.
 */
export function ensureDeviceDelayedReturn(input: {
  store: DeviceContinuityStore;
  record: DeviceContinuityRecordV1;
  session: StudySessionV1;
  evidenceEntries: readonly EvidenceEntry[];
}): EnsureDelayedReturnResult {
  const projected = projectDeviceDelayedReturn({
    record: input.record,
    session: input.session,
    evidenceEntries: input.evidenceEntries,
  });
  if (!projected.ok) return projected;
  if (projected.operation !== "scheduled") {
    return deepFreeze({
      ok: true as const,
      task: projected.task,
      operation: projected.operation,
    });
  }
  const persisted = input.store.upsert(projected.record);
  if (!persisted.ok) return deepFreeze({ ok: false as const, reason: "persistence_failed" as const });
  const saved = persisted.ledger.records.find((record) => record.recordId === input.record.recordId);
  const savedTask = saved?.delayedReturnTasks.find(
    (candidate) => candidate.returnId === projected.task?.returnId,
  );
  if (!savedTask) return deepFreeze({ ok: false as const, reason: "persistence_failed" as const });
  return deepFreeze({ ok: true as const, task: savedTask, operation: "scheduled" as const });
}

function returnEvidenceFor(
  task: DelayedReturnTaskV1,
  receipt: ForceMotionReturnAttemptReceipt,
): EvidenceEntry {
  return {
    id: task.returnEvidenceEntryId,
    capabilityId: task.capabilityId,
    recordedAt: receipt.attemptedAt,
    source: { kind: "return_challenge", refId: task.returnId },
    proof: {
      conditionId: task.proofClaimId,
      mode: "return_proof",
      assistanceAccess: "removed",
      outcome: receipt.outcome,
    },
    assistance: [],
    sharing: { status: "private", updatedAt: receipt.attemptedAt },
    returnSchedule: null,
  };
}

function exactReturnEvidence(
  entry: EvidenceEntry | undefined,
  expected: EvidenceEntry,
): boolean {
  return entry !== undefined && canonicalJson(entry) === canonicalJson(expected);
}

function exactPendingReturnEvidence(
  entry: EvidenceEntry | undefined,
  task: DelayedReturnTaskV1,
): entry is EvidenceEntry {
  return entry !== undefined
    && entry.id === task.returnEvidenceEntryId
    && entry.capabilityId === task.capabilityId
    && entry.source.kind === "return_challenge"
    && entry.source.refId === task.returnId
    && entry.proof.conditionId === task.proofClaimId
    && entry.proof.mode === "return_proof"
    && entry.proof.assistanceAccess === "removed"
    && entry.assistance.length === 0
    && entry.sharing.status === "private"
    && entry.sharing.updatedAt === entry.recordedAt
    && entry.returnSchedule === null
    && delayedReturnTiming(task, entry.recordedAt) === "due";
}

export type CompleteDeviceDelayedReturnResult =
  | Readonly<{
      ok: true;
      operation: "completed" | "reused";
      task: Readonly<DelayedReturnTaskV1>;
      record: Readonly<DeviceContinuityRecordV1>;
      evidenceEntryId: string;
    }>
  | Readonly<{
      ok: false;
      reason:
        | "continuity_unavailable"
        | "return_not_found"
        | "return_not_due"
        | "invalid_return_receipt"
        | "invalid_completion_time"
        | "evidence_not_recorded"
        | "persistence_failed";
    }>;

export function completeDeviceDelayedReturn(input: {
  store: DeviceContinuityStore;
  returnId: string;
  receipt: ForceMotionReturnAttemptReceipt;
  completedAt: string;
  recordReturnEvidence?: ReturnEvidenceRecorder;
}): CompleteDeviceDelayedReturnResult {
  const read = input.store.read();
  if (
    read.status === "storage_unavailable"
    || read.status === "storage_error"
    || read.status === "reset_malformed"
    || read.status === "reset_unknown_version"
  ) return deepFreeze({ ok: false as const, reason: "continuity_unavailable" as const });

  const matches = read.ledger.records.flatMap((record) =>
    record.delayedReturnTasks
      .filter((task) => task.returnId === input.returnId)
      .map((task) => ({ record, task })));
  if (matches.length !== 1) return deepFreeze({ ok: false as const, reason: "return_not_found" as const });
  const { record, task } = matches[0]!;
  if (!verifyForceMotionReturnAttemptReceipt(input.receipt)
    || input.receipt.returnId !== task.returnId
    || input.receipt.taskFamilyId !== task.taskFamilyId
    || input.completedAt !== input.receipt.attemptedAt
  ) return deepFreeze({ ok: false as const, reason: "invalid_return_receipt" as const });
  if (Date.parse(input.completedAt) < Date.parse(record.updatedAt)) {
    return deepFreeze({ ok: false as const, reason: "invalid_completion_time" as const });
  }

  const expectedEvidence = returnEvidenceFor(task, input.receipt);
  if (task.status === "completed" && task.completedAt !== input.completedAt) {
    return deepFreeze({ ok: false as const, reason: "invalid_return_receipt" as const });
  }
  if (task.status === "scheduled" && delayedReturnTiming(task, input.completedAt) !== "due") {
    return deepFreeze({ ok: false as const, reason: "return_not_due" as const });
  }
  const recorded = (input.recordReturnEvidence ?? defaultReturnEvidenceRecorder)(expectedEvidence);
  const evidence = recorded.ledger.entries.find((entry) => entry.id === expectedEvidence.id);
  const isExactNewEvidence = exactReturnEvidence(evidence, expectedEvidence);
  const isExactPendingReplay = !recorded.ok
    && recorded.reason === "duplicate_entry"
    && exactPendingReturnEvidence(evidence, task);
  if ((!recorded.ok && recorded.reason !== "duplicate_entry")
    || (!isExactNewEvidence && !isExactPendingReplay)) {
    return deepFreeze({ ok: false as const, reason: "evidence_not_recorded" as const });
  }
  const completionTime = isExactPendingReplay ? evidence.recordedAt : input.completedAt;

  if (task.status === "completed") {
    return deepFreeze({
      ok: true as const,
      operation: "reused" as const,
      task,
      record,
      evidenceEntryId: expectedEvidence.id,
    });
  }

  const completedTask = delayedReturnTaskSchema.parse({
    ...task,
    status: "completed",
    completedAt: completionTime,
  });
  const updatedAt = Date.parse(record.updatedAt) > Date.parse(completionTime)
    ? record.updatedAt
    : completionTime;
  const persisted = input.store.upsert({
    ...record,
    delayedReturnTasks: record.delayedReturnTasks.map((candidate) =>
      candidate.returnId === completedTask.returnId ? completedTask : candidate),
    updatedAt,
  });
  if (!persisted.ok) {
    // The exact bounded evidence entry is the pending receipt. A retry replays
    // its original timestamp and outcome; it never invents a second attempt.
    return deepFreeze({ ok: false as const, reason: "persistence_failed" as const });
  }
  const saved = persisted.ledger.records.find((candidate) => candidate.recordId === record.recordId);
  const savedTask = saved?.delayedReturnTasks.find((candidate) => candidate.returnId === completedTask.returnId);
  if (!saved || !savedTask) return deepFreeze({ ok: false as const, reason: "persistence_failed" as const });
  return deepFreeze({
    ok: true as const,
    operation: "completed" as const,
    task: savedTask,
    record: saved,
    evidenceEntryId: expectedEvidence.id,
  });
}
