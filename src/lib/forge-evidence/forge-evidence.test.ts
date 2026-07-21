import { describe, expect, it } from "vitest";
import {
  DEFAULT_EVIDENCE_LEDGER_STORAGE_KEY,
  createEmptyEvidenceLedger,
  createEvidenceLedgerStore,
  createLocalStorageEvidenceLedgerAdapter,
  createReturnProofSchedule,
  decodeEvidenceLedger,
  deriveEvidenceState,
  evidenceEntrySchema,
  exportEvidenceLedger,
  isReturnProofDue,
  listDueReturnProofs,
  reduceEvidenceLedger,
  type BrowserStorageLike,
  type EvidenceEntry,
  type EvidenceLedger,
  type ProofConditions,
} from "./index";

const RECORDED_AT = "2026-07-01T12:00:00.000Z";

class FakeStorage implements BrowserStorageLike {
  readonly values = new Map<string, string>();
  failReads = false;
  failWrites = false;

  getItem(key: string): string | null {
    if (this.failReads) throw new Error("blocked");
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failWrites) throw new Error("quota");
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    if (this.failWrites) throw new Error("blocked");
    this.values.delete(key);
  }
}

function schedule(intervalsDays: readonly number[] = [7, 30]) {
  const result = createReturnProofSchedule(RECORDED_AT, intervalsDays);
  if (!result.ok) throw new Error(result.reason);
  return result.schedule;
}

function proof(overrides: Partial<ProofConditions> = {}): ProofConditions {
  return {
    conditionId: "force.motion.transfer.v1",
    mode: "independent_transfer",
    assistanceAccess: "removed",
    outcome: "proved",
    ...overrides,
  };
}

function entry(overrides: Partial<EvidenceEntry> = {}): EvidenceEntry {
  return {
    id: "evidence-1",
    capabilityId: "force-motion",
    recordedAt: RECORDED_AT,
    source: { kind: "authored_activity", refId: "modelshift.force-motion" },
    proof: proof(),
    assistance: [
      { kind: "model_interpretation", sourceId: "interpretation.schema.v1" },
      { kind: "authored_hint", sourceId: "hint.net-force.v1" },
    ],
    sharing: { status: "private", updatedAt: RECORDED_AT },
    returnSchedule: schedule(),
    ...overrides,
  };
}

function ledger(...entries: EvidenceEntry[]): EvidenceLedger {
  return { schemaVersion: 1, entries };
}

function storeFor(storage: FakeStorage) {
  return createEvidenceLedgerStore(createLocalStorageEvidenceLedgerAdapter({ storage }));
}

describe("forge evidence schema and reducer", () => {
  it("appends strict privacy-minimal evidence with assistance, source, and proof provenance", () => {
    const transition = reduceEvidenceLedger(createEmptyEvidenceLedger(), { type: "append", entry: entry() });

    expect(transition.accepted).toBe(true);
    if (!transition.accepted) return;
    expect(transition.ledger.entries[0]).toMatchObject({
      source: { kind: "authored_activity", refId: "modelshift.force-motion" },
      proof: { conditionId: "force.motion.transfer.v1", assistanceAccess: "removed" },
      assistance: [{ kind: "model_interpretation" }, { kind: "authored_hint" }],
      sharing: { status: "private" },
    });
  });

  it("fails closed on identity, raw chat, explanations, and mastery-like unknown fields", () => {
    for (const unsafe of [
      { ...entry(), rawChat: "full private conversation" },
      { ...entry(), learnerName: "A Learner" },
      { ...entry(), explanation: "raw learner explanation" },
      { ...entry(), masteryPercent: 92 },
      { ...entry(), proof: { ...entry().proof, rawAnswer: "secret answer" } },
    ]) {
      expect(evidenceEntrySchema.safeParse(unsafe).success).toBe(false);
      expect(reduceEvidenceLedger(createEmptyEvidenceLedger(), { type: "append", entry: unsafe })).toMatchObject({
        accepted: false,
        reason: "invalid_entry",
        ledger: { entries: [] },
      });
    }
  });

  it("rejects duplicate IDs and malformed source/proof condition pairings", () => {
    const current = ledger(entry());
    expect(reduceEvidenceLedger(current, { type: "append", entry: entry() })).toMatchObject({
      accepted: false,
      reason: "duplicate_entry",
    });
    expect(
      evidenceEntrySchema.safeParse(
        entry({
          id: "bad-project",
          source: { kind: "learner_project", refId: "project-opaque-1" },
          proof: proof({ mode: "independent_transfer" }),
          returnSchedule: null,
        }),
      ).success,
    ).toBe(false);
  });
});

describe("versioned decoding and browser persistence", () => {
  it("repairs corrupted storage to an empty current-version ledger", () => {
    const storage = new FakeStorage();
    storage.values.set(DEFAULT_EVIDENCE_LEDGER_STORAGE_KEY, "{ definitely not json");

    const read = storeFor(storage).read();

    expect(read).toEqual({ status: "reset_malformed", ledger: { schemaVersion: 1, entries: [] } });
    expect(JSON.parse(storage.values.get(DEFAULT_EVIDENCE_LEDGER_STORAGE_KEY) ?? "null")).toEqual({
      schemaVersion: 1,
      entries: [],
    });
  });

  it("resets unknown versions without carrying forward untrusted fields", () => {
    const storage = new FakeStorage();
    storage.values.set(
      DEFAULT_EVIDENCE_LEDGER_STORAGE_KEY,
      JSON.stringify({ schemaVersion: 99, entries: [entry()], rawChat: "do not keep", email: "private@example.test" }),
    );

    const read = storeFor(storage).read();
    const repaired = storage.values.get(DEFAULT_EVIDENCE_LEDGER_STORAGE_KEY) ?? "";

    expect(read.status).toBe("reset_unknown_version");
    expect(read.ledger.entries).toEqual([]);
    expect(repaired).toBe('{"schemaVersion":1,"entries":[]}');
    expect(repaired).not.toContain("rawChat");
    expect(repaired).not.toContain("private@example.test");
  });

  it("treats empty and unknown-shaped data as clean empty migrations", () => {
    expect(decodeEvidenceLedger(null)).toEqual({ status: "empty", ledger: { schemaVersion: 1, entries: [] } });
    expect(decodeEvidenceLedger(JSON.stringify({ chat: "untrusted" }))).toEqual({
      status: "reset_unknown_version",
      ledger: { schemaVersion: 1, entries: [] },
    });
  });

  it("is SSR-safe and reports unavailable storage instead of throwing", () => {
    const store = createEvidenceLedgerStore(createLocalStorageEvidenceLedgerAdapter({ storage: null }));

    expect(store.read()).toEqual({ status: "storage_unavailable", ledger: { schemaVersion: 1, entries: [] } });
    expect(store.append(entry())).toMatchObject({ ok: false, reason: "storage_unavailable" });
  });

  it("surfaces storage read and write failures without claiming persistence", () => {
    const storage = new FakeStorage();
    const store = storeFor(storage);
    storage.failReads = true;
    expect(store.read().status).toBe("storage_error");

    storage.failReads = false;
    storage.failWrites = true;
    expect(store.append(entry())).toMatchObject({ ok: false, reason: "storage_error", ledger: { entries: [] } });
  });
});

describe("store deletion and learner-owned export", () => {
  it("appends, reads, deletes one record, and deletes the full local ledger", () => {
    const storage = new FakeStorage();
    const store = storeFor(storage);
    const second = entry({ id: "evidence-2", returnSchedule: null });

    expect(store.append(entry()).ok).toBe(true);
    expect(store.append(second).ok).toBe(true);
    expect(store.read().ledger.entries.map(({ id }) => id)).toEqual(["evidence-1", "evidence-2"]);
    expect(store.delete("evidence-1")).toMatchObject({ ok: true, ledger: { entries: [{ id: "evidence-2" }] } });
    expect(store.delete("missing")).toMatchObject({ ok: false, reason: "entry_not_found" });
    expect(store.deleteAll()).toMatchObject({ ok: true, ledger: { entries: [] } });
    expect(storage.values.has(DEFAULT_EVIDENCE_LEDGER_STORAGE_KEY)).toBe(false);
  });

  it("keeps shared export opt-in while learner export remains a complete portable copy", () => {
    const storage = new FakeStorage();
    const store = storeFor(storage);
    store.append(entry());
    store.append(entry({ id: "evidence-2", returnSchedule: null }));
    expect(
      store.setSharing("evidence-2", {
        status: "shared_by_learner",
        scope: "educator",
        updatedAt: "2026-07-02T12:00:00.000Z",
      }),
    ).toMatchObject({ ok: true });

    const learnerCopy = store.export("learner_copy", "2026-07-03T12:00:00.000Z");
    const sharedCopy = store.export("educator", "2026-07-03T12:00:00.000Z");

    expect(learnerCopy.ok && learnerCopy.value.entries).toHaveLength(2);
    expect(sharedCopy.ok && sharedCopy.value.entries.map(({ id }) => id)).toEqual(["evidence-2"]);
    const serialized = JSON.stringify(sharedCopy);
    expect(serialized).not.toMatch(/rawChat|explanation|learnerName|email|masteryPercent/i);
  });

  it("can export a validated pure snapshot without a persistence adapter", () => {
    const result = exportEvidenceLedger(ledger(entry({ returnSchedule: null })), "learner_copy", "2026-07-04T12:00:00.000Z");
    expect(result).toMatchObject({
      ok: true,
      value: { format: "forge-evidence-ledger", schemaVersion: 1, scope: "learner_copy" },
    });
  });
});

describe("return-proof scheduler and categorical evidence states", () => {
  it("uses configurable intervals, detects due work, and advances each completion deterministically", () => {
    const storage = new FakeStorage();
    const store = storeFor(storage);
    store.append(entry());

    const initial = store.read().ledger;
    const initialSchedule = initial.entries[0].returnSchedule;
    expect(initialSchedule?.nextDueAt).toBe("2026-07-08T12:00:00.000Z");
    expect(isReturnProofDue(initialSchedule, "2026-07-08T11:59:59.999Z")).toBe(false);
    expect(isReturnProofDue(initialSchedule, "2026-07-08T12:00:00.000Z")).toBe(true);
    expect(listDueReturnProofs(initial, "2026-07-08T12:00:00.000Z")).toEqual([
      { entryId: "evidence-1", capabilityId: "force-motion", dueAt: "2026-07-08T12:00:00.000Z" },
    ]);
    expect(store.completeReturnProof("evidence-1", "2026-07-08T11:59:59.999Z")).toMatchObject({
      ok: false,
      reason: "invalid_completion_time",
    });

    const first = store.completeReturnProof("evidence-1", "2026-07-08T12:00:00.000Z");
    expect(first.ok && first.ledger.entries[0].returnSchedule).toMatchObject({
      completedCount: 1,
      nextDueAt: "2026-08-07T12:00:00.000Z",
    });
    const second = store.completeReturnProof("evidence-1", "2026-08-07T12:00:00.000Z");
    expect(second.ok && second.ledger.entries[0].returnSchedule).toMatchObject({
      completedCount: 2,
      nextDueAt: null,
    });
    expect(store.completeReturnProof("evidence-1", "2026-08-08T12:00:00.000Z")).toMatchObject({
      ok: false,
      reason: "return_not_scheduled",
    });
  });

  it("rejects invalid interval configurations and semantically forged schedules", () => {
    expect(createReturnProofSchedule(RECORDED_AT, [])).toEqual({ ok: false, reason: "invalid_intervals" });
    expect(createReturnProofSchedule(RECORDED_AT, [30, 7])).toEqual({ ok: false, reason: "invalid_intervals" });
    expect(createReturnProofSchedule("not-a-date", [7])).toEqual({ ok: false, reason: "invalid_anchor" });
    expect(
      evidenceEntrySchema.safeParse(
        entry({ returnSchedule: { ...schedule(), nextDueAt: "2035-01-01T00:00:00.000Z" } }),
      ).success,
    ).toBe(false);
  });

  it("derives building, proved_once, ready_to_revisit, carried_into_project, and open_question", () => {
    const building = entry({
      id: "building",
      capabilityId: "building-capability",
      proof: proof({ mode: "supported_practice", assistanceAccess: "available", outcome: "practice_completed" }),
      returnSchedule: null,
    });
    const proved = entry({ id: "proved", capabilityId: "proved-capability", returnSchedule: null });
    const revisit = entry({ id: "revisit", capabilityId: "revisit-capability" });
    const project = entry({
      id: "project",
      capabilityId: "project-capability",
      source: { kind: "learner_project", refId: "project-opaque-1" },
      proof: proof({ mode: "project_application" }),
      returnSchedule: null,
    });
    const question = entry({
      id: "question",
      capabilityId: "question-capability",
      proof: proof({ outcome: "open_question" }),
      returnSchedule: null,
    });
    const current = ledger(building, proved, revisit, project, question);
    const now = "2026-07-08T12:00:00.000Z";

    expect(deriveEvidenceState(current, "building-capability", now)).toBe("building");
    expect(deriveEvidenceState(current, "proved-capability", now)).toBe("proved_once");
    expect(deriveEvidenceState(current, "revisit-capability", now)).toBe("ready_to_revisit");
    expect(deriveEvidenceState(current, "project-capability", now)).toBe("carried_into_project");
    expect(deriveEvidenceState(current, "question-capability", now)).toBe("open_question");
    expect(deriveEvidenceState(current, "missing-capability", now)).toBe("building");
  });
});
