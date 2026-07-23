import {
  evaluateServerOwnedProviderAuthority,
  type ProviderPurpose,
  type ServerOwnedProviderAuthoritySnapshot,
} from "./provider-authority.server";

export const PROVIDER_AUTHORITY_TEST_NOW = new Date();
export const PROVIDER_AUTHORITY_TEST_EXPIRED_AT = new Date(
  PROVIDER_AUTHORITY_TEST_NOW.getTime() - 1_000,
).toISOString();
export const PROVIDER_AUTHORITY_TEST_REVOKED_AT = new Date(
  PROVIDER_AUTHORITY_TEST_NOW.getTime() - 2_000,
).toISOString();
const DIGEST = `sha256:${"a".repeat(64)}` as const;

function relativeTimestamp(milliseconds: number): string {
  return new Date(PROVIDER_AUTHORITY_TEST_NOW.getTime() + milliseconds).toISOString();
}

export function providerAuthorityFixture(
  purpose: ProviderPurpose = "interpretation",
): ServerOwnedProviderAuthoritySnapshot {
  return {
    subject: {
      authority: "server-verified-adult.v1",
      accountId: "account-adult-1",
      tenantId: "tenant-closed-cohort-1",
      cohortId: "cohort-reviewed-adults-1",
      verifiedAt: relativeTimestamp(-86_400_000 * 30),
    },
    entitlement: {
      schemaVersion: "pilot-entitlement.v1",
      entitlementId: "entitlement-1",
      subjectAccountId: "account-adult-1",
      tenantId: "tenant-closed-cohort-1",
      cohortId: "cohort-reviewed-adults-1",
      consentId: "consent-1",
      purpose: "wave6-reviewed-adult-pilot",
      providerPurposes: ["interpretation", "learning-plan-rephrase", "lesson-draft"],
      eligibilityBasisRef: "eligibility-record-1",
      issuerAuthorityRef: "operator-issuer-1",
      policyRef: { id: "policy-provider-1", version: "1.0.0", digest: DIGEST },
      dependencyRef: { id: "provider-dependency-1", version: "1.0.0", digest: DIGEST },
      inputDigest: DIGEST,
      permittedOperations: ["provider-transport"],
      issuedAt: relativeTimestamp(-86_400_000),
      expiresAt: relativeTimestamp(86_400_000),
      revokedAt: null,
      revocationReason: null,
    },
    consent: {
      authority: "server-provider-consent.v1",
      consentId: "consent-1",
      subjectAccountId: "account-adult-1",
      tenantId: "tenant-closed-cohort-1",
      entitlementId: "entitlement-1",
      providerPurposes: ["interpretation", "learning-plan-rephrase", "lesson-draft"],
      status: "active",
      expiresAt: relativeTimestamp(86_400_000),
      revokedAt: null,
    },
    quotaReservation: {
      authority: "server-provider-quota-reservation.v1",
      reservationId: "reservation-1",
      subjectAccountId: "account-adult-1",
      tenantId: "tenant-closed-cohort-1",
      entitlementId: "entitlement-1",
      purpose,
      status: "reserved",
      expiresAt: relativeTimestamp(3_600_000),
    },
  };
}

export function approvedProviderAuthorityForTest(purpose: ProviderPurpose) {
  const decision = evaluateServerOwnedProviderAuthority(purpose, providerAuthorityFixture(purpose), new Date());
  if (!decision.allowed) throw new Error("Synthetic provider authority fixture must be valid.");
  return decision;
}
