import { describe, expect, it, vi } from "vitest";

import type { UniversityDegreeMapRequestV2 } from "../university-degree-map";
import type { UniversityLearningMapRequestV2 } from "../university-learning-map";
import {
  projectUniversityStudentContext,
  type UniversityStudentContextRequestV2,
  UNIVERSITY_STUDENT_CONTEXT_STATUSES,
} from ".";

function degreeRequest(): UniversityDegreeMapRequestV2 {
  const sourceRef = "source.catalog.v1";
  return {
    schemaVersion: "university-degree-map-request.v2",
    ownershipDeclaration: {
      subject: "adult_learner_self_attested",
      control: "learner_managed_self_attested",
    },
    program: {
      programRef: "program.computing.v1",
      creditUnit: "institution_credit_unit",
      sourceRef,
    },
    sourceRegistry: [{
      sourceRef,
      declaredSourceDigest: `sha256:${"a".repeat(64)}`,
      authority: "learner_supplied_not_verified",
    }],
    courses: [
      {
        courseId: "course.math100",
        creditUnits: 3,
        state: "completed",
        prerequisiteCourseIds: [],
        sourceRef,
      },
      {
        courseId: "course.cs100",
        creditUnits: 4,
        state: "in_progress",
        prerequisiteCourseIds: ["course.math100"],
        sourceRef,
      },
    ],
    requirements: [{
      requirementId: "requirement.credits.core",
      kind: "minimum_credits",
      minimumCreditUnits: 7,
      eligibleCourseIds: ["course.math100", "course.cs100"],
      sourceRef,
    }],
  };
}

function learningRequest(): UniversityLearningMapRequestV2 {
  return {
    schemaVersion: "university-learning-map-request.v2",
    course: {
      courseRef: "course.cs100",
      ownershipDeclaration: "learner_self_attested",
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

function request(): UniversityStudentContextRequestV2 {
  return {
    schemaVersion: "university-student-context-request.v2",
    contextBinding: {
      bindingId: "context.local-001",
      ownershipDeclaration: "adult_learner_self_attested",
    },
    degreeMapRequest: degreeRequest(),
    learningMapRequest: learningRequest(),
  };
}

function expectDeeplyFrozen(value: unknown, seen = new WeakSet<object>()): void {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && "value" in descriptor) {
      expectDeeplyFrozen(descriptor.value, seen);
    }
  }
}

describe("projectUniversityStudentContext", () => {
  it("recomputes both canonical maps under one exact opaque binding", () => {
    const projection = projectUniversityStudentContext(request());

    expect(projection).toMatchObject({
      schemaVersion: "university-student-context-projection.v2",
      status: "ready_for_inspection",
      contextBinding: {
        bindingId: "context.local-001",
        ownershipDeclaration: "adult_learner_self_attested",
      },
      degreeAxis: {
        status: "ready_for_inspection",
        programRef: "program.computing.v1",
      },
      learningAxis: {
        status: "ready_for_inspection",
        map: {
          course: {
            courseRef: "course.cs100",
          },
        },
      },
      issues: [],
    });
    expect(projection.authority).toEqual({
      projectionClass: "learner_declared_student_context_inspection",
      bindingAuthority: "caller_supplied_opaque_not_verified",
      adultStatusAuthority: "self_attested_not_verified",
      degreeAndLearningAxesMerged: false,
      rankingAllowed: false,
      recommendationAllowed: false,
      globalActionSelectionAllowed: false,
      readinessInferenceAllowed: false,
      masteryInferenceAllowed: false,
      persistenceAllowed: false,
      networkAllowed: false,
      eventEmissionAllowed: false,
    });
  });

  it("rejects retired outer and child v1 request schemas", () => {
    const retiredOuter = {
      ...request(),
      schemaVersion: "university-student-context-request.v1",
    };
    const retiredChild = {
      ...request(),
      degreeMapRequest: {
        ...degreeRequest(),
        schemaVersion: "university-degree-map-request.v1",
      },
    };

    const outerProjection = projectUniversityStudentContext(retiredOuter);
    const childProjection = projectUniversityStudentContext(retiredChild);

    expect(outerProjection.status).toBe("invalid");
    expect(outerProjection.issues.map((entry) => entry.code)).toContain(
      "schema.invalid",
    );
    expect(childProjection.status).toBe("invalid");
    expect(childProjection.issues.map((entry) => entry.code)).toContain(
      "child.invalid",
    );
    expect(childProjection.degreeAxis).toBeNull();
    expect(childProjection.learningAxis).toBeNull();
  });

  it("keeps degree and learning review states on separate axes", () => {
    const degreeReview = request();
    delete degreeReview.degreeMapRequest.program.sourceRef;
    const learningReview = request();
    learningReview.learningMapRequest.unknowns.push({
      unknownRef: "unknown.prerequisite-01",
      scopeRef: "concept.foundation-01",
      kind: "prerequisite_unknown",
      state: "explicit",
    });

    const first = projectUniversityStudentContext(degreeReview);
    const second = projectUniversityStudentContext(learningReview);

    expect(first.status).toBe("review_required");
    expect(first.degreeAxis?.status).toBe("review_required");
    expect(first.learningAxis?.status).toBe("ready_for_inspection");
    expect(second.status).toBe("review_required");
    expect(second.degreeAxis?.status).toBe("ready_for_inspection");
    expect(second.learningAxis?.status).toBe("review_required");
  });

  it("rejects invalid raw children and never accepts supplied projections", () => {
    const invalidDegree = request() as unknown as Record<string, unknown>;
    invalidDegree.degreeMapRequest = {
      ...degreeRequest(),
      ownershipDeclaration: {
        ...degreeRequest().ownershipDeclaration,
        subject: "adult_learner",
      },
    };
    const invalidLearning = request() as unknown as Record<string, unknown>;
    invalidLearning.learningMapRequest = {
      ...learningRequest(),
      recommendation: "select this concept",
    };
    const forged = request() as unknown as Record<string, unknown>;
    forged.degreeMapRequest = {
      schemaVersion: "university-degree-map-projection.v2",
      status: "ready_for_inspection",
    };

    for (const candidate of [invalidDegree, invalidLearning, forged]) {
      const projection = projectUniversityStudentContext(candidate);
      expect(projection.status).toBe("invalid");
      expect(projection.contextBinding).toBeNull();
      expect(projection.degreeAxis).toBeNull();
      expect(projection.learningAxis).toBeNull();
      expect(projection.issues.some(
        (issue) => issue.code === "child.invalid",
      )).toBe(true);
    }
  });

  it("fails closed when the learning course is absent from the degree axis", () => {
    const value = request();
    value.learningMapRequest.course.courseRef = "course.unknown-999";

    const projection = projectUniversityStudentContext(value);

    expect(projection.status).toBe("invalid");
    expect(projection.contextBinding).toBeNull();
    expect(projection.degreeAxis).toBeNull();
    expect(projection.learningAxis).toBeNull();
    expect(projection.issues).toEqual([{
      code: "binding.course_mismatch",
      path: "learningMapRequest.course.courseRef",
      message: "The learning-map course must exist in the bound raw degree map.",
    }]);
    expectDeeplyFrozen(projection);
  });

  it("requires one strict opaque learner-ownership declaration", () => {
    const missing = request() as unknown as Record<string, unknown>;
    delete missing.contextBinding;
    const extra = request() as unknown as {
      contextBinding: Record<string, unknown>;
    };
    extra.contextBinding.email = "learner@example.test";
    const wrongOwner = request() as unknown as {
      contextBinding: Record<string, unknown>;
    };
    wrongOwner.contextBinding.ownershipDeclaration = "institution_owned";
    const nonOpaque = request() as unknown as {
      contextBinding: Record<string, unknown>;
    };
    nonOpaque.contextBinding.bindingId = "Student Name";
    const list = {
      ...request(),
      contextBinding: [request().contextBinding],
    };

    const projections = [missing, extra, wrongOwner, nonOpaque, list].map(
      projectUniversityStudentContext,
    );
    expect(projections.every((entry) => entry.status === "invalid")).toBe(true);
    expect(projections.every((entry) => (
      entry.issues.every((issue) => issue.code === "schema.invalid")
    ))).toBe(true);
  });

  it("does not invoke hostile accessors or proxy traps", () => {
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
      learningMapRequest: { course: unknown };
    };
    nestedProxy.learningMapRequest.course = new Proxy(
      learningRequest().course,
      {
        getPrototypeOf: trap,
        ownKeys: trap,
        getOwnPropertyDescriptor: trap,
      },
    );

    const projections = [accessor, rootProxy, nestedProxy].map(
      projectUniversityStudentContext,
    );
    expect(projections.every((entry) => entry.status === "invalid")).toBe(true);
    expect(getter).not.toHaveBeenCalled();
    expect(trap).not.toHaveBeenCalled();
  });

  it("rejects aliases, cycles, sparse arrays, symbols, and exotic objects", () => {
    const alias = request() as unknown as Record<string, unknown>;
    alias.learningMapRequest = alias.degreeMapRequest;
    const cycle = request() as unknown as Record<string, unknown>;
    cycle.self = cycle;
    const sparse = request();
    sparse.learningMapRequest.outcomes =
      new Array(1) as UniversityLearningMapRequestV2["outcomes"];
    const symbol = request() as unknown as Record<PropertyKey, unknown>;
    symbol[Symbol("hidden")] = true;
    const exotic = Object.create({ inherited: true }) as Record<string, unknown>;
    Object.assign(exotic, request());

    const projections = [alias, cycle, sparse, symbol, exotic].map(
      projectUniversityStudentContext,
    );
    expect(projections.every((entry) => entry.status === "invalid")).toBe(true);
  });

  it("rejects unbounded, unsafe, and authority-upgrade input", () => {
    const unsafeNumber = request() as unknown as {
      degreeMapRequest: { courses: Array<Record<string, unknown>> };
    };
    unsafeNumber.degreeMapRequest.courses[0]!.creditUnits = Number.NaN;
    const oversized = request() as unknown as Record<string, unknown>;
    oversized.extra = Array.from({ length: 513 }, () => 0);
    const authorityUpgrade = {
      ...request(),
      globalActionSelectionAllowed: true,
    };
    const ranked = {
      ...request(),
      rankedCourseIds: ["course.cs100"],
    };

    const projections = [
      unsafeNumber,
      oversized,
      authorityUpgrade,
      ranked,
    ].map(projectUniversityStudentContext);
    expect(projections.every((entry) => entry.status === "invalid")).toBe(true);
  });

  it("is deterministic, detached, deeply frozen, and side-effect free", () => {
    const input = request();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const dispatchSpy = vi.spyOn(EventTarget.prototype, "dispatchEvent");

    const first = projectUniversityStudentContext(input);
    const second = projectUniversityStudentContext(request());
    input.contextBinding.bindingId = "context.changed-999";
    input.degreeMapRequest.courses[0]!.state = "planned";
    input.learningMapRequest.attempts[0]!.disposition = "blocked";

    expect(first).toEqual(second);
    expect(first.contextBinding?.bindingId).toBe("context.local-001");
    expect(first.degreeAxis?.courses[0]?.state).toBe("in_progress");
    expect(first.learningAxis?.map?.attempts[0]?.disposition).toBe(
      "completed",
    );
    expect(UNIVERSITY_STUDENT_CONTEXT_STATUSES).toEqual([
      "invalid",
      "review_required",
      "ready_for_inspection",
    ]);
    expectDeeplyFrozen(first);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(dispatchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    dispatchSpy.mockRestore();
  });
});
