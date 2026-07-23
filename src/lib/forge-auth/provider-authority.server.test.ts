import { describe, expect, it } from "vitest";

import {
  authorizeProviderUse,
  consumeProviderAuthorityForTransport,
  evaluateServerOwnedProviderAuthority,
  providerAuthorityAllows,
} from "./provider-authority.server";
import {
  PROVIDER_AUTHORITY_TEST_EXPIRED_AT,
  PROVIDER_AUTHORITY_TEST_NOW as NOW,
  PROVIDER_AUTHORITY_TEST_REVOKED_AT,
  approvedProviderAuthorityForTest,
  providerAuthorityFixture as fixture,
} from "./provider-authority.test-helpers";

describe("server-owned provider authority", () => {
  it("accepts only a complete synthetic server-owned adult fixture", () => {
    expect(evaluateServerOwnedProviderAuthority("interpretation", fixture(), NOW)).toMatchObject({
      allowed: true,
      purpose: "interpretation",
      subjectAccountId: "account-adult-1",
      tenantId: "tenant-closed-cohort-1",
    });
  });

  it("rejects anonymous and client-shaped self-attestations before provider authority", async () => {
    const clientAssertion = {
      ageMode: "adult",
      guardianManaged: false,
      profile: { age: 32, tenantId: "tenant-closed-cohort-1" },
    };
    void clientAssertion;

    expect(evaluateServerOwnedProviderAuthority("interpretation", null, NOW)).toEqual({
      allowed: false,
      reason: "no_verified_adult",
    });
    await expect(authorizeProviderUse("interpretation", { reader: { reserve: async () => null }, now: NOW })).resolves.toEqual({
      allowed: false,
      reason: "no_verified_adult",
    });
  });

  it("rejects expired, revoked, wrong-purpose, wrong-tenant/cohort, and exhausted quota fixtures", () => {
    const expired = { ...fixture(), entitlement: { ...fixture().entitlement, expiresAt: PROVIDER_AUTHORITY_TEST_EXPIRED_AT } };
    const revoked = { ...fixture(), consent: { ...fixture().consent, revokedAt: PROVIDER_AUTHORITY_TEST_REVOKED_AT } };
    const wrongPurpose = { ...fixture(), quotaReservation: { ...fixture().quotaReservation, purpose: "learning-plan-rephrase" as const } };
    const wrongTenant = { ...fixture(), entitlement: { ...fixture().entitlement, tenantId: "tenant-other" } };
    const wrongCohort = { ...fixture(), entitlement: { ...fixture().entitlement, cohortId: "cohort-other" } };
    const exhausted = { ...fixture(), quotaReservation: { ...fixture().quotaReservation, status: "exhausted" as const } };

    expect(evaluateServerOwnedProviderAuthority("interpretation", expired, NOW)).toEqual({ allowed: false, reason: "expired" });
    expect(evaluateServerOwnedProviderAuthority("interpretation", revoked, NOW)).toEqual({ allowed: false, reason: "revoked" });
    expect(evaluateServerOwnedProviderAuthority("interpretation", wrongPurpose, NOW)).toEqual({ allowed: false, reason: "wrong_purpose" });
    expect(evaluateServerOwnedProviderAuthority("interpretation", wrongTenant, NOW)).toEqual({ allowed: false, reason: "wrong_tenant" });
    expect(evaluateServerOwnedProviderAuthority("interpretation", wrongCohort, NOW)).toEqual({ allowed: false, reason: "wrong_cohort" });
    expect(evaluateServerOwnedProviderAuthority("interpretation", exhausted, NOW)).toEqual({ allowed: false, reason: "quota_unavailable" });
  });

  it("rejects malformed purpose collections and complete snapshots with extra or unknown fields", () => {
    const stringPurposes = {
      ...fixture(),
      entitlement: { ...fixture().entitlement, providerPurposes: "interpretation" },
      consent: { ...fixture().consent, providerPurposes: "interpretation" },
    };
    const duplicatePurposes = {
      ...fixture(),
      entitlement: { ...fixture().entitlement, providerPurposes: ["interpretation", "interpretation"] },
    };
    const unknownPurpose = {
      ...fixture(),
      consent: { ...fixture().consent, providerPurposes: ["interpretation", "unreviewed-purpose"] },
    };
    const extraField = { ...fixture(), browserAdultClaim: true };
    const uppercaseDigest = { ...fixture(), entitlement: { ...fixture().entitlement, inputDigest: `sha256:${"A".repeat(64)}` } };
    const nonSemver = { ...fixture(), entitlement: { ...fixture().entitlement, policyRef: { ...fixture().entitlement.policyRef, version: "1" } } };
    const inconsistentRevocation = { ...fixture(), entitlement: { ...fixture().entitlement, revokedAt: null, revocationReason: "operator-revoked" } };

    for (const malformed of [stringPurposes, duplicatePurposes, unknownPurpose, extraField, uppercaseDigest, nonSemver, inconsistentRevocation]) {
      expect(evaluateServerOwnedProviderAuthority("interpretation", malformed, NOW)).toEqual({
        allowed: false,
        reason: "malformed_server_record",
      });
    }
  });

  it("rejects a hostile synthetic reader snapshot without invoking getters", () => {
    const hostile = { ...fixture() } as Record<string, unknown>;
    let getterReads = 0;
    Object.defineProperty(hostile, "entitlement", {
      enumerable: true,
      get: () => {
        getterReads += 1;
        throw new Error("provider preflight must not read this getter");
      },
    });
    expect(evaluateServerOwnedProviderAuthority("interpretation", hostile, NOW)).toEqual({
      allowed: false,
      reason: "malformed_server_record",
    });
    expect(getterReads).toBe(0);
  });

  it("makes transport grants short-lived and single-use", () => {
    const grant = evaluateServerOwnedProviderAuthority("interpretation", fixture(), NOW);
    expect(providerAuthorityAllows(grant, "interpretation", NOW)).toBe(true);
    const clonedGrant = { ...grant };
    expect(providerAuthorityAllows(clonedGrant, "interpretation", NOW)).toBe(false);
    expect(consumeProviderAuthorityForTransport(clonedGrant, "interpretation", NOW)).toBe(false);
    expect(consumeProviderAuthorityForTransport(grant, "interpretation", NOW)).toBe(true);
    expect(consumeProviderAuthorityForTransport(grant, "interpretation", NOW)).toBe(false);
    expect(providerAuthorityAllows(
      evaluateServerOwnedProviderAuthority("interpretation", fixture(), NOW),
      "interpretation",
      new Date(NOW.getTime() + 15_001),
    )).toBe(false);
  });

  it("checks process-local issuance before reading a forged getter or clone", () => {
    const issued = approvedProviderAuthorityForTest("interpretation");
    const getter = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(getter, "allowed", { enumerable: true, get: () => { throw new Error("must not read forged grant"); } });
    expect(providerAuthorityAllows(getter as never, "interpretation", NOW)).toBe(false);
    expect(providerAuthorityAllows({ ...issued }, "interpretation", NOW)).toBe(false);
    expect(providerAuthorityAllows(JSON.parse(JSON.stringify(issued)), "interpretation", NOW)).toBe(false);
    expect(consumeProviderAuthorityForTransport(issued, "interpretation", NOW)).toBe(true);
    expect(consumeProviderAuthorityForTransport(issued, "interpretation", NOW)).toBe(false);
  });

  it("keeps the real reader disabled even when provider transport flags are present", async () => {
    await expect(authorizeProviderUse("interpretation", { now: NOW })).resolves.toEqual({
      allowed: false,
      reason: "cloud_authority_disabled",
    });
  });
});
