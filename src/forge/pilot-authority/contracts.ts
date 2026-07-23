import "server-only";

import { deepFreeze } from "../deep-freeze";

/**
 * W6-000 is a fixture-only, process-local authority kernel. Nothing in this
 * module reads a request, a browser profile, a cookie, an environment value,
 * or a provider. The mint helpers are deliberately test fixtures, not an
 * issuance path or a production identity service.
 */
export const PILOT_ENTITLEMENT_SCHEMA_VERSION = "pilot-entitlement.v1" as const;
export const REVIEWER_GRANT_SCHEMA_VERSION = "reviewer-grant.v1" as const;
export const REVIEW_DECISION_SCHEMA_VERSION = "review-decision-ref.v1" as const;
export const PUBLISHER_AUTHORITY_SCHEMA_VERSION = "publisher-authority.v1" as const;
export const CANDIDATE_ITEM_SCHEMA_VERSION = "pilot-candidate-item.v1" as const;
export const PILOT_AUTHORITY_SNAPSHOT_VERSION = "pilot-authority-snapshot.v1" as const;

const PILOT_OPERATION_LITERALS = [
  "fixture-route-read",
  "fixture-route-projection",
  "provider-transport",
] as const;
export type PilotOperation = (typeof PILOT_OPERATION_LITERALS)[number];
export const PILOT_PERMITTED_OPERATIONS = Object.freeze([...PILOT_OPERATION_LITERALS]) as readonly PilotOperation[];

const REVIEW_SCOPE_LITERALS = [
  "domain-capability",
  "learning-sequence",
  "access",
  "safety-rights",
] as const;
export type ReviewerScope = (typeof REVIEW_SCOPE_LITERALS)[number];
export const REQUIRED_REVIEWER_SCOPES = Object.freeze([...REVIEW_SCOPE_LITERALS]) as readonly ReviewerScope[];

export type ImmutableRefV1 = Readonly<{
  id: string;
  version: string;
  digest: `sha256:${string}`;
}>;

export interface PilotEntitlementV1 {
  readonly schemaVersion: typeof PILOT_ENTITLEMENT_SCHEMA_VERSION;
  readonly entitlementId: string;
  readonly subjectAccountId: string;
  readonly tenantId: string;
  readonly cohortId: string;
  readonly purpose: "wave6-reviewed-adult-pilot";
  readonly eligibilityBasisRef: string;
  readonly issuerAuthorityRef: string;
  readonly policyRef: ImmutableRefV1;
  readonly dependencyRef: ImmutableRefV1;
  /** The immutable reviewed input bound to future route access. */
  readonly inputDigest: `sha256:${string}`;
  readonly permittedOperations: readonly PilotOperation[];
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly revokedAt: string | null;
  readonly revocationReason: string | null;
}

export interface ReviewerGrantV1 {
  readonly schemaVersion: typeof REVIEWER_GRANT_SCHEMA_VERSION;
  readonly grantId: string;
  readonly tenantId: string;
  readonly reviewerAccountId: string;
  readonly reviewerKind: "human";
  readonly scope: ReviewerScope;
  readonly purpose: "wave6-reviewed-adult-pilot";
  readonly itemId: string;
  readonly inputDigest: `sha256:${string}`;
  readonly qualificationRef: string;
  readonly policyRef: ImmutableRefV1;
  readonly dependencyRef: ImmutableRefV1;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly revokedAt: string | null;
  readonly revocationReason: string | null;
}

export interface ReviewDecisionRefV1 {
  readonly schemaVersion: typeof REVIEW_DECISION_SCHEMA_VERSION;
  readonly decisionId: string;
  readonly tenantId: string;
  readonly itemId: string;
  readonly inputDigest: `sha256:${string}`;
  readonly reviewerGrantId: string;
  readonly reviewerAccountId: string;
  readonly reviewerKind: "human";
  readonly scope: ReviewerScope;
  readonly outcome: "accepted" | "rejected";
  readonly independence: "independent" | "declared-conflict";
  readonly policyRef: ImmutableRefV1;
  readonly dependencyRef: ImmutableRefV1;
  readonly decidedAt: string;
  readonly expiresAt: string;
  readonly revokedAt: string | null;
  readonly revocationReason: string | null;
}

export interface PublisherAuthorityV1 {
  readonly schemaVersion: typeof PUBLISHER_AUTHORITY_SCHEMA_VERSION;
  readonly publisherAuthorityId: string;
  readonly tenantId: string;
  readonly publisherAccountId: string;
  readonly publisherKind: "human";
  readonly purpose: "wave6-reviewed-adult-pilot";
  readonly itemId: string;
  readonly inputDigest: `sha256:${string}`;
  readonly policyRef: ImmutableRefV1;
  readonly dependencyRef: ImmutableRefV1;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly revokedAt: string | null;
  readonly revocationReason: string | null;
}

export interface PilotCandidateItemV1 {
  readonly schemaVersion: typeof CANDIDATE_ITEM_SCHEMA_VERSION;
  readonly itemId: string;
  readonly tenantId: string;
  readonly authorAccountId: string;
  readonly inputDigest: `sha256:${string}`;
  readonly policyRef: ImmutableRefV1;
  readonly dependencyRef: ImmutableRefV1;
  readonly createdAt: string;
}

export interface PilotAuthoritySnapshotV1 {
  readonly authority: typeof PILOT_AUTHORITY_SNAPSHOT_VERSION;
  readonly subjectAccountId: string;
  readonly tenantId: string;
  readonly cohortId: string;
  readonly entitlement: PilotEntitlementV1;
  readonly currentDependencyRef: ImmutableRefV1;
}

export interface PilotRouteAccessRequestV1 {
  readonly accountId: string;
  readonly tenantId: string;
  readonly cohortId: string;
  readonly purpose: "wave6-reviewed-adult-pilot";
  readonly policyRef: ImmutableRefV1;
  readonly inputDigest: `sha256:${string}`;
  readonly requiredDependencyRef: ImmutableRefV1;
  readonly operation: Extract<PilotOperation, "fixture-route-read" | "fixture-route-projection">;
}

export type PilotRouteAccessDenialReason =
  | "absent_authority"
  | "malformed_authority"
  | "malformed_clock"
  | "untrusted_authority"
  | "malformed_request"
  | "wrong_account"
  | "wrong_tenant"
  | "wrong_cohort"
  | "wrong_purpose"
  | "wrong_policy"
  | "wrong_input_digest"
  | "operation_not_permitted"
  | "not_yet_valid"
  | "expired"
  | "revoked"
  | "stale_authority";

export type PilotRouteAccessDecision =
  | Readonly<{
      allowed: true;
      operation: Extract<PilotOperation, "fixture-route-read" | "fixture-route-projection">;
      entitlementId: string;
      validUntilEpochMs: number;
    }>
  | Readonly<{ allowed: false; reason: PilotRouteAccessDenialReason }>;

const SNAPSHOTS = new WeakSet<object>();
const GRANTS = new WeakSet<object>();
const DECISIONS = new WeakSet<object>();
const PUBLISHERS = new WeakSet<object>();
const CANDIDATES = new WeakSet<object>();

const ID = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+$/;
const DIGEST = /^sha256:[a-f0-9]{64}$/;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const MAX_ID = 160;
const MAX_REASON = 240;
const MAX_OPERATIONS = PILOT_OPERATION_LITERALS.length;

type OwnDataRecord = Readonly<Record<string, unknown>>;

/**
 * Read an object through own data descriptors only. Accessors, inherited
 * fields, symbols, exotic prototypes, and proxy traps that throw all fail
 * closed before the caller reads a value.
 */
function recordOf(value: unknown, expectedKeys: readonly string[]): OwnDataRecord | null {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return null;
    const keys = Reflect.ownKeys(value);
    if (keys.length !== expectedKeys.length || keys.some((key) => typeof key !== "string" || !expectedKeys.includes(key))) return null;
    const result: Record<string, unknown> = {};
    for (const key of expectedKeys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor) || descriptor.get || descriptor.set) return null;
      result[key] = descriptor.value;
    }
    return result;
  } catch {
    return null;
  }
}

function arrayOf(value: unknown, maximum: number): readonly unknown[] | null {
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > maximum) return null;
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => key !== "length" && (typeof key !== "string" || !/^(0|[1-9]\d*)$/.test(key)))) return null;
    const values: unknown[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor || !("value" in descriptor) || descriptor.get || descriptor.set) return null;
      values.push(descriptor.value);
    }
    return values;
  } catch {
    return null;
  }
}

function stringOf(value: unknown, maximum: number, pattern?: RegExp): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > maximum || value.trim() !== value) return null;
  if (/[\u0000-\u001f\u007f-\u009f\ud800-\udfff]/.test(value) || (pattern && !pattern.test(value))) return null;
  return value;
}

function idOf(value: unknown): string | null {
  return stringOf(value, MAX_ID, ID);
}

function digestOf(value: unknown): `sha256:${string}` | null {
  const digest = stringOf(value, 71, DIGEST);
  return digest as `sha256:${string}` | null;
}

function timestampOf(value: unknown): string | null {
  const timestamp = stringOf(value, 24, TIMESTAMP);
  if (!timestamp) return null;
  const parsed = Date.parse(timestamp);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === timestamp ? timestamp : null;
}

function nullableTimestampOf(value: unknown): string | null | undefined {
  return value === null ? null : timestampOf(value) ?? undefined;
}

function nullableReasonOf(value: unknown): string | null | undefined {
  return value === null ? null : stringOf(value, MAX_REASON, ID) ?? undefined;
}

function sameRef(left: ImmutableRefV1, right: ImmutableRefV1): boolean {
  return left.id === right.id && left.version === right.version && left.digest === right.digest;
}

function parseRef(value: unknown): ImmutableRefV1 | null {
  const record = recordOf(value, ["id", "version", "digest"]);
  if (!record) return null;
  const id = idOf(record.id);
  const version = stringOf(record.version, 32, SEMVER);
  const digest = digestOf(record.digest);
  return id && version && digest ? deepFreeze({ id, version, digest }) : null;
}

function parseOperations(value: unknown): readonly PilotOperation[] | null {
  const values = arrayOf(value, MAX_OPERATIONS);
  if (!values || values.length === 0) return null;
  const parsed: PilotOperation[] = [];
  for (const value of values) {
    if (typeof value !== "string" || !PILOT_OPERATION_LITERALS.includes(value as PilotOperation) || parsed.includes(value as PilotOperation)) return null;
    parsed.push(value as PilotOperation);
  }
  return deepFreeze(parsed.sort());
}

function parseScope(value: unknown): ReviewerScope | null {
  return typeof value === "string" && REVIEW_SCOPE_LITERALS.includes(value as ReviewerScope) ? value as ReviewerScope : null;
}

function validLifecycle(issuedAt: string, expiresAt: string, revokedAt: string | null, revocationReason: string | null): boolean {
  if (Date.parse(expiresAt) <= Date.parse(issuedAt)) return false;
  if ((revokedAt === null) !== (revocationReason === null)) return false;
  return revokedAt === null || (Date.parse(revokedAt) >= Date.parse(issuedAt) && Date.parse(revokedAt) <= Date.parse(expiresAt));
}

export function parsePilotEntitlementV1(value: unknown): PilotEntitlementV1 | null {
  const record = recordOf(value, [
    "schemaVersion", "entitlementId", "subjectAccountId", "tenantId", "cohortId", "purpose", "eligibilityBasisRef", "issuerAuthorityRef",
    "policyRef", "dependencyRef", "inputDigest", "permittedOperations", "issuedAt", "expiresAt", "revokedAt", "revocationReason",
  ]);
  if (!record || record.schemaVersion !== PILOT_ENTITLEMENT_SCHEMA_VERSION || record.purpose !== "wave6-reviewed-adult-pilot") return null;
  const entitlementId = idOf(record.entitlementId);
  const subjectAccountId = idOf(record.subjectAccountId);
  const tenantId = idOf(record.tenantId);
  const cohortId = idOf(record.cohortId);
  const eligibilityBasisRef = idOf(record.eligibilityBasisRef);
  const issuerAuthorityRef = idOf(record.issuerAuthorityRef);
  const policyRef = parseRef(record.policyRef);
  const dependencyRef = parseRef(record.dependencyRef);
  const inputDigest = digestOf(record.inputDigest);
  const permittedOperations = parseOperations(record.permittedOperations);
  const issuedAt = timestampOf(record.issuedAt);
  const expiresAt = timestampOf(record.expiresAt);
  const revokedAt = nullableTimestampOf(record.revokedAt);
  const revocationReason = nullableReasonOf(record.revocationReason);
  if (!entitlementId || !subjectAccountId || !tenantId || !cohortId || !eligibilityBasisRef || !issuerAuthorityRef || !policyRef || !dependencyRef || !inputDigest || !permittedOperations || !issuedAt || !expiresAt || revokedAt === undefined || revocationReason === undefined || !validLifecycle(issuedAt, expiresAt, revokedAt, revocationReason)) return null;
  return deepFreeze({
    schemaVersion: PILOT_ENTITLEMENT_SCHEMA_VERSION, entitlementId, subjectAccountId, tenantId, cohortId, purpose: "wave6-reviewed-adult-pilot",
    eligibilityBasisRef, issuerAuthorityRef, policyRef, dependencyRef, inputDigest, permittedOperations, issuedAt, expiresAt, revokedAt, revocationReason,
  });
}

export function testOnlyMintPilotAuthoritySnapshot(value: unknown): PilotAuthoritySnapshotV1 | null {
  const record = recordOf(value, ["authority", "subjectAccountId", "tenantId", "cohortId", "entitlement", "currentDependencyRef"]);
  if (!record || record.authority !== PILOT_AUTHORITY_SNAPSHOT_VERSION) return null;
  const subjectAccountId = idOf(record.subjectAccountId);
  const tenantId = idOf(record.tenantId);
  const cohortId = idOf(record.cohortId);
  const entitlement = parsePilotEntitlementV1(record.entitlement);
  const currentDependencyRef = parseRef(record.currentDependencyRef);
  if (!subjectAccountId || !tenantId || !cohortId || !entitlement || !currentDependencyRef) return null;
  if (entitlement.subjectAccountId !== subjectAccountId || entitlement.tenantId !== tenantId || entitlement.cohortId !== cohortId) return null;
  const snapshot = deepFreeze({ authority: PILOT_AUTHORITY_SNAPSHOT_VERSION, subjectAccountId, tenantId, cohortId, entitlement, currentDependencyRef });
  SNAPSHOTS.add(snapshot);
  return snapshot;
}

function parseRouteRequest(value: unknown): PilotRouteAccessRequestV1 | null {
  const record = recordOf(value, ["accountId", "tenantId", "cohortId", "purpose", "policyRef", "inputDigest", "requiredDependencyRef", "operation"]);
  if (!record || (record.operation !== "fixture-route-read" && record.operation !== "fixture-route-projection")) return null;
  const accountId = idOf(record.accountId);
  const tenantId = idOf(record.tenantId);
  const cohortId = idOf(record.cohortId);
  const purpose = idOf(record.purpose);
  const policyRef = parseRef(record.policyRef);
  const inputDigest = digestOf(record.inputDigest);
  const requiredDependencyRef = parseRef(record.requiredDependencyRef);
  return accountId && tenantId && cohortId && purpose && policyRef && inputDigest && requiredDependencyRef
    ? deepFreeze({ accountId, tenantId, cohortId, purpose: purpose as "wave6-reviewed-adult-pilot", policyRef, inputDigest, requiredDependencyRef, operation: record.operation })
    : null;
}

function deny(reason: PilotRouteAccessDenialReason): PilotRouteAccessDecision {
  return deepFreeze({ allowed: false, reason });
}

/** A default production reader is intentionally impossible to configure into authorization. */
export async function readPilotAuthoritySnapshot(): Promise<null> {
  return null;
}

/**
 * Exact fixture evaluation. The snapshot must have been minted in this
 * process; structurally equivalent data, JSON, spread clones, and branded
 * lookalikes fail before any route can be considered eligible.
 */
export function evaluatePilotRouteAccess(
  requestInput: unknown,
  snapshotInput: unknown,
  now: unknown = new Date(),
): PilotRouteAccessDecision {
  if (snapshotInput === null || snapshotInput === undefined) return deny("absent_authority");
  if (!SNAPSHOTS.has(snapshotInput as object)) return deny("untrusted_authority");
  const snapshot = snapshotInput as PilotAuthoritySnapshotV1;
  const request = parseRouteRequest(requestInput);
  if (!request) return deny("malformed_request");
  const clock = dateOf(now);
  if (!clock) return deny("malformed_clock");
  const nowMs = Date.prototype.getTime.call(clock);
  const entitlement = snapshot.entitlement;
  if (request.accountId !== snapshot.subjectAccountId || request.accountId !== entitlement.subjectAccountId) return deny("wrong_account");
  if (request.tenantId !== snapshot.tenantId || request.tenantId !== entitlement.tenantId) return deny("wrong_tenant");
  if (request.cohortId !== snapshot.cohortId || request.cohortId !== entitlement.cohortId) return deny("wrong_cohort");
  if (request.purpose !== entitlement.purpose) return deny("wrong_purpose");
  if (!sameRef(request.policyRef, entitlement.policyRef)) return deny("wrong_policy");
  if (request.inputDigest !== entitlement.inputDigest) return deny("wrong_input_digest");
  if (!entitlement.permittedOperations.includes(request.operation)) return deny("operation_not_permitted");
  if (Date.parse(entitlement.issuedAt) > nowMs) return deny("not_yet_valid");
  if (Date.parse(entitlement.expiresAt) <= nowMs) return deny("expired");
  if (entitlement.revokedAt !== null) return deny("revoked");
  if (!sameRef(snapshot.currentDependencyRef, entitlement.dependencyRef) || !sameRef(request.requiredDependencyRef, entitlement.dependencyRef)) return deny("stale_authority");
  return deepFreeze({ allowed: true, operation: request.operation, entitlementId: entitlement.entitlementId, validUntilEpochMs: Date.parse(entitlement.expiresAt) });
}

function parseReviewerGrant(value: unknown): ReviewerGrantV1 | null {
  const record = recordOf(value, ["schemaVersion", "grantId", "tenantId", "reviewerAccountId", "reviewerKind", "scope", "purpose", "itemId", "inputDigest", "qualificationRef", "policyRef", "dependencyRef", "issuedAt", "expiresAt", "revokedAt", "revocationReason"]);
  if (!record || record.schemaVersion !== REVIEWER_GRANT_SCHEMA_VERSION || record.reviewerKind !== "human" || record.purpose !== "wave6-reviewed-adult-pilot") return null;
  const grantId = idOf(record.grantId);
  const tenantId = idOf(record.tenantId);
  const reviewerAccountId = idOf(record.reviewerAccountId);
  const scope = parseScope(record.scope);
  const itemId = idOf(record.itemId);
  const inputDigest = digestOf(record.inputDigest);
  const qualificationRef = idOf(record.qualificationRef);
  const policyRef = parseRef(record.policyRef);
  const dependencyRef = parseRef(record.dependencyRef);
  const issuedAt = timestampOf(record.issuedAt);
  const expiresAt = timestampOf(record.expiresAt);
  const revokedAt = nullableTimestampOf(record.revokedAt);
  const revocationReason = nullableReasonOf(record.revocationReason);
  if (!grantId || !tenantId || !reviewerAccountId || !scope || !itemId || !inputDigest || !qualificationRef || !policyRef || !dependencyRef || !issuedAt || !expiresAt || revokedAt === undefined || revocationReason === undefined || !validLifecycle(issuedAt, expiresAt, revokedAt, revocationReason)) return null;
  return deepFreeze({ schemaVersion: REVIEWER_GRANT_SCHEMA_VERSION, grantId, tenantId, reviewerAccountId, reviewerKind: "human", scope, purpose: "wave6-reviewed-adult-pilot", itemId, inputDigest, qualificationRef, policyRef, dependencyRef, issuedAt, expiresAt, revokedAt, revocationReason });
}

export function testOnlyMintReviewerGrant(value: unknown): ReviewerGrantV1 | null {
  const grant = parseReviewerGrant(value);
  if (grant) GRANTS.add(grant);
  return grant;
}

function parseCandidate(value: unknown): PilotCandidateItemV1 | null {
  const record = recordOf(value, ["schemaVersion", "itemId", "tenantId", "authorAccountId", "inputDigest", "policyRef", "dependencyRef", "createdAt"]);
  if (!record || record.schemaVersion !== CANDIDATE_ITEM_SCHEMA_VERSION) return null;
  const itemId = idOf(record.itemId);
  const tenantId = idOf(record.tenantId);
  const authorAccountId = idOf(record.authorAccountId);
  const inputDigest = digestOf(record.inputDigest);
  const policyRef = parseRef(record.policyRef);
  const dependencyRef = parseRef(record.dependencyRef);
  const createdAt = timestampOf(record.createdAt);
  return itemId && tenantId && authorAccountId && inputDigest && policyRef && dependencyRef && createdAt
    ? deepFreeze({ schemaVersion: CANDIDATE_ITEM_SCHEMA_VERSION, itemId, tenantId, authorAccountId, inputDigest, policyRef, dependencyRef, createdAt })
    : null;
}

export function testOnlyMintPilotCandidateItem(value: unknown): PilotCandidateItemV1 | null {
  const candidate = parseCandidate(value);
  if (candidate) CANDIDATES.add(candidate);
  return candidate;
}

export function testOnlyMintReviewDecision(value: unknown): ReviewDecisionRefV1 | null {
  const record = recordOf(value, ["schemaVersion", "decisionId", "tenantId", "itemId", "inputDigest", "reviewerGrant", "outcome", "independence", "policyRef", "dependencyRef", "decidedAt", "expiresAt", "revokedAt", "revocationReason"]);
  if (!record || record.schemaVersion !== REVIEW_DECISION_SCHEMA_VERSION || (record.outcome !== "accepted" && record.outcome !== "rejected") || (record.independence !== "independent" && record.independence !== "declared-conflict")) return null;
  const outcome: "accepted" | "rejected" = record.outcome === "accepted" ? "accepted" : "rejected";
  const independence: "independent" | "declared-conflict" = record.independence === "independent" ? "independent" : "declared-conflict";
  if (!GRANTS.has(record.reviewerGrant as object)) return null;
  const grant = record.reviewerGrant as ReviewerGrantV1;
  const decisionId = idOf(record.decisionId);
  const tenantId = idOf(record.tenantId);
  const itemId = idOf(record.itemId);
  const inputDigest = digestOf(record.inputDigest);
  const policyRef = parseRef(record.policyRef);
  const dependencyRef = parseRef(record.dependencyRef);
  const decidedAt = timestampOf(record.decidedAt);
  const expiresAt = timestampOf(record.expiresAt);
  const revokedAt = nullableTimestampOf(record.revokedAt);
  const revocationReason = nullableReasonOf(record.revocationReason);
  if (!decisionId || !tenantId || !itemId || !inputDigest || !policyRef || !dependencyRef || !decidedAt || !expiresAt || revokedAt === undefined || revocationReason === undefined || !validLifecycle(decidedAt, expiresAt, revokedAt, revocationReason)) return null;
  if (
    tenantId !== grant.tenantId || itemId !== grant.itemId || inputDigest !== grant.inputDigest || !sameRef(policyRef, grant.policyRef) ||
    !sameRef(dependencyRef, grant.dependencyRef) || grant.purpose !== "wave6-reviewed-adult-pilot" || grant.revokedAt !== null ||
    Date.parse(decidedAt) < Date.parse(grant.issuedAt) || Date.parse(decidedAt) >= Date.parse(grant.expiresAt) || Date.parse(expiresAt) > Date.parse(grant.expiresAt)
  ) return null;
  const decision = deepFreeze({
    schemaVersion: REVIEW_DECISION_SCHEMA_VERSION, decisionId, tenantId, itemId, inputDigest, reviewerGrantId: grant.grantId,
    reviewerAccountId: grant.reviewerAccountId, reviewerKind: "human" as const, scope: grant.scope, outcome,
    independence, policyRef, dependencyRef, decidedAt, expiresAt, revokedAt, revocationReason,
  });
  DECISIONS.add(decision);
  return decision;
}

function parsePublisher(value: unknown): PublisherAuthorityV1 | null {
  const record = recordOf(value, ["schemaVersion", "publisherAuthorityId", "tenantId", "publisherAccountId", "publisherKind", "purpose", "itemId", "inputDigest", "policyRef", "dependencyRef", "issuedAt", "expiresAt", "revokedAt", "revocationReason"]);
  if (!record || record.schemaVersion !== PUBLISHER_AUTHORITY_SCHEMA_VERSION || record.publisherKind !== "human" || record.purpose !== "wave6-reviewed-adult-pilot") return null;
  const publisherAuthorityId = idOf(record.publisherAuthorityId);
  const tenantId = idOf(record.tenantId);
  const publisherAccountId = idOf(record.publisherAccountId);
  const itemId = idOf(record.itemId);
  const inputDigest = digestOf(record.inputDigest);
  const policyRef = parseRef(record.policyRef);
  const dependencyRef = parseRef(record.dependencyRef);
  const issuedAt = timestampOf(record.issuedAt);
  const expiresAt = timestampOf(record.expiresAt);
  const revokedAt = nullableTimestampOf(record.revokedAt);
  const revocationReason = nullableReasonOf(record.revocationReason);
  if (!publisherAuthorityId || !tenantId || !publisherAccountId || !itemId || !inputDigest || !policyRef || !dependencyRef || !issuedAt || !expiresAt || revokedAt === undefined || revocationReason === undefined || !validLifecycle(issuedAt, expiresAt, revokedAt, revocationReason)) return null;
  return deepFreeze({ schemaVersion: PUBLISHER_AUTHORITY_SCHEMA_VERSION, publisherAuthorityId, tenantId, publisherAccountId, publisherKind: "human", purpose: "wave6-reviewed-adult-pilot", itemId, inputDigest, policyRef, dependencyRef, issuedAt, expiresAt, revokedAt, revocationReason });
}

export function testOnlyMintPublisherAuthority(value: unknown): PublisherAuthorityV1 | null {
  const publisher = parsePublisher(value);
  if (publisher) PUBLISHERS.add(publisher);
  return publisher;
}

function isCurrent(value: { readonly issuedAt?: string; readonly decidedAt?: string; readonly expiresAt: string; readonly revokedAt: string | null }, nowMs: number): boolean {
  const start = "issuedAt" in value ? value.issuedAt : value.decidedAt;
  return !!start && Date.parse(start) <= nowMs && Date.parse(value.expiresAt) > nowMs && value.revokedAt === null;
}

export type PilotProjectionStatus = "candidate" | "reviewed-unpublished" | "published-ineligible" | "eligible-for-reviewed-adult-pilot";
export type PilotProjectionReason =
  | "untrusted_candidate"
  | "missing_current_review"
  | "invalid_review_set"
  | "publisher_missing_or_invalid"
  | "route_ineligible"
  | "stale_dependency";

export interface PilotItemProjection {
  readonly status: PilotProjectionStatus;
  readonly reasons: readonly PilotProjectionReason[];
  readonly routeAccess: PilotRouteAccessDecision;
  readonly capabilities: Readonly<{
    fixtureRouteRead: boolean;
    curriculumPublication: false;
    resourceAssignment: false;
    externalNetwork: false;
    evidenceUpgrade: false;
    proofAuthority: false;
    educatorSharing: false;
    generalAvailability: false;
  }>;
}

export interface PilotProjectionRequest {
  readonly candidate: unknown;
  readonly decisions: unknown;
  readonly publisher: unknown;
  readonly routeRequest: unknown;
  readonly routeSnapshot: unknown;
  readonly currentDependencyRef: unknown;
  readonly now: Date;
}

type ParsedPilotProjectionRequest = Readonly<{
  candidate: unknown;
  decisions: unknown;
  publisher: unknown;
  routeRequest: unknown;
  routeSnapshot: unknown;
  currentDependencyRef: unknown;
  now: Date;
}>;

function dateOf(value: unknown): Date | null {
  try {
    if (value === null || typeof value !== "object" || Object.getPrototypeOf(value) !== Date.prototype) return null;
    const epochMs = Date.prototype.getTime.call(value);
    return Number.isFinite(epochMs) ? new Date(epochMs) : null;
  } catch {
    return null;
  }
}

/** Descriptor-closed runtime parse: no caller field is trusted via TypeScript alone. */
function parseProjectionRequest(value: unknown): ParsedPilotProjectionRequest | null {
  const record = recordOf(value, ["candidate", "decisions", "publisher", "routeRequest", "routeSnapshot", "currentDependencyRef", "now"]);
  if (!record) return null;
  const now = dateOf(record.now);
  return now ? deepFreeze({
    candidate: record.candidate,
    decisions: record.decisions,
    publisher: record.publisher,
    routeRequest: record.routeRequest,
    routeSnapshot: record.routeSnapshot,
    currentDependencyRef: record.currentDependencyRef,
    now,
  }) : null;
}

function currentReviews(candidate: PilotCandidateItemV1, values: unknown, nowMs: number): { readonly complete: boolean; readonly invalid: boolean; readonly reviewerIds: readonly string[]; readonly latestAcceptedDecisionEpochMs: number | null } {
  const decisions = arrayOf(values, REQUIRED_REVIEWER_SCOPES.length);
  if (!decisions || Date.parse(candidate.createdAt) > nowMs) return { complete: false, invalid: true, reviewerIds: [], latestAcceptedDecisionEpochMs: null };
  const seenScopes = new Set<ReviewerScope>();
  const reviewerIds = new Set<string>();
  let latestAcceptedDecisionEpochMs: number | null = null;
  let invalid = decisions.length !== REQUIRED_REVIEWER_SCOPES.length;
  for (const candidateDecision of decisions) {
    if (!DECISIONS.has(candidateDecision as object)) { invalid = true; continue; }
    const decision = candidateDecision as ReviewDecisionRefV1;
    if (
      decision.tenantId !== candidate.tenantId || decision.itemId !== candidate.itemId || decision.inputDigest !== candidate.inputDigest ||
      !sameRef(decision.policyRef, candidate.policyRef) || !sameRef(decision.dependencyRef, candidate.dependencyRef) ||
      decision.outcome !== "accepted" || decision.independence !== "independent" || decision.reviewerKind !== "human" ||
      decision.reviewerAccountId === candidate.authorAccountId || Date.parse(decision.decidedAt) < Date.parse(candidate.createdAt) ||
      !isCurrent(decision, nowMs) || seenScopes.has(decision.scope) || reviewerIds.has(decision.reviewerAccountId)
    ) {
      invalid = true;
      continue;
    }
    seenScopes.add(decision.scope);
    reviewerIds.add(decision.reviewerAccountId);
    latestAcceptedDecisionEpochMs = Math.max(latestAcceptedDecisionEpochMs ?? Number.NEGATIVE_INFINITY, Date.parse(decision.decidedAt));
  }
  return {
    complete: !invalid && REQUIRED_REVIEWER_SCOPES.every((scope) => seenScopes.has(scope)),
    invalid,
    reviewerIds: [...reviewerIds],
    latestAcceptedDecisionEpochMs,
  };
}

function validPublisher(candidate: PilotCandidateItemV1, reviewerIds: readonly string[], latestAcceptedDecisionEpochMs: number | null, value: unknown, nowMs: number): boolean {
  if (!PUBLISHERS.has(value as object)) return false;
  const publisher = value as PublisherAuthorityV1;
  return latestAcceptedDecisionEpochMs !== null && publisher.publisherKind === "human" && publisher.purpose === "wave6-reviewed-adult-pilot" && publisher.tenantId === candidate.tenantId && publisher.itemId === candidate.itemId &&
    publisher.inputDigest === candidate.inputDigest && sameRef(publisher.policyRef, candidate.policyRef) && sameRef(publisher.dependencyRef, candidate.dependencyRef) &&
    publisher.publisherAccountId !== candidate.authorAccountId && !reviewerIds.includes(publisher.publisherAccountId) &&
    Date.parse(publisher.issuedAt) >= latestAcceptedDecisionEpochMs && isCurrent(publisher, nowMs);
}

/**
 * Deterministic, non-operative fixture projection. It can only expose a
 * narrow fixture route-read bit; every durable or educational authority stays
 * explicitly false, including when all synthetic records are current.
 */
export function projectPilotCandidateItem(request: unknown): PilotItemProjection {
  const parsedRequest = parseProjectionRequest(request);
  const capabilityBase = { curriculumPublication: false as const, resourceAssignment: false as const, externalNetwork: false as const, evidenceUpgrade: false as const, proofAuthority: false as const, educatorSharing: false as const, generalAvailability: false as const };
  if (!parsedRequest) return deepFreeze({ status: "candidate", reasons: ["untrusted_candidate"], routeAccess: deny("malformed_request"), capabilities: { fixtureRouteRead: false, ...capabilityBase } });
  const nowMs = parsedRequest.now.getTime();
  const candidate = CANDIDATES.has(parsedRequest.candidate as object) ? parsedRequest.candidate as PilotCandidateItemV1 : null;
  const fallbackRoute = deny("untrusted_authority");
  if (!candidate || !Number.isFinite(nowMs)) return deepFreeze({ status: "candidate", reasons: ["untrusted_candidate"], routeAccess: fallbackRoute, capabilities: { fixtureRouteRead: false, ...capabilityBase } });
  const dependency = parseRef(parsedRequest.currentDependencyRef);
  const reviews = currentReviews(candidate, parsedRequest.decisions, nowMs);
  if (!reviews.complete) return deepFreeze({ status: "candidate", reasons: [reviews.invalid ? "invalid_review_set" : "missing_current_review"], routeAccess: fallbackRoute, capabilities: { fixtureRouteRead: false, ...capabilityBase } });
  if (!validPublisher(candidate, reviews.reviewerIds, reviews.latestAcceptedDecisionEpochMs, parsedRequest.publisher, nowMs)) return deepFreeze({ status: "reviewed-unpublished", reasons: ["publisher_missing_or_invalid"], routeAccess: fallbackRoute, capabilities: { fixtureRouteRead: false, ...capabilityBase } });
  if (!dependency || !sameRef(dependency, candidate.dependencyRef)) return deepFreeze({ status: "published-ineligible", reasons: ["stale_dependency"], routeAccess: fallbackRoute, capabilities: { fixtureRouteRead: false, ...capabilityBase } });
  const routeAccess = evaluatePilotRouteAccess(parsedRequest.routeRequest, parsedRequest.routeSnapshot, parsedRequest.now);
  if (!routeAccess.allowed) return deepFreeze({ status: "published-ineligible", reasons: ["route_ineligible"], routeAccess, capabilities: { fixtureRouteRead: false, ...capabilityBase } });
  return deepFreeze({ status: "eligible-for-reviewed-adult-pilot", reasons: [], routeAccess, capabilities: { fixtureRouteRead: true, ...capabilityBase } });
}

export function isFixturePilotAuthoritySnapshot(value: unknown): value is PilotAuthoritySnapshotV1 {
  return typeof value === "object" && value !== null && SNAPSHOTS.has(value);
}

export function isFixtureReviewerGrant(value: unknown): value is ReviewerGrantV1 {
  return typeof value === "object" && value !== null && GRANTS.has(value);
}

export function isFixtureReviewDecision(value: unknown): value is ReviewDecisionRefV1 {
  return typeof value === "object" && value !== null && DECISIONS.has(value);
}

export function isFixturePublisherAuthority(value: unknown): value is PublisherAuthorityV1 {
  return typeof value === "object" && value !== null && PUBLISHERS.has(value);
}

export function isFixturePilotCandidateItem(value: unknown): value is PilotCandidateItemV1 {
  return typeof value === "object" && value !== null && CANDIDATES.has(value);
}
