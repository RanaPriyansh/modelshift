import { describe, expect, it } from "vitest";

import {
  evaluatePilotRouteAccess,
  isFixturePilotAuthoritySnapshot,
  isFixtureReviewDecision,
  parsePilotEntitlementV1,
  projectPilotCandidateItem,
  readPilotAuthoritySnapshot,
  testOnlyMintPilotAuthoritySnapshot,
  testOnlyMintPilotCandidateItem,
  testOnlyMintPublisherAuthority,
  testOnlyMintReviewDecision,
  testOnlyMintReviewerGrant,
} from "./contracts";
import {
  readAcceptedForgeJournalAggregate,
  replayPilotFixtureJournal,
  testOnlyMintPilotFixtureJournalEvent,
} from "./fixture-journal";

const NOW = new Date("2026-07-23T12:00:00.000Z");
const BEFORE = "2026-07-23T11:00:00.000Z";
const AFTER = "2026-07-23T13:00:00.000Z";
const EARLIER = "2026-07-23T10:00:00.000Z";
const DIGEST_A = `sha256:${"a".repeat(64)}` as const;
const DIGEST_B = `sha256:${"b".repeat(64)}` as const;
const POLICY = { id: "policy-wave6-1", version: "1.0.0", digest: DIGEST_A } as const;
const DEPENDENCY = { id: "dependency-wave6-1", version: "1.0.0", digest: DIGEST_B } as const;

function entitlement(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: "pilot-entitlement.v1",
    entitlementId: "entitlement-wave6-1",
    subjectAccountId: "account-adult-1",
    tenantId: "tenant-wave6-1",
    cohortId: "cohort-wave6-1",
    purpose: "wave6-reviewed-adult-pilot",
    eligibilityBasisRef: "eligibility-wave6-1",
    issuerAuthorityRef: "issuer-wave6-1",
    policyRef: POLICY,
    dependencyRef: DEPENDENCY,
    inputDigest: DIGEST_A,
    permittedOperations: ["fixture-route-read", "fixture-route-projection"],
    issuedAt: BEFORE,
    expiresAt: AFTER,
    revokedAt: null,
    revocationReason: null,
    ...overrides,
  };
}

function snapshot(overrides: Record<string, unknown> = {}) {
  const minted = testOnlyMintPilotAuthoritySnapshot({
    authority: "pilot-authority-snapshot.v1",
    subjectAccountId: "account-adult-1",
    tenantId: "tenant-wave6-1",
    cohortId: "cohort-wave6-1",
    entitlement: entitlement(),
    currentDependencyRef: DEPENDENCY,
    ...overrides,
  });
  expect(minted).not.toBeNull();
  return minted!;
}

function routeRequest(overrides: Record<string, unknown> = {}) {
  return {
    accountId: "account-adult-1",
    tenantId: "tenant-wave6-1",
    cohortId: "cohort-wave6-1",
    purpose: "wave6-reviewed-adult-pilot",
    policyRef: POLICY,
    inputDigest: DIGEST_A,
    requiredDependencyRef: DEPENDENCY,
    operation: "fixture-route-read",
    ...overrides,
  };
}

function candidate(overrides: Record<string, unknown> = {}) {
  const minted = testOnlyMintPilotCandidateItem({
    schemaVersion: "pilot-candidate-item.v1",
    itemId: "candidate-wave6-1",
    tenantId: "tenant-wave6-1",
    authorAccountId: "author-wave6-1",
    inputDigest: DIGEST_A,
    policyRef: POLICY,
    dependencyRef: DEPENDENCY,
    createdAt: BEFORE,
    ...overrides,
  });
  expect(minted).not.toBeNull();
  return minted!;
}

function grant(scope: string, reviewerAccountId: string, overrides: Record<string, unknown> = {}) {
  const minted = testOnlyMintReviewerGrant({
    schemaVersion: "reviewer-grant.v1",
    grantId: `grant-${scope}`,
    tenantId: "tenant-wave6-1",
    reviewerAccountId,
    reviewerKind: "human",
    scope,
    purpose: "wave6-reviewed-adult-pilot",
    itemId: "candidate-wave6-1",
    inputDigest: DIGEST_A,
    qualificationRef: `qualification-${scope}`,
    policyRef: POLICY,
    dependencyRef: DEPENDENCY,
    issuedAt: EARLIER,
    expiresAt: AFTER,
    revokedAt: null,
    revocationReason: null,
    ...overrides,
  });
  expect(minted).not.toBeNull();
  return minted!;
}

function decision(scope: string, reviewerAccountId: string, overrides: Record<string, unknown> = {}) {
  const minted = testOnlyMintReviewDecision({
    schemaVersion: "review-decision-ref.v1",
    decisionId: `decision-${scope}-${reviewerAccountId}`,
    tenantId: "tenant-wave6-1",
    itemId: "candidate-wave6-1",
    inputDigest: DIGEST_A,
    reviewerGrant: grant(scope, reviewerAccountId),
    outcome: "accepted",
    independence: "independent",
    policyRef: POLICY,
    dependencyRef: DEPENDENCY,
    decidedAt: BEFORE,
    expiresAt: AFTER,
    revokedAt: null,
    revocationReason: null,
    ...overrides,
  });
  expect(minted).not.toBeNull();
  return minted!;
}

function completeDecisions() {
  return [
    decision("domain-capability", "reviewer-domain-1"),
    decision("learning-sequence", "reviewer-sequence-1"),
    decision("access", "reviewer-access-1"),
    decision("safety-rights", "reviewer-safety-1"),
  ];
}

function publisher(overrides: Record<string, unknown> = {}) {
  const minted = testOnlyMintPublisherAuthority({
    schemaVersion: "publisher-authority.v1",
    publisherAuthorityId: "publisher-authority-1",
    tenantId: "tenant-wave6-1",
    publisherAccountId: "publisher-wave6-1",
    publisherKind: "human",
    purpose: "wave6-reviewed-adult-pilot",
    itemId: "candidate-wave6-1",
    inputDigest: DIGEST_A,
    policyRef: POLICY,
    dependencyRef: DEPENDENCY,
    issuedAt: BEFORE,
    expiresAt: AFTER,
    revokedAt: null,
    revocationReason: null,
    ...overrides,
  });
  expect(minted).not.toBeNull();
  return minted!;
}

describe("W6 fixture-only pilot entitlement", () => {
  it("accepts only a complete server-minted synthetic snapshot and never a production reader", async () => {
    const minted = snapshot();
    expect(isFixturePilotAuthoritySnapshot(minted)).toBe(true);
    expect(Object.isFrozen(minted)).toBe(true);
    expect(await readPilotAuthoritySnapshot()).toBeNull();
    expect(evaluatePilotRouteAccess(routeRequest(), minted, NOW)).toMatchObject({ allowed: true, entitlementId: "entitlement-wave6-1" });
  });

  it("rejects anonymous, client-shaped, self-attested, and browser-shaped inputs before authority", () => {
    const clientShapes = [
      null,
      undefined,
      { audience: "adult" },
      { profile: { age: 42, tenantId: "tenant-wave6-1" } },
      { query: { audience: "adult" } },
      { cookie: "adult=true" },
      { localStorage: { "forge.device-profile:v1": "adult" } },
      { model: { says: "approved" } },
    ];
    for (const value of clientShapes) {
      expect(evaluatePilotRouteAccess(routeRequest(), value, NOW)).toEqual({ allowed: false, reason: value == null ? "absent_authority" : "untrusted_authority" });
    }
  });

  it("uses own data descriptors and rejects accessors, hostile proxies, extra keys, duplicates, Unicode, and malformed canonical values", () => {
    const withGetter = entitlement();
    Object.defineProperty(withGetter, "tenantId", { enumerable: true, get: () => "tenant-wave6-1" });
    const hostileProxy = new Proxy(entitlement(), { ownKeys() { throw new Error("must not traverse"); } });
    const invalids = [
      withGetter,
      hostileProxy,
      { ...entitlement(), extra: true },
      { ...entitlement(), permittedOperations: ["fixture-route-read", "fixture-route-read"] },
      { ...entitlement(), entitlementId: "é" },
      { ...entitlement(), inputDigest: `sha256:${"A".repeat(64)}` },
      { ...entitlement(), issuedAt: "2026-07-23T11:00:00Z" },
      { ...entitlement(), revokedAt: EARLIER, revocationReason: "operator-revoked" },
      { ...entitlement(), revokedAt: BEFORE, revocationReason: null },
      { ...entitlement(), revokedAt: null, revocationReason: "manual-revocation" },
    ];
    for (const invalid of invalids) expect(parsePilotEntitlementV1(invalid)).toBeNull();
  });

  it("returns exact fail-closed route denial reasons", () => {
    const cases: ReadonlyArray<readonly [string, unknown, unknown, string]> = [
      ["wrong account", routeRequest({ accountId: "account-other-1" }), snapshot(), "wrong_account"],
      ["wrong tenant", routeRequest({ tenantId: "tenant-other-1" }), snapshot(), "wrong_tenant"],
      ["wrong cohort", routeRequest({ cohortId: "cohort-other-1" }), snapshot(), "wrong_cohort"],
      ["wrong purpose", routeRequest({ purpose: "other-purpose" }), snapshot(), "wrong_purpose"],
      ["wrong policy", routeRequest({ policyRef: { ...POLICY, digest: DIGEST_B } }), snapshot(), "wrong_policy"],
      ["wrong input", routeRequest({ inputDigest: DIGEST_B }), snapshot(), "wrong_input_digest"],
      ["stale dependency", routeRequest({ requiredDependencyRef: { ...DEPENDENCY, version: "2.0.0" } }), snapshot(), "stale_authority"],
      ["not yet valid", routeRequest(), snapshot({ entitlement: entitlement({ issuedAt: AFTER, expiresAt: "2026-07-23T14:00:00.000Z" }) }), "not_yet_valid"],
      ["expired", routeRequest(), snapshot({ entitlement: entitlement({ expiresAt: "2026-07-23T11:30:00.000Z" }) }), "expired"],
      ["revoked", routeRequest(), snapshot({ entitlement: entitlement({ revokedAt: BEFORE, revocationReason: "operator-revoked" }) }), "revoked"],
      ["missing operation", routeRequest(), snapshot({ entitlement: entitlement({ permittedOperations: ["fixture-route-projection"] }) }), "operation_not_permitted"],
    ];
    for (const [, request, authority, reason] of cases) expect(evaluatePilotRouteAccess(request, authority, NOW)).toEqual({ allowed: false, reason });
  });

  it("parses the supplied route clock without invoking caller-controlled getTime", () => {
    const hostileClock = { getTime: () => { throw new Error("must not invoke hostile getTime"); } };
    const proxyClock = new Proxy(NOW, {});
    for (const clock of [hostileClock, proxyClock, new Date("invalid")]) {
      expect(evaluatePilotRouteAccess(routeRequest(), snapshot(), clock)).toEqual({ allowed: false, reason: "malformed_clock" });
    }
  });

  it("rejects mutable, spread, JSON, and forged brand-shaped snapshots", () => {
    const minted = snapshot();
    expect(Object.isFrozen(minted.entitlement)).toBe(true);
    expect(() => { (minted.entitlement.permittedOperations as string[]).push("provider-transport"); }).toThrow();
    for (const forged of [
      { ...minted },
      JSON.parse(JSON.stringify(minted)),
      { ...minted, authority: "pilot-authority-snapshot.v1", __brand: true },
    ]) {
      expect(evaluatePilotRouteAccess(routeRequest(), forged, NOW)).toEqual({ allowed: false, reason: "untrusted_authority" });
    }
  });
});

describe("W6 scoped review, separate publication, and route projection", () => {
  it("keeps candidate, reviewed-unpublished, published-ineligible, and narrowly eligible states distinct", () => {
    const item = candidate();
    const reviews = completeDecisions();
    const baseline = { candidate: item, decisions: reviews, publisher: publisher(), routeRequest: routeRequest(), routeSnapshot: snapshot(), currentDependencyRef: DEPENDENCY, now: NOW };

    expect(projectPilotCandidateItem({ ...baseline, decisions: [] }).status).toBe("candidate");
    expect(projectPilotCandidateItem({ ...baseline, publisher: null }).status).toBe("reviewed-unpublished");
    expect(projectPilotCandidateItem({ ...baseline, routeSnapshot: null }).status).toBe("published-ineligible");
    const eligible = projectPilotCandidateItem(baseline);
    expect(eligible.status).toBe("eligible-for-reviewed-adult-pilot");
    expect(eligible.capabilities).toEqual({
      fixtureRouteRead: true,
      curriculumPublication: false,
      resourceAssignment: false,
      externalNetwork: false,
      evidenceUpgrade: false,
      proofAuthority: false,
      educatorSharing: false,
      generalAvailability: false,
    });
  });

  it("rejects incomplete, duplicate, wrong-bound, self-approved, conflicted, nonhuman, stale, and revoked review paths", () => {
    const item = candidate();
    const valid = completeDecisions();
    const base = { candidate: item, publisher: publisher(), routeRequest: routeRequest(), routeSnapshot: snapshot(), currentDependencyRef: DEPENDENCY, now: NOW };
    const self = decision("domain-capability", "author-wave6-1");
    const duplicateReviewer = [
      decision("domain-capability", "reviewer-shared-1"),
      decision("learning-sequence", "reviewer-shared-1"),
      decision("access", "reviewer-access-2"),
      decision("safety-rights", "reviewer-safety-2"),
    ];
    const conflict = decision("domain-capability", "reviewer-conflict-1", { independence: "declared-conflict" });
    const revoked = decision("domain-capability", "reviewer-revoked-1", { revokedAt: BEFORE, revocationReason: "review-revoked" });
    const malformedGrant = testOnlyMintReviewerGrant({ ...grant("access", "reviewer-model-1"), reviewerKind: "model" });
    expect(malformedGrant).toBeNull();
    expect(testOnlyMintReviewerGrant({
      schemaVersion: "reviewer-grant.v1", grantId: "grant-learner-1", tenantId: "tenant-wave6-1", reviewerAccountId: "learner-1",
      reviewerKind: "learner", scope: "access", purpose: "wave6-reviewed-adult-pilot", itemId: "candidate-wave6-1", inputDigest: DIGEST_A,
      qualificationRef: "qualification-learner-1", policyRef: POLICY, dependencyRef: DEPENDENCY, issuedAt: EARLIER, expiresAt: AFTER, revokedAt: null, revocationReason: null,
    })).toBeNull();
    const cases = [
      [self, valid[1], valid[2], valid[3]],
      duplicateReviewer,
      [conflict, valid[1], valid[2], valid[3]],
      [revoked, valid[1], valid[2], valid[3]],
      [...valid, { ...valid[0] }],
    ];
    for (const decisions of cases) {
      expect(projectPilotCandidateItem({ ...base, decisions }).status).toBe("candidate");
    }
    expect(isFixtureReviewDecision({ ...valid[0] })).toBe(false);
  });

  it("binds each reviewer grant to one item/input/dependency and refuses revoked, expired, or not-yet-valid grants", () => {
    const current = grant("domain-capability", "reviewer-grant-bound-1");
    const base = {
      schemaVersion: "review-decision-ref.v1", decisionId: "decision-grant-bound-1", tenantId: "tenant-wave6-1", itemId: "candidate-wave6-1", inputDigest: DIGEST_A,
      reviewerGrant: current, outcome: "accepted", independence: "independent", policyRef: POLICY, dependencyRef: DEPENDENCY,
      decidedAt: BEFORE, expiresAt: AFTER, revokedAt: null, revocationReason: null,
    };
    expect(testOnlyMintReviewDecision({ ...base, itemId: "candidate-other-1" })).toBeNull();
    expect(testOnlyMintReviewDecision({ ...base, inputDigest: DIGEST_B })).toBeNull();
    expect(testOnlyMintReviewDecision({ ...base, dependencyRef: { ...DEPENDENCY, version: "2.0.0" } })).toBeNull();
    expect(testOnlyMintReviewDecision({ ...base, expiresAt: "2026-07-23T14:00:00.000Z" })).toBeNull();
    const revokedGrant = grant("access", "reviewer-grant-revoked-1", { revokedAt: BEFORE, revocationReason: "grant-revoked" });
    expect(testOnlyMintReviewDecision({ ...base, decisionId: "decision-revoked-grant-1", reviewerGrant: revokedGrant })).toBeNull();
    const expiredGrant = grant("access", "reviewer-grant-expired-1", { expiresAt: BEFORE });
    expect(testOnlyMintReviewDecision({ ...base, decisionId: "decision-expired-grant-1", reviewerGrant: expiredGrant })).toBeNull();
    const futureGrant = grant("access", "reviewer-grant-future-1", { issuedAt: AFTER, expiresAt: "2026-07-23T14:00:00.000Z" });
    expect(testOnlyMintReviewDecision({ ...base, decisionId: "decision-future-grant-1", reviewerGrant: futureGrant })).toBeNull();
    expect(testOnlyMintReviewerGrant({ ...current, grantId: "grant-contradictory-1", revokedAt: "2026-07-23T09:00:00.000Z", revocationReason: "impossible-revocation" })).toBeNull();
  });

  it("requires a distinct current human publisher that is neither author nor accepted reviewer", () => {
    const base = { candidate: candidate(), decisions: completeDecisions(), routeRequest: routeRequest(), routeSnapshot: snapshot(), currentDependencyRef: DEPENDENCY, now: NOW };
    for (const authority of [
      publisher({ publisherAccountId: "author-wave6-1" }),
      publisher({ publisherAccountId: "reviewer-domain-1" }),
      publisher({ tenantId: "tenant-other-1" }),
      publisher({ inputDigest: DIGEST_B }),
      publisher({ policyRef: { ...POLICY, digest: DIGEST_B } }),
      publisher({ expiresAt: "2026-07-23T11:30:00.000Z" }),
      publisher({ revokedAt: BEFORE, revocationReason: "publisher-revoked" }),
    ]) {
      expect(projectPilotCandidateItem({ ...base, publisher: authority }).status).toBe("reviewed-unpublished");
    }
    expect(testOnlyMintPublisherAuthority({ ...publisher(), publisherAuthorityId: "publisher-other-purpose-1", purpose: "other-purpose" })).toBeNull();
  });

  it("enforces candidate, decision, and publisher chronology before route eligibility", () => {
    const futureCandidate = candidate({ createdAt: "2026-07-23T13:30:00.000Z" });
    const candidateAfterReview = candidate({ createdAt: "2026-07-23T11:30:00.000Z" });
    const shared = { publisher: publisher(), routeRequest: routeRequest(), routeSnapshot: snapshot(), currentDependencyRef: DEPENDENCY, now: NOW };
    expect(projectPilotCandidateItem({ candidate: futureCandidate, decisions: completeDecisions(), ...shared }).status).toBe("candidate");
    expect(projectPilotCandidateItem({ candidate: candidateAfterReview, decisions: completeDecisions(), ...shared }).status).toBe("candidate");

    const decisions = [
      decision("domain-capability", "reviewer-chronology-domain-1"),
      decision("learning-sequence", "reviewer-chronology-sequence-1"),
      decision("access", "reviewer-chronology-access-1"),
      decision("safety-rights", "reviewer-chronology-safety-1", { decidedAt: "2026-07-23T11:30:00.000Z" }),
    ];
    expect(projectPilotCandidateItem({
      candidate: candidate(),
      decisions,
      publisher: publisher({ issuedAt: BEFORE }),
      routeRequest: routeRequest(),
      routeSnapshot: snapshot(),
      currentDependencyRef: DEPENDENCY,
      now: NOW,
    }).status).toBe("reviewed-unpublished");
  });

  it("cannot use raw candidate records, stale dependencies, route eligibility, or direct Boolean claims as broader authority", () => {
    const item = candidate();
    const base = { candidate: item, decisions: completeDecisions(), publisher: publisher(), routeRequest: routeRequest(), routeSnapshot: snapshot(), currentDependencyRef: DEPENDENCY, now: NOW };
    expect(projectPilotCandidateItem({ ...base, candidate: { ...item } }).status).toBe("candidate");
    expect(projectPilotCandidateItem({ ...base, currentDependencyRef: { ...DEPENDENCY, digest: DIGEST_A } }).status).toBe("published-ineligible");
    const projection = projectPilotCandidateItem(base);
    expect(projection.capabilities.resourceAssignment).toBe(false);
    expect(projection.capabilities.externalNetwork).toBe(false);
    expect(projection.capabilities.evidenceUpgrade).toBe(false);
    expect(projection.capabilities.proofAuthority).toBe(false);
  });

  it("parses an unknown descriptor-closed projection request before reading fields", () => {
    const valid = { candidate: candidate(), decisions: completeDecisions(), publisher: publisher(), routeRequest: routeRequest(), routeSnapshot: snapshot(), currentDependencyRef: DEPENDENCY, now: NOW };
    const unknownRequest: unknown = valid;
    expect(projectPilotCandidateItem(unknownRequest).status).toBe("eligible-for-reviewed-adult-pilot");
    const getter = { ...valid };
    Object.defineProperty(getter, "publisher", { enumerable: true, get: () => { throw new Error("must not read accessor"); } });
    const hostileProxy = new Proxy(valid, { ownKeys() { throw new Error("must not traverse proxy"); } });
    for (const hostile of [getter, hostileProxy, { ...valid, untrusted: true }, { ...valid, now: new Proxy(NOW, {}) }]) {
      expect(projectPilotCandidateItem(hostile as never).status).toBe("candidate");
    }
  });
});

function event(sequence: number, kind: string, overrides: Record<string, unknown> = {}) {
  const terminal = kind === "candidate-withdrawn" || kind === "candidate-incident-held" || kind === "candidate-tombstoned" || kind === "entitlement-revoked";
  const minted = testOnlyMintPilotFixtureJournalEvent({
    schemaVersion: "pilot-authority-fixture-event.v1",
    eventId: `event-${sequence}-${kind}`,
    aggregate: { type: "pilot_authority_fixture", id: "aggregate-wave6-1", tenantId: "tenant-wave6-1" },
    sequence,
    occurredAt: new Date(NOW.getTime() + sequence * 1_000).toISOString(),
    kind,
    payload: {
      candidateId: kind === "entitlement-revoked" ? null : "candidate-wave6-1",
      entitlementId: kind === "entitlement-revoked" ? "entitlement-wave6-1" : null,
      referenceId: `reference-${sequence}`,
      reasonCode: terminal ? "fixture-reason" : null,
    },
    ...overrides,
  });
  expect(minted).not.toBeNull();
  return minted!;
}

describe("W6 separate fixture-only journal", () => {
  it("replays accepted fixture events deterministically and old readers reject their aggregate safely", () => {
    const events = [event(1, "candidate-recorded"), event(2, "review-recorded"), event(3, "publication-recorded"), event(4, "entitlement-revoked"), event(5, "candidate-withdrawn")];
    const first = replayPilotFixtureJournal(events);
    const second = replayPilotFixtureJournal(events);
    expect(first).toEqual(second);
    expect(first).toMatchObject({ ok: true, state: { revokedEntitlementIds: ["entitlement-wave6-1"], withdrawnCandidateIds: ["candidate-wave6-1"] } });
    expect(readAcceptedForgeJournalAggregate(events[0])).toEqual({ accepted: false, reason: "unknown_aggregate" });
  });

  it("rejects forged, cloned, duplicate, out-of-order, cross-tenant, stale, unknown, and resurrection fixture events", () => {
    const first = event(1, "candidate-recorded");
    const second = event(2, "review-recorded");
    const terminal = event(2, "candidate-tombstoned");
    const cases: ReadonlyArray<readonly [unknown, string]> = [
      [[{ ...first }], "untrusted_event"],
      [[first, first], "duplicate_event"],
      [[second], "out_of_order"],
      [[first, event(2, "publication-recorded")], "out_of_order"],
      [[first, event(2, "review-recorded", { aggregate: { type: "pilot_authority_fixture", id: "aggregate-wave6-1", tenantId: "tenant-other-1" } })], "cross_tenant"],
      [[first, event(2, "review-recorded", { occurredAt: "2026-07-23T11:00:00.000Z" })], "stale_event"],
      [[first, terminal, event(3, "publication-recorded")], "terminal_state"],
      [[first, { ...second, kind: "forged-event" }], "untrusted_event"],
    ];
    for (const [events, reason] of cases) expect(replayPilotFixtureJournal(events)).toMatchObject({ ok: false, reason });
    expect(testOnlyMintPilotFixtureJournalEvent({ ...first, kind: "unknown-event" })).toBeNull();
    expect(testOnlyMintPilotFixtureJournalEvent({ ...first, aggregate: { ...first.aggregate, type: "world_run" } })).toBeNull();
  });

  it("deep-freezes fixture event payloads and rejects JSON round trips", () => {
    const minted = event(1, "candidate-recorded");
    expect(Object.isFrozen(minted.payload)).toBe(true);
    expect(() => { (minted.payload as { referenceId: string }).referenceId = "forged"; }).toThrow();
    expect(replayPilotFixtureJournal(JSON.parse(JSON.stringify([minted])))).toMatchObject({ ok: false, reason: "untrusted_event" });
  });
});
