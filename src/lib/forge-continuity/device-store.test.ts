import { describe, expect, it } from "vitest";

import { planForgeLearning } from "../forge-planner/planner";
import {
  applyPathDecision,
  compileContinuityFromPlan,
  createInitialActivityStates,
  type PathDecisionV1,
} from "../../forge/continuity";
import {
  DEVICE_CONTINUITY_FORMAT,
  DEVICE_CONTINUITY_SCHEMA_VERSION,
  MAX_DEVICE_CONTINUITY_RAW_BYTES,
  MAX_DEVICE_CONTINUITY_RECORDS,
  createDeviceContinuityRecord,
  createDeviceContinuityStore,
  decodeDeviceContinuityLedger,
  deviceContinuityLedgerSchema,
  type DeviceContinuityPersistence,
} from ".";

const NOW = "2026-07-24T12:00:00.000Z";

function memoryPersistence(options: {
  failRead?: boolean;
  failWrite?: boolean;
  unavailable?: boolean;
  initialValue?: string | null;
} = {}) {
  let value: string | null = options.initialValue ?? null;
  const persistence: DeviceContinuityPersistence = {
    read: () => options.failRead
      ? { ok: false, reason: options.unavailable ? "unavailable" : "read_failed" }
      : { ok: true, value },
    write: (next) => {
      if (options.failWrite) return { ok: false, reason: options.unavailable ? "unavailable" : "write_failed" };
      value = next;
      return { ok: true };
    },
    remove: () => {
      if (options.failWrite) return { ok: false, reason: options.unavailable ? "unavailable" : "write_failed" };
      value = null;
      return { ok: true };
    },
  };
  return { persistence, raw: () => value };
}

async function acceptedRecord(recordId = "continuity-record.ratios") {
  const plan = await planForgeLearning({
    question: "How do equivalent ratios work?",
    ageMode: "adult",
    depth: "standard",
    startingPoint: "I can multiply.",
    successShape: "I can solve a new map ratio without help.",
    currentKnowledge: "",
    practicalOutcome: "Resize a recipe.",
    timeAvailable: "45_min",
    modalityNeeds: ["text", "visual"],
    constraints: "",
    guardianManaged: false,
    sourceMode: "curated",
  }, { apiKey: "" });
  const goal = {
    schemaVersion: "learner-goal.v1" as const,
    goalId: "goal.ratios",
    storageClass: "learner-owned-device-local" as const,
    learnerWords: "Help me resize recipes without losing the relationship.",
    desiredOutcome: "Resize a recipe and explain it.",
    createdAt: NOW,
  };
  const compiled = await compileContinuityFromPlan(plan, goal, {
    pathId: "path.ratios",
    revisionId: "path-revision.ratios-1",
    compiledAt: NOW,
  });
  if (!compiled.ok) throw new Error("Expected grounded candidate.");
  const decision: PathDecisionV1 = {
    schemaVersion: "path-decision.v1",
    decisionId: "path-decision.ratios-accept",
    decision: "accept",
    pathId: compiled.revision.pathId,
    baseRevisionId: compiled.revision.revisionId,
    baseRevisionNumber: compiled.revision.revisionNumber,
    baseRevisionDigest: compiled.revision.revisionDigest,
    resultRevisionId: "path-revision.ratios-2",
    decidedAt: "2026-07-24T12:01:00.000Z",
  };
  const accepted = await applyPathDecision(compiled.revision, decision);
  if (!accepted.accepted) throw new Error("Expected accepted path.");
  const initialized = await createInitialActivityStates(accepted.revision, "2026-07-24T12:02:00.000Z");
  if (!initialized.ok) throw new Error("Expected activity states.");
  return createDeviceContinuityRecord({
    recordId,
    goal,
    revisions: [compiled.revision, accepted.revision],
    decisions: [decision],
    activityStates: initialized.states,
    currentRevisionId: accepted.revision.revisionId,
    updatedAt: "2026-07-24T12:02:00.000Z",
  });
}

describe("device-local continuity decoding", () => {
  it("quarantines malformed and unknown versions without treating them as records", () => {
    expect(decodeDeviceContinuityLedger("{not-json")).toMatchObject({
      status: "reset_malformed",
      ledger: { records: [] },
    });
    expect(decodeDeviceContinuityLedger(JSON.stringify({
      format: DEVICE_CONTINUITY_FORMAT,
      schemaVersion: 999,
      records: [{ rawChat: "must not survive" }],
    }))).toEqual({
      status: "reset_unknown_version",
      ledger: {
        format: DEVICE_CONTINUITY_FORMAT,
        schemaVersion: DEVICE_CONTINUITY_SCHEMA_VERSION,
        records: [],
      },
    });
  });

  it("never rewrites unreadable learner data during a read and requires explicit recovery", async () => {
    const raw = JSON.stringify({
      format: DEVICE_CONTINUITY_FORMAT,
      schemaVersion: 999,
      records: [{ rawChat: "unchanged recovery bytes" }],
    });
    const memory = memoryPersistence({ initialValue: raw });
    const store = createDeviceContinuityStore(memory.persistence);

    expect(store.read()).toMatchObject({ status: "reset_unknown_version", ledger: { records: [] } });
    expect(memory.raw()).toBe(raw);
    expect(store.exportUnreadable()).toEqual({
      ok: true,
      raw,
      status: "reset_unknown_version",
    });
    expect(store.save(await acceptedRecord())).toMatchObject({
      ok: false,
      reason: "recovery_required",
    });
    expect(memory.raw()).toBe(raw);
    expect(store.clear()).toMatchObject({ ok: true, operation: "cleared" });
    expect(memory.raw()).toBeNull();
  });

  it("rejects oversized raw storage before JSON parsing and preserves it for recovery", async () => {
    const raw = "x".repeat(MAX_DEVICE_CONTINUITY_RAW_BYTES + 1);
    const memory = memoryPersistence({ initialValue: raw });
    const store = createDeviceContinuityStore(memory.persistence);

    expect(store.read()).toMatchObject({ status: "reset_malformed", ledger: { records: [] } });
    expect(memory.raw()).toBe(raw);
    expect(store.exportUnreadable()).toEqual({ ok: true, raw, status: "reset_malformed" });
    expect(store.save(await acceptedRecord())).toMatchObject({
      ok: false,
      reason: "recovery_required",
    });
    expect(memory.raw()).toBe(raw);
  });

  it("enforces the bounded record ceiling", async () => {
    const record = await acceptedRecord();
    const records = Array.from({ length: MAX_DEVICE_CONTINUITY_RECORDS + 1 }, (_, index) => ({
      ...record,
      recordId: `continuity-record.ratios-${index + 1}`,
    }));
    expect(deviceContinuityLedgerSchema.safeParse({
      format: DEVICE_CONTINUITY_FORMAT,
      schemaVersion: DEVICE_CONTINUITY_SCHEMA_VERSION,
      records,
    }).success).toBe(false);
  });
});

describe("device-local continuity mutations", () => {
  it("makes save, upsert, export, and delete explicit and learner-controlled", async () => {
    const memory = memoryPersistence();
    const store = createDeviceContinuityStore(memory.persistence);
    const record = await acceptedRecord();

    expect(store.save(record)).toMatchObject({ ok: true, operation: "saved" });
    expect(store.save(record)).toMatchObject({ ok: false, reason: "record_exists" });
    const updated = { ...record, updatedAt: "2026-07-24T13:00:00.000Z" };
    expect(store.upsert(updated)).toMatchObject({
      ok: true,
      operation: "upserted",
      ledger: { records: [{ updatedAt: "2026-07-24T13:00:00.000Z" }] },
    });
    expect(store.upsert({
      ...updated,
      revisions: updated.revisions.map((revision, index) =>
        index === 0 ? { ...revision, title: "Silently rewritten history" } : revision),
      updatedAt: "2026-07-24T13:00:01.000Z",
    })).toMatchObject({ ok: false, reason: "history_rewrite" });
    expect(store.export("2026-07-24T13:01:00.000Z")).toMatchObject({
      ok: true,
      value: {
        dataClass: "learner-owned-local-copy",
        records: [{ goal: { learnerWords: record.goal.learnerWords } }],
      },
    });
    expect(store.delete(record.recordId)).toMatchObject({
      ok: true,
      operation: "deleted",
      ledger: { records: [] },
    });
    expect(store.delete(record.recordId)).toMatchObject({ ok: false, reason: "record_not_found" });
  });

  it("never claims a save when persistence fails", async () => {
    const memory = memoryPersistence({ failWrite: true });
    const store = createDeviceContinuityStore(memory.persistence);
    const record = await acceptedRecord();

    expect(store.save(record)).toEqual({
      ok: false,
      ledger: {
        format: DEVICE_CONTINUITY_FORMAT,
        schemaVersion: DEVICE_CONTINUITY_SCHEMA_VERSION,
        records: [],
      },
      reason: "storage_error",
    });
    expect(memory.raw()).toBeNull();
    expect(store.read()).toMatchObject({ status: "empty", ledger: { records: [] } });
  });

  it("reports unavailable reads without creating an optimistic empty save", async () => {
    const memory = memoryPersistence({ failRead: true, unavailable: true });
    const store = createDeviceContinuityStore(memory.persistence);
    const record = await acceptedRecord();
    expect(store.save(record)).toMatchObject({
      ok: false,
      reason: "storage_unavailable",
      ledger: { records: [] },
    });
  });
});
