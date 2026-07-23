import "server-only";

import { z } from "zod";

import { isForgeCloudAuthAuthorityEnabled } from "./cloud-authority";
import { readForgeCloudIdentity } from "./session.server";

/**
 * These are server policy purposes, not values accepted from a browser. New
 * provider features must add a purpose here and receive an independent review.
 */
export const PROVIDER_PURPOSES = ["interpretation", "learning-plan-rephrase", "lesson-draft"] as const;
export type ProviderPurpose = (typeof PROVIDER_PURPOSES)[number];

export interface ServerOwnedVerifiedAdult {
  readonly authority: "server-verified-adult.v1";
  readonly accountId: string;
  readonly tenantId: string;
  readonly cohortId: string;
  readonly verifiedAt: string;
}

/**
 * This extends the W6 PilotEntitlementV1 proposal with the tenant, consent,
 * and provider-purpose inputs required before a provider transport may run.
 * It is intentionally an internal read model: request data never supplies it.
 */
export interface ServerOwnedPilotEntitlement {
  readonly schemaVersion: "pilot-entitlement.v1";
  readonly entitlementId: string;
  readonly subjectAccountId: string;
  readonly tenantId: string;
  readonly cohortId: string;
  readonly consentId: string;
  readonly purpose: "wave6-reviewed-adult-pilot";
  readonly providerPurposes: readonly ProviderPurpose[];
  readonly eligibilityBasisRef: string;
  readonly issuerAuthorityRef: string;
  readonly policyRef: Readonly<{ id: string; version: string; digest: `sha256:${string}` }>;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly revokedAt: string | null;
}

export interface ServerOwnedProviderConsent {
  readonly authority: "server-provider-consent.v1";
  readonly consentId: string;
  readonly subjectAccountId: string;
  readonly tenantId: string;
  readonly entitlementId: string;
  readonly providerPurposes: readonly ProviderPurpose[];
  readonly status: "active" | "revoked";
  readonly expiresAt: string;
  readonly revokedAt: string | null;
}

/**
 * A quota reservation must be atomically granted by the entitlement service
 * before transport. A UI counter or process-local limiter is not a reservation.
 */
export interface ServerOwnedProviderQuotaReservation {
  readonly authority: "server-provider-quota-reservation.v1";
  readonly reservationId: string;
  readonly subjectAccountId: string;
  readonly tenantId: string;
  readonly entitlementId: string;
  readonly purpose: ProviderPurpose;
  readonly status: "reserved" | "exhausted" | "revoked";
  readonly expiresAt: string;
}

export interface ServerOwnedProviderAuthoritySnapshot {
  readonly subject: ServerOwnedVerifiedAdult;
  readonly entitlement: ServerOwnedPilotEntitlement;
  readonly consent: ServerOwnedProviderConsent;
  readonly quotaReservation: ServerOwnedProviderQuotaReservation;
}

export type ProviderAuthorityDenialReason =
  | "cloud_authority_disabled"
  | "no_verified_adult"
  | "malformed_server_record"
  | "wrong_tenant"
  | "wrong_cohort"
  | "authority_mismatch"
  | "wrong_purpose"
  | "expired"
  | "revoked"
  | "consent_inactive"
  | "quota_unavailable";

const PROVIDER_AUTHORITY_GRANT = Symbol("forge-provider-authority-grant");

type ProviderAuthorityGrant = Readonly<{
  allowed: true;
  purpose: ProviderPurpose;
  subjectAccountId: string;
  tenantId: string;
  entitlementId: string;
  quotaReservationId: string;
  validUntilEpochMs: number;
  [PROVIDER_AUTHORITY_GRANT]: true;
}>;

export type ProviderAuthorityDecision =
  | ProviderAuthorityGrant
  | Readonly<{ allowed: false; reason: ProviderAuthorityDenialReason }>;

export interface ProviderAuthorityReader {
  /**
   * The production implementation must atomically create and reserve a fresh,
   * purpose-bound quota record. A read-only snapshot lookup is insufficient
   * because the same reservation could otherwise authorize concurrent calls.
   */
  reserve(purpose: ProviderPurpose): Promise<ServerOwnedProviderAuthoritySnapshot | null>;
}

function deny(reason: ProviderAuthorityDenialReason): ProviderAuthorityDecision {
  return { allowed: false, reason };
}

function isTimestamp(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

const nonEmptyIdSchema = z.string().min(1).max(200).regex(/^[A-Za-z0-9._:-]+$/);
const timestampSchema = z.string().max(80).refine(isTimestamp);
const digestSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/i);
const providerPurposeSchema = z.enum(PROVIDER_PURPOSES);
const providerPurposesSchema = z.array(providerPurposeSchema)
  .min(1)
  .max(PROVIDER_PURPOSES.length)
  .refine((purposes) => new Set(purposes).size === purposes.length);

const providerAuthoritySnapshotSchema = z.object({
  subject: z.object({
    authority: z.literal("server-verified-adult.v1"),
    accountId: nonEmptyIdSchema,
    tenantId: nonEmptyIdSchema,
    cohortId: nonEmptyIdSchema,
    verifiedAt: timestampSchema,
  }).strict(),
  entitlement: z.object({
    schemaVersion: z.literal("pilot-entitlement.v1"),
    entitlementId: nonEmptyIdSchema,
    subjectAccountId: nonEmptyIdSchema,
    tenantId: nonEmptyIdSchema,
    cohortId: nonEmptyIdSchema,
    consentId: nonEmptyIdSchema,
    purpose: z.literal("wave6-reviewed-adult-pilot"),
    providerPurposes: providerPurposesSchema,
    eligibilityBasisRef: nonEmptyIdSchema,
    issuerAuthorityRef: nonEmptyIdSchema,
    policyRef: z.object({
      id: nonEmptyIdSchema,
      version: nonEmptyIdSchema,
      digest: digestSchema,
    }).strict(),
    issuedAt: timestampSchema,
    expiresAt: timestampSchema,
    revokedAt: timestampSchema.nullable(),
  }).strict(),
  consent: z.object({
    authority: z.literal("server-provider-consent.v1"),
    consentId: nonEmptyIdSchema,
    subjectAccountId: nonEmptyIdSchema,
    tenantId: nonEmptyIdSchema,
    entitlementId: nonEmptyIdSchema,
    providerPurposes: providerPurposesSchema,
    status: z.enum(["active", "revoked"]),
    expiresAt: timestampSchema,
    revokedAt: timestampSchema.nullable(),
  }).strict(),
  quotaReservation: z.object({
    authority: z.literal("server-provider-quota-reservation.v1"),
    reservationId: nonEmptyIdSchema,
    subjectAccountId: nonEmptyIdSchema,
    tenantId: nonEmptyIdSchema,
    entitlementId: nonEmptyIdSchema,
    purpose: providerPurposeSchema,
    status: z.enum(["reserved", "exhausted", "revoked"]),
    expiresAt: timestampSchema,
  }).strict(),
}).strict();

function isBeforeOrEqual(value: string, now: number): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp <= now;
}

function isAfter(value: string, now: number): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp > now;
}

function hasPurpose(purposes: readonly ProviderPurpose[], purpose: ProviderPurpose): boolean {
  return purposes.includes(purpose);
}

const PROVIDER_GRANT_MAX_AGE_MS = 15_000;
const ISSUED_PROVIDER_GRANTS = new WeakSet<object>();
const CONSUMED_PROVIDER_GRANTS = new WeakSet<object>();

/**
 * Pure validator for a snapshot fetched solely by trusted server infrastructure.
 * It deliberately has no request/body/profile/URL inputs, so client assertions
 * cannot mint provider authority.
 */
export function evaluateServerOwnedProviderAuthority(
  purpose: ProviderPurpose,
  snapshot: unknown,
  now: Date = new Date(),
): ProviderAuthorityDecision {
  if (!snapshot) return deny("no_verified_adult");
  const nowMs = now.getTime();
  if (!Number.isFinite(nowMs)) return deny("malformed_server_record");

  const parsed = providerAuthoritySnapshotSchema.safeParse(snapshot);
  if (!parsed.success) return deny("malformed_server_record");
  const { subject, entitlement, consent, quotaReservation } = parsed.data;

  if (
    entitlement.subjectAccountId !== subject.accountId ||
    consent.subjectAccountId !== subject.accountId ||
    quotaReservation.subjectAccountId !== subject.accountId ||
    entitlement.tenantId !== subject.tenantId ||
    consent.tenantId !== subject.tenantId ||
    quotaReservation.tenantId !== subject.tenantId
  ) {
    return deny("wrong_tenant");
  }
  if (entitlement.cohortId !== subject.cohortId) return deny("wrong_cohort");
  if (
    entitlement.consentId !== consent.consentId ||
    consent.entitlementId !== entitlement.entitlementId ||
    quotaReservation.entitlementId !== entitlement.entitlementId ||
    Date.parse(entitlement.issuedAt) < Date.parse(subject.verifiedAt)
  ) {
    return deny("authority_mismatch");
  }
  if (
    !hasPurpose(entitlement.providerPurposes, purpose) ||
    !hasPurpose(consent.providerPurposes, purpose) ||
    quotaReservation.purpose !== purpose
  ) {
    return deny("wrong_purpose");
  }
  if (entitlement.revokedAt !== null || consent.revokedAt !== null || quotaReservation.status === "revoked") {
    return deny("revoked");
  }
  if (
    !isBeforeOrEqual(entitlement.issuedAt, nowMs) ||
    !isAfter(entitlement.expiresAt, nowMs) ||
    !isAfter(consent.expiresAt, nowMs) ||
    !isAfter(quotaReservation.expiresAt, nowMs)
  ) {
    return deny("expired");
  }
  if (consent.authority !== "server-provider-consent.v1" || consent.status !== "active") {
    return deny("consent_inactive");
  }
  if (quotaReservation.authority !== "server-provider-quota-reservation.v1" || quotaReservation.status !== "reserved") {
    return deny("quota_unavailable");
  }

  const grant: ProviderAuthorityGrant = Object.freeze({
    allowed: true,
    purpose,
    subjectAccountId: subject.accountId,
    tenantId: subject.tenantId,
    entitlementId: entitlement.entitlementId,
    quotaReservationId: quotaReservation.reservationId,
    validUntilEpochMs: Math.min(
      Date.parse(entitlement.expiresAt),
      Date.parse(consent.expiresAt),
      Date.parse(quotaReservation.expiresAt),
      nowMs + PROVIDER_GRANT_MAX_AGE_MS,
    ),
    [PROVIDER_AUTHORITY_GRANT]: true as const,
  });
  ISSUED_PROVIDER_GRANTS.add(grant);
  return grant;
}

/** An opaque grant is accepted only for the exact policy purpose that issued it. */
export function providerAuthorityAllows(
  decision: ProviderAuthorityDecision,
  purpose: ProviderPurpose,
  now: Date = new Date(),
): decision is ProviderAuthorityGrant {
  const nowMs = now.getTime();
  return Number.isFinite(nowMs)
    && decision.allowed
    && decision.purpose === purpose
    && decision[PROVIDER_AUTHORITY_GRANT] === true
    && ISSUED_PROVIDER_GRANTS.has(decision)
    && nowMs <= decision.validUntilEpochMs;
}

/**
 * Claims a grant exactly once in this server process immediately before the
 * transport is constructed. Distributed one-use enforcement still belongs to
 * the future atomic reservation service and remains an activation gate.
 */
export function consumeProviderAuthorityForTransport(
  decision: ProviderAuthorityDecision,
  purpose: ProviderPurpose,
  now: Date = new Date(),
): boolean {
  if (!providerAuthorityAllows(decision, purpose, now) || CONSUMED_PROVIDER_GRANTS.has(decision)) {
    return false;
  }
  CONSUMED_PROVIDER_GRANTS.add(decision);
  return true;
}

/**
 * Current production reader. It is deliberately unable to return a snapshot:
 * cloud identity is structurally disabled until the accepted integration has
 * durable auth, tenancy, consent, revocation, and quota services. The first
 * branch prevents even a session lookup when retired flags or provider keys
 * are present, so they can never authorize a transport by accident.
 */
const DEFAULT_PROVIDER_AUTHORITY_READER: ProviderAuthorityReader = {
  async reserve() {
    if (!isForgeCloudAuthAuthorityEnabled()) return null;

    // Future accepted infrastructure must derive all remaining snapshot fields
    // from server-owned stores. A cookie/session alone remains insufficient.
    const identity = await readForgeCloudIdentity();
    if (!identity) return null;
    return null;
  },
};

export async function authorizeProviderUse(
  purpose: ProviderPurpose,
  options: Readonly<{ reader?: ProviderAuthorityReader; now?: Date }> = {},
): Promise<ProviderAuthorityDecision> {
  if (!options.reader && !isForgeCloudAuthAuthorityEnabled()) return deny("cloud_authority_disabled");
  const snapshot = await (options.reader ?? DEFAULT_PROVIDER_AUTHORITY_READER).reserve(purpose);
  return evaluateServerOwnedProviderAuthority(purpose, snapshot, options.now);
}
