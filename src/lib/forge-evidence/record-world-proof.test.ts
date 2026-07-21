import { afterEach, describe, expect, it, vi } from "vitest";

import { createLocalStorageEvidenceLedgerAdapter } from "./local-storage";
import { recordWorldProof } from "./record-world-proof";
import { createEvidenceLedgerStore } from "./store";

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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("recordWorldProof", () => {
  it("persists only bounded proof metadata and schedules independent return proof", () => {
    const storage = new MemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });

    const result = recordWorldProof({
      capabilityId: "capability.test.transfer",
      conditionId: "proof.test.new-context",
      sourceRefId: "world.test",
      outcome: "proved",
      assistance: [{ kind: "authored_hint", sourceId: "hint.test.attention" }],
      recordedAt: "2026-07-22T00:00:00.000Z",
      returnIntervalsDays: [7, 30],
    });

    expect(result.ok).toBe(true);
    const persisted = createEvidenceLedgerStore(
      createLocalStorageEvidenceLedgerAdapter({ storage }),
    ).read().ledger;
    expect(persisted.entries).toHaveLength(1);
    expect(persisted.entries[0]).toMatchObject({
      capabilityId: "capability.test.transfer",
      source: { kind: "authored_activity", refId: "world.test" },
      proof: {
        conditionId: "proof.test.new-context",
        mode: "independent_transfer",
        assistanceAccess: "removed",
        outcome: "proved",
      },
      sharing: { status: "private" },
      returnSchedule: {
        intervalsDays: [7, 30],
        nextDueAt: "2026-07-29T00:00:00.000Z",
      },
    });
    expect(JSON.stringify(persisted)).not.toMatch(/question|explanation|confidence|identity|raw/i);
  });

  it("does not schedule return proof for an unproved attempt", () => {
    const storage = new MemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });

    const result = recordWorldProof({
      capabilityId: "capability.test.transfer",
      conditionId: "proof.test.new-context",
      sourceRefId: "world.test",
      outcome: "not_proved",
      recordedAt: "2026-07-22T00:00:00.000Z",
    });

    expect(result.ok).toBe(true);
    const persisted = createEvidenceLedgerStore(
      createLocalStorageEvidenceLedgerAdapter({ storage }),
    ).read().ledger;
    expect(persisted.entries[0].returnSchedule).toBeNull();
  });
});
