import { describe, expect, it, vi } from "vitest";

import { canonicalJson, sha256Digest } from "../events";
import {
  UNIVERSITY_DECLARATION_DOCUMENT_CANONICALIZER_VERSION,
  UNIVERSITY_DECLARATION_DOCUMENT_DIGEST_DOMAIN,
  UNIVERSITY_DECLARATION_DOCUMENT_SCHEMA_VERSION,
  projectUniversityDeclarationDocument,
  universityDeclarationDocumentRequestSchema,
  type UniversityDeclarationDocumentRequestV1,
} from ".";

function degreeRequest(): UniversityDeclarationDocumentRequestV1["degreeMapRequest"] {
  const source = {
    sourceRef: "source.catalog.v1",
    declaredSourceDigest: `sha256:${"a".repeat(64)}`,
    authority: "learner_supplied_not_verified" as const,
  };
  return {
    schemaVersion: "university-degree-map-request.v2",
    ownershipDeclaration: {
      subject: "adult_learner_self_attested",
      control: "learner_managed_self_attested",
    },
    program: {
      programRef: "program.computing.v1",
      creditUnit: "institution_credit_unit",
      sourceRef: source.sourceRef,
    },
    sourceRegistry: [source],
    courses: [{
      courseId: "course.cs100",
      creditUnits: 4,
      state: "in_progress",
      prerequisiteCourseIds: [],
      sourceRef: source.sourceRef,
    }],
    requirements: [{
      requirementId: "requirement.core.cs100",
      kind: "required_course",
      courseId: "course.cs100",
      sourceRef: source.sourceRef,
    }],
  };
}

function learningRequest(): UniversityDeclarationDocumentRequestV1["learningMapRequest"] {
  return {
    schemaVersion: "university-learning-map-request.v2",
    course: {
      courseRef: "course.cs100",
      ownershipDeclaration: "adult_learner_self_attested",
      sourceAuthority: "learner_declared_unverified",
    },
    outcomes: [{
      outcomeRef: "outcome.reason-01",
      declaration: "learner_declared_unverified",
    }],
    concepts: [{
      conceptRef: "concept.foundation-01",
      outcomeRefs: ["outcome.reason-01"],
      prerequisiteConceptRefs: [],
      prerequisiteKnowledge: "declared",
    }],
    evidence: [{
      evidenceRef: "evidence.attempt-01",
      kind: "attempt_receipt",
      authority: "bounded_reference_only",
      contentCaptured: false,
    }],
    attempts: [{
      attemptRef: "attempt.local-01",
      conceptRefs: ["concept.foundation-01"],
      attemptedOn: "2026-08-01",
      disposition: "completed",
      evidenceRefs: ["evidence.attempt-01"],
      helpUsed: [],
    }],
    delayedReturns: [{
      returnRef: "return.local-01",
      sourceAttemptRef: "attempt.local-01",
      conceptRefs: ["concept.foundation-01"],
      dueOn: "2026-08-08",
      completion: "scheduled",
    }],
    unknowns: [],
  };
}

function request(): UniversityDeclarationDocumentRequestV1 {
  return {
    schemaVersion: "university-declaration-document-request.v1",
    degreeMapRequest: degreeRequest(),
    learningMapRequest: learningRequest(),
  };
}

function expectDeeplyFrozen(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) expectDeeplyFrozen(child);
}

describe("university declaration document", () => {
  it("builds one ready canonical document with bounded authority", async () => {
    const result = await projectUniversityDeclarationDocument(request());

    expect(result).toMatchObject({
      schemaVersion: "university-declaration-document-result.v1",
      document: {
        schemaVersion: "university-declaration-document.v1",
        canonicalizerVersion:
          "university-declaration-document-canonicalizer.v1",
        degreeMapRequestSchemaVersion: "university-degree-map-request.v2",
        learningMapRequestSchemaVersion: "university-learning-map-request.v2",
        degreeMapProjectionSchemaVersion:
          "university-degree-map-projection.v2",
        learningMapProjectionSchemaVersion:
          "university-learning-map-projection.v2",
        documentDigest: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
      },
      inspection: {
        status: "ready_for_inspection",
        issues: [],
      },
      authority: {
        ownerAuthorityEstablished: false,
        tenantAuthorityEstablished: false,
        adultStatusAuthority: "self_attested_not_verified",
        adultEntitlementEstablished: false,
        institutionalAuthorityEstablished: false,
        sourceAuthorityEstablished: false,
        persistenceAllowed: false,
        networkAllowed: false,
        eventEmissionAllowed: false,
        providerCallAllowed: false,
        identityAuthorityEstablished: false,
        recommendationAllowed: false,
        masteryInferenceAllowed: false,
        tutoringAllowed: false,
        answerGenerationAllowed: false,
        externalEffectsAllowed: false,
      },
    });
    expectDeeplyFrozen(result);
  });

  it("returns review outside the canonical document", async () => {
    const value = request();
    delete value.degreeMapRequest.program.sourceRef;

    const result = await projectUniversityDeclarationDocument(value);

    expect(result.inspection.status).toBe("review_required");
    expect(result.inspection.issues).toEqual([{
      code: "degree.review_required",
      path: "degreeMapRequest",
      message: "The raw degree-map request requires process-local review.",
    }]);
    expect(result.document).not.toHaveProperty("status");
    expect(result.document).not.toHaveProperty("inspection");
  });

  it("returns a bounded learning review issue outside the document", async () => {
    const value = request();
    value.learningMapRequest.unknowns.push({
      unknownRef: "unknown.prerequisite-01",
      scopeRef: "concept.foundation-01",
      kind: "prerequisite_unknown",
      state: "explicit",
    });

    const result = await projectUniversityDeclarationDocument(value);

    expect(result.inspection).toEqual({
      status: "review_required",
      issues: [{
        code: "learning.review_required",
        path: "learningMapRequest",
        message: "The raw learning-map request requires process-local review.",
      }],
    });
    expect(result.inspection.issues).toHaveLength(1);
    expect(result.document).not.toHaveProperty("status");
    expect(result.document).not.toHaveProperty("inspection");
  });

  it("rejects an invalid child projection", async () => {
    const value = request();
    value.learningMapRequest.concepts[0]!.outcomeRefs = [
      "outcome.missing-99",
    ];

    const result = await projectUniversityDeclarationDocument(value);

    expect(result).toMatchObject({
      document: null,
      inspection: {
        status: "invalid",
        issues: [{
          code: "child.invalid",
          path: "learningMapRequest",
        }],
      },
    });
  });

  it("rejects a learning course absent from the raw degree map", async () => {
    const value = request();
    value.learningMapRequest.course.courseRef = "course.unknown-99";

    const result = await projectUniversityDeclarationDocument(value);

    expect(result).toMatchObject({
      document: null,
      inspection: {
        status: "invalid",
        issues: [{
          code: "linkage.course_mismatch",
          path: "learningMapRequest.course.courseRef",
        }],
      },
    });
  });

  it("rejects every retired request schema", async () => {
    const retiredOuter = {
      ...request(),
      schemaVersion: "university-declaration-document-request.v0",
    };
    const retiredDegree = {
      ...request(),
      degreeMapRequest: {
        ...degreeRequest(),
        schemaVersion: "university-degree-map-request.v1",
      },
    };
    const retiredLearning = {
      ...request(),
      learningMapRequest: {
        ...learningRequest(),
        schemaVersion: "university-learning-map-request.v1",
      },
    };

    const results = await Promise.all(
      [retiredOuter, retiredDegree, retiredLearning]
        .map(projectUniversityDeclarationDocument),
    );

    expect(results.every(
      (result) => result.inspection.status === "invalid",
    )).toBe(true);
  });

  it("rejects the retired non-adult child ownership literal", async () => {
    const retiredOwnership = {
      ...request(),
      learningMapRequest: {
        ...learningRequest(),
        course: {
          ...learningRequest().course,
          ownershipDeclaration: "learner_self_attested",
        },
      },
    };

    const result = await projectUniversityDeclarationDocument(
      retiredOwnership,
    );

    expect(result).toMatchObject({
      document: null,
      inspection: {
        status: "invalid",
        issues: [{
          code: "child.invalid",
          path: "learningMapRequest.course.ownershipDeclaration",
        }],
      },
      authority: {
        adultStatusAuthority: "self_attested_not_verified",
        adultEntitlementEstablished: false,
      },
    });
  });

  it("rejects unknown fields at the outer and child boundaries", async () => {
    const cases = [
      { ...request(), ownerId: "owner.local-01" },
      { ...request(), status: "ready_for_inspection" },
      { ...request(), recommendation: "Select this course." },
      {
        ...request(),
        degreeMapRequest: { ...degreeRequest(), projection: {} },
      },
      {
        ...request(),
        learningMapRequest: { ...learningRequest(), action: "start" },
      },
    ];

    const results = await Promise.all(
      cases.map(projectUniversityDeclarationDocument),
    );

    expect(results.every(
      (result) => result.inspection.status === "invalid",
    )).toBe(true);
  });

  it("keeps the digest stable across object property order", async () => {
    const first = request();
    const reordered = {
      learningMapRequest: learningRequest(),
      degreeMapRequest: degreeRequest(),
      schemaVersion: "university-declaration-document-request.v1",
    };

    const [firstResult, reorderedResult] = await Promise.all([
      projectUniversityDeclarationDocument(first),
      projectUniversityDeclarationDocument(reordered),
    ]);

    expect(firstResult.document?.documentDigest).toBe(
      reorderedResult.document?.documentDigest,
    );
  });

  it("changes the digest for a meaningful raw declaration change", async () => {
    const changed = request();
    changed.degreeMapRequest.courses[0]!.creditUnits = 5;

    const [first, second] = await Promise.all([
      projectUniversityDeclarationDocument(request()),
      projectUniversityDeclarationDocument(changed),
    ]);

    expect(first.document?.documentDigest).not.toBe(
      second.document?.documentDigest,
    );
  });

  it("domain-separates the complete canonical declaration material", async () => {
    const value = request();
    const result = await projectUniversityDeclarationDocument(value);
    const canonicalMaterial = canonicalJson({
      documentSchemaVersion: UNIVERSITY_DECLARATION_DOCUMENT_SCHEMA_VERSION,
      canonicalizerVersion:
        UNIVERSITY_DECLARATION_DOCUMENT_CANONICALIZER_VERSION,
      degreeMapRequestSchemaVersion: value.degreeMapRequest.schemaVersion,
      learningMapRequestSchemaVersion: value.learningMapRequest.schemaVersion,
      degreeMapProjectionSchemaVersion:
        "university-degree-map-projection.v2",
      learningMapProjectionSchemaVersion:
        "university-learning-map-projection.v2",
      degreeMapRequest: value.degreeMapRequest,
      learningMapRequest: value.learningMapRequest,
    });
    const undomainedDigest = await sha256Digest(canonicalMaterial);

    expect(result.document?.documentDigest).not.toBe(undomainedDigest);
  });

  it("binds the complete version registry into canonical material", async () => {
    const value = request();
    const expectedMaterial = canonicalJson({
      documentSchemaVersion: "university-declaration-document.v1",
      canonicalizerVersion:
        "university-declaration-document-canonicalizer.v1",
      degreeMapRequestSchemaVersion: "university-degree-map-request.v2",
      learningMapRequestSchemaVersion: "university-learning-map-request.v2",
      degreeMapProjectionSchemaVersion:
        "university-degree-map-projection.v2",
      learningMapProjectionSchemaVersion:
        "university-learning-map-projection.v2",
      degreeMapRequest: value.degreeMapRequest,
      learningMapRequest: value.learningMapRequest,
    });
    const expectedDigest = await sha256Digest(
      `${UNIVERSITY_DECLARATION_DOCUMENT_DIGEST_DOMAIN}\u0000${expectedMaterial}`,
    );

    const result = await projectUniversityDeclarationDocument(value);

    expect(result.document?.documentDigest).toBe(expectedDigest);
  });

  it("rejects hostile graphs without invoking accessors or proxy traps", async () => {
    const getter = vi.fn(() => request().schemaVersion);
    const accessor = request() as unknown as Record<string, unknown>;
    Object.defineProperty(accessor, "schemaVersion", {
      enumerable: true,
      get: getter,
    });
    const trap = vi.fn(() => {
      throw new Error("proxy trap executed");
    });
    const proxy = new Proxy(request(), {
      getPrototypeOf: trap,
      ownKeys: trap,
      getOwnPropertyDescriptor: trap,
    });
    const alias = request() as unknown as Record<string, unknown>;
    alias.learningMapRequest = alias.degreeMapRequest;
    const cycle = request() as unknown as Record<string, unknown>;
    cycle.self = cycle;

    const results = await Promise.all(
      [accessor, proxy, alias, cycle].map(
        projectUniversityDeclarationDocument,
      ),
    );

    expect(results.every(
      (result) => result.inspection.status === "invalid",
    )).toBe(true);
    expect(getter).not.toHaveBeenCalled();
    expect(trap).not.toHaveBeenCalled();
  });

  it("enforces string, byte, and unsafe-number limits before Zod", async () => {
    const safeParse = vi.spyOn(
      universityDeclarationDocumentRequestSchema,
      "safeParse",
    );
    const longString = {
      ...request(),
      extra: "x".repeat(4_097),
    };
    const tooManyBytes = {
      ...request(),
      extra: Array.from({ length: 129 }, () => "x".repeat(4_096)),
    };
    const unsafeNumber = request() as unknown as {
      degreeMapRequest: { courses: Array<Record<string, unknown>> };
    };
    unsafeNumber.degreeMapRequest.courses[0]!.creditUnits =
      Number.MAX_SAFE_INTEGER + 1;

    for (const candidate of [longString, tooManyBytes, unsafeNumber]) {
      safeParse.mockClear();
      const result = await projectUniversityDeclarationDocument(candidate);
      expect(result.inspection.status).toBe("invalid");
      expect(safeParse).not.toHaveBeenCalled();
    }
  });

  it("contains no forbidden revision or authority fields", async () => {
    const result = await projectUniversityDeclarationDocument(request());
    const documentKeys = Object.keys(result.document ?? {});
    const forbidden = [
      "ownerId",
      "tenantId",
      "accountId",
      "acceptedAt",
      "revisionId",
      "predecessorId",
      "idempotencyKey",
      "degreeMapProjection",
      "learningMapProjection",
      "status",
      "recommendation",
      "action",
    ];

    for (const field of forbidden) expect(documentKeys).not.toContain(field);
  });

  it("detaches and deeply freezes every returned value", async () => {
    const input = request();
    const result = await projectUniversityDeclarationDocument(input);
    input.degreeMapRequest.courses[0]!.creditUnits = 9;
    input.learningMapRequest.attempts[0]!.disposition = "blocked";

    expect(result.document?.degreeMapRequest.courses[0]?.creditUnits).toBe(4);
    expect(
      result.document?.learningMapRequest.attempts[0]?.disposition,
    ).toBe("completed");
    expectDeeplyFrozen(result);
  });
});
