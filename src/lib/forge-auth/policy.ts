export const ADULT_AGE_BAND = "adult" as const;

export interface LearnerProfileAuthority {
  age_band: "6_8" | "9_12" | "13_15" | "16_17" | "adult";
  onboarding_status: "pending" | "active" | "paused" | "closed";
}

/**
 * Cloud evidence is an adult-only opt-in. Missing, minor, paused, or closed
 * profiles all fail back to the anonymous device ledger.
 */
export function canUseAdultPrivateEvidence(
  profile: LearnerProfileAuthority | null | undefined,
): boolean {
  return profile?.age_band === ADULT_AGE_BAND && profile.onboarding_status === "active";
}
