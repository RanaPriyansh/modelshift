import { describe, expect, it } from "vitest";

import {
  buildCourseSourceGoalContext,
  courseSourceCandidateSchema,
  reconcileCourseSources,
} from ".";

const DIGEST = (character: string) => `sha256:${character.repeat(64)}`;
const OWNER = "11111111-1111-4111-8111-111111111111";
const TENANT = "22222222-2222-4222-8222-222222222222";
const scope = {
  ownerUserId: OWNER,
  tenantId: TENANT,
  termId: "term.2026-autumn",
  courseId: "course.cs102",
} as const;
const AS_OF = "2026-08-10T12:00:00.000Z";

function revision(
  revisionId = "course-source-revision.syllabus-v1",
  overrides: Record<string, unknown> = {},
) {
  return {
    schemaVersion: "course-source-revision.v1" as const,
    revisionId,
    scope,
    inputKind: "manual" as const,
    sourceLabel: "Learner-entered CS102 syllabus facts",
    sourceDigest: DIGEST("a"),
    observedAt: "2026-08-01T12:00:00.000Z",
    freshnessReviewDueAt: "2026-09-01T12:00:00.000Z",
    coverage: {
      status: "declared_complete_for_source" as const,
      window: {
        startsAt: "2026-08-01T00:00:00.000Z",
        endsAt: "2026-12-31T23:59:59.000Z",
      },
      inspectedScopes: ["course_commitments" as const, "deadlines" as const, "assessment_policies" as const],
      unknownOrOmittedScopes: [],
    },
    privacy: {
      visibility: "private_to_owner" as const,
      retentionClass: "derived_fields_only" as const,
      originalBytesRetained: false as const,
      redistributionAllowed: false as const,
    },
    ...overrides,
  };
}

function deadlineCandidate(
  candidateId = "course-source-candidate.assignment-one",
  dueAt = "2026-08-20T16:00:00.000Z",
  overrides: Record<string, unknown> = {},
) {
  return {
    schemaVersion: "course-source-candidate.v1" as const,
    candidateId,
    scope,
    sourceRevisionId: "course-source-revision.syllabus-v1",
    claimKey: "course-claim.assignment-one-deadline",
    locator: { kind: "manual_field" as const, fieldKey: "assignment_one_deadline" },
    extractedBy: "learner_manual" as const,
    fact: {
      kind: "deadline" as const,
      title: "Assignment one",
      dueAt,
      timeZone: "Asia/Kolkata",
      consequenceClass: "consequential" as const,
    },
    createdAt: "2026-08-01T12:05:00.000Z",
    ...overrides,
  };
}

function accept(
  candidateId = "course-source-candidate.assignment-one",
  decisionId = "course-source-decision.assignment-one-accept",
  overrides: Record<string, unknown> = {},
) {
  return {
    schemaVersion: "course-source-decision.v1" as const,
    decisionId,
    candidateId,
    scope,
    actor: "learner" as const,
    kind: "accept" as const,
    extractionMatch: "learner_confirmed" as const,
    decidedAt: "2026-08-01T12:10:00.000Z",
    ...overrides,
  };
}

function request(
  overrides: {
    sourceRevisions?: readonly unknown[];
    candidates?: readonly unknown[];
    decisions?: readonly unknown[];
    scope?: typeof scope;
    asOf?: string;
  } = {},
) {
  return {
    schemaVersion: "course-source-reconciliation.v1" as const,
    scope: overrides.scope ?? scope,
    asOf: overrides.asOf ?? AS_OF,
    sourceRevisions: overrides.sourceRevisions ?? [revision()],
    candidates: overrides.candidates ?? [deadlineCandidate()],
    decisions: overrides.decisions ?? [accept()],
  };
}

describe("ADR-010 university course-source candidate boundary", () => {
  it("projects an accepted manual fact without upgrading authenticity, completeness, persistence, or side effects", async () => {
    const result = await reconcileCourseSources(request());

    expect(result.status).toBe("connected_sources_reviewed");
    expect(result.authority).toEqual({
      identityScopeAuthority: "caller_asserted_fixture_only",
      tenantIsolationAuthority: "not_established",
      rightsEnforcementAuthority: "not_established",
      sourceClass: "learner_connected_source_copy",
      sourceAuthenticity: "not_established",
      institutionalCompleteness: "not_established",
      publicationAuthority: "not_established",
      durableStorageAuthority: "not_established",
      persistenceAllowed: false,
      eventEmissionAllowed: false,
      externalSideEffectsAllowed: false,
    });
    expect(result.coverage).toMatchObject({
      state: "connected_sources_reviewed",
      institutionalCompleteness: "not_established",
    });
    expect(result.coverage.declarations[0]).toMatchObject({
      sourceRevisionId: "course-source-revision.syllabus-v1",
      coverage: { status: "declared_complete_for_source" },
    });
    expect(result.sources[0]).toMatchObject({
      revisionId: "course-source-revision.syllabus-v1",
      sourceDigest: DIGEST("a"),
      privacy: {
        visibility: "private_to_owner",
        originalBytesRetained: false,
        redistributionAllowed: false,
      },
    });
    expect(result.candidates[0]).toMatchObject({
      locator: { kind: "manual_field", fieldKey: "assignment_one_deadline" },
      extractedBy: "learner_manual",
      extractionState: "learner_confirmed",
      factAuthority: "learner_connected_source_copy",
      sourceAuthenticity: "not_established",
      institutionalCompleteness: "not_established",
      institutionalPolicyAuthorization: "not_established",
    });
    expect(result.projectionDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.candidates[0])).toBe(true);
  });

  it("accepts deterministic ICS metadata only when the locator matches the ICS revision", async () => {
    const icsRevision = revision("course-source-revision.calendar-v1", {
      inputKind: "ics",
      sourceLabel: "Exported course calendar",
      sourceDigest: DIGEST("b"),
    });
    const icsCandidate = deadlineCandidate("course-source-candidate.calendar-assignment-one", "2026-08-20T16:00:00.000Z", {
      sourceRevisionId: "course-source-revision.calendar-v1",
      locator: { kind: "ics_component", uid: "assignment-one@university.example", propertyName: "DUE" },
      extractedBy: "deterministic_ics_parser",
    });
    const result = await reconcileCourseSources(request({
      sourceRevisions: [icsRevision],
      candidates: [icsCandidate],
      decisions: [accept(icsCandidate.candidateId, "course-source-decision.calendar-accept")],
    }));

    expect(result.status).toBe("connected_sources_reviewed");
    expect(result.issues).toEqual([]);
  });

  it("keeps a copied assessment policy restricted even after the learner confirms transcription", async () => {
    const policyCandidate = deadlineCandidate("course-source-candidate.policy-one", undefined, {
      claimKey: "course-claim.assignment-one-ai-policy",
      fact: {
        kind: "assessment_assistance_policy",
        assessmentRef: "assessment.assignment-one",
        statementSummary: "Generative tools may be used for brainstorming.",
        assertedAssistance: "allowed",
      },
    });
    const result = await reconcileCourseSources(request({
      candidates: [policyCandidate],
      decisions: [accept(policyCandidate.candidateId, "course-source-decision.policy-accept")],
    }));

    expect(result.candidates[0]).toMatchObject({
      extractionState: "learner_confirmed",
      institutionalPolicyAuthorization: "not_established",
      effectiveAssessmentMode: "restricted_assessment",
    });
  });

  it("preserves deterministic conflicts and excludes every conflicting fact from goal context", async () => {
    const first = deadlineCandidate("course-source-candidate.deadline-a", "2026-08-20T16:00:00.000Z");
    const second = deadlineCandidate("course-source-candidate.deadline-b", "2026-08-21T16:00:00.000Z");
    const reconciliationRequest = request({
      candidates: [first, second],
      decisions: [
        accept(first.candidateId, "course-source-decision.deadline-a"),
        accept(second.candidateId, "course-source-decision.deadline-b"),
      ],
    });
    const result = await reconcileCourseSources(reconciliationRequest);
    const goal = await buildCourseSourceGoalContext({
      goalRef: {
        schemaVersion: "learner-goal.v1",
        goalId: "goal.finish-assignment-one",
        storageClass: "learner-owned-device-local",
      },
      reconciliationRequest,
    });

    expect(result.status).toBe("review_required");
    expect(result.conflicts).toEqual([{
      groupKey: "conflict:course-claim.assignment-one-deadline",
      claimKey: "course-claim.assignment-one-deadline",
      candidateIds: [first.candidateId, second.candidateId],
      canonicalFactDigests: expect.arrayContaining([
        expect.stringMatching(/^sha256:/),
        expect.stringMatching(/^sha256:/),
      ]),
      resolution: "learner_or_authorized_human_required",
    }]);
    expect(result.contextCandidateIds).toEqual([]);
    expect(goal.status).toBe("available");
    expect(goal.context?.facts).toEqual([]);
    expect(goal.context).toMatchObject({
      scopeAuthority: "caller_asserted_fixture_only",
      executionAllowed: false,
      recommendationAllowed: false,
      pathActivationAllowed: false,
    });
  });

  it("flags exact duplicates without silently merging them into goal context", async () => {
    const first = deadlineCandidate("course-source-candidate.duplicate-a");
    const second = deadlineCandidate("course-source-candidate.duplicate-b");
    const result = await reconcileCourseSources(request({
      candidates: [second, first],
      decisions: [
        accept(second.candidateId, "course-source-decision.duplicate-b"),
        accept(first.candidateId, "course-source-decision.duplicate-a"),
      ],
    }));

    expect(result.status).toBe("review_required");
    expect(result.duplicateGroups).toHaveLength(1);
    expect(result.duplicateGroups[0]?.candidateIds).toEqual([first.candidateId, second.candidateId]);
    expect(result.contextCandidateIds).toEqual([]);
  });

  it("retains the original fact and gives a learner correction only student-entered authority", async () => {
    const original = deadlineCandidate();
    const correctedDueAt = "2026-08-22T16:00:00.000Z";
    const correction = {
      schemaVersion: "course-source-decision.v1" as const,
      decisionId: "course-source-decision.assignment-one-correct",
      candidateId: original.candidateId,
      scope,
      actor: "learner" as const,
      kind: "correct" as const,
      extractionMatch: "learner_corrected" as const,
      correctedFact: { ...original.fact, dueAt: correctedDueAt },
      correctionReasonCode: "source_transcription_error",
      decidedAt: "2026-08-01T12:10:00.000Z",
    };
    const result = await reconcileCourseSources(request({ candidates: [original], decisions: [correction] }));

    expect(result.candidates[0]?.originalFact).toEqual(original.fact);
    expect(result.candidates[0]?.effectiveFact).toEqual({ ...original.fact, dueAt: correctedDueAt });
    expect(result.candidates[0]?.factAuthority).toBe("student_entered_correction");
    expect(result.candidates[0]?.sourceAuthenticity).toBe("not_established");
  });

  it("fails closed for cross-tenant records, missing sources, and duplicate decisions", async () => {
    const otherScope = { ...scope, tenantId: "33333333-3333-4333-8333-333333333333" };
    const crossTenant = await reconcileCourseSources(request({
      candidates: [deadlineCandidate(undefined, undefined, { scope: otherScope })],
    }));
    const missingSource = await reconcileCourseSources(request({
      candidates: [deadlineCandidate(undefined, undefined, { sourceRevisionId: "course-source-revision.missing" })],
    }));
    const duplicateDecision = await reconcileCourseSources(request({
      decisions: [
        accept(),
        accept("course-source-candidate.assignment-one", "course-source-decision.assignment-one-second"),
      ],
    }));

    expect(crossTenant.status).toBe("invalid");
    expect(crossTenant.issues.map((entry) => entry.code)).toContain("candidate.scope_mismatch");
    expect(missingSource.status).toBe("invalid");
    expect(missingSource.issues.map((entry) => entry.code)).toContain("candidate.source_missing");
    expect(duplicateDecision.status).toBe("invalid");
    expect(duplicateDecision.issues.map((entry) => entry.code)).toContain("decision.duplicate_for_candidate");
    expect(duplicateDecision.candidates).toEqual([]);
    expect(duplicateDecision.projectionDigest).toBeNull();
  });

  it.each([
    ["owner", { ...scope, ownerUserId: "44444444-4444-4444-8444-444444444444" }],
    ["tenant", { ...scope, tenantId: "33333333-3333-4333-8333-333333333333" }],
    ["term", { ...scope, termId: "term.2027-spring" }],
    ["course", { ...scope, courseId: "course.cs999" }],
  ])("fails closed for a candidate outside the requested %s scope", async (_dimension, foreignScope) => {
    const result = await reconcileCourseSources(request({
      candidates: [deadlineCandidate(undefined, undefined, { scope: foreignScope })],
    }));

    expect(result.status).toBe("invalid");
    expect(result.issues.map((entry) => entry.code)).toContain("candidate.scope_mismatch");
  });

  it("fails closed when a source revision or learner decision crosses scope", async () => {
    const foreignRevision = await reconcileCourseSources(request({
      sourceRevisions: [revision(undefined, { scope: { ...scope, courseId: "course.cs999" } })],
    }));
    const foreignDecision = await reconcileCourseSources(request({
      decisions: [accept(undefined, undefined, { scope: { ...scope, termId: "term.2027-spring" } })],
    }));

    expect(foreignRevision.status).toBe("invalid");
    expect(foreignRevision.issues.map((entry) => entry.code)).toContain("revision.scope_mismatch");
    expect(foreignDecision.status).toBe("invalid");
    expect(foreignDecision.issues.map((entry) => entry.code)).toContain("decision.scope_mismatch");
  });

  it("computes stale and unknown freshness without upgrading connected coverage", async () => {
    const stale = await reconcileCourseSources(request({
      sourceRevisions: [revision(undefined, { freshnessReviewDueAt: "2026-08-05T12:00:00.000Z" })],
    }));
    const unknown = await reconcileCourseSources(request({
      sourceRevisions: [revision(undefined, {
        freshnessReviewDueAt: null,
        coverage: {
          status: "unknown",
          window: {
            startsAt: "2026-08-01T00:00:00.000Z",
            endsAt: "2026-12-31T23:59:59.000Z",
          },
          inspectedScopes: [],
          unknownOrOmittedScopes: ["course_commitments", "deadlines", "assessment_policies"],
        },
      })],
    }));

    expect(stale.status).toBe("review_required");
    expect(stale.freshness[0]?.state).toBe("stale");
    expect(unknown.status).toBe("review_required");
    expect(unknown.freshness[0]?.state).toBe("unknown");
    expect(unknown.coverage).toMatchObject({
      state: "unknown",
      institutionalCompleteness: "not_established",
    });
  });

  it("rejects future observations and mismatched manual/ICS locators", async () => {
    const future = await reconcileCourseSources(request({
      sourceRevisions: [revision(undefined, {
        observedAt: "2026-08-11T12:00:00.000Z",
        freshnessReviewDueAt: "2026-09-01T12:00:00.000Z",
      })],
    }));
    const mismatched = await reconcileCourseSources(request({
      candidates: [deadlineCandidate(undefined, undefined, {
        locator: { kind: "ics_component", uid: "x", propertyName: "DUE" },
        extractedBy: "deterministic_ics_parser",
      })],
    }));

    expect(future.status).toBe("invalid");
    expect(future.issues.map((entry) => entry.code)).toContain("revision.observed_in_future");
    expect(mismatched.status).toBe("invalid");
    expect(mismatched.issues.map((entry) => entry.code)).toContain("candidate.locator_kind_mismatch");
  });

  it("uses strict schemas so raw source text, URLs, and source bytes cannot cross the contract", async () => {
    const candidateWithRawText = {
      ...deadlineCandidate(),
      rawSourceText: "private syllabus contents",
      url: "https://lms.example/private",
    };
    expect(courseSourceCandidateSchema.safeParse(candidateWithRawText).success).toBe(false);

    const requestWithBytes = {
      ...request(),
      sourceRevisions: [{
        ...revision(),
        sourceBytes: "data:application/pdf;base64,private",
      }],
    };
    const result = await reconcileCourseSources(requestWithBytes);
    expect(result.status).toBe("invalid");
    expect(result.issues.map((entry) => entry.code)).toContain("schema.invalid");
  });

  it("caps structural issues for a maximum-size malformed candidate array", async () => {
    const invalidMaximum = request({
      candidates: Array.from({ length: 512 }, () => null),
      decisions: [],
    });

    const first = await reconcileCourseSources(invalidMaximum);
    const second = await reconcileCourseSources(invalidMaximum);

    expect(first.status).toBe("invalid");
    expect(first.issues).toHaveLength(64);
    expect(first.issues.length).toBeLessThanOrEqual(64);
    expect(first).toEqual(second);
  });

  it("produces the same stable projection for semantically identical array orderings", async () => {
    const first = deadlineCandidate("course-source-candidate.stable-a", "2026-08-20T16:00:00.000Z", {
      claimKey: "course-claim.stable-a",
    });
    const second = deadlineCandidate("course-source-candidate.stable-b", "2026-08-21T16:00:00.000Z", {
      claimKey: "course-claim.stable-b",
    });
    const decisions = [
      accept(first.candidateId, "course-source-decision.stable-a"),
      accept(second.candidateId, "course-source-decision.stable-b"),
    ];
    const left = await reconcileCourseSources(request({ candidates: [first, second], decisions }));
    const right = await reconcileCourseSources(request({
      candidates: [second, first],
      decisions: [...decisions].reverse(),
    }));

    expect(left.projectionDigest).toBe(right.projectionDigest);
    expect(left.candidates).toEqual(right.candidates);
  });

  it("binds the projection digest to the exact private source revision digest", async () => {
    const left = await reconcileCourseSources(request());
    const right = await reconcileCourseSources(request({
      sourceRevisions: [revision(undefined, { sourceDigest: DIGEST("c") })],
    }));

    expect(left.projectionDigest).not.toBe(right.projectionDigest);
    expect(right.sources[0]?.sourceDigest).toBe(DIGEST("c"));
  });

  it("rejects a correction that changes the candidate fact kind", async () => {
    const result = await reconcileCourseSources(request({
      decisions: [{
        schemaVersion: "course-source-decision.v1",
        decisionId: "course-source-decision.invalid-kind",
        candidateId: "course-source-candidate.assignment-one",
        scope,
        actor: "learner",
        kind: "correct",
        extractionMatch: "learner_corrected",
        correctedFact: {
          kind: "assessment_assistance_policy",
          assessmentRef: "assessment.assignment-one",
          statementSummary: "A copied policy candidate.",
          assertedAssistance: "unknown",
        },
        correctionReasonCode: "wrong_fact_kind",
        decidedAt: "2026-08-01T12:10:00.000Z",
      }],
    }));

    expect(result.status).toBe("invalid");
    expect(result.issues.map((entry) => entry.code)).toContain("decision.corrected_fact_kind_mismatch");
  });

  it("preserves an explicit rejection without allowing the rejected fact into goal context", async () => {
    const candidate = deadlineCandidate();
    const reconciliationRequest = request({
      candidates: [candidate],
      decisions: [{
        schemaVersion: "course-source-decision.v1",
        decisionId: "course-source-decision.assignment-one-reject",
        candidateId: candidate.candidateId,
        scope,
        actor: "learner",
        kind: "reject",
        extractionMatch: "learner_rejected",
        rejectionReasonCode: "not_current",
        decidedAt: "2026-08-01T12:10:00.000Z",
      }],
    });
    const result = await buildCourseSourceGoalContext({
      goalRef: {
        schemaVersion: "learner-goal.v1",
        goalId: "goal.finish-assignment-one",
        storageClass: "learner-owned-device-local",
      },
      reconciliationRequest,
    });

    expect(result.reconciliation.candidates[0]).toMatchObject({
      extractionState: "learner_rejected",
      factAuthority: "none",
      effectiveFact: null,
    });
    expect(result.context?.facts).toEqual([]);
  });

  it("rejects a goal reference that does not use the existing continuity contract", async () => {
    const result = await buildCourseSourceGoalContext({
      goalRef: { goalId: "goal.finish-assignment-one" },
      reconciliationRequest: request(),
    });

    expect(result.status).toBe("unavailable");
    expect(result.context).toBeNull();
    expect(result.issues.map((entry) => entry.code)).toContain("schema.invalid");
  });

  it("builds a non-runnable goal context only from accepted or corrected, non-conflicting facts", async () => {
    const pending = deadlineCandidate("course-source-candidate.pending", "2026-08-25T16:00:00.000Z", {
      claimKey: "course-claim.pending-deadline",
    });
    const accepted = deadlineCandidate();
    const result = await buildCourseSourceGoalContext({
      goalRef: {
        schemaVersion: "learner-goal.v1",
        goalId: "goal.finish-assignment-one",
        storageClass: "learner-owned-device-local",
      },
      reconciliationRequest: request({
        candidates: [pending, accepted],
        decisions: [accept(accepted.candidateId)],
      }),
    });

    expect(result.status).toBe("available");
    expect(result.reconciliation.status).toBe("review_required");
    expect(result.context?.facts).toHaveLength(1);
    expect(result.context?.facts[0]?.candidateId).toBe(accepted.candidateId);
    expect(result.context).toMatchObject({
      authority: "candidate_unverified",
      scopeAuthority: "caller_asserted_fixture_only",
      sourceAuthenticity: "not_established",
      institutionalCompleteness: "not_established",
      executionAllowed: false,
      recommendationAllowed: false,
      pathActivationAllowed: false,
    });
    expect(Object.isFrozen(result.context)).toBe(true);
  });

  it("reconciles an ordinary request from one detached snapshot", async () => {
    const result = await reconcileCourseSources(request());

    expect(result.status).toBe("connected_sources_reviewed");
  });

  it("fails reconciliation closed without invoking an accessor or leaking a hostile proxy failure", async () => {
    let getterCalls = 0;
    const accessorRequest = request() as Record<string, unknown>;
    Object.defineProperty(accessorRequest, "scope", {
      configurable: true,
      enumerable: true,
      get() {
        getterCalls += 1;
        throw new Error("must not execute");
      },
    });
    const proxyRequest = new Proxy(request(), {
      ownKeys() {
        throw new Error("hostile proxy");
      },
    });

    const accessorResult = await reconcileCourseSources(accessorRequest);
    const proxyResult = await reconcileCourseSources(proxyRequest);

    expect(accessorResult.status).toBe("invalid");
    expect(accessorResult.issues.map((entry) => entry.code)).toContain("schema.invalid");
    expect(getterCalls).toBe(0);
    expect(proxyResult.status).toBe("invalid");
    expect(proxyResult.issues.map((entry) => entry.code)).toContain("schema.invalid");
  });

  it("rejects a proxy before reflection while preserving ordinary request input", async () => {
    const accepted = await reconcileCourseSources(request());
    let getPrototypeOfCalls = 0;
    let ownKeysCalls = 0;
    const proxyRequest = new Proxy(request(), {
      getPrototypeOf() {
        getPrototypeOfCalls += 1;
        throw new Error("proxy prototype reflection must not run");
      },
      ownKeys() {
        ownKeysCalls += 1;
        throw new Error("proxy key reflection must not run");
      },
    });

    const rejected = await reconcileCourseSources(proxyRequest);

    expect(accepted.status).toBe("connected_sources_reviewed");
    expect(rejected.status).toBe("invalid");
    expect(rejected.issues.map((entry) => entry.code)).toEqual(["schema.invalid"]);
    expect(getPrototypeOfCalls).toBe(0);
    expect(ownKeysCalls).toBe(0);
  });

  it("builds goal context from one ordinary wrapper snapshot", async () => {
    const callerInput = {
      goalRef: {
        schemaVersion: "learner-goal.v1",
        goalId: "goal.finish-assignment-one",
        storageClass: "learner-owned-device-local",
      },
      reconciliationRequest: request(),
    };
    const result = await buildCourseSourceGoalContext(callerInput);

    expect(result.status).toBe("available");

    const extraWrapperKeyInput = {
      ...callerInput,
      ignored: "wrapper keys are exact",
    };
    const extraWrapperKey = await buildCourseSourceGoalContext(extraWrapperKeyInput);
    expect(extraWrapperKey.status).toBe("unavailable");
    expect(extraWrapperKey.reconciliation.status).toBe("invalid");
    expect(extraWrapperKey.issues.map((entry) => entry.code)).toContain("schema.invalid");

    let getterCalls = 0;
    const hostileInput = {
      reconciliationRequest: request(),
    } as Record<string, unknown>;
    Object.defineProperty(hostileInput, "goalRef", {
      configurable: true,
      enumerable: true,
      get() {
        getterCalls += 1;
        throw new Error("must not execute");
      },
    });
    const rejected = await buildCourseSourceGoalContext(
      hostileInput as {
        readonly goalRef: unknown;
        readonly reconciliationRequest: unknown;
      },
    );

    expect(rejected.status).toBe("unavailable");
    expect(rejected.reconciliation.status).toBe("invalid");
    expect(rejected.issues.map((entry) => entry.code)).toContain("schema.invalid");
    expect(getterCalls).toBe(0);
  });

  it("rejects a proxy goal-context wrapper before reflection", async () => {
    const callerInput = {
      goalRef: {
        schemaVersion: "learner-goal.v1",
        goalId: "goal.finish-assignment-one",
        storageClass: "learner-owned-device-local",
      },
      reconciliationRequest: request(),
    };
    let getPrototypeOfCalls = 0;
    let ownKeysCalls = 0;
    const proxyInput = new Proxy(callerInput, {
      getPrototypeOf() {
        getPrototypeOfCalls += 1;
        throw new Error("goal-context proxy prototype reflection must not run");
      },
      ownKeys() {
        ownKeysCalls += 1;
        throw new Error("goal-context proxy key reflection must not run");
      },
    });

    const result = await buildCourseSourceGoalContext(proxyInput);

    expect(result.status).toBe("unavailable");
    expect(result.reconciliation.status).toBe("invalid");
    expect(result.issues.map((entry) => entry.code)).toEqual(["schema.invalid"]);
    expect(getPrototypeOfCalls).toBe(0);
    expect(ownKeysCalls).toBe(0);
  });
});
