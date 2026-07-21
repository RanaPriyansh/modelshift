import { describe, expect, it } from "vitest";

import {
  FORGE_DEVICE_PROFILE_KEY,
  clearForgeDeviceProfile,
  createForgeDeviceProfile,
  readForgeDeviceProfile,
} from "./device-profile";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    values,
  };
}

describe("FORGE device profile", () => {
  it("stores only a versioned pseudonymous age policy profile", () => {
    const storage = memoryStorage();
    const profile = createForgeDeviceProfile(
      storage,
      "adult",
      false,
      new Date("2026-07-22T00:00:00.000Z"),
      "9be711de-d7a6-4911-b903-f2d829da83d5",
    );

    expect(readForgeDeviceProfile(storage)).toEqual(profile);
    expect(storage.values.get(FORGE_DEVICE_PROFILE_KEY)).not.toMatch(/name|email|school/i);
  });

  it("fails closed when a child device session lacks a grown-up confirmation", () => {
    const storage = memoryStorage();
    expect(() => createForgeDeviceProfile(storage, "child_with_grown_up", false)).toThrow(
      "guardian_confirmation_required",
    );
    expect(readForgeDeviceProfile(storage)).toBeNull();
  });

  it("ignores malformed data and supports an explicit local reset", () => {
    const storage = memoryStorage();
    storage.setItem(FORGE_DEVICE_PROFILE_KEY, "not-json");
    expect(readForgeDeviceProfile(storage)).toBeNull();
    clearForgeDeviceProfile(storage);
    expect(storage.getItem(FORGE_DEVICE_PROFILE_KEY)).toBeNull();
  });
});
