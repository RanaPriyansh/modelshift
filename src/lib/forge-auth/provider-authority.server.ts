import "server-only";

import { z } from "zod";

import {
  PILOT_PERMITTED_OPERATIONS,
  parsePilotEntitlementV1,
  type PilotEntitlementV1,
  type PilotOperation,
} from "../../forge/pilot-authority/contracts";
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
 * This composes the canonical W6 PilotEntitlementV1 with the tenant-consent
 * and provider-purpose facts required before a provider transport may run.
 * It is intentionally an internal read model: request data never supplies it.
 */
export interface ServerOwnedPilotEntitlement extends PilotEntitlementV1 {
  readonly consentId: string;
  readonly providerPurposes: readonly ProviderPurpose[];
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

const PROVIDER_SNAPSHOT_KEYS = ["subject", "entitlement", "consent", "quotaReservation"] as const;
const PROVIDER_SUBJECT_KEYS = ["authority", "accountId", "tenantId", "cohortId", "verifiedAt"] as const;
const PROVIDER_ENTITLEMENT_KEYS = [
  "schemaVersion", "entitlementId", "subjectAccountId", "tenantId", "cohortId", "consentId", "purpose", "providerPurposes",
  "eligibilityBasisRef", "issuerAuthorityRef", "policyRef", "dependencyRef", "inputDigest", "permittedOperations", "issuedAt", "expiresAt", "revokedAt", "revocationReason",
] as const;
const PROVIDER_CONSENT_KEYS = ["authority", "consentId", "subjectAccountId", "tenantId", "entitlementId", "providerPurposes", "status", "expiresAt", "revokedAt"] as const;
const PROVIDER_QUOTA_KEYS = ["authority", "reservationId", "subjectAccountId", "tenantId", "entitlementId", "purpose", "status", "expiresAt"] as const;
const CANONICAL_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

type OwnDataRecord = Readonly<Record<string, unknown>>;

/**
 * Preflight every reader-provided value through own data descriptors before
 * Zod traverses it. A hostile synthetic reader therefore cannot run getters
 * while provider authority is deciding whether a transport is allowed.
 */
function ownDataRecord(value: unknown, expectedKeys: readonly string[]): OwnDataRecord | null {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return null;
    const keys = Reflect.ownKeys(value);
    if (keys.length !== expectedKeys.length || keys.some((key) => typeof key !== "string" || !expectedKeys.includes(key))) return null;
    const output: Record<string, unknown> = {};
    for (const key of expectedKeys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor) || descriptor.get || descriptor.set) return null;
      output[key] = descriptor.value;
    }
    return output;
  } catch {
    return null;
  }
}

function ownStringArray(value: unknown, maximum: number): readonly string[] | null {
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length === 0 || value.length > maximum) return null;
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => key !== "length" && (typeof key !== "string" || !/^(0|[1-9]\d*)$/.test(key)))) return null;
    const output: string[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !("value" in descriptor) || descriptor.get || descriptor.set || typeof descriptor.value !== "string") return null;
      output.push(descriptor.value);
    }
    return output;
  } catch {
    return null;
  }
}

function preflightProviderAuthoritySnapshot(value: unknown): unknown | null {
  const snapshot = ownDataRecord(value, PROVIDER_SNAPSHOT_KEYS);
  if (!snapshot) return null;
  const subject = ownDataRecord(snapshot.subject, PROVIDER_SUBJECT_KEYS);
  const entitlement = ownDataRecord(snapshot.entitlement, PROVIDER_ENTITLEMENT_KEYS);
  const consent = ownDataRecord(snapshot.consent, PROVIDER_CONSENT_KEYS);
  const quotaReservation = ownDataRecord(snapshot.quotaReservation, PROVIDER_QUOTA_KEYS);
  if (!subject || !entitlement || !consent || !quotaReservation) return null;
  const canonicalEntitlement = parsePilotEntitlementV1({
    schemaVersion: entitlement.schemaVersion,
    entitlementId: entitlement.entitlementId,
    subjectAccountId: entitlement.subjectAccountId,
    tenantId: entitlement.tenantId,
    cohortId: entitlement.cohortId,
    purpose: entitlement.purpose,
    eligibilityBasisRef: entitlement.eligibilityBasisRef,
    issuerAuthorityRef: entitlement.issuerAuthorityRef,
    policyRef: entitlement.policyRef,
    dependencyRef: entitlement.dependencyRef,
    inputDigest: entitlement.inputDigest,
    permittedOperations: entitlement.permittedOperations,
    issuedAt: entitlement.issuedAt,
    expiresAt: entitlement.expiresAt,
    revokedAt: entitlement.revokedAt,
    revocationReason: entitlement.revocationReason,
  });
  const entitlementPurposes = ownStringArray(entitlement.providerPurposes, PROVIDER_PURPOSES.length);
  const consentPurposes = ownStringArray(consent.providerPurposes, PROVIDER_PURPOSES.length);
  if (!canonicalEntitlement || !entitlementPurposes || !consentPurposes) return null;
  return {
    subject: { ...subject },
    entitlement: { ...canonicalEntitlement, consentId: entitlement.consentId, providerPurposes: [...entitlementPurposes] },
    consent: { ...consent, providerPurposes: [...consentPurposes] },
    quotaReservation: { ...quotaReservation },
  };
}

function isTimestamp(value: string): boolean {
  if (!CANONICAL_TIMESTAMP.test(value)) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

const nonEmptyIdSchema = z.string().min(1).max(200).regex(/^[A-Za-z0-9._:-]+$/);
const canonicalIdSchema = z.string().min(1).max(160).regex(/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/);
const semverSchema = z.string().regex(/^\d+\.\d+\.\d+$/);
const timestampSchema = z.string().max(80).refine(isTimestamp);
const digestSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const providerPurposeSchema = z.enum(PROVIDER_PURPOSES);
const pilotOperationSchema = z.enum([...PILOT_PERMITTED_OPERATIONS] as [PilotOperation, ...PilotOperation[]]);
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
    entitlementId: canonicalIdSchema,
    subjectAccountId: canonicalIdSchema,
    tenantId: canonicalIdSchema,
    cohortId: canonicalIdSchema,
    consentId: nonEmptyIdSchema,
    purpose: z.literal("wave6-reviewed-adult-pilot"),
    providerPurposes: providerPurposesSchema,
    eligibilityBasisRef: canonicalIdSchema,
    issuerAuthorityRef: canonicalIdSchema,
    policyRef: z.object({
      id: canonicalIdSchema,
      version: semverSchema,
      digest: digestSchema,
    }).strict(),
    dependencyRef: z.object({
      id: canonicalIdSchema,
      version: semverSchema,
      digest: digestSchema,
    }).strict(),
    inputDigest: digestSchema,
    permittedOperations: z.array(pilotOperationSchema)
      .min(1)
      .max(PILOT_PERMITTED_OPERATIONS.length)
      .refine((operations) => new Set(operations).size === operations.length),
    issuedAt: timestampSchema,
    expiresAt: timestampSchema,
    revokedAt: timestampSchema.nullable(),
    revocationReason: nonEmptyIdSchema.nullable(),
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

  const safeSnapshot = preflightProviderAuthoritySnapshot(snapshot);
  if (!safeSnapshot) return deny("malformed_server_record");
  const parsed = providerAuthoritySnapshotSchema.safeParse(safeSnapshot);
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
    quotaReservation.purpose !== purpose ||
    !entitlement.permittedOperations.includes("provider-transport")
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
  // Membership is checked before any property read. A typed but caller-owned
  // getter/proxy lookalike must not execute while a transport asks whether a
  // process-local issued grant is valid.
  if (!Number.isFinite(nowMs) || typeof decision !== "object" || decision === null || !ISSUED_PROVIDER_GRANTS.has(decision)) return false;
  const issued = decision as ProviderAuthorityGrant;
  return issued.allowed
    && issued.purpose === purpose
    && issued[PROVIDER_AUTHORITY_GRANT] === true
    && nowMs <= issued.validUntilEpochMs;
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
