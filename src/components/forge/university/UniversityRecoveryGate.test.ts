import { describe, expect, it } from "vitest";

import { readUniversityRecoveryGate } from "@/app/internal/university-recovery/fixture-gate.server";

describe("university recovery route gate", () => {
  it("is unavailable by default and accepts only the exact server-owned fixture token", () => {
    expect(readUniversityRecoveryGate({})).toEqual({
      enabled: false,
      status: "recovery-fixture-unavailable",
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
    });
  });
});
