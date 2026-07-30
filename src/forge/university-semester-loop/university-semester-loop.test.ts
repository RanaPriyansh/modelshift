import { describe, expect, it, vi } from "vitest";

import { universityTodayFixtureRequest } from "@/app/internal/university-today/today-fixture.server";
import type { CourseSourceReconciliationRequestV1 } from "@/src/forge/course-sources";
import { trustedWorldRegistry } from "@/src/forge/registry.server";
import type { UniversityRecoveryRequestV1 } from "@/src/forge/university-recovery";
import type { UniversityTodayRequestV1 } from "@/src/forge/university-today";

import {
  projectUniversitySemesterLoop,
  type UniversitySemesterLoopRequestV1,
} from ".";

const OTHER_OWNER = "33333333-3333-4333-8333-333333333333";
const OTHER_COURSE = "course.sample-other";

function worldPack() {
  const value = trustedWorldRegistry.getPack("world.source-corroboration");
  if (!value) throw new Error("Expected the source-corroboration World fixture.");
  return value;
}

function sourceRequest(today: UniversityTodayRequestV1): CourseSourceReconciliationRequestV1 {
  return today.reconciliationRequest as CourseSourceReconciliationRequestV1;
}

function deadlineCandidateId(reconciliation: CourseSourceReconciliationRequestV1): string {
  const candidate = reconciliation.candidates.find((entry) => entry.fact.kind === "deadline");
  if (!candidate) throw new Error("Expected one copied deadline candidate.");
  return candidate.candidateId;
}

function recoveryFor(
  today: UniversityTodayRequestV1,
  changes: Partial<UniversityRecoveryRequestV1> = {},
): UniversityRecoveryRequestV1 {
  const reconciliation = sourceRequest(today);
  const { context } = today;
  return {
    schemaVersion: "university-recovery-request.v1",
    scope: {
      ownerUserId: context.scope.ownerUserId,
      tenantId: context.scope.tenantId,
      termId: context.scope.termId,
    },
    asOf: context.asOf,
    termLabel: context.termLabel,
    timeZone: context.timeZone,
    declaredChange: {
      kind: "capacity_changed",
      declaredBy: "learner_fixture",
    },
    recoveryWindow: {
      startsAt: context.asOf,
      endsAt: "2026-09-01T09:00:00.000Z",
      availableMinutes: 240,
      bufferMinutes: 30,
      declaredBy: "learner_fixture",
    },
    courses: [{
      courseId: context.scope.courseId,
      courseLabel: context.courseLabel,
      reconciliationRequest: reconciliation,
    }],
    items: [{
      schemaVersion: "university-recovery-item.v1",
      itemId: "recovery-item.sample-semester-loop",
      courseId: context.scope.courseId,
      deadlineCandidateId: deadlineCandidateId(reconciliation),
      learnerDisposition: "required",
      learningEssential: {
        value: true,
        declaredBy: "learner_fixture",
      },
      effort: {
        minutesLow: 60,
        minutesHigh: 90,
        basis: "fixture_authored",
      },
      dependencyItemIds: [],
      humanRoute: {
        owner: "instructor",
        declaredBy: "learner_fixture",
      },
    }],
    ...changes,
  };
}

function requestFor(
  today: UniversityTodayRequestV1,
  recovery: UniversityRecoveryRequestV1 = recoveryFor(today),
): UniversitySemesterLoopRequestV1 {
  return {
    schemaVersion: "university-semester-loop-request.v1",
    todayRequest: today,
    recoveryRequest: recovery,
    worldPack: worldPack(),
  };
}

function withActivityStatus(
  today: UniversityTodayRequestV1,
  status: "completed" | "blocked",
): UniversityTodayRequestV1 {
  return {
    ...today,
    activityStates: today.activityStates.map((state) => ({
      ...(state as Record<string, unknown>),
      status,
    })),
  };
}

function withScope(
  reconciliation: CourseSourceReconciliationRequestV1,
  scope: CourseSourceReconciliationRequestV1["scope"],
): CourseSourceReconciliationRequestV1 {
  return {
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
}

describe("projectUniversitySemesterLoop", () => {
  it("composes one exact source-reviewed action into a protected-study brief", async () => {
    const today = await universityTodayFixtureRequest("ready");
    const result = await projectUniversitySemesterLoop(requestFor(today));

    expect(result).toMatchObject({
      schemaVersion: "university-semester-loop-projection.v1",
      status: "protected_study_ready",
      scope: today.context.scope,
      asOf: today.context.asOf,
      termLabel: today.context.termLabel,
      courseLabel: today.context.courseLabel,
      timeZone: today.context.timeZone,
      authority: {
        projectionClass: "fixture_only_university_semester_loop",
        actionSelectionBasis: "today_existing_learner_accepted_path_only",
        sourceFactsMaySelectAction: false,
        recommendationAllowed: false,
        sessionStartAllowed: false,
        persistenceAllowed: false,
        evidenceClaimAllowed: false,
        messageSendAllowed: false,
        eventEmissionAllowed: false,
        externalSideEffectsAllowed: false,
      },
      today: {
        status: "ready",
        action: {
          selectedBecause: "next_in_existing_learner_accepted_path",
          selectedFromCourseSourceFacts: false,
          startAllowedFromThisProjection: false,
        },
      },
      recoveryDraft: null,
      protectedStudy: {
        status: "ready",
        authority: {
          sessionStartAllowed: false,
          persistenceAllowed: false,
          evidenceClaimAllowed: false,
        },
      },
      issues: [],
    });
    expect(result.projectionDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("lets Today source review block the loop without exposing recovery or study", async () => {
    const today = await universityTodayFixtureRequest("source-review");
    const result = await projectUniversitySemesterLoop(requestFor(today));

    expect(result).toMatchObject({
      status: "source_review_required",
      today: { status: "source_review_required" },
      recoveryDraft: null,
      protectedStudy: null,
      issues: [],
    });
  });

  it("lets uncertainty in another recovery course block the composed loop", async () => {
    const today = await universityTodayFixtureRequest("ready");
    const uncertainToday = await universityTodayFixtureRequest("source-review");
    const base = recoveryFor(today);
    const otherScope = {
      ...uncertainToday.context.scope,
      courseId: OTHER_COURSE,
    };
    const uncertainSource = withScope(sourceRequest(uncertainToday), otherScope);
    const recovery: UniversityRecoveryRequestV1 = {
      ...base,
      courses: [
        ...base.courses,
        {
          courseId: OTHER_COURSE,
          courseLabel: "OTHER101: Uncertain commitments",
          reconciliationRequest: uncertainSource,
        },
      ],
      items: [
        ...base.items,
        {
          ...base.items[0]!,
          itemId: "recovery-item.sample-other",
          courseId: OTHER_COURSE,
          deadlineCandidateId: deadlineCandidateId(uncertainSource),
        },
      ],
    };

    const result = await projectUniversitySemesterLoop(requestFor(today, recovery));

    expect(result).toMatchObject({
      status: "source_review_required",
      today: { status: "ready" },
      recoveryDraft: null,
      protectedStudy: null,
    });
  });

  it("exposes the same-envelope recovery draft only when Today has no room", async () => {
    const today = await universityTodayFixtureRequest("no-room");
    const result = await projectUniversitySemesterLoop(requestFor(today));

    expect(result).toMatchObject({
      status: "recovery_required",
      today: { status: "capacity_conflict" },
      recoveryDraft: {
        status: "draft_ready",
        scope: {
          ownerUserId: today.context.scope.ownerUserId,
          tenantId: today.context.scope.tenantId,
          termId: today.context.scope.termId,
        },
        asOf: today.context.asOf,
        timeZone: today.context.timeZone,
        authority: {
          recommendationAllowed: false,
          persistenceAllowed: false,
          messageSendAllowed: false,
        },
      },
      protectedStudy: null,
    });
  });

  it("keeps a tight Today window as a learner choice", async () => {
    const today = await universityTodayFixtureRequest("tight");
    const result = await projectUniversitySemesterLoop(requestFor(today));

    expect(result).toMatchObject({
      status: "learner_choice_required",
      today: { status: "learner_choice_required" },
      recoveryDraft: null,
      protectedStudy: null,
    });
  });

  it("retains a bounded World-review child for an exact binding mismatch", async () => {
    const today = await universityTodayFixtureRequest("ready");
    const exact = worldPack();
    const input = requestFor(today);
    const result = await projectUniversitySemesterLoop({
      ...input,
      worldPack: {
        ...exact,
        manifest: {
          ...exact.manifest,
          version: "1.0.2",
        },
      },
    });

    expect(result).toMatchObject({
      status: "world_review_required",
      today: { status: "ready" },
      recoveryDraft: null,
      protectedStudy: {
        status: "world_mismatch",
        recovery: "review_world_binding",
      },
      issues: [],
    });
  });

  it("fails closed when a ready Today request receives an invalid World child", async () => {
    const today = await universityTodayFixtureRequest("ready");
    const result = await projectUniversitySemesterLoop({
      ...requestFor(today),
      worldPack: {},
    });

    expect(result).toMatchObject({
      status: "invalid",
      today: { status: "ready" },
      recoveryDraft: null,
      protectedStudy: null,
      issues: [{ code: "child.invalid", path: "worldPack" }],
      projectionDigest: null,
    });
  });

  it.each([
    ["completed", "path_complete"],
    ["blocked", "path_blocked"],
  ] as const)("maps an exact %s path state directly to %s", async (activityStatus, expected) => {
    const base = await universityTodayFixtureRequest("ready");
    const today = withActivityStatus(base, activityStatus);
    const result = await projectUniversitySemesterLoop(requestFor(today));

    expect(result).toMatchObject({
      status: expected,
      today: {
        status: activityStatus === "completed" ? "complete" : "blocked",
      },
      recoveryDraft: null,
      protectedStudy: null,
    });
  });

  it("rejects envelope and course-label drift after recomputing both children", async () => {
    const today = await universityTodayFixtureRequest("ready");
    const base = recoveryFor(today);
    const cases: UniversityRecoveryRequestV1[] = [
      { ...base, timeZone: "UTC" },
      { ...base, termLabel: "Different term label" },
      {
        ...base,
        courses: base.courses.map((course) => ({
          ...course,
          courseLabel: "Different course label",
        })),
      },
      (() => {
        const scope = {
          ...base.scope,
          ownerUserId: OTHER_OWNER,
        };
        const reconciliation = withScope(
          base.courses[0]!.reconciliationRequest as CourseSourceReconciliationRequestV1,
          {
            ...today.context.scope,
            ownerUserId: OTHER_OWNER,
          },
        );
        return {
          ...base,
          scope,
          courses: [{
            ...base.courses[0]!,
            reconciliationRequest: reconciliation,
          }],
        };
      })(),
    ];

    for (const recovery of cases) {
      const result = await projectUniversitySemesterLoop(requestFor(today, recovery));
      expect(result.status).toBe("invalid");
      expect(result.issues.map((issue) => issue.code)).toContain("envelope.mismatch");
    }
  });

  it("rejects a recovery projection that omits the exact Today course", async () => {
    const today = await universityTodayFixtureRequest("ready");
    const base = recoveryFor(today);
    const otherScope = {
      ...today.context.scope,
      courseId: OTHER_COURSE,
    };
    const otherSource = withScope(sourceRequest(today), otherScope);
    const recovery: UniversityRecoveryRequestV1 = {
      ...base,
      courses: [{
        ...base.courses[0]!,
        courseId: OTHER_COURSE,
        courseLabel: "OTHER101",
        reconciliationRequest: otherSource,
      }],
      items: [{
        ...base.items[0]!,
        courseId: OTHER_COURSE,
      }],
    };

    const result = await projectUniversitySemesterLoop(requestFor(today, recovery));

    expect(result).toMatchObject({
      status: "invalid",
      issues: [{ code: "course.missing", path: "recoveryRequest.courses" }],
    });
  });

  it("requires canonical source continuity between Today and its recovery course", async () => {
    const today = await universityTodayFixtureRequest("ready");
    const base = recoveryFor(today);
    const reconciliation = base.courses[0]!
      .reconciliationRequest as CourseSourceReconciliationRequestV1;
    const changed: CourseSourceReconciliationRequestV1 = {
      ...reconciliation,
      sourceRevisions: reconciliation.sourceRevisions.map((revision, index) => (
        index === 0
          ? { ...revision, sourceLabel: "Changed source label" }
          : revision
      )),
    };
    const recovery: UniversityRecoveryRequestV1 = {
      ...base,
      courses: [{
        ...base.courses[0]!,
        reconciliationRequest: changed,
      }],
    };

    const result = await projectUniversitySemesterLoop(requestFor(today, recovery));

    expect(result).toMatchObject({
      status: "invalid",
      issues: [{
        code: "source.binding_mismatch",
        path: "recoveryRequest.courses",
      }],
    });
  });

  it("accepts no caller-supplied child projections or readiness flags", async () => {
    const today = await universityTodayFixtureRequest("ready");
    const valid = requestFor(today);
    const result = await projectUniversitySemesterLoop({
      ...valid,
      today: { status: "ready" },
      recoveryDraft: { status: "draft_ready" },
      ready: true,
    });

    expect(result).toMatchObject({
      status: "invalid",
      issues: [{ code: "schema.invalid" }],
      projectionDigest: null,
    });
  });

  it("does not invoke hostile accessors or proxy traps", async () => {
    const getter = vi.fn(() => "university-semester-loop-request.v1");
    const hostileGetter = {};
    Object.defineProperty(hostileGetter, "schemaVersion", {
      enumerable: true,
      get: getter,
    });
    const ownKeys = vi.fn((): never => {
      throw new Error("must not execute");
    });
    const getPrototypeOf = vi.fn((): never => {
      throw new Error("must not execute");
    });
    const hostileProxy = new Proxy({}, {
      ownKeys() {
        return ownKeys();
      },
      getPrototypeOf() {
        return getPrototypeOf();
      },
      get() {
        throw new Error("must fail closed");
      },
    });

    const [getterResult, proxyResult] = await Promise.all([
      projectUniversitySemesterLoop(hostileGetter),
      projectUniversitySemesterLoop(hostileProxy),
    ]);

    expect(getter).not.toHaveBeenCalled();
    expect(ownKeys).not.toHaveBeenCalled();
    expect(getPrototypeOf).not.toHaveBeenCalled();
    expect(getterResult).toMatchObject({
      status: "invalid",
      issues: [{ code: "schema.invalid" }],
    });
    expect(proxyResult).toMatchObject({
      status: "invalid",
      issues: [{ code: "schema.invalid" }],
    });
  });

  it("rejects exotic prototypes, cycles, excessive depth, and excessive nodes", async () => {
    const today = await universityTodayFixtureRequest("ready");
    const valid = requestFor(today);
    const exotic = Object.assign(Object.create({ inherited: true }), valid);
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    let deep: unknown = "leaf";
    for (let index = 0; index < 24; index += 1) deep = { value: deep };
    const tooManyNodes = Array.from({ length: 16_500 }, () => 0);

    const results = await Promise.all([
      projectUniversitySemesterLoop(exotic),
      projectUniversitySemesterLoop({ ...valid, worldPack: cycle }),
      projectUniversitySemesterLoop({ ...valid, worldPack: deep }),
      projectUniversitySemesterLoop({ ...valid, worldPack: tooManyNodes }),
    ]);

    for (const result of results) {
      expect(result).toMatchObject({
        status: "invalid",
        issues: [{ code: "schema.invalid" }],
        projectionDigest: null,
      });
    }
  });

  it("is deterministic, deeply frozen, and performs no external effect", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const today = await universityTodayFixtureRequest("ready");
    const input = requestFor(today);
    const first = await projectUniversitySemesterLoop(input);
    const second = await projectUniversitySemesterLoop(input);

    expect(first).toEqual(second);
    expect(first.projectionDigest).toBe(second.projectionDigest);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.authority)).toBe(true);
    expect(Object.isFrozen(first.today)).toBe(true);
    expect(Object.isFrozen(first.today?.action?.activity.worldRef)).toBe(true);
    expect(Object.isFrozen(first.protectedStudy)).toBe(true);
    expect(Object.isFrozen(first.protectedStudy?.learningContract?.proof.successCriteria)).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
