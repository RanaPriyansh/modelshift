import { describe, expect, it, vi } from "vitest";

import {
  projectUniversityDegreeMap,
  type UniversityDegreeMapRequestV2,
} from ".";

function request(): UniversityDegreeMapRequestV2 {
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
    courses: [
      {
        courseId: "course.math100",
        creditUnits: 3,
        state: "completed",
        prerequisiteCourseIds: [],
        sourceRef: source.sourceRef,
      },
      {
        courseId: "course.cs100",
        creditUnits: 4,
        state: "in_progress",
        prerequisiteCourseIds: ["course.math100"],
        sourceRef: source.sourceRef,
      },
      {
        courseId: "course.cs200",
        creditUnits: 4,
        state: "planned",
        prerequisiteCourseIds: ["course.cs100"],
        sourceRef: source.sourceRef,
      },
    ],
    requirements: [
      {
        requirementId: "requirement.core.cs200",
        kind: "required_course",
        courseId: "course.cs200",
        sourceRef: source.sourceRef,
      },
      {
        requirementId: "requirement.credits.core",
        kind: "minimum_credits",
        minimumCreditUnits: 7,
        eligibleCourseIds: [
          "course.math100",
          "course.cs100",
          "course.cs200",
        ],
        sourceRef: source.sourceRef,
      },
    ],
  };
}

describe("projectUniversityDegreeMap", () => {
  it("projects learner states, credit totals, prerequisites, and unmet requirements", () => {
    const projection = projectUniversityDegreeMap(request());

    expect(projection).toMatchObject({
      status: "ready_for_inspection",
      programRef: "program.computing.v1",
      creditTotals: {
        completed: 3,
        inProgress: 4,
        planned: 4,
        allDeclared: 11,
      },
      unmetRequirementIds: [
        "requirement.core.cs200",
        "requirement.credits.core",
      ],
      authority: {
        projectionClass: "learner_declared_degree_map_inspection",
        adultStatusAuthority: "self_attested_not_verified",
        sourceAuthority: "learner_supplied_not_verified",
        rankingAllowed: false,
        recommendationAllowed: false,
        persistenceAllowed: false,
        networkAllowed: false,
        eventEmissionAllowed: false,
      },
      issues: [],
    });
    expect(projection.courses.find(
      (course) => course.courseId === "course.cs200",
    )?.unmetPrerequisiteCourseIds).toEqual(["course.cs100"]);
    expect(JSON.stringify(projection)).not.toContain("recommendedCourse");
    expect(JSON.stringify(projection)).not.toContain("rankedCourse");
  });

  it("uses alphabetical reference order when declaration collections arrive in another order", () => {
    const value = request();
    value.courses.reverse();
    value.requirements.reverse();

    const projection = projectUniversityDegreeMap(value);

    expect(projection.courses.map((course) => course.courseId)).toEqual([
      "course.cs100",
      "course.cs200",
      "course.math100",
    ]);
    expect(projection.requirements.map((requirement) => requirement.requirementId))
      .toEqual([
        "requirement.core.cs200",
        "requirement.credits.core",
      ]);
  });

  it("rejects the retired v1 request schema", () => {
    const retiredRequest = {
      ...request(),
      schemaVersion: "university-degree-map-request.v1",
    };

    const projection = projectUniversityDegreeMap(retiredRequest);

    expect(projection.status).toBe("invalid");
    expect(projection.issues.map((entry) => entry.code)).toContain(
      "schema.invalid",
    );
  });

  it("requires review for conflicts, missing sources, and unknown courses", () => {
    const value = request();
    delete value.program.sourceRef;
    delete value.courses[0]!.sourceRef;
    value.courses.push({
      ...value.courses[1]!,
      state: "completed",
      prerequisiteCourseIds: ["course.unknown"],
    });
    delete value.requirements[0]!.sourceRef;

    const projection = projectUniversityDegreeMap(value);

    expect(projection.status).toBe("review_required");
    expect(projection.flags).toMatchObject({
      duplicateCourseIds: ["course.cs100"],
      conflictingStateCourseIds: ["course.cs100"],
      unknownCourseIds: ["course.unknown"],
      missingSources: {
        program: true,
        courseIds: ["course.math100"],
        requirementIds: ["requirement.core.cs200"],
      },
    });
    expect(projection.issues.map((entry) => entry.code)).toEqual(
      expect.arrayContaining([
        "courses.duplicate_id",
        "courses.conflicting_state",
        "references.unknown_course",
        "sources.missing_or_unbound",
      ]),
    );
  });

  it("detects cycles and active courses with unmet prerequisites", () => {
    const value = request();
    value.courses[0] = {
      ...value.courses[0]!,
      prerequisiteCourseIds: ["course.cs100"],
    };

    const projection = projectUniversityDegreeMap(value);

    expect(projection.status).toBe("review_required");
    expect(projection.flags.prerequisiteCycleCourseIds).toEqual([
      "course.cs100",
      "course.math100",
    ]);
    expect(projection.flags.activeCourseUnmetPrerequisiteIds).toEqual([
      "course.math100",
    ]);
  });

  it("rejects PII-shaped extra fields and authority or behavior upgrades", () => {
    const cases: unknown[] = [
      { ...request(), learnerName: "A learner" },
      { ...request(), learnerEmail: "learner@example.test" },
      {
        ...request(),
        ownershipDeclaration: {
          ...request().ownershipDeclaration,
          subject: "adult_learner",
        },
      },
      { ...request(), recommendationRequested: true },
      { ...request(), persistenceAllowed: true },
      {
        ...request(),
        courses: [
          {
            ...request().courses[0],
            courseTitle: "Personal independent study",
          },
        ],
      },
    ];

    const projections = cases.map(projectUniversityDegreeMap);
    expect(projections.every((entry) => entry.status === "invalid")).toBe(true);
    expect(projections.every((entry) => entry.programRef === null)).toBe(true);
  });

  it("rejects whitespace normalization and opaque identifier collisions", () => {
    const paddedProgram = request();
    paddedProgram.program.programRef = " program.computing.v1 ";
    const paddedSource = request();
    paddedSource.sourceRegistry[0]!.sourceRef = " source.catalog.v1 ";
    paddedSource.program.sourceRef = " source.catalog.v1 ";
    paddedSource.courses.forEach((course) => {
      course.sourceRef = " source.catalog.v1 ";
    });
    paddedSource.requirements.forEach((requirement) => {
      requirement.sourceRef = " source.catalog.v1 ";
    });
    const sourceCollision = request();
    sourceCollision.sourceRegistry.push({
      ...sourceCollision.sourceRegistry[0]!,
      sourceRef: " source.catalog.v1 ",
    });

    for (const candidate of [
      paddedProgram,
      paddedSource,
      sourceCollision,
    ]) {
      const projection = projectUniversityDegreeMap(candidate);
      expect(projection.status).toBe("invalid");
      expect(projection.programRef).toBeNull();
      expect(projection.issues.every(
        (entry) => entry.code === "schema.invalid",
      )).toBe(true);
    }
  });

  it("does not execute hostile accessors or proxy traps", () => {
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
    const nested = request() as unknown as { courses: unknown[] };
    nested.courses[0] = new Proxy(request().courses[0]!, {
      getPrototypeOf: trap,
      ownKeys: trap,
      getOwnPropertyDescriptor: trap,
    });

    const projections = [
      projectUniversityDegreeMap(accessor),
      projectUniversityDegreeMap(rootProxy),
      projectUniversityDegreeMap(nested),
    ];

    expect(projections.every((entry) => entry.status === "invalid")).toBe(true);
    expect(getter).not.toHaveBeenCalled();
    expect(trap).not.toHaveBeenCalled();
  });

  it("rejects aliases, cycles, sparse arrays, exotic prototypes, and symbols", () => {
    const alias = request() as unknown as Record<string, unknown>;
    alias.requirements = alias.courses;
    const cycle = request() as unknown as Record<string, unknown>;
    cycle.cycle = cycle;
    const sparse = request() as unknown as { courses: unknown[] };
    sparse.courses = new Array(3);
    const exotic = Object.create({ inherited: true }) as Record<string, unknown>;
    Object.assign(exotic, request());
    const symbol = request() as unknown as Record<PropertyKey, unknown>;
    symbol[Symbol("hidden")] = true;

    const projections = [alias, cycle, sparse, exotic, symbol].map(
      projectUniversityDegreeMap,
    );
    expect(projections.every((entry) => entry.status === "invalid")).toBe(true);
  });

  it("fails closed on unsafe numbers and oversized collections", () => {
    const unsafe = request() as unknown as { courses: Array<Record<string, unknown>> };
    unsafe.courses[0]!.creditUnits = Number.NaN;
    const oversized = request() as unknown as { courses: unknown[] };
    oversized.courses = Array.from(
      { length: 257 },
      () => ({ ...request().courses[0] }),
    );

    expect(projectUniversityDegreeMap(unsafe).status).toBe("invalid");
    expect(projectUniversityDegreeMap(oversized).status).toBe("invalid");
  });

  it("is deterministic, deeply frozen, and side-effect free", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const first = projectUniversityDegreeMap(request());
    const second = projectUniversityDegreeMap(request());

    expect(first).toEqual(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.flags)).toBe(true);
    expect(Object.isFrozen(first.courses)).toBe(true);
    expect(Object.isFrozen(first.courses[0])).toBe(true);
    expect(() => {
      (first.courses as unknown as Array<unknown>).push({});
    }).toThrow();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
