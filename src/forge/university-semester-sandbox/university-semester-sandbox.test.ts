import { describe, expect, it, vi } from "vitest";

import { universityTodayFixtureRequest } from "@/app/internal/university-today/today-fixture.server";
import type {
  CourseSourceCandidateV1,
  CourseSourceDecisionV1,
  CourseSourceReconciliationRequestV1,
} from "@/src/forge/course-sources";
import { trustedWorldRegistry } from "@/src/forge/registry.server";
import type { UniversityRecoveryRequestV1 } from "@/src/forge/university-recovery";
import {
  projectUniversitySemesterLoop,
  type UniversitySemesterLoopRequestV1,
} from "@/src/forge/university-semester-loop";
import type { UniversityTodayRequestV1 } from "@/src/forge/university-today";

import {
  projectUniversitySemesterSandbox,
  type UniversitySemesterSandboxRequestV1,
} from ".";

const OTHER_COURSE = "course.sample-other";

type DeadlineCandidateV1 = Omit<CourseSourceCandidateV1, "fact"> & {
  readonly fact: Extract<CourseSourceCandidateV1["fact"], { kind: "deadline" }>;
};

function worldPack() {
  const value = trustedWorldRegistry.getPack("world.source-corroboration");
  if (!value) throw new Error("Expected the source-corroboration World fixture.");
  return value;
}

function sourceRequest(
  today: UniversityTodayRequestV1,
): CourseSourceReconciliationRequestV1 {
  return today.reconciliationRequest as CourseSourceReconciliationRequestV1;
}

function deadlineCandidateId(
  reconciliation: CourseSourceReconciliationRequestV1,
): string {
  return deadlineCandidate(reconciliation).candidateId;
}

function deadlineCandidate(
  reconciliation: CourseSourceReconciliationRequestV1,
): DeadlineCandidateV1 {
  const candidate = reconciliation.candidates.find(
    (entry) => entry.fact.kind === "deadline",
  );
  if (!candidate) throw new Error("Expected one copied deadline candidate.");
  return candidate as DeadlineCandidateV1;
}

function recoveryFor(today: UniversityTodayRequestV1): UniversityRecoveryRequestV1 {
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
      kind: "source_changed",
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
      itemId: "recovery-item.sample-semester-sandbox",
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
  };
}

function loopFor(
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

function sandboxRequest(
  semesterLoopRequest: UniversitySemesterLoopRequestV1,
  sourceDecisions: readonly CourseSourceDecisionV1[],
): UniversitySemesterSandboxRequestV1 {
  return {
    schemaVersion: "university-semester-sandbox-request.v1",
    semesterLoopRequest,
    sourceDecisions,
  };
}

function withoutSourceDecisions(
  today: UniversityTodayRequestV1,
): UniversityTodayRequestV1 {
  const reconciliation = sourceRequest(today);
  return {
    ...today,
    reconciliationRequest: {
      ...reconciliation,
      decisions: [],
    },
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

function correctedDeadlineDecision(
  source: CourseSourceReconciliationRequestV1,
): Extract<CourseSourceDecisionV1, { kind: "correct" }> {
  const candidate = deadlineCandidate(source);
  return {
    schemaVersion: "course-source-decision.v1",
    decisionId: "course-source-decision.sample-today-deadline-correct",
    candidateId: candidate.candidateId,
    scope: source.scope,
    actor: "learner",
    kind: "correct",
    extractionMatch: "learner_corrected",
    correctedFact: {
      ...candidate.fact,
      dueAt: "2026-09-13T12:30:00+05:30",
    },
    correctionReasonCode: "learner_fixture_copy_correction",
    decidedAt: "2026-08-25T08:00:00.000Z",
  };
}

function rejectedDeadlineDecision(
  source: CourseSourceReconciliationRequestV1,
): Extract<CourseSourceDecisionV1, { kind: "reject" }> {
  return {
    ...source.decisions[0]!,
    decisionId: "course-source-decision.sample-today-deadline-reject",
    kind: "reject",
    extractionMatch: "learner_rejected",
    rejectionReasonCode: "learner_fixture_not_current",
  };
}

describe("projectUniversitySemesterSandbox", () => {
  it("transiently rebuilds both source copies and reaches canonical Today readiness", async () => {
    const reviewedToday = await universityTodayFixtureRequest("ready");
    const reviewedSource = sourceRequest(reviewedToday);
    const pendingToday = withoutSourceDecisions(reviewedToday);
    const rawLoop = loopFor(pendingToday);

    const result = await projectUniversitySemesterSandbox(
      sandboxRequest(rawLoop, reviewedSource.decisions),
    );
    const canonical = await projectUniversitySemesterLoop(loopFor(reviewedToday));

    expect(result).toMatchObject({
      schemaVersion: "university-semester-sandbox-projection.v1",
      projectionClass: "development_only_transient_semester_sandbox",
      status: "ready",
      sourceDecisionCount: 1,
      authority: {
        identityAuthority: false,
        tenantIsolationAuthority: false,
        sourceAuthenticityAuthority: false,
        institutionalCompletenessAuthority: false,
        sourceReviewAuthority: false,
        actionSelectionAuthority: false,
        recommendationAllowed: false,
        sessionStartAllowed: false,
        persistenceAllowed: false,
        evidenceClaimAllowed: false,
        messageSendAllowed: false,
        eventEmissionAllowed: false,
        externalSideEffectsAllowed: false,
      },
      semesterLoop: {
        status: "protected_study_ready",
        today: {
          status: "ready",
          action: {
            selectedBecause: "next_in_existing_learner_accepted_path",
            selectedFromCourseSourceFacts: false,
            startAllowedFromThisProjection: false,
          },
        },
        protectedStudy: {
          status: "ready",
          authority: {
            sessionStartAllowed: false,
            persistenceAllowed: false,
            evidenceClaimAllowed: false,
          },
        },
      },
      issues: [],
    });
    expect(result.projectionDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(result.semesterLoop).toEqual(canonical);
    expect(result.semesterLoop?.projectionDigest).toBe(canonical.projectionDigest);
    expect(sourceRequest(pendingToday).decisions).toEqual([]);
    expect(
      (rawLoop.recoveryRequest as UniversityRecoveryRequestV1).courses[0]!
        .reconciliationRequest,
    ).toBe(pendingToday.reconciliationRequest);
  });

  it("keeps an undecided raw source copy in explicit review_required state", async () => {
    const pendingToday = withoutSourceDecisions(
      await universityTodayFixtureRequest("ready"),
    );
    const result = await projectUniversitySemesterSandbox(
      sandboxRequest(loopFor(pendingToday), []),
    );

    expect(result).toMatchObject({
      status: "review_required",
      sourceDecisionCount: 0,
      semesterLoop: {
        status: "source_review_required",
        today: { status: "source_review_required" },
        protectedStudy: null,
        recoveryDraft: null,
      },
      issues: [],
    });
  });

  it("recomputes a fixed same-kind correction without changing the accepted-path action", async () => {
    const reviewedToday = await universityTodayFixtureRequest("ready");
    const source = sourceRequest(reviewedToday);
    const pendingToday = withoutSourceDecisions(reviewedToday);
    const accepted = await projectUniversitySemesterSandbox(
      sandboxRequest(loopFor(pendingToday), source.decisions),
    );
    const corrected = await projectUniversitySemesterSandbox(
      sandboxRequest(loopFor(pendingToday), [correctedDeadlineDecision(source)]),
    );

    expect(corrected).toMatchObject({
      status: "ready",
      semesterLoop: {
        status: "protected_study_ready",
        today: {
          status: "ready",
          source: {
            facts: [{
              factAuthority: "student_entered_correction",
              fact: {
                kind: "deadline",
                dueAt: "2026-09-13T12:30:00+05:30",
              },
            }],
          },
        },
      },
    });
    expect(corrected.semesterLoop?.today?.action).toEqual(
      accepted.semesterLoop?.today?.action,
    );
    expect(corrected.projectionDigest).not.toBe(accepted.projectionDigest);
    expect(corrected.semesterLoop?.projectionDigest).not.toBe(
      accepted.semesterLoop?.projectionDigest,
    );
  });

  it("keeps source rejection as an explicit invalid refusal rather than readiness", async () => {
    const reviewedToday = await universityTodayFixtureRequest("ready");
    const source = sourceRequest(reviewedToday);
    const pendingToday = withoutSourceDecisions(reviewedToday);
    const result = await projectUniversitySemesterSandbox(
      sandboxRequest(loopFor(pendingToday), [rejectedDeadlineDecision(source)]),
    );

    expect(result).toMatchObject({
      status: "invalid",
      sourceDecisionCount: 1,
      issues: [{ code: "semester.invalid" }],
      semesterLoop: {
        status: "invalid",
        issues: [{ code: "child.invalid", path: "recoveryRequest" }],
      },
      projectionDigest: null,
    });
  });

  it.each([
    ["no-room", "recovery_required"],
    ["tight", "learner_choice_required"],
  ] as const)("maps the canonical %s branch to %s", async (scenario, status) => {
    const today = await universityTodayFixtureRequest(scenario);
    const result = await projectUniversitySemesterSandbox(
      sandboxRequest(loopFor(today), sourceRequest(today).decisions),
    );

    expect(result.status).toBe(status);
    expect(result.semesterLoop?.status).toBe(status);
  });

  it.each([
    ["completed", "path_complete"],
    ["blocked", "path_blocked"],
  ] as const)("maps an exact %s path to %s", async (activityStatus, status) => {
    const base = await universityTodayFixtureRequest("ready");
    const today = withActivityStatus(base, activityStatus);
    const result = await projectUniversitySemesterSandbox(
      sandboxRequest(loopFor(today), sourceRequest(today).decisions),
    );

    expect(result.status).toBe(status);
    expect(result.semesterLoop?.status).toBe(status);
  });

  it("retains the canonical World-review state without granting authority", async () => {
    const today = await universityTodayFixtureRequest("ready");
    const rawLoop = loopFor(today);
    const exact = worldPack();
    const result = await projectUniversitySemesterSandbox(
      sandboxRequest({
        ...rawLoop,
        worldPack: {
          ...exact,
          manifest: {
            ...exact.manifest,
            version: "1.0.2",
          },
        },
      }, sourceRequest(today).decisions),
    );

    expect(result).toMatchObject({
      status: "world_review_required",
      semesterLoop: {
        status: "world_review_required",
        protectedStudy: {
          status: "world_mismatch",
          recovery: "review_world_binding",
        },
      },
    });
    expect(Object.values(result.authority).every((value) => value === false)).toBe(true);
  });

  it("does not repair mismatched raw Today and recovery source bindings", async () => {
    const today = await universityTodayFixtureRequest("ready");
    const recovery = recoveryFor(today);
    const source = sourceRequest(today);
    const changed: CourseSourceReconciliationRequestV1 = {
      ...source,
      sourceRevisions: source.sourceRevisions.map((revision, index) => (
        index === 0
          ? { ...revision, sourceLabel: "Different raw source copy" }
          : revision
      )),
    };
    const driftedRecovery: UniversityRecoveryRequestV1 = {
      ...recovery,
      courses: recovery.courses.map((course) => ({
        ...course,
        reconciliationRequest: changed,
      })),
    };

    const result = await projectUniversitySemesterSandbox(
      sandboxRequest(loopFor(today, driftedRecovery), source.decisions),
    );

    expect(result).toMatchObject({
      status: "invalid",
      issues: [{
        code: "source.binding_mismatch",
        path: "semesterLoopRequest.recoveryRequest.courses",
      }],
      semesterLoop: null,
      projectionDigest: null,
    });
  });

  it("rejects decisions outside the exact raw Today scope", async () => {
    const today = await universityTodayFixtureRequest("ready");
    const source = sourceRequest(today);
    const foreignDecision: CourseSourceDecisionV1 = {
      ...source.decisions[0]!,
      scope: {
        ...source.decisions[0]!.scope,
        courseId: OTHER_COURSE,
      },
    };

    const result = await projectUniversitySemesterSandbox(
      sandboxRequest(loopFor(today), [foreignDecision]),
    );

    expect(result).toMatchObject({
      status: "invalid",
      sourceDecisionCount: 1,
      issues: [{ code: "semester.invalid" }],
      semesterLoop: {
        status: "invalid",
      },
      projectionDigest: null,
    });
  });

  it.each([
    "duplicate",
    "future",
    "fact-kind-change",
  ] as const)("fails closed for a semantically invalid %s decision set", async (scenario) => {
    const today = await universityTodayFixtureRequest("ready");
    const source = sourceRequest(today);
    const accepted = source.decisions[0]!;
    const sourceDecisions: readonly unknown[] = scenario === "duplicate"
      ? [
          accepted,
          {
            ...accepted,
            decisionId: "course-source-decision.sample-today-deadline-second",
          },
        ]
      : scenario === "future"
        ? [{
            ...accepted,
            decidedAt: "2026-08-26T08:00:00.000Z",
          }]
        : [{
            ...correctedDeadlineDecision(source),
            correctedFact: {
              kind: "assessment_assistance_policy",
              assessmentRef: "assessment.sample-assignment-one",
              statementSummary: "This changes the fact kind and must be refused.",
              assertedAssistance: "unknown",
            },
          }];

    const result = await projectUniversitySemesterSandbox({
      schemaVersion: "university-semester-sandbox-request.v1",
      semesterLoopRequest: loopFor(today),
      sourceDecisions,
    });

    expect(result).toMatchObject({
      status: "invalid",
      issues: [{ code: "semester.invalid" }],
      semesterLoop: { status: "invalid" },
      projectionDigest: null,
    });
  });

  it("accepts no caller-supplied status, projection, or readiness flag", async () => {
    const today = await universityTodayFixtureRequest("ready");
    const valid = sandboxRequest(loopFor(today), sourceRequest(today).decisions);
    const result = await projectUniversitySemesterSandbox({
      ...valid,
      status: "ready",
      projection: { status: "protected_study_ready" },
      ready: true,
    });

    expect(result).toMatchObject({
      status: "invalid",
      issues: [{ code: "schema.invalid" }],
      semesterLoop: null,
      projectionDigest: null,
    });
  });

  it("does not invoke hostile accessors or proxy traps", async () => {
    const getter = vi.fn(() => "university-semester-sandbox-request.v1");
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
      projectUniversitySemesterSandbox(hostileGetter),
      projectUniversitySemesterSandbox(hostileProxy),
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

  it("rejects oversized arrays before own-key and element descriptor enumeration", async () => {
    const today = await universityTodayFixtureRequest("ready");
    const input = sandboxRequest(loopFor(today), sourceRequest(today).decisions);
    const oversized = Array.from({ length: 32_768 }, () => null);
    input.semesterLoopRequest.worldPack = oversized;
    const getOwnPropertyNames = vi.spyOn(Object, "getOwnPropertyNames");
    const getOwnPropertyDescriptor = vi.spyOn(Object, "getOwnPropertyDescriptor");

    try {
      const result = await projectUniversitySemesterSandbox(input);

      expect(result).toMatchObject({
        status: "invalid",
        projectionDigest: null,
        issues: [{ code: "schema.invalid" }],
      });
      expect(getOwnPropertyNames).not.toHaveBeenCalledWith(oversized);
      expect(getOwnPropertyDescriptor).not.toHaveBeenCalledWith(oversized, "0");
    } finally {
      getOwnPropertyNames.mockRestore();
      getOwnPropertyDescriptor.mockRestore();
    }
  });

  it("rejects exotic prototypes, cycles, excessive depth, and excessive nodes", async () => {
    const today = await universityTodayFixtureRequest("ready");
    const valid = sandboxRequest(loopFor(today), sourceRequest(today).decisions);
    const exotic = Object.assign(Object.create({ inherited: true }), valid);
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    let deep: unknown = "leaf";
    for (let index = 0; index < 28; index += 1) deep = { value: deep };
    const tooManyNodes = Array.from({ length: 33_000 }, () => 0);

    const results = await Promise.all([
      projectUniversitySemesterSandbox(exotic),
      projectUniversitySemesterSandbox({
        ...valid,
        semesterLoopRequest: {
          ...valid.semesterLoopRequest,
          worldPack: cycle,
        },
      }),
      projectUniversitySemesterSandbox({
        ...valid,
        semesterLoopRequest: {
          ...valid.semesterLoopRequest,
          worldPack: deep,
        },
      }),
      projectUniversitySemesterSandbox({
        ...valid,
        semesterLoopRequest: {
          ...valid.semesterLoopRequest,
          worldPack: tooManyNodes,
        },
      }),
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
    try {
      const reviewedToday = await universityTodayFixtureRequest("ready");
      const pendingToday = withoutSourceDecisions(reviewedToday);
      const input = sandboxRequest(
        loopFor(pendingToday),
        sourceRequest(reviewedToday).decisions,
      );
      const first = await projectUniversitySemesterSandbox(input);
      const second = await projectUniversitySemesterSandbox(input);

      expect(first).toEqual(second);
      expect(first.projectionDigest).toBe(second.projectionDigest);
      expect(Object.isFrozen(first)).toBe(true);
      expect(Object.isFrozen(first.authority)).toBe(true);
      expect(Object.isFrozen(first.semesterLoop)).toBe(true);
      expect(Object.isFrozen(first.semesterLoop?.today)).toBe(true);
      expect(Object.isFrozen(first.semesterLoop?.today?.action?.activity.worldRef)).toBe(true);
      expect(Object.isFrozen(first.semesterLoop?.protectedStudy)).toBe(true);
      expect(
        Object.isFrozen(
          first.semesterLoop?.protectedStudy?.learningContract?.proof.successCriteria,
        ),
      ).toBe(true);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
