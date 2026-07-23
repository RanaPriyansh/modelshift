import { deepFreeze } from "../deep-freeze";

export const PROJECT_FIXTURE_GRANT_SCOPES = [
  "project-safety-review",
  "return-policy-review",
  "practice-package-review",
  "learner-contribution-provenance",
] as const;

export type ProjectFixtureGrantScope = (typeof PROJECT_FIXTURE_GRANT_SCOPES)[number];

const GRANT_BRAND = Symbol("forge-project-fixture-grant");
const ISSUED_GRANTS = new WeakSet<object>();

export type ProjectFixtureGrant = Readonly<{
  grantMarker: string;
  scope: ProjectFixtureGrantScope;
  subjectRef: string;
  actorRef: string;
  issuedAt: string;
  expiresAt: string;
  allowedContributionIds: readonly string[];
  allowedOperationIds: readonly string[];
  readonly [GRANT_BRAND]: true;
}>;

export type ProjectFixtureGrantInput = Omit<ProjectFixtureGrant, typeof GRANT_BRAND>;

const STRICT_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function validTimestamp(value: string): boolean {
  if (!STRICT_TIMESTAMP.test(value)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString() === value;
}

function compare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * Test-only fixture mint. The returned object is process-local and clone
 * resistant. It is deliberately not identity, tenancy, or production grant
 * authority.
 */
export function testOnlyMintProjectFixtureGrant(input: ProjectFixtureGrantInput): ProjectFixtureGrant {
  if (!validTimestamp(input.issuedAt) || !validTimestamp(input.expiresAt) || Date.parse(input.expiresAt) <= Date.parse(input.issuedAt)) {
    throw new Error("Fixture grant timestamps must be strict UTC instants with a positive validity window.");
  }
  const grant = deepFreeze({
    ...input,
    allowedContributionIds: [...new Set(input.allowedContributionIds)].sort(compare),
    allowedOperationIds: [...new Set(input.allowedOperationIds)].sort(compare),
    [GRANT_BRAND]: true as const,
  });
  ISSUED_GRANTS.add(grant);
  return grant;
}

export type ProjectFixtureGrantExpectation = Readonly<{
  grantMarker: string;
  scope: ProjectFixtureGrantScope;
  subjectRef: string;
  actorRef: string;
  evaluationAt: string;
  contributionId?: string;
  operationIds?: readonly string[];
}>;

/** Exact process-local verification. Structured clones and plain objects fail. */
export function verifyProjectFixtureGrant(
  value: ProjectFixtureGrant | undefined,
  expected: ProjectFixtureGrantExpectation,
): boolean {
  if (!value || !ISSUED_GRANTS.has(value) || value[GRANT_BRAND] !== true || !validTimestamp(expected.evaluationAt)) return false;
  if (
    value.grantMarker !== expected.grantMarker
    || value.scope !== expected.scope
    || value.subjectRef !== expected.subjectRef
    || value.actorRef !== expected.actorRef
    || Date.parse(value.issuedAt) > Date.parse(expected.evaluationAt)
    || Date.parse(value.expiresAt) <= Date.parse(expected.evaluationAt)
  ) return false;
  if (expected.contributionId && !value.allowedContributionIds.includes(expected.contributionId)) return false;
  if (expected.operationIds?.some((operationId) => !value.allowedOperationIds.includes(operationId))) return false;
  return true;
}
