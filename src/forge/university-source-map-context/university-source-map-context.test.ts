import { describe, expect, it, vi } from "vitest";

import type { CourseSourceReconciliationRequestV1 } from "../course-sources";
import type { UniversityDegreeMapRequestV2 } from "../university-degree-map";
import type { UniversityLearningMapRequestV2 } from "../university-learning-map";
import type { UniversityStudentContextRequestV2 } from "../university-student-context";
import {
  projectUniversitySourceMapContext,
  UNIVERSITY_SOURCE_MAP_CONTEXT_STATUSES,
  type UniversitySourceMapBindingV1,
} from ".";

const DIGEST_A = `sha256:${"a".repeat(64)}`;
const DIGEST_B = `sha256:${"b".repeat(64)}`;
const OWNER = "11111111-1111-4111-8111-111111111111";
const TENANT = "22222222-2222-4222-8222-222222222222";
const AS_OF = "2026-08-10T12:00:00.000Z";

function courseScope() {
  return {
    ownerUserId: OWNER,
    tenantId: TENANT,
    termId: "term.2026-autumn",
    courseId: "course.cs102",
  } as const;
}

function degreeRequest(): UniversityDegreeMapRequestV2 {
  return {
    schemaVersion: "university-degree-map-request.v2",
    ownershipDeclaration: {
      subject: "adult_learner_self_attested",
      control: "learner_managed_self_attested",
    },
    program: {
      programRef: "program.computing.v1",
      creditUnit: "institution_credit_unit",
      sourceRef: "source.cs102-syllabus",
    },
    sourceRegistry: [{
      sourceRef: "source.cs102-syllabus",
      declaredSourceDigest: DIGEST_A,
      authority: "learner_supplied_not_verified",
    }],
    courses: [{
      courseId: "course.cs102",
      creditUnits: 4,
      state: "in_progress",
      prerequisiteCourseIds: [],
      sourceRef: "source.cs102-syllabus",
    }],
    requirements: [{
      requirementId: "requirement.cs102",
      kind: "required_course",
      courseId: "course.cs102",
      sourceRef: "source.cs102-syllabus",
    }],
  };
}

function learningRequest(): UniversityLearningMapRequestV2 {
  return {
    schemaVersion: "university-learning-map-request.v2",
    course: {
      courseRef: "course.cs102",
      ownershipDeclaration: "learner_self_attested",
      sourceAuthority: "learner_declared_unverified",
    },
    outcomes: [{
      outcomeRef: "outcome.cs102-foundation",
      declaration: "learner_declared_unverified",
    }],
    concepts: [{
      conceptRef: "concept.assignment-planning",
      outcomeRefs: ["outcome.cs102-foundation"],
      prerequisiteConceptRefs: [],
      prerequisiteKnowledge: "declared",
    }],
    evidence: [],
    attempts: [],
    delayedReturns: [],
    unknowns: [],
  };
}

function studentContextRequest(): UniversityStudentContextRequestV2 {
  return {
    schemaVersion: "university-student-context-request.v2",
    contextBinding: {
      bindingId: "context.cs102-local",
      ownershipDeclaration: "adult_learner_self_attested",
    },
    degreeMapRequest: degreeRequest(),
    learningMapRequest: learningRequest(),
  };
}

function sourceRevision() {
  return {
    schemaVersion: "course-source-revision.v1" as const,
    revisionId: "course-source-revision.cs102-syllabus-v1",
    scope: courseScope(),
    inputKind: "manual" as const,
    sourceLabel: "Learner-entered CS102 syllabus facts",
    sourceDigest: DIGEST_A,
    observedAt: "2026-08-01T12:00:00.000Z",
    freshnessReviewDueAt: "2026-09-01T12:00:00.000Z",
    coverage: {
      status: "declared_complete_for_source" as const,
      window: {
        startsAt: "2026-08-01T00:00:00.000Z",
        endsAt: "2026-12-31T23:59:59.000Z",
      },
      inspectedScopes: [
        "course_commitments" as const,
        "deadlines" as const,
        "assessment_policies" as const,
      ],
      unknownOrOmittedScopes: [],
    },
    privacy: {
      visibility: "private_to_owner" as const,
      retentionClass: "derived_fields_only" as const,
      originalBytesRetained: false as const,
      redistributionAllowed: false as const,
    },
  };
}

function sourceCandidate(
  candidateId = "course-source-candidate.assignment-one",
  claimKey = "course-claim.assignment-one-deadline",
) {
  return {
    schemaVersion: "course-source-candidate.v1" as const,
    candidateId,
    scope: courseScope(),
    sourceRevisionId: "course-source-revision.cs102-syllabus-v1",
    claimKey,
    locator: {
      kind: "manual_field" as const,
      fieldKey: candidateId.endsWith("two")
        ? "assignment_two_deadline"
        : "assignment_one_deadline",
    },
    extractedBy: "learner_manual" as const,
    fact: {
      kind: "deadline" as const,
      title: candidateId.endsWith("two")
        ? "Assignment two"
        : "Assignment one",
      dueAt: candidateId.endsWith("two")
        ? "2026-08-27T16:00:00.000Z"
        : "2026-08-20T16:00:00.000Z",
      timeZone: "Asia/Kolkata",
      consequenceClass: "consequential" as const,
    },
    createdAt: "2026-08-01T12:05:00.000Z",
  };
}

function acceptDecision(
  candidateId = "course-source-candidate.assignment-one",
  decisionId = "course-source-decision.assignment-one-accept",
) {
  return {
    schemaVersion: "course-source-decision.v1" as const,
    decisionId,
    candidateId,
    scope: courseScope(),
    actor: "learner" as const,
    kind: "accept" as const,
    extractionMatch: "learner_confirmed" as const,
    decidedAt: "2026-08-01T12:10:00.000Z",
  };
}

function sourceRequest(): CourseSourceReconciliationRequestV1 {
  return {
    schemaVersion: "course-source-reconciliation.v1",
    scope: courseScope(),
    asOf: AS_OF,
    sourceRevisions: [sourceRevision()],
    candidates: [sourceCandidate()],
    decisions: [acceptDecision()],
  };
}

function sourceBinding(
  overrides: Partial<UniversitySourceMapBindingV1> = {},
): UniversitySourceMapBindingV1 {
  return {
    courseId: "course.cs102",
    degreeSourceRef: "source.cs102-syllabus",
    sourceRevisionId: "course-source-revision.cs102-syllabus-v1",
    sourceDigest: DIGEST_A,
    conceptRef: "concept.assignment-planning",
    candidateId: "course-source-candidate.assignment-one",
    claimKey: "course-claim.assignment-one-deadline",
    ...overrides,
  };
}

function request() {
  return {
    schemaVersion: "university-source-map-context-request.v2" as const,
    studentContextRequest: studentContextRequest(),
    courseSourceReconciliationRequest: sourceRequest(),
    bindings: [sourceBinding()],
  };
}

function expectDeeplyFrozen(
  value: unknown,
  seen = new WeakSet<object>(),
): void {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  Reflect.ownKeys(value).forEach((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && "value" in descriptor) {
      expectDeeplyFrozen(descriptor.value, seen);
    }
  });
}

describe("projectUniversitySourceMapContext", () => {
  it("binds exact reviewed source copies without establishing truth or learning", async () => {
    const projection = await projectUniversitySourceMapContext(request());

    expect(projection).toMatchObject({
      schemaVersion: "university-source-map-context-projection.v2",
      status: "bound_review_candidate",
      courseId: "course.cs102",
      asOf: AS_OF,
      studentContextStatus: "ready_for_inspection",
      courseSourceStatus: "connected_sources_reviewed",
      degreeSources: [{
        courseId: "course.cs102",
        degreeSourceRef: "source.cs102-syllabus",
        sourceRevisionId: "course-source-revision.cs102-syllabus-v1",
        sourceDigest: DIGEST_A,
        degreeCourseState: "in_progress",
        freshnessState: "current_within_declared_window",
        coverageState: "connected_sources_reviewed",
        bindingState: "bound_review_candidate",
        sourceAuthenticity: "not_established",
        institutionalCompleteness: "not_established",
      }],
      learningSources: [{
        conceptRef: "concept.assignment-planning",
        candidateId: "course-source-candidate.assignment-one",
        claimKey: "course-claim.assignment-one-deadline",
        factKind: "deadline",
        extractionState: "learner_confirmed",
        factAuthority: "learner_connected_source_copy",
        bindingState: "bound_review_candidate",
        conceptAssociationAuthority: "caller_supplied_not_verified",
        learningContentGrounding: "not_established",
        answerGenerationAllowed: false,
        masteryInferenceAllowed: false,
      }],
      unboundCandidateIds: [],
      unboundConceptRefs: [],
      issues: [],
    });
    expect(projection.authority).toEqual({
      projectionClass: "learner_declared_source_map_inspection",
      bindingAuthority: "caller_supplied_not_verified",
      identityAuthority: "not_established",
      identityEstablished: false,
      adultStatusAuthority: "self_attested_not_verified",
      tenantIsolationAuthority: "not_established",
      sourceClass: "learner_connected_source_copy",
      sourceAuthenticity: "not_established",
      institutionalCompleteness: "not_established",
      learningContentGrounding: "not_established",
      conceptSourceGroundingEstablished: false,
      persistenceAllowed: false,
      eventEmissionAllowed: false,
      providerAllowed: false,
      networkAllowed: false,
      recommendationAllowed: false,
      answerGenerationAllowed: false,
      masteryInferenceAllowed: false,
      pathActivationAllowed: false,
      externalSideEffectsAllowed: false,
    });
    expect(projection.projectionDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("rejects retired outer and nested v1 request schemas", async () => {
    const retiredOuter = {
      ...request(),
      schemaVersion: "university-source-map-context-request.v1",
    };
    const retiredStudent = {
      ...request(),
      studentContextRequest: {
        ...studentContextRequest(),
        schemaVersion: "university-student-context-request.v1",
      },
    };

    for (const [candidate, issueCode] of [
      [retiredOuter, "schema.invalid"],
      [retiredStudent, "student_context.invalid"],
    ] as const) {
      const projection = await projectUniversitySourceMapContext(candidate);
      expect(projection.status).toBe("invalid");
      expect(projection.issues.map((entry) => entry.code)).toContain(issueCode);
      expect(projection.degreeSources).toEqual([]);
      expect(projection.learningSources).toEqual([]);
    }
  });

  it("keeps unresolved, stale, incomplete, and rejected bindings in review", async () => {
    const unresolved = request();
    unresolved.courseSourceReconciliationRequest.decisions = [];

    const stale = request();
    stale.courseSourceReconciliationRequest.asOf =
      "2026-10-01T12:00:00.000Z";

    const incomplete = request();
    incomplete.courseSourceReconciliationRequest.sourceRevisions[0]!
      .coverage = {
        ...incomplete.courseSourceReconciliationRequest.sourceRevisions[0]!
          .coverage,
        status: "partial",
        inspectedScopes: ["deadlines"],
        unknownOrOmittedScopes: [
          "course_commitments",
          "assessment_policies",
        ],
      };

    const rejected = request();
    rejected.courseSourceReconciliationRequest.decisions = [{
      schemaVersion: "course-source-decision.v1",
      decisionId: "course-source-decision.assignment-one-reject",
      candidateId: "course-source-candidate.assignment-one",
      scope: courseScope(),
      actor: "learner",
      kind: "reject",
      extractionMatch: "learner_rejected",
      decidedAt: "2026-08-01T12:10:00.000Z",
    }];

    const [unresolvedResult, staleResult, incompleteResult, rejectedResult] =
      await Promise.all([
        projectUniversitySourceMapContext(unresolved),
        projectUniversitySourceMapContext(stale),
        projectUniversitySourceMapContext(incomplete),
        projectUniversitySourceMapContext(rejected),
      ]);

    expect(unresolvedResult).toMatchObject({
      status: "review_required",
      learningSources: [{
        extractionState: "candidate",
        bindingState: "review_required",
      }],
    });
    expect(staleResult).toMatchObject({
      status: "review_required",
      degreeSources: [{
        freshnessState: "stale",
        bindingState: "review_required",
      }],
    });
    expect(incompleteResult).toMatchObject({
      status: "review_required",
      degreeSources: [{
        coverageState: "partial",
        bindingState: "review_required",
      }],
    });
    expect(rejectedResult).toMatchObject({
      status: "review_required",
      learningSources: [{
        extractionState: "learner_rejected",
        bindingState: "review_required",
      }],
    });
    expect(rejectedResult.issues.map((entry) => entry.code)).toContain(
      "source.candidate_rejected",
    );
  });

  it("keeps duplicate, conflicting, and unbound facts in review", async () => {
    const duplicate = request();
    duplicate.courseSourceReconciliationRequest.candidates.push(
      sourceCandidate(
        "course-source-candidate.assignment-one-copy",
        "course-claim.assignment-one-deadline",
      ),
    );
    duplicate.courseSourceReconciliationRequest.decisions.push(
      acceptDecision(
        "course-source-candidate.assignment-one-copy",
        "course-source-decision.assignment-one-copy-accept",
      ),
    );

    const conflict = request();
    const conflictingCandidate = sourceCandidate(
      "course-source-candidate.assignment-one-conflict",
      "course-claim.assignment-one-deadline",
    );
    conflictingCandidate.fact.dueAt = "2026-08-21T16:00:00.000Z";
    conflict.courseSourceReconciliationRequest.candidates.push(
      conflictingCandidate,
    );
    conflict.courseSourceReconciliationRequest.decisions.push(
      acceptDecision(
        "course-source-candidate.assignment-one-conflict",
        "course-source-decision.assignment-one-conflict-accept",
      ),
    );

    const unbound = request();
    unbound.courseSourceReconciliationRequest.candidates.push(
      sourceCandidate(
        "course-source-candidate.assignment-two",
        "course-claim.assignment-two-deadline",
      ),
    );
    unbound.courseSourceReconciliationRequest.decisions.push(
      acceptDecision(
        "course-source-candidate.assignment-two",
        "course-source-decision.assignment-two-accept",
      ),
    );

    const [duplicateResult, conflictResult, unboundResult] = await Promise.all([
      projectUniversitySourceMapContext(duplicate),
      projectUniversitySourceMapContext(conflict),
      projectUniversitySourceMapContext(unbound),
    ]);

    expect(duplicateResult.status).toBe("review_required");
    expect(duplicateResult.issues.map((entry) => entry.code)).toContain(
      "source.duplicate_review_required",
    );
    expect(conflictResult.status).toBe("review_required");
    expect(conflictResult.issues.map((entry) => entry.code)).toContain(
      "source.conflict_review_required",
    );
    expect(unboundResult).toMatchObject({
      status: "review_required",
      unboundCandidateIds: ["course-source-candidate.assignment-two"],
    });
    expect(unboundResult.issues.map((entry) => entry.code)).toContain(
      "source.fact_unbound",
    );
  });

  it("lists rejected unbound candidates and keeps them in review", async () => {
    const value = request();
    value.courseSourceReconciliationRequest.candidates.push(
      sourceCandidate(
        "course-source-candidate.assignment-two",
        "course-claim.assignment-two-deadline",
      ),
    );
    value.courseSourceReconciliationRequest.decisions.push({
      schemaVersion: "course-source-decision.v1",
      decisionId: "course-source-decision.assignment-two-reject",
      candidateId: "course-source-candidate.assignment-two",
      scope: courseScope(),
      actor: "learner",
      kind: "reject",
      extractionMatch: "learner_rejected",
      decidedAt: "2026-08-01T12:10:00.000Z",
    });

    const projection = await projectUniversitySourceMapContext(value);

    expect(projection).toMatchObject({
      status: "review_required",
      unboundCandidateIds: ["course-source-candidate.assignment-two"],
    });
    expect(projection.issues).toContainEqual({
      code: "source.fact_unbound",
      path:
        "courseSourceReconciliationRequest.candidates.course-source-candidate.assignment-two",
      message:
        "A course-source candidate has no explicit concept inspection binding.",
    });
  });

  it("lists unbound concepts and requires review", async () => {
    const value = request();
    value.studentContextRequest.learningMapRequest.concepts.push({
      conceptRef: "concept.assignment-review",
      outcomeRefs: ["outcome.cs102-foundation"],
      prerequisiteConceptRefs: [],
      prerequisiteKnowledge: "declared",
    });

    const projection = await projectUniversitySourceMapContext(value);

    expect(projection).toMatchObject({
      status: "review_required",
      unboundConceptRefs: ["concept.assignment-review"],
    });
    expect(projection.issues).toContainEqual({
      code: "map.concept_unbound",
      path: "studentContextRequest.learningMapRequest.concepts",
      message:
        "One or more learning-map concepts have no explicit source inspection binding.",
    });
  });

  it("deduplicates degree sources and conservatively combines binding states", async () => {
    function twoBindingRequest() {
      const value = request();
      value.studentContextRequest.learningMapRequest.concepts.push({
        conceptRef: "concept.assignment-review",
        outcomeRefs: ["outcome.cs102-foundation"],
        prerequisiteConceptRefs: [],
        prerequisiteKnowledge: "declared",
      });
      value.courseSourceReconciliationRequest.candidates.push(
        sourceCandidate(
          "course-source-candidate.assignment-two",
          "course-claim.assignment-two-deadline",
        ),
      );
      value.courseSourceReconciliationRequest.decisions.push(
        acceptDecision(
          "course-source-candidate.assignment-two",
          "course-source-decision.assignment-two-accept",
        ),
      );
      value.bindings.push(sourceBinding({
        conceptRef: "concept.assignment-review",
        candidateId: "course-source-candidate.assignment-two",
        claimKey: "course-claim.assignment-two-deadline",
      }));
      return value;
    }

    const allReviewed = await projectUniversitySourceMapContext(
      twoBindingRequest(),
    );
    const mixed = twoBindingRequest();
    mixed.bindings.push(sourceBinding());
    const mixedResult = await projectUniversitySourceMapContext(mixed);

    expect(allReviewed).toMatchObject({
      status: "bound_review_candidate",
      degreeSources: [{ bindingState: "bound_review_candidate" }],
      unboundConceptRefs: [],
    });
    expect(allReviewed.degreeSources).toHaveLength(1);
    expect(allReviewed.learningSources).toHaveLength(2);

    expect(mixedResult.status).toBe("review_required");
    expect(mixedResult.degreeSources).toEqual([
      expect.objectContaining({ bindingState: "review_required" }),
    ]);
    expect(mixedResult.learningSources.some(
      (entry) => entry.bindingState === "bound_review_candidate",
    )).toBe(true);
    expect(mixedResult.learningSources.some(
      (entry) => entry.bindingState === "review_required",
    )).toBe(true);
  });

  it("does not expose copied source labels or complete facts", async () => {
    const value = request();
    value.courseSourceReconciliationRequest.sourceRevisions[0]!.sourceLabel =
      "PRIVATE SOURCE LABEL MARKER";
    const privateFact =
      value.courseSourceReconciliationRequest.candidates[0]!.fact;
    if (privateFact.kind !== "deadline") {
      throw new Error("The test fixture must contain a deadline.");
    }
    privateFact.title = "PRIVATE FACT TITLE MARKER";

    const projection = await projectUniversitySourceMapContext(value);
    const serialized = JSON.stringify(projection);

    expect(projection.status).toBe("bound_review_candidate");
    expect(projection.degreeSources[0]).not.toHaveProperty("sourceLabel");
    expect(projection.learningSources[0]).not.toHaveProperty("effectiveFact");
    expect(serialized).not.toContain("PRIVATE SOURCE LABEL MARKER");
    expect(serialized).not.toContain("PRIVATE FACT TITLE MARKER");
  });

  it("requires exact course, source, digest, candidate, claim, and concept relations", async () => {
    const cases: Array<{
      readonly value: ReturnType<typeof request>;
      readonly code: string;
    }> = [];

    const courseMismatch = request();
    courseMismatch.bindings[0] = sourceBinding({
      courseId: "course.other",
    });
    cases.push({
      value: courseMismatch,
      code: "binding.raw_identity_mismatch",
    });

    const missingRevision = request();
    missingRevision.bindings[0] = sourceBinding({
      sourceRevisionId: "course-source-revision.other",
    });
    cases.push({
      value: missingRevision,
      code: "binding.raw_identity_mismatch",
    });

    const digestMismatch = request();
    digestMismatch.bindings[0] = sourceBinding({ sourceDigest: DIGEST_B });
    cases.push({
      value: digestMismatch,
      code: "binding.degree_source_digest_mismatch",
    });

    const missingCandidate = request();
    missingCandidate.bindings[0] = sourceBinding({
      candidateId: "course-source-candidate.other",
    });
    cases.push({
      value: missingCandidate,
      code: "binding.raw_identity_mismatch",
    });

    const claimMismatch = request();
    claimMismatch.bindings[0] = sourceBinding({
      claimKey: "course-claim.other",
    });
    cases.push({
      value: claimMismatch,
      code: "binding.raw_identity_mismatch",
    });

    const missingConcept = request();
    missingConcept.bindings[0] = sourceBinding({
      conceptRef: "concept.other",
    });
    cases.push({
      value: missingConcept,
      code: "binding.concept_missing",
    });

    const missingDegreeSource = request();
    missingDegreeSource.bindings[0] = sourceBinding({
      degreeSourceRef: "source.other",
    });
    cases.push({
      value: missingDegreeSource,
      code: "binding.degree_source_missing",
    });

    for (const candidate of cases) {
      const projection = await projectUniversitySourceMapContext(
        candidate.value,
      );
      expect(projection.status).toBe("invalid");
      expect(projection.issues.map((entry) => entry.code)).toContain(
        candidate.code,
      );
      expect(projection.degreeSources).toEqual([]);
      expect(projection.learningSources).toEqual([]);
    }
  });

  it("keeps issue paths bound to original input positions after ordering", async () => {
    const value = request();
    value.bindings = [
      sourceBinding({ sourceDigest: DIGEST_B }),
      sourceBinding(),
    ];

    const projection = await projectUniversitySourceMapContext(value);

    expect(projection.status).toBe("invalid");
    expect(projection.issues).toContainEqual({
      code: "binding.degree_source_digest_mismatch",
      path: "bindings.0.sourceDigest",
      message:
        "The bound digest must match the exact degree source registry digest.",
    });
    expect(projection.issues.some(
      (entry) => entry.path === "bindings.1.sourceDigest",
    )).toBe(false);
  });

  it("rejects raw whitespace normalization before reconciled identities bind", async () => {
    const paddedCourse = request();
    paddedCourse.courseSourceReconciliationRequest.scope.courseId =
      " course.cs102 ";

    const paddedRevision = request();
    paddedRevision.courseSourceReconciliationRequest.sourceRevisions[0]!
      .revisionId = " course-source-revision.cs102-syllabus-v1 ";

    const paddedCandidateRevision = request();
    paddedCandidateRevision.courseSourceReconciliationRequest.candidates[0]!
      .sourceRevisionId = " course-source-revision.cs102-syllabus-v1 ";

    const paddedCandidate = request();
    paddedCandidate.courseSourceReconciliationRequest.candidates[0]!
      .candidateId = " course-source-candidate.assignment-one ";

    const paddedClaim = request();
    paddedClaim.courseSourceReconciliationRequest.candidates[0]!.claimKey =
      " course-claim.assignment-one-deadline ";

    const paddedDecisionCandidate = request();
    paddedDecisionCandidate.courseSourceReconciliationRequest.decisions[0]!
      .candidateId = " course-source-candidate.assignment-one ";

    for (const value of [
      paddedCourse,
      paddedRevision,
      paddedCandidateRevision,
      paddedCandidate,
      paddedClaim,
      paddedDecisionCandidate,
    ]) {
      const projection = await projectUniversitySourceMapContext(value);
      expect(projection.status).toBe("invalid");
      expect(projection.issues.map((entry) => entry.code)).toContain(
        "binding.raw_identity_mismatch",
      );
    }
  });

  it("rejects whitespace in every explicit binding identifier", async () => {
    const fields = [
      ["courseId", " course.cs102 "],
      ["degreeSourceRef", " source.cs102-syllabus "],
      [
        "sourceRevisionId",
        " course-source-revision.cs102-syllabus-v1 ",
      ],
      ["candidateId", " course-source-candidate.assignment-one "],
      ["claimKey", " course-claim.assignment-one-deadline "],
      ["conceptRef", " concept.assignment-planning "],
    ] as const;

    for (const [field, value] of fields) {
      const candidate = request() as unknown as {
        bindings: Array<Record<string, unknown>>;
      };
      candidate.bindings[0]![field] = value;
      const projection = await projectUniversitySourceMapContext(candidate);
      expect(projection.status).toBe("invalid");
      expect(projection.issues.every(
        (entry) => entry.code === "schema.invalid",
      )).toBe(true);
    }
  });

  it("keeps duplicate explicit bindings in review", async () => {
    const value = request();
    value.bindings = [sourceBinding(), sourceBinding()];

    const projection = await projectUniversitySourceMapContext(value);

    expect(projection.status).toBe("review_required");
    expect(projection.issues.map((entry) => entry.code)).toContain(
      "binding.duplicate",
    );
    expect(projection.learningSources.every(
      (entry) => entry.bindingState === "review_required",
    )).toBe(true);
  });

  it("rejects invalid raw child requests and supplied child projections", async () => {
    const invalidStudent = request() as unknown as {
      studentContextRequest: unknown;
    };
    invalidStudent.studentContextRequest = {
      schemaVersion: "university-student-context-projection.v2",
      status: "ready_for_inspection",
    };
    const invalidSource = request() as unknown as {
      courseSourceReconciliationRequest: unknown;
    };
    invalidSource.courseSourceReconciliationRequest = {
      schemaVersion: "course-source-reconciliation-result.v1",
      status: "connected_sources_reviewed",
    };
    const authorityUpgrade = {
      ...request(),
      recommendationAllowed: true,
    };

    const results = await Promise.all([
      projectUniversitySourceMapContext(invalidStudent),
      projectUniversitySourceMapContext(invalidSource),
      projectUniversitySourceMapContext(authorityUpgrade),
    ]);

    expect(results.map((entry) => entry.status)).toEqual([
      "invalid",
      "invalid",
      "invalid",
    ]);
    expect(results[0]!.issues[0]?.code).toBe("student_context.invalid");
    expect(results[1]!.issues[0]?.code).toBe("course_source.invalid");
    expect(results[2]!.issues[0]?.code).toBe("schema.invalid");
  });

  it("does not invoke accessors or proxy traps", async () => {
    const getter = vi.fn(() => request().schemaVersion);
    const accessor = request() as unknown as Record<string, unknown>;
    Object.defineProperty(accessor, "schemaVersion", {
      enumerable: true,
      get: getter,
    });
    const trap = vi.fn(() => {
      throw new Error("proxy trap executed");
    });
    const rootProxy = new Proxy(request(), {
      getPrototypeOf: trap,
      ownKeys: trap,
      getOwnPropertyDescriptor: trap,
    });
    const nestedProxy = request() as unknown as {
      bindings: unknown[];
    };
    nestedProxy.bindings[0] = new Proxy(sourceBinding(), {
      getPrototypeOf: trap,
      ownKeys: trap,
      getOwnPropertyDescriptor: trap,
    });

    const results = await Promise.all([
      projectUniversitySourceMapContext(accessor),
      projectUniversitySourceMapContext(rootProxy),
      projectUniversitySourceMapContext(nestedProxy),
    ]);

    expect(results.every((entry) => entry.status === "invalid")).toBe(true);
    expect(getter).not.toHaveBeenCalled();
    expect(trap).not.toHaveBeenCalled();
  });

  it("rejects aliases, cycles, sparse arrays, symbols, exotic objects, and limits", async () => {
    const alias = request() as unknown as {
      studentContextRequest: {
        degreeMapRequest: unknown;
        learningMapRequest: unknown;
      };
    };
    alias.studentContextRequest.learningMapRequest =
      alias.studentContextRequest.degreeMapRequest;

    const cycle = request() as unknown as Record<string, unknown>;
    cycle.self = cycle;

    const sparse = request();
    sparse.bindings =
      new Array(1) as UniversitySourceMapBindingV1[];

    const symbol = request() as unknown as Record<PropertyKey, unknown>;
    symbol[Symbol("hidden")] = true;

    const exotic = Object.create({ inherited: true }) as Record<string, unknown>;
    Object.assign(exotic, request());

    const unsafe = request();
    unsafe.studentContextRequest.degreeMapRequest.courses[0]!.creditUnits =
      Number.NaN;

    const oversized = request() as unknown as {
      bindings: UniversitySourceMapBindingV1[];
    };
    oversized.bindings = Array.from(
      { length: 257 },
      (_, index) => sourceBinding({
        conceptRef: `concept.assignment-${index}`,
      }),
    );

    const results = await Promise.all([
      alias,
      cycle,
      sparse,
      symbol,
      exotic,
      unsafe,
      oversized,
    ].map(projectUniversitySourceMapContext));

    expect(results.every((entry) => entry.status === "invalid")).toBe(true);
  });

  it("rejects oversized fractional course-source timestamps", async () => {
    const value = request();
    value.courseSourceReconciliationRequest.asOf =
      `2026-08-10T12:00:00.${"0".repeat(65)}Z`;

    const projection = await projectUniversitySourceMapContext(value);

    expect(projection.status).toBe("invalid");
    expect(projection.issues).toMatchObject([{
      code: "course_source.invalid",
      path: "courseSourceReconciliationRequest",
    }]);
  });

  it("rejects requests above the serialized JSON byte boundary", async () => {
    const value = request() as ReturnType<typeof request> & {
      courseSourceReconciliationRequest:
        ReturnType<typeof sourceRequest> & { padding?: string[] };
    };
    value.courseSourceReconciliationRequest.padding = Array.from(
      { length: 129 },
      () => "x".repeat(4_096),
    );

    const projection = await projectUniversitySourceMapContext(value);

    expect(projection.status).toBe("invalid");
    expect(projection.issues).toMatchObject([{
      code: "schema.invalid",
      path: "",
    }]);
  });

  it("is deterministic, detached, frozen, and has no runtime effects", async () => {
    const input = request();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const dispatchSpy = vi.spyOn(EventTarget.prototype, "dispatchEvent");

    const first = await projectUniversitySourceMapContext(input);
    const second = await projectUniversitySourceMapContext(request());
    input.bindings[0] = sourceBinding({
      conceptRef: "concept.changed-after-projection",
    });
    const inputFact =
      input.courseSourceReconciliationRequest.candidates[0]!.fact;
    if (inputFact.kind !== "deadline") {
      throw new Error("The test fixture must contain a deadline.");
    }
    inputFact.title = "Changed after projection";

    expect(first).toEqual(second);
    expect(first.learningSources[0]?.conceptRef).toBe(
      "concept.assignment-planning",
    );
    expect(first.learningSources[0]).not.toHaveProperty("effectiveFact");
    expect(UNIVERSITY_SOURCE_MAP_CONTEXT_STATUSES).toEqual([
      "invalid",
      "review_required",
      "bound_review_candidate",
    ]);
    expectDeeplyFrozen(first);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(dispatchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    dispatchSpy.mockRestore();
  });
});
