import { describe, expect, it, vi } from "vitest";

import { readUniversityRecoveryGate } from "@/app/internal/university-recovery/fixture-gate.server";

describe("university recovery route gate", () => {
  it("is unavailable by default and accepts only the exact server-owned fixture token", () => {
    expect(readUniversityRecoveryGate({})).toEqual({
      enabled: false,
      status: "recovery-fixture-unavailable",
      mode: null,
    });
    expect(readUniversityRecoveryGate({
      FORGE_UNIVERSITY_RECOVERY_FIXTURE: "true",
    }).enabled).toBe(false);
    expect(readUniversityRecoveryGate({
      FORGE_UNIVERSITY_RECOVERY_FIXTURE: "forge-university-recovery.v1 ",
    }).enabled).toBe(false);
    expect(readUniversityRecoveryGate({
      NEXT_PUBLIC_FORGE_UNIVERSITY_RECOVERY_FIXTURE: "forge-university-recovery.v1",
    }).enabled).toBe(false);
    expect(readUniversityRecoveryGate({
      FORGE_UNIVERSITY_RECOVERY_FIXTURE: "forge-university-recovery.v1",
    })).toEqual({
      enabled: true,
      status: "recovery-fixture-enabled",
      mode: "legacy",
    });
    expect(readUniversityRecoveryGate({
      FORGE_UNIVERSITY_RECOVERY_FIXTURE:
        "forge-university-recovery-what-if.v1",
    })).toEqual({
      enabled: true,
      status: "recovery-what-if-enabled",
      mode: "capacity_what_if",
    });
    expect(readUniversityRecoveryGate({
      FORGE_UNIVERSITY_RECOVERY_FIXTURE:
        "forge-university-recovery-what-if.v1 ",
    }).enabled).toBe(false);
  });

  it("fails closed for inherited values, accessors, and proxies without ordinary reads", () => {
    const inherited = Object.create({
      FORGE_UNIVERSITY_RECOVERY_FIXTURE: "forge-university-recovery.v1",
    }) as Record<string, string | undefined>;
    const getter = vi.fn(() => "forge-university-recovery.v1");
    const accessor = {};
    Object.defineProperty(accessor, "FORGE_UNIVERSITY_RECOVERY_FIXTURE", {
      configurable: true,
      enumerable: true,
      get: getter,
    });
    const proxyTrap = vi.fn(() => ["FORGE_UNIVERSITY_RECOVERY_FIXTURE"]);
    const proxy = new Proxy({
      FORGE_UNIVERSITY_RECOVERY_FIXTURE: "forge-university-recovery.v1",
    }, {
      ownKeys: proxyTrap,
    });

    expect(readUniversityRecoveryGate(inherited).enabled).toBe(false);
    expect(readUniversityRecoveryGate(
      accessor as Record<string, string | undefined>,
    ).enabled).toBe(false);
    expect(readUniversityRecoveryGate(proxy).enabled).toBe(false);
    expect(getter).not.toHaveBeenCalled();
    expect(proxyTrap).not.toHaveBeenCalled();
  });
});
