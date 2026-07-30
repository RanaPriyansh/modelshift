import { describe, expect, it } from "vitest";

import {
  createForceMotionDelayedReturnTask,
  delayedReturnTaskSchema,
  delayedReturnTiming,
  type StudySessionV1,
} from "../../forge/continuity";
import {
  createForceMotionReturnAttemptReceipt,
} from "../../forge/delayed-return/force-motion-return";
import type { EvidenceEntry, EvidenceLedgerMutationResult } from "../forge-evidence";
import type { DeviceContinuityRecordV1, DeviceContinuityStore } from "./device-store";
import {
  completeDeviceDelayedReturn,
  ensureDeviceDelayedReturn,
} from "./delayed-return-store";

const SCHEDULED_AT = "2026-07-24T13:00:00.000Z";
const DUE_AT = "2026-07-31T13:00:00.000Z";
const WINDOW_ENDS_AT = "2026-08-30T13:00:00.000Z";

function completedSession(): StudySessionV1 {
  return {
    schemaVersion: "study-session.v1",
    sessionId: "study-session.force-return-one",
    recordId: "continuity-record.force-return",
    pathId: "path.force-return",
    pathRevisionId: "path-revision.force-return-2",
    pathRevisionDigest: `sha256:${"a".repeat(64)}`,
    nodeId: "path-node.force-return-world",
    activityId: "activity.force-return-world",
    worldRef: {
      worldId: "world.force-and-motion",
      worldVersion: "1.0.2",
      worldRoute: "/learn/force-and-motion",
      activityProtocol: "modelshift",
      sourceIds: ["source.openstax.newtons-first-law"],
    },
    sessionVersion: 2,
    status: "completed",
    startedAt: "2026-07-24T12:00:00.000Z",
    updatedAt: "2026-07-24T13:01:00.000Z",
    completedAt: "2026-07-24T13:01:00.000Z",
    runtimeCorrelation: {
      schemaVersion: "study-runtime-correlation.v1",
      receiptSchemaVersion: "1.1.0",
      attemptId: "attempt.force-return-one",
      receiptRecordedAt: SCHEDULED_AT,
      worldId: "world.force-and-motion",
      worldVersion: "1.0.2",
      runtimeBindingDigest: `sha256:${"b".repeat(64)}`,
      packageIntegrityHash: `sha256:${"c".repeat(64)}`,
      evidenceEntryId: "proof.attempt.force-return-one",
    },
  };
}

function originEvidence(): EvidenceEntry {
  return {
    id: "proof.attempt.force-return-one",
    capabilityId: "capability.force-motion.zero-net-force",
    recordedAt: SCHEDULED_AT,
    source: { kind: "authored_activity", refId: "world.force-and-motion" },
    proof: {
      conditionId: "proof.force-motion.independent-transfer",
      mode: "independent_transfer",
      assistanceAccess: "removed",
      outcome: "proved",
    },
    assistance: [],
    sharing: { status: "private", updatedAt: SCHEDULED_AT },
    returnSchedule: null,
  };
}

function task() {
  const result = createForceMotionDelayedReturnTask({
    recordId: "continuity-record.force-return",
    pathId: "path.force-return",
    pathRevisionId: "path-revision.force-return-2",
    nodeId: "path-node.force-return-world",
    studySessionId: "study-session.force-return-one",
    originEvidenceEntryId: "proof.attempt.force-return-one",
    worldVersion: "1.0.2",
    scheduledAt: SCHEDULED_AT,
  });
  if (!result) throw new Error("Expected reviewed return task.");
  return result;
}

function record(tasks = [task()]): DeviceContinuityRecordV1 {
  return {
    recordId: "continuity-record.force-return",
    goal: {} as DeviceContinuityRecordV1["goal"],
    revisions: [] as DeviceContinuityRecordV1["revisions"],
    decisions: [],
    activityStates: [],
    studySessions: [completedSession()],
    delayedReturnTasks: tasks,
    currentRevisionId: "path-revision.force-return-2",
    updatedAt: SCHEDULED_AT,
  };
}

function storeFor(initial: DeviceContinuityRecordV1, options: { failWrite?: boolean } = {}) {
  let current = initial;
  const store = {
    read: () => ({
      status: "ok" as const,
      ledger: {
        format: "forge-device-continuity" as const,
        schemaVersion: 1 as const,
        records: [current],
      },
    }),
    upsert: (next: DeviceContinuityRecordV1) => {
      if (options.failWrite) {
        return { ok: false as const, ledger: store.read().ledger, reason: "storage_error" as const };
      }
      current = next;
      return { ok: true as const, ledger: { ...store.read().ledger, records: [current] }, operation: "upserted" as const };
    },
  } as unknown as DeviceContinuityStore;
  return { store, current: () => current };
}

function recorder(entries: EvidenceEntry[], duplicate = false) {
  return (entry: EvidenceEntry): EvidenceLedgerMutationResult => {
    const existing = entries.find((candidate) => candidate.id === entry.id);
    if (existing || duplicate) {
      return {
        ok: false,
        ledger: { schemaVersion: 1, entries },
        reason: "duplicate_entry",
        readStatus: "ok",
      };
    }
    entries.push(entry);
    return { ok: true, ledger: { schemaVersion: 1, entries }, readStatus: "ok" };
  };
}

describe("device-local delayed-return protocol", () => {
  it("schedules exactly once from one genuine completed session and exact proved evidence", () => {
    const initial = record([]);
    const memory = storeFor(initial);
    const first = ensureDeviceDelayedReturn({
      store: memory.store,
      record: initial,
      session: completedSession(),
      evidenceEntries: [originEvidence()],
    });
    expect(first).toMatchObject({ ok: true, operation: "scheduled", task: { dueAt: DUE_AT } });
    if (!first.ok || !first.task) throw new Error("Expected scheduled task.");
    expect(delayedReturnTiming(first.task, "2026-07-31T12:59:59.999Z")).toBe("upcoming");
    expect(delayedReturnTiming(first.task, DUE_AT)).toBe("due");
    expect(delayedReturnTiming(first.task, WINDOW_ENDS_AT)).toBe("due");
    expect(delayedReturnTiming(first.task, "2026-08-30T13:00:00.001Z")).toBe("expired");
    const second = ensureDeviceDelayedReturn({
      store: memory.store,
      record: memory.current(),
      session: completedSession(),
      evidenceEntries: [originEvidence()],
    });
    expect(second).toMatchObject({ ok: true, operation: "reused" });
    expect(memory.current().delayedReturnTasks).toHaveLength(1);
    expect(ensureDeviceDelayedReturn({
      store: memory.store,
      record: memory.current(),
      session: completedSession(),
      evidenceEntries: [{ ...originEvidence(), id: "proof.attempt.other" }],
    })).toMatchObject({ ok: true, operation: "not_eligible", task: null });
  });

  it("accepts the reviewed window boundary and rejects an attempt after it closes", () => {
    expect(createForceMotionReturnAttemptReceipt({
      task: task(),
      choiceId: "constant_positive_velocity",
      attemptedAt: WINDOW_ENDS_AT,
    })).not.toBeNull();
    expect(createForceMotionReturnAttemptReceipt({
      task: task(),
      choiceId: "constant_positive_velocity",
      attemptedAt: "2026-08-30T13:00:00.001Z",
    })).toBeNull();
    expect(delayedReturnTaskSchema.safeParse({
      ...task(),
      status: "completed",
      completedAt: "2026-08-30T13:00:00.001Z",
    }).success).toBe(false);
  });

  it("rejects early and cloned attempts, then records a due task exactly once with retry-safe evidence", () => {
    const memory = storeFor(record());
    const early = createForceMotionReturnAttemptReceipt({
      task: task(),
      choiceId: "constant_positive_velocity",
      attemptedAt: "2026-07-31T12:59:59.999Z",
    });
    expect(early).toBeNull();
    const receipt = createForceMotionReturnAttemptReceipt({
      task: task(),
      choiceId: "constant_positive_velocity",
      attemptedAt: DUE_AT,
    });
    if (!receipt) throw new Error("Expected due receipt.");
    const entries: EvidenceEntry[] = [];
    expect(completeDeviceDelayedReturn({
      store: memory.store,
      returnId: task().returnId,
      receipt: { ...receipt },
      completedAt: DUE_AT,
      recordReturnEvidence: recorder(entries),
    })).toMatchObject({ ok: false, reason: "invalid_return_receipt" });
    const first = completeDeviceDelayedReturn({
      store: memory.store,
      returnId: task().returnId,
      receipt,
      completedAt: DUE_AT,
      recordReturnEvidence: recorder(entries),
    });
    expect(first).toMatchObject({ ok: true, operation: "completed", evidenceEntryId: "return-proof.force-return-one" });
    expect(entries).toMatchObject([{
      source: { kind: "return_challenge", refId: task().returnId },
      proof: { mode: "return_proof", assistanceAccess: "removed", outcome: "proved" },
      assistance: [],
    }]);
    const retry = completeDeviceDelayedReturn({
      store: memory.store,
      returnId: task().returnId,
      receipt,
      completedAt: DUE_AT,
      recordReturnEvidence: recorder(entries, true),
    });
    expect(retry).toMatchObject({ ok: true, operation: "reused" });
    expect(memory.current().delayedReturnTasks[0]).toMatchObject({ status: "completed", completedAt: DUE_AT });

    const wrongMemory = storeFor(record());
    const wrongReceipt = createForceMotionReturnAttemptReceipt({
      task: task(),
      choiceId: "returns_to_zero",
      attemptedAt: DUE_AT,
    });
    if (!wrongReceipt) throw new Error("Expected due incorrect receipt.");
    const wrongEntries: EvidenceEntry[] = [];
    expect(completeDeviceDelayedReturn({
      store: wrongMemory.store,
      returnId: task().returnId,
      receipt: wrongReceipt,
      completedAt: DUE_AT,
      recordReturnEvidence: recorder(wrongEntries),
    })).toMatchObject({ ok: true, operation: "completed" });
    expect(wrongEntries[0]?.proof.outcome).toBe("not_proved");
  });

  it("does not claim a completed return when the exact local path projection cannot persist", () => {
    const memory = storeFor(record(), { failWrite: true });
    const originalReceipt = createForceMotionReturnAttemptReceipt({
      task: task(),
      choiceId: "not_sure",
      attemptedAt: DUE_AT,
    });
    if (!originalReceipt) throw new Error("Expected due receipt.");
    const entries: EvidenceEntry[] = [];
    expect(completeDeviceDelayedReturn({
      store: memory.store,
      returnId: task().returnId,
      receipt: originalReceipt,
      completedAt: DUE_AT,
      recordReturnEvidence: recorder(entries),
    })).toMatchObject({ ok: false, reason: "persistence_failed" });
    const laterAttemptedAt = "2026-07-31T13:00:01.000Z";
    const retryReceipt = createForceMotionReturnAttemptReceipt({
      task: task(),
      choiceId: "constant_positive_velocity",
      attemptedAt: laterAttemptedAt,
    });
    if (!retryReceipt) throw new Error("Expected later due receipt.");
    // The fixed evidence identity makes the first bounded entry the pending
    // receipt. A later UI retry replays that entry's exact timestamp and
    // outcome instead of claiming a second attempt.
    const retry = storeFor(record());
    expect(completeDeviceDelayedReturn({
      store: retry.store,
      returnId: task().returnId,
      receipt: retryReceipt,
      completedAt: laterAttemptedAt,
      recordReturnEvidence: recorder(entries, true),
    })).toMatchObject({ ok: true, operation: "completed" });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      recordedAt: DUE_AT,
      proof: { outcome: "open_question" },
    });
    expect(retry.current().delayedReturnTasks[0]).toMatchObject({
      status: "completed",
      completedAt: DUE_AT,
    });
  });
});
