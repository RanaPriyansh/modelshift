import { describe, expect, it, vi } from "vitest";

import {
  universityTodayFixtureRequest,
} from "@/app/internal/university-today/today-fixture.server";
import type {
  CourseSourceReconciliationRequestV1,
} from "@/src/forge/course-sources";
import {
  projectUniversityRecovery,
  type UniversityRecoveryRequestV1,
} from "@/src/forge/university-recovery";
import {
  projectUniversitySemesterLoop,
} from "@/src/forge/university-semester-loop";
import type {
  UniversityTodayRequestV1,
} from "@/src/forge/university-today";
import { SOURCE_CORROBORATION_WORLD } from "@/src/forge/worlds";

import {
  projectUniversitySemesterOverview,
  type UniversitySemesterOverviewRequestV1,
} from "./index.server";

type MutableOverviewRequest = {
  schemaVersion: "university-semester-overview-request.v1";
  recoveryRequest: unknown;
  courses: Array<{
    todayRequest: unknown;
    worldPack: unknown;
  }>;
};

function detached<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function expectDeeplyFrozen(
  value: unknown,
  seen = new WeakSet<object>(),
): void {
  if (typeof value !== "object" || value === null || seen.has(value)) return;
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) {
    expectDeeplyFrozen(child, seen);
  }
}

function sourceRequest(
  today: UniversityTodayRequestV1,
): CourseSourceReconciliationRequestV1 {
  return today.reconciliationRequest as CourseSourceReconciliationRequestV1;
}

function deadlineCandidateId(
  reconciliation: CourseSourceReconciliationRequestV1,
): string {
  const deadline = reconciliation.candidates.find(
    (candidate) => candidate.fact.kind === "deadline",
  );
  if (!deadline) throw new Error("Expected one deadline fixture candidate.");
  return deadline.candidateId;
}

async function todayForCourse(
  courseId: string,
  courseLabel: string,
  activityStatus: "ready" | "completed" = "ready",
): Promise<UniversityTodayRequestV1> {
  const base = await universityTodayFixtureRequest("ready");
  const scope = {
    ...base.context.scope,
    courseId,
  };
  const reconciliation = sourceRequest(base);
  const scopedReconciliation: CourseSourceReconciliationRequestV1 = {
    ...reconciliation,
    scope,
    sourceRevisions: reconciliation.sourceRevisions.map((revision) => ({
      ...revision,
      scope,
    })),
    candidates: reconciliation.candidates.map((candidate) => ({
      ...candidate,
      scope,
    })),
    decisions: reconciliation.decisions.map((decision) => ({
      ...decision,
      scope,
    })),
  };

  return detached({
    ...base,
    context: {
      ...base.context,
      scope,
      courseLabel,
    },
    reconciliationRequest: scopedReconciliation,
    activityStates: base.activityStates.map((state) => ({
      ...(state as Record<string, unknown>),
      status: activityStatus,
    })),
  }) as UniversityTodayRequestV1;
}

function recoveryFor(
  courses: readonly UniversityTodayRequestV1[],
): UniversityRecoveryRequestV1 {
  const first = courses[0];
  if (!first) throw new Error("Expected at least one overview course.");
  return {
    schemaVersion: "university-recovery-request.v1",
    scope: {
      ownerUserId: first.context.scope.ownerUserId,
      tenantId: first.context.scope.tenantId,
      termId: first.context.scope.termId,
    },
    asOf: first.context.asOf,
    termLabel: first.context.termLabel,
    timeZone: first.context.timeZone,
    declaredChange: {
      kind: "capacity_changed",
      declaredBy: "learner_fixture",
    },
    recoveryWindow: {
      startsAt: first.context.asOf,
      endsAt: "2026-09-13T09:00:00.000Z",
      availableMinutes: 480,
      bufferMinutes: 30,
      declaredBy: "learner_fixture",
    },
    courses: courses.map((today) => ({
      courseId: today.context.scope.courseId,
      courseLabel: today.context.courseLabel,
      reconciliationRequest: today.reconciliationRequest,
    })),
    items: courses.map((today, index) => ({
      schemaVersion: "university-recovery-item.v1",
      itemId: `recovery-item.semester-overview-${index + 1}`,
      courseId: today.context.scope.courseId,
      deadlineCandidateId: deadlineCandidateId(sourceRequest(today)),
      learnerDisposition: "required",
      learningEssential: {
        value: true,
        declaredBy: "learner_fixture",
      },
      effort: {
        minutesLow: 45,
        minutesHigh: 60,
        basis: "fixture_authored",
      },
      dependencyItemIds: [],
      humanRoute: {
        owner: "instructor",
        declaredBy: "learner_fixture",
      },
    })),
  };
}

async function overviewRequest(): Promise<MutableOverviewRequest> {
  const courses = [
    await todayForCourse(
      "course.semester-overview-alpha",
      "ALPHA101: Source reasoning",
    ),
    await todayForCourse(
      "course.semester-overview-beta",
      "BETA202: Evidence practice",
      "completed",
    ),
  ];
  return detached({
    schemaVersion: "university-semester-overview-request.v1",
    recoveryRequest: recoveryFor(courses),
    courses: courses.map((todayRequest) => ({
      todayRequest,
      worldPack: SOURCE_CORROBORATION_WORLD,
    })),
  } satisfies UniversitySemesterOverviewRequestV1);
}

function mutableToday(
  request: MutableOverviewRequest,
  index: number,
): UniversityTodayRequestV1 {
  return request.courses[index]!.todayRequest as UniversityTodayRequestV1;
}

describe("projectUniversitySemesterOverview", () => {
  it("exposes one Recovery axis and one exact loop per course without selecting globally", async () => {
    const request = await overviewRequest();
    const recoveryRequest =
      request.recoveryRequest as UniversityRecoveryRequestV1;
    const directRecovery = await projectUniversityRecovery(recoveryRequest);
    const directLoops = await Promise.all(request.courses.map((course) => (
      projectUniversitySemesterLoop({
        schemaVersion: "university-semester-loop-request.v1",
        todayRequest: course.todayRequest,
        recoveryRequest,
        worldPack: course.worldPack,
      })
    )));
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const projection = await projectUniversitySemesterOverview(request);

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    expect(projection).toMatchObject({
      schemaVersion: "university-semester-overview-projection.v1",
      status: "ready_for_inspection",
      authority: {
        projectionClass: "fixture_only_semester_inspection",
        orderBasis: "course_id_not_priority",
        identityScopeAuthority: "not_established",
        tenantIsolationAuthority: "not_established",
        rightsEnforcementAuthority: "not_established",
        institutionalCompleteness: "not_established",
        termFeasibilityAllowed: false,
        courseSelectionAllowed: false,
        globalActionAllowed: false,
        recommendationAllowed: false,
        schedulingAllowed: false,
        providerCallAllowed: false,
        sessionStartAllowed: false,
        persistenceAllowed: false,
        evidenceClaimAllowed: false,
        messageSendAllowed: false,
        eventEmissionAllowed: false,
        externalSideEffectsAllowed: false,
      },
      termRecovery: {
        status: directRecovery.status,
        projectionDigest: directRecovery.projectionDigest,
      },
      issues: [],
    });
    expect(projection.courses).toEqual([
      {
        courseId: "course.semester-overview-alpha",
        courseLabel: "ALPHA101: Source reasoning",
        todayStatus: directLoops[0]!.today!.status,
        semesterLoopStatus: directLoops[0]!.status,
        todayProjectionDigest: directLoops[0]!.today!.projectionDigest,
        semesterLoopDigest: directLoops[0]!.projectionDigest,
      },
      {
        courseId: "course.semester-overview-beta",
        courseLabel: "BETA202: Evidence practice",
        todayStatus: directLoops[1]!.today!.status,
        semesterLoopStatus: directLoops[1]!.status,
        todayProjectionDigest: directLoops[1]!.today!.projectionDigest,
        semesterLoopDigest: directLoops[1]!.projectionDigest,
      },
    ]);
    expect(projection.projectionDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expectDeeplyFrozen(projection);

    const serialized = JSON.stringify(projection);
    expect(serialized).not.toContain("todayRequest");
    expect(serialized).not.toContain("recoveryRequest");
    expect(serialized).not.toContain("worldPack");
    expect(serialized).not.toContain('"action":');
    expect(serialized).not.toContain('"score":');
  });

  it("is invariant to input course order and always sorts by course ID", async () => {
    const request = await overviewRequest();
    const reversed = detached({
      ...request,
      courses: [...request.courses].reverse(),
    });
    const fullyPermuted = detached(reversed);
    const permutedRecovery =
      fullyPermuted.recoveryRequest as UniversityRecoveryRequestV1;
    fullyPermuted.recoveryRequest = {
      ...permutedRecovery,
      courses: [...permutedRecovery.courses].reverse(),
      items: [...permutedRecovery.items].reverse(),
    };

    const [forward, backward, permuted] = await Promise.all([
      projectUniversitySemesterOverview(request),
      projectUniversitySemesterOverview(reversed),
      projectUniversitySemesterOverview(fullyPermuted),
    ]);

    expect(backward).toEqual(forward);
    expect(permuted).toEqual(forward);
    expect(forward.courses.map((course) => course.courseId)).toEqual([
      "course.semester-overview-alpha",
      "course.semester-overview-beta",
    ]);
  });

  it("fails closed on duplicate or non-identical declared course sets", async () => {
    const duplicate = await overviewRequest();
    const first = mutableToday(duplicate, 0);
    const second = mutableToday(duplicate, 1);
    duplicate.courses[1]!.todayRequest = {
      ...second,
      context: {
        ...second.context,
        scope: {
          ...second.context.scope,
          courseId: first.context.scope.courseId,
        },
      },
    };

    const missing = await overviewRequest();
    const recovery = missing.recoveryRequest as UniversityRecoveryRequestV1;
    missing.recoveryRequest = {
      ...recovery,
      courses: recovery.courses.slice(0, 1),
      items: recovery.items.slice(0, 1),
    };

    const [duplicateResult, missingResult] = await Promise.all([
      projectUniversitySemesterOverview(duplicate),
      projectUniversitySemesterOverview(missing),
    ]);
    expect(duplicateResult.status).toBe("invalid");
    expect(duplicateResult.issues.map((issue) => issue.code))
      .toContain("course.duplicate");
    expect(missingResult.status).toBe("invalid");
    expect(missingResult.issues.map((issue) => issue.code))
      .toContain("course_set.mismatch");
  });

  it("rejects every owner, tenant, term, time, label, and zone envelope drift", async () => {
    const mutations: Array<(today: UniversityTodayRequestV1) => UniversityTodayRequestV1> = [
      (today) => ({
        ...today,
        context: {
          ...today.context,
          scope: {
            ...today.context.scope,
            ownerUserId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          },
        },
      }),
      (today) => ({
        ...today,
        context: {
          ...today.context,
          scope: {
            ...today.context.scope,
            tenantId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          },
        },
      }),
      (today) => ({
        ...today,
        context: {
          ...today.context,
          scope: {
            ...today.context.scope,
            termId: "term.other",
          },
        },
      }),
      (today) => ({
        ...today,
        context: {
          ...today.context,
          asOf: "2026-08-25T09:00:01.000Z",
        },
      }),
      (today) => ({
        ...today,
        context: {
          ...today.context,
          termLabel: "Another term",
        },
      }),
      (today) => ({
        ...today,
        context: {
          ...today.context,
          timeZone: "UTC",
        },
      }),
    ];

    for (const mutate of mutations) {
      const request = await overviewRequest();
      request.courses[1]!.todayRequest = mutate(mutableToday(request, 1));
      const projection = await projectUniversitySemesterOverview(request);
      expect(projection.status).toBe("invalid");
      expect(projection.issues.map((issue) => issue.code))
        .toContain("envelope.mismatch");
    }
  });

  it("rejects course-label and canonical reconciliation substitution", async () => {
    const labelDrift = await overviewRequest();
    const labelledToday = mutableToday(labelDrift, 1);
    labelDrift.courses[1]!.todayRequest = {
      ...labelledToday,
      context: {
        ...labelledToday.context,
        courseLabel: "Substituted course label",
      },
    };

    const sourceDrift = await overviewRequest();
    const sourceToday = mutableToday(sourceDrift, 1);
    const reconciliation = sourceRequest(sourceToday);
    sourceDrift.courses[1]!.todayRequest = {
      ...sourceToday,
      reconciliationRequest: {
        ...reconciliation,
        sourceRevisions: reconciliation.sourceRevisions.map(
          (revision, index) => index === 0
            ? { ...revision, sourceLabel: "Substituted source copy" }
            : revision,
        ),
      },
    };

    const [labelResult, sourceResult] = await Promise.all([
      projectUniversitySemesterOverview(labelDrift),
      projectUniversitySemesterOverview(sourceDrift),
    ]);
    expect(labelResult.issues.map((issue) => issue.code))
      .toContain("course_label.mismatch");
    expect(sourceResult.issues.map((issue) => issue.code))
      .toContain("source.binding_mismatch");
  });

  it("invalidates the entire overview when any canonical semester child is invalid", async () => {
    const request = await overviewRequest();
    request.courses[0]!.worldPack = {};

    const projection = await projectUniversitySemesterOverview(request);

    expect(projection).toMatchObject({
      status: "invalid",
      termRecovery: null,
      courses: [],
      issues: [{ code: "child.invalid", path: "courses.0" }],
      projectionDigest: null,
    });
  });

  it("rejects hostile, revoked, and nested Proxies without executing traps", async () => {
    const request = await overviewRequest();
    const get = vi.fn(() => {
      throw new Error("get trap must not execute");
    });
    const getPrototypeOf = vi.fn(() => {
      throw new Error("prototype trap must not execute");
    });
    const ownKeys = vi.fn(() => {
      throw new Error("ownKeys trap must not execute");
    });
    const getOwnPropertyDescriptor = vi.fn(() => {
      throw new Error("descriptor trap must not execute");
    });
    const hostile = new Proxy(request, {
      get,
      getPrototypeOf,
      ownKeys,
      getOwnPropertyDescriptor,
    });
    const revoked = Proxy.revocable({}, {});
    revoked.revoke();
    const nested = await overviewRequest();
    nested.courses[0]!.worldPack = new Proxy({}, {
      get,
      getPrototypeOf,
      ownKeys,
      getOwnPropertyDescriptor,
    });

    for (const value of [hostile, revoked.proxy, nested]) {
      expect(await projectUniversitySemesterOverview(value)).toMatchObject({
        status: "invalid",
        issues: [{ code: "schema.invalid" }],
      });
    }
    expect(get).not.toHaveBeenCalled();
    expect(getPrototypeOf).not.toHaveBeenCalled();
    expect(ownKeys).not.toHaveBeenCalled();
    expect(getOwnPropertyDescriptor).not.toHaveBeenCalled();
  });

  it("rejects accessors, symbols, exotic objects, cycles, and repeated aliases", async () => {
    const accessor = await overviewRequest();
    const getter = vi.fn(() => {
      throw new Error("overview getter must not execute");
    });
    Object.defineProperty(accessor.courses[0]!, "worldPack", {
      configurable: true,
      enumerable: true,
      get: getter,
    });

    const symbol = await overviewRequest();
    Object.defineProperty(
      symbol.recoveryRequest as object,
      Symbol("hidden"),
      { enumerable: true, value: true },
    );

    const exotic = await overviewRequest();
    Object.setPrototypeOf(
      exotic.recoveryRequest as object,
      { unexpected: true },
    );

    const cycle = await overviewRequest();
    (cycle.recoveryRequest as Record<string, unknown>).cycle =
      cycle.recoveryRequest;

    const alias = await overviewRequest();
    alias.courses[1]!.worldPack = alias.courses[0]!.worldPack;

    for (const value of [accessor, symbol, exotic, cycle, alias]) {
      expect(await projectUniversitySemesterOverview(value)).toMatchObject({
        status: "invalid",
        issues: [{ code: "schema.invalid" }],
      });
    }
    expect(getter).not.toHaveBeenCalled();
  });

  it("rejects sparse and extended arrays, pollution keys, and unsafe numbers", async () => {
    const sparse = await overviewRequest();
    const sparseCourses = new Array(2);
    sparseCourses[0] = sparse.courses[0];
    sparse.courses = sparseCourses;

    const extended = await overviewRequest();
    Object.defineProperty(extended.courses, "extra", {
      enumerable: true,
      value: true,
    });

    const polluted = await overviewRequest();
    Object.defineProperty(
      polluted.recoveryRequest as object,
      "__proto__",
      { enumerable: true, value: { polluted: true } },
    );

    const unsafe = await overviewRequest();
    (unsafe.recoveryRequest as Record<string, unknown>).unsafe =
      Number.MAX_SAFE_INTEGER + 1;

    for (const value of [sparse, extended, polluted, unsafe]) {
      expect(await projectUniversitySemesterOverview(value)).toMatchObject({
        status: "invalid",
        issues: [{ code: "schema.invalid" }],
      });
    }
  });

  it("fails closed on depth, node, key, object-key, and array-length limits", async () => {
    const depth = await overviewRequest();
    const deepRoot: Record<string, unknown> = {};
    let cursor = deepRoot;
    for (let index = 0; index < 24; index += 1) {
      const child: Record<string, unknown> = {};
      cursor.child = child;
      cursor = child;
    }
    depth.recoveryRequest = deepRoot;

    const objectKeys = await overviewRequest();
    objectKeys.recoveryRequest = Object.fromEntries(
      Array.from({ length: 257 }, (_, index) => [`key${index}`, index]),
    );

    const arrayLength = await overviewRequest();
    arrayLength.recoveryRequest = Array.from(
      { length: 513 },
      (_, index) => index,
    );

    const nodes = await overviewRequest();
    nodes.recoveryRequest = Object.fromEntries(
      Array.from({ length: 65 }, (_, group) => [
        `group${group}`,
        Array.from(
          { length: 256 },
          (_, index) => `${group}:${index}`,
        ),
      ]),
    );

    const aggregateKeys = await overviewRequest();
    aggregateKeys.recoveryRequest = Array.from(
      { length: 30 },
      () => Array.from({ length: 500 }, () => []),
    );

    for (
      const value
      of [depth, objectKeys, arrayLength, nodes, aggregateKeys]
    ) {
      expect(await projectUniversitySemesterOverview(value)).toMatchObject({
        status: "invalid",
        issues: [{ code: "schema.invalid" }],
      });
    }
  });

  it("keeps learner agency closed and rejects status, authority, and free-text injection", async () => {
    const topLevel = await overviewRequest() as MutableOverviewRequest & {
      globalAction?: unknown;
      repairText?: unknown;
    };
    topLevel.globalAction = "course.semester-overview-beta";
    topLevel.repairText = "Tell me what to write.";

    const courseLevel = await overviewRequest();
    courseLevel.courses[0] = {
      ...courseLevel.courses[0]!,
      semesterLoopStatus: "protected_study_ready",
      recommendationAllowed: true,
      learnerText: "Complete this answer for me.",
    } as unknown as MutableOverviewRequest["courses"][number];

    for (const value of [topLevel, courseLevel]) {
      const projection = await projectUniversitySemesterOverview(value);
      expect(projection.status).toBe("invalid");
      expect(projection.issues.map((issue) => issue.code))
        .toContain("schema.invalid");
      expect(projection.authority).toMatchObject({
        courseSelectionAllowed: false,
        globalActionAllowed: false,
        recommendationAllowed: false,
        schedulingAllowed: false,
        providerCallAllowed: false,
        persistenceAllowed: false,
        externalSideEffectsAllowed: false,
      });
    }
  });
});
