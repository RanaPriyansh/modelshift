import { afterEach, describe, expect, it, vi } from "vitest";

import {
  applyPathDecision,
  compileContinuityFromPlan,
  createInitialActivityStates,
  type PathDecisionV1,
} from "../../forge/continuity";
import {
  createWorldRuntimeSession,
  dispatchWorldRuntimeCommand,
  forceAndMotionWorldRuntimeAdapter,
  proportionalReasoningWorldRuntimeAdapter,
  type BoundedLocalWorldRuntimeReceipt,
} from "../../forge/world-runtime";
import type { LearningEvent } from "../../domain/learning";
import type { RatioWorldEvent } from "../../worlds/proportional-reasoning";
import { createEvidenceLedgerStore } from "../forge-evidence/store";
import { createLocalStorageEvidenceLedgerAdapter } from "../forge-evidence/local-storage";
import { planForgeLearning } from "../forge-planner/planner";
import {
  createDeviceContinuityRecord,
  createDeviceContinuityStore,
  type DeviceContinuityPersistence,
} from "./device-store";
import {
  completeDeviceStudySession,
  startDeviceStudySession,
} from "./study-session-store";

const BASE_TIME = "2026-07-24T12:00:00.000Z";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

function memoryPersistence(
  initialValue: string | null = null,
  options: { failWriteNumber?: number } = {},
) {
  let value = initialValue;
  let writes = 0;
  const persistence: DeviceContinuityPersistence = {
    read: () => ({ ok: true, value }),
    write: (next) => {
      writes += 1;
      if (writes === options.failWriteNumber) {
        return { ok: false as const, reason: "write_failed" as const };
      }
      value = next;
      return { ok: true };
    },
    remove: () => {
      value = null;
      return { ok: true };
    },
  };
  return { persistence, raw: () => value, writes: () => writes };
}

async function acceptedRecord(
  recordId = "continuity-record.session-ratios",
  topic: "ratios" | "force" = "ratios",
) {
  const plan = await planForgeLearning({
    question: topic === "force"
      ? "How do force, motion, and velocity relate after a push ends?"
      : "How do equivalent ratios work?",
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
    goalId: "goal.session-ratios",
    storageClass: "learner-owned-device-local" as const,
    learnerWords: "Help me resize recipes without losing the relationship.",
    desiredOutcome: "Resize a recipe and explain it.",
    createdAt: BASE_TIME,
  };
  const suffix = recordId.split(".").at(-1)!.replaceAll("_", "-");
  const compiled = await compileContinuityFromPlan(plan, goal, {
    pathId: `path.${suffix}`,
    revisionId: `path-revision.${suffix}-1`,
    compiledAt: BASE_TIME,
  });
  if (!compiled.ok) throw new Error("Expected grounded candidate.");
  const decision: PathDecisionV1 = {
    schemaVersion: "path-decision.v1",
    decisionId: `path-decision.${suffix}-accept`,
    decision: "accept",
    pathId: compiled.revision.pathId,
    baseRevisionId: compiled.revision.revisionId,
    baseRevisionNumber: compiled.revision.revisionNumber,
    baseRevisionDigest: compiled.revision.revisionDigest,
    resultRevisionId: `path-revision.${suffix}-2`,
    decidedAt: "2026-07-24T12:01:00.000Z",
  };
  const accepted = await applyPathDecision(compiled.revision, decision);
  if (!accepted.accepted) throw new Error("Expected accepted path.");
  const initialized = await createInitialActivityStates(
    accepted.revision,
    "2026-07-24T12:02:00.000Z",
  );
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

function completedForceReceipt(
  attemptId = "attempt.path-session-force",
): BoundedLocalWorldRuntimeReceipt {
  let runtime = createWorldRuntimeSession(forceAndMotionWorldRuntimeAdapter, attemptId);
  const events: readonly LearningEvent[] = [
    { type: "START" },
    { type: "COMMIT_PREDICTION", predictionId: "gradually_slows", confidence: 65 },
    { type: "COMMIT_EXPLANATION", explanation: "A continuing push seems to set speed." },
    { type: "INTERPRETATION_FAILED", reason: "timeout" },
    { type: "COMMIT_PROBE_PREDICTION", predictionId: "friction_changes_velocity" },
    { type: "RUN_EXPERIMENT" },
    { type: "OBSERVE_EXPERIMENT" },
    {
      type: "SUBMIT_REFLECTION",
      reflection: "The push stops changing velocity when the force ends.",
    },
    {
      type: "SUBMIT_RECONSTRUCTION",
      reconstruction: "Net force changes acceleration while zero net force leaves velocity constant.",
    },
    { type: "CONTINUE_TO_COLD_TRANSFER" },
    {
      type: "SUBMIT_TRANSFER",
      choiceId: "stays_constant_after_force",
      explanation: "Velocity stays flat after force returns to zero.",
    },
  ];
  for (const event of events) {
    const dispatched = dispatchWorldRuntimeCommand(
      forceAndMotionWorldRuntimeAdapter,
      runtime,
      { kind: "domain", event },
    );
    if (!dispatched.accepted) throw new Error(`Runtime rejected ${event.type}.`);
    runtime = dispatched.session;
  }
  if (!runtime.receipt) throw new Error("Expected bounded force receipt.");
  return runtime.receipt;
}

function completedRatioReceipt(
  attemptId = "attempt.path-session-ratios",
): BoundedLocalWorldRuntimeReceipt {
  let runtime = createWorldRuntimeSession(
    proportionalReasoningWorldRuntimeAdapter,
    attemptId,
  );
  const events: readonly RatioWorldEvent[] = [
    { type: "COMMIT_INITIAL", predictionId: "same_strength", confidence: 65 },
    {
      type: "COMMIT_EXPLANATION",
      explanation: "Both quantities need the same scale factor.",
    },
    { type: "COMMIT_TEST_PREDICTION", predictionId: "same_strength" },
    { type: "RUN_EXPERIMENT" },
    { type: "BEGIN_RECONSTRUCTION" },
    {
      type: "SUBMIT_RECONSTRUCTION",
      reconstruction: "A relationship stays proportional when both quantities scale equally.",
    },
    { type: "ACKNOWLEDGE_WITHDRAWAL" },
    {
      type: "SUBMIT_TRANSFER",
      choiceId: "32_km",
      explanation: "Twelve is four times three, so eight scales to thirty-two.",
      confidence: 85,
    },
  ];
  for (const event of events) {
    const dispatched = dispatchWorldRuntimeCommand(
      proportionalReasoningWorldRuntimeAdapter,
      runtime,
      { kind: "domain", event },
    );
    if (!dispatched.accepted) throw new Error(`Runtime rejected ${event.type}.`);
    runtime = dispatched.session;
  }
  if (!runtime.receipt) throw new Error("Expected bounded runtime receipt.");
  return runtime.receipt;
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("device-local StudySession composition", () => {
  it("creates and reuses one opaque session while denying manual completion", async () => {
    const memory = memoryPersistence();
    const store = createDeviceContinuityStore(memory.persistence);
    const record = await acceptedRecord();
    expect(store.save(record)).toMatchObject({ ok: true });
    const nodeId = record.activityStates[0]!.nodeId;

    const first = await startDeviceStudySession({
      store,
      recordId: record.recordId,
      nodeId,
      sessionId: "study-session.ratios-one",
      startedAt: "2026-07-24T12:03:00.000Z",
    });
    expect(first).toMatchObject({
      ok: true,
      operation: "created",
      session: {
        sessionVersion: 1,
        status: "active",
        runtimeCorrelation: null,
      },
      record: {
        activityStates: [{ status: "in_progress", stateVersion: 2 }],
      },
    });

    const reused = await startDeviceStudySession({
      store,
      recordId: record.recordId,
      nodeId,
      sessionId: "study-session.ignored-new-id",
      startedAt: "2026-07-24T12:04:00.000Z",
    });
    expect(reused).toMatchObject({
      ok: true,
      operation: "reused",
      session: { sessionId: "study-session.ratios-one", sessionVersion: 1 },
    });

    if (!first.ok) throw new Error("Expected active session.");
    expect(store.upsert({
      ...first.record,
      activityStates: first.record.activityStates.map((state) => ({
        ...state,
        stateVersion: state.stateVersion + 1,
        status: "completed",
        updatedAt: "2026-07-24T12:05:00.000Z",
      })),
      updatedAt: "2026-07-24T12:05:00.000Z",
    })).toMatchObject({ ok: false, reason: "invalid_record" });
    expect(memory.raw()).toContain('"status":"in_progress"');
  });

  it("lets only a genuine runtime receipt create evidence identity and complete the exact path node", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-24T13:00:00.000Z"));
    const evidenceStorage = new MemoryStorage();
    vi.stubGlobal("window", { localStorage: evidenceStorage });

    const memory = memoryPersistence();
    const store = createDeviceContinuityStore(memory.persistence);
    const record = await acceptedRecord();
    store.save(record);
    const started = await startDeviceStudySession({
      store,
      recordId: record.recordId,
      nodeId: record.activityStates[0]!.nodeId,
      sessionId: "study-session.ratios-genuine",
      startedAt: "2026-07-24T12:03:00.000Z",
    });
    expect(started.ok).toBe(true);

    const receipt = completedRatioReceipt();
    const completed = await completeDeviceStudySession({
      store,
      sessionId: "study-session.ratios-genuine",
      receipt,
      completedAt: "2026-07-24T13:01:00.000Z",
    });
    expect(completed).toMatchObject({
      ok: true,
      operation: "completed",
      evidenceEntryId: `proof.${receipt.attemptId}`,
      session: {
        sessionVersion: 2,
        status: "completed",
        runtimeCorrelation: {
          attemptId: receipt.attemptId,
          worldId: "world.proportional-reasoning",
        },
      },
      record: { activityStates: [{ status: "completed", stateVersion: 3 }] },
    });
    expect(createEvidenceLedgerStore(
      createLocalStorageEvidenceLedgerAdapter({ storage: evidenceStorage }),
    ).read().ledger.entries).toEqual([
      expect.objectContaining({ id: `proof.${receipt.attemptId}` }),
    ]);

    expect(await completeDeviceStudySession({
      store,
      sessionId: "study-session.ratios-genuine",
      receipt,
      completedAt: "2026-07-24T13:02:00.000Z",
    })).toMatchObject({ ok: true, operation: "reused" });

    const second = await acceptedRecord("continuity-record.session-ratios-two");
    expect(store.save(second)).toMatchObject({ ok: true });
    expect(await startDeviceStudySession({
      store,
      recordId: second.recordId,
      nodeId: second.activityStates[0]!.nodeId,
      sessionId: "study-session.ratios-two",
      startedAt: "2026-07-24T12:03:00.000Z",
    })).toMatchObject({ ok: true });
    expect(await completeDeviceStudySession({
      store,
      sessionId: "study-session.ratios-two",
      receipt,
      completedAt: "2026-07-24T13:03:00.000Z",
    })).toMatchObject({ ok: false, reason: "invalid_session" });
  });

  it("rejects a structurally valid receipt clone without the runtime attestation sidecar", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-24T13:00:00.000Z"));
    const evidenceStorage = new MemoryStorage();
    vi.stubGlobal("window", { localStorage: evidenceStorage });

    const memory = memoryPersistence();
    const store = createDeviceContinuityStore(memory.persistence);
    const record = await acceptedRecord();
    store.save(record);
    await startDeviceStudySession({
      store,
      recordId: record.recordId,
      nodeId: record.activityStates[0]!.nodeId,
      sessionId: "study-session.ratios-clone",
      startedAt: "2026-07-24T12:03:00.000Z",
    });
    const receipt = completedRatioReceipt("attempt.path-session-clone");
    const clonedReceipt = { ...receipt };

    expect(await completeDeviceStudySession({
      store,
      sessionId: "study-session.ratios-clone",
      receipt: clonedReceipt,
      completedAt: "2026-07-24T13:01:00.000Z",
    })).toMatchObject({ ok: false, reason: "invalid_runtime_receipt" });
    expect(store.read().ledger.records[0]).toMatchObject({
      activityStates: [{ status: "in_progress" }],
      studySessions: [{ status: "active", runtimeCorrelation: null }],
    });
    expect(createEvidenceLedgerStore(
      createLocalStorageEvidenceLedgerAdapter({ storage: evidenceStorage }),
    ).read().ledger.entries).toHaveLength(0);
  });

  it("fails closed before evidence projection when continuity recovery is required", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-24T13:00:00.000Z"));
    const evidenceStorage = new MemoryStorage();
    vi.stubGlobal("window", { localStorage: evidenceStorage });
    const raw = '{"format":"forge-device-continuity","schemaVersion":999,"records":[]}';
    const memory = memoryPersistence(raw);
    const store = createDeviceContinuityStore(memory.persistence);

    expect(await completeDeviceStudySession({
      store,
      sessionId: "study-session.unreadable",
      receipt: completedRatioReceipt("attempt.unreadable-session"),
      completedAt: "2026-07-24T13:01:00.000Z",
    })).toMatchObject({ ok: false, reason: "continuity_unavailable" });
    expect(memory.raw()).toBe(raw);
    expect(evidenceStorage.getItem("forge.evidence-ledger")).toBeNull();
  });

  it("persists force completion and its deterministic delayed return in one continuity envelope", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-24T13:00:00.000Z"));
    const evidenceStorage = new MemoryStorage();
    vi.stubGlobal("window", { localStorage: evidenceStorage });

    const memory = memoryPersistence();
    const store = createDeviceContinuityStore(memory.persistence);
    const record = await acceptedRecord("continuity-record.session-force", "force");
    expect(store.save(record)).toMatchObject({ ok: true });
    expect(await startDeviceStudySession({
      store,
      recordId: record.recordId,
      nodeId: record.activityStates[0]!.nodeId,
      sessionId: "study-session.force-atomic",
      startedAt: "2026-07-24T12:03:00.000Z",
    })).toMatchObject({ ok: true });
    const writesBeforeCompletion = memory.writes();

    const receipt = completedForceReceipt();
    const completed = await completeDeviceStudySession({
      store,
      sessionId: "study-session.force-atomic",
      receipt,
      completedAt: "2026-07-24T13:01:00.000Z",
    });

    expect(completed).toMatchObject({
      ok: true,
      operation: "completed",
      delayedReturnId: "return-task.force-atomic",
      record: {
        studySessions: [{ status: "completed" }],
        delayedReturnTasks: [{
          returnId: "return-task.force-atomic",
          studySessionId: "study-session.force-atomic",
          status: "scheduled",
        }],
      },
    });
    expect(memory.writes() - writesBeforeCompletion).toBe(1);
  });

  it("does not expose a completed force session without its return when the atomic envelope write fails", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-24T13:00:00.000Z"));
    const evidenceStorage = new MemoryStorage();
    vi.stubGlobal("window", { localStorage: evidenceStorage });

    // Save and start are writes one and two; fail the single completion envelope.
    const memory = memoryPersistence(null, { failWriteNumber: 3 });
    const store = createDeviceContinuityStore(memory.persistence);
    const record = await acceptedRecord("continuity-record.session-force-fail", "force");
    expect(store.save(record)).toMatchObject({ ok: true });
    expect(await startDeviceStudySession({
      store,
      recordId: record.recordId,
      nodeId: record.activityStates[0]!.nodeId,
      sessionId: "study-session.force-atomic-fail",
      startedAt: "2026-07-24T12:03:00.000Z",
    })).toMatchObject({ ok: true });

    const receipt = completedForceReceipt("attempt.path-session-force-fail");
    expect(await completeDeviceStudySession({
      store,
      sessionId: "study-session.force-atomic-fail",
      receipt,
      completedAt: "2026-07-24T13:01:00.000Z",
    })).toMatchObject({ ok: false, reason: "persistence_failed" });
    expect(store.read().ledger.records[0]).toMatchObject({
      studySessions: [{ status: "active", runtimeCorrelation: null }],
      delayedReturnTasks: [],
    });
    expect(createEvidenceLedgerStore(
      createLocalStorageEvidenceLedgerAdapter({ storage: evidenceStorage }),
    ).read().ledger.entries).toHaveLength(1);

    expect(await completeDeviceStudySession({
      store,
      sessionId: "study-session.force-atomic-fail",
      receipt,
      completedAt: "2026-07-24T13:01:00.000Z",
    })).toMatchObject({
      ok: true,
      operation: "completed",
      delayedReturnId: "return-task.force-atomic-fail",
      record: {
        studySessions: [{ status: "completed" }],
        delayedReturnTasks: [{ status: "scheduled" }],
      },
    });
    expect(createEvidenceLedgerStore(
      createLocalStorageEvidenceLedgerAdapter({ storage: evidenceStorage }),
    ).read().ledger.entries).toHaveLength(1);
  });
});
