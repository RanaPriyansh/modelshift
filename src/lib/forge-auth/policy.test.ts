import { describe, expect, it } from "vitest";

import { canUseAdultPrivateEvidence } from "./policy";

describe("adult private evidence policy", () => {
  it("allows only active adult profiles", () => {
    expect(canUseAdultPrivateEvidence({ age_band: "adult", onboarding_status: "active" })).toBe(true);
    expect(canUseAdultPrivateEvidence({ age_band: "adult", onboarding_status: "pending" })).toBe(false);
    expect(canUseAdultPrivateEvidence({ age_band: "adult", onboarding_status: "paused" })).toBe(false);
  });

  it("keeps every under-18 band and missing profiles device-only", () => {
    for (const age_band of ["6_8", "9_12", "13_15", "16_17"] as const) {
      expect(canUseAdultPrivateEvidence({ age_band, onboarding_status: "active" })).toBe(false);
    }
    expect(canUseAdultPrivateEvidence(null)).toBe(false);
    expect(canUseAdultPrivateEvidence(undefined)).toBe(false);
  });
});
