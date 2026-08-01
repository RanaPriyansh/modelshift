import { describe, expect, it } from "vitest";

import {
  clearForgeDeviceProfile,
  createForgeDeviceProfile,
  readForgeDeviceProfile,
} from "./device-profile";
import {
  createForgeProfileBoundStorage,
  FORGE_CONTINUITY_STORAGE_KEY,
  FORGE_EVIDENCE_LEDGER_STORAGE_KEY,
  FORGE_PROFILE_BOUND_STORAGE_PREFIX,
  FORGE_WORLD_SESSION_CHECKPOINT_STORAGE_PREFIX,
} from "./profile-bound-data";

const PROFILE_A = "9be711de-d7a6-4911-b903-f2d829da83d5";
const PROFILE_B = "9be711de-d7a6-4911-b903-f2d829da83d6";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    get length() {
      return values.size;
    },
    key: (index: number) => [...values.keys()][index] ?? null,
    values,
  };
}

function seedProfile(storage: ReturnType<typeof memoryStorage>, profileId: string) {
  return createForgeDeviceProfile(
    storage,
    "adult",
    false,
    new Date("2026-08-02T00:00:00.000Z"),
    profileId,
  );
}

describe("profile-bound local data", () => {
  it("denies a mismatched profile read and keeps each local namespace separate", () => {
    const storage = memoryStorage();
    const profileA = createForgeProfileBoundStorage(storage, PROFILE_A);
    const profileB = createForgeProfileBoundStorage(storage, PROFILE_B);

    profileA.setItem(FORGE_CONTINUITY_STORAGE_KEY, "continuity-a");
    profileA.setItem(FORGE_EVIDENCE_LEDGER_STORAGE_KEY, "evidence-a");
    profileA.setItem(
      `${FORGE_WORLD_SESSION_CHECKPOINT_STORAGE_PREFIX}session-a`,
      "checkpoint-a",
    );

    expect(profileA.getItem(FORGE_CONTINUITY_STORAGE_KEY)).toBe("continuity-a");
    expect(profileA.getItem(FORGE_EVIDENCE_LEDGER_STORAGE_KEY)).toBe("evidence-a");
    expect(profileB.getItem(FORGE_CONTINUITY_STORAGE_KEY)).toBeNull();
    expect(profileB.getItem(FORGE_EVIDENCE_LEDGER_STORAGE_KEY)).toBeNull();
    expect(profileB.getItem(`${FORGE_WORLD_SESSION_CHECKPOINT_STORAGE_PREFIX}session-a`)).toBeNull();
    expect([...storage.values.keys()]).toContain(`${FORGE_PROFILE_BOUND_STORAGE_PREFIX}${PROFILE_A}:${FORGE_CONTINUITY_STORAGE_KEY}`);
  });

  it("removes the active profile data and legacy local records with read-back verification", () => {
    const storage = memoryStorage();
    seedProfile(storage, PROFILE_A);
    const profileA = createForgeProfileBoundStorage(storage, PROFILE_A);
    const profileB = createForgeProfileBoundStorage(storage, PROFILE_B);

    profileA.setItem(FORGE_CONTINUITY_STORAGE_KEY, "continuity-a");
    profileA.setItem(FORGE_EVIDENCE_LEDGER_STORAGE_KEY, "evidence-a");
    profileA.setItem(
      `${FORGE_WORLD_SESSION_CHECKPOINT_STORAGE_PREFIX}session-a`,
      "checkpoint-a",
    );
    profileB.setItem(FORGE_CONTINUITY_STORAGE_KEY, "continuity-b");
    storage.setItem(FORGE_CONTINUITY_STORAGE_KEY, "legacy-continuity");
    storage.setItem(FORGE_EVIDENCE_LEDGER_STORAGE_KEY, "legacy-evidence");
    storage.setItem(
      `${FORGE_WORLD_SESSION_CHECKPOINT_STORAGE_PREFIX}legacy-session`,
      "legacy-checkpoint",
    );
    storage.setItem("unrelated-local-preference", "keep");

    expect(clearForgeDeviceProfile(storage)).toEqual({ ok: true });
    expect(readForgeDeviceProfile(storage)).toBeNull();
    expect(profileA.getItem(FORGE_CONTINUITY_STORAGE_KEY)).toBeNull();
    expect(profileA.getItem(FORGE_EVIDENCE_LEDGER_STORAGE_KEY)).toBeNull();
    expect(profileA.getItem(`${FORGE_WORLD_SESSION_CHECKPOINT_STORAGE_PREFIX}session-a`)).toBeNull();
    expect(storage.getItem(FORGE_CONTINUITY_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(FORGE_EVIDENCE_LEDGER_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(`${FORGE_WORLD_SESSION_CHECKPOINT_STORAGE_PREFIX}legacy-session`)).toBeNull();
    expect(profileB.getItem(FORGE_CONTINUITY_STORAGE_KEY)).toBe("continuity-b");
    expect(storage.getItem("unrelated-local-preference")).toBe("keep");
  });

  it("does not report removal success when the storage adapter is a no-op", () => {
    const storage = memoryStorage();
    seedProfile(storage, PROFILE_A);
    const profileA = createForgeProfileBoundStorage(storage, PROFILE_A);
    profileA.setItem(FORGE_CONTINUITY_STORAGE_KEY, "continuity-a");
    storage.removeItem = () => false;

    expect(clearForgeDeviceProfile(storage)).toEqual({ ok: false, reason: "value_remains" });
    expect(readForgeDeviceProfile(storage)?.profileId).toBe(PROFILE_A);
    expect(profileA.getItem(FORGE_CONTINUITY_STORAGE_KEY)).toBe("continuity-a");
  });
});
