import { describe, expect, it, vi } from "vitest";

import {
  createLearningPathRevision,
  type ActivityStateV1,
  type LearningPathRevisionV1,
} from "../continuity";
import {
  parseCourseSourceReconciliationRequest,
  type CourseSourceReconciliationRequestV1,
} from "../course-sources";
import {
  projectUniversityToday,
  type UniversityTodayRequestV1,
} from ".";

const SCOPE = Object.freeze({
  ownerUserId: "11111111-1111-4111-8111-111111111111",
  tenantId: "22222222-2222-4222-8222-222222222222",
  termId: "term.sample-autumn-2026",
  courseId: "course.sample-cs102",
});
const GOAL_REF = Object.freeze({
  schemaVersion: "learner-goal.v1" as const,
  goalId: "goal.sample-source-corroboration",
  storageClass: "learner-owned-device-local" as const,
});
const WORLD_REF = Object.freeze({
  worldId: "world.source-corroboration",
  worldVersion: "1.0.1",
  worldRoute: "/learn/ai-and-learning",
  activityProtocol: "activity" as const,
  sourceIds: [
    "source.bastani-pnas.genai-learning-2025",
    "source.tutor-copilot.arxiv-2024",
  ],
});

function readySources(): Readonly<CourseSourceReconciliationRequestV1> {
  return parseCourseSourceReconciliationRequest({
    schemaVersion: "course-source-reconciliation.v1",
    scope: SCOPE,
    asOf: "2026-08-25T09:00:00.000Z",
    sourceRevisions: [{
      schemaVersion: "course-source-revision.v1",
      revisionId: "course-source-revision.sample-syllabus",
      scope: SCOPE,
      inputKind: "manual",
      sourceLabel: "Copied syllabus",
      sourceDigest: `sha256:${"a".repeat(64)}`,
      observedAt: "2026-08-01T09:00:00.000Z",
      freshnessReviewDueAt: "2026-09-01T09:00:00.000Z",
      coverage: {
        status: "declared_complete_for_source",
        window: {
          startsAt: "2026-08-01T00:00:00.000Z",
          endsAt: "2026-12-31T23:59:59.000Z",
        },
        inspectedScopes: ["course_commitments", "deadlines", "assessment_policies"],
        unknownOrOmittedScopes: [],
      },
      privacy: {
        visibility: "private_to_owner",
        retentionClass: "derived_fields_only",
        originalBytesRetained: false,
        redistributionAllowed: false,
      },
    }],
    candidates: [{
      schemaVersion: "course-source-candidate.v1",
      candidateId: "course-source-candidate.sample-deadline",
      scope: SCOPE,
      sourceRevisionId: "course-source-revision.sample-syllabus",
      claimKey: "course-claim.sample-assignment-one-deadline",
      locator: { kind: "manual_field", fieldKey: "assignment_one_deadline" },
      extractedBy: "learner_manual",
      fact: {
        kind: "deadline",
        title: "Assignment one",
        dueAt: "2026-09-12T12:30:00+05:30",
        timeZone: "Asia/Kolkata",
        consequenceClass: "consequential",
      },
      createdAt: "2026-08-01T09:05:00.000Z",
    }],
    decisions: [{
      schemaVersion: "course-source-decision.v1",
      decisionId: "course-source-decision.sample-deadline-accept",
      candidateId: "course-source-candidate.sample-deadline",
      scope: SCOPE,
      actor: "learner",
      kind: "accept",
      extractionMatch: "learner_confirmed",
      decidedAt: "2026-08-25T08:00:00.000Z",
    }],
  });
}

async function acceptedPath(): Promise<Readonly<LearningPathRevisionV1>> {
  return createLearningPathRevision({
    schemaVersion: "learning-path-revision.v1",
    pathId: "path.sample-source-corroboration",
    revisionId: "path-revision.sample-source-corroboration-accepted",
    revisionNumber: 2,
    goalRef: { goalId: GOAL_REF.goalId },
    planKind: "grounded_learning",
    status: "accepted",
    title: "Check a claim against its sources",
    authority: {
      kind: "reviewed_world",
      executionEligible: true,
      reviewStatus: "reviewed",
      worldRef: WORLD_REF,
    },
    nodes: [{
      nodeId: "path-node.sample-source-corroboration",
      position: 0,
      title: "Test one claim against two sources",
      objective: "Separate what the evidence supports from what remains uncertain.",
      prerequisiteNodeIds: [],
      authority: {
        kind: "reviewed_world",
        executionEligible: true,
        reviewStatus: "reviewed",
        worldRef: WORLD_REF,
      },
      activity: {
        activityId: "activity.source-corroboration",
        kind: "reviewed_world_activity",
        runnable: true,
        worldRef: WORLD_REF,
      },
    }],
    sourcePlanDigest: `sha256:${"b".repeat(64)}`,
    executionAllowed: true,
    acceptanceDecisionId: "path-decision.sample-source-corroboration-accept",
    supersedesRevisionId: "path-revision.sample-source-corroboration-candidate",
    createdAt: "2026-08-20T09:00:00.000Z",
  });
}

function activityState(status: ActivityStateV1["status"] = "ready"): ActivityStateV1 {
  return {
    schemaVersion: "activity-state.v1",
    pathId: "path.sample-source-corroboration",
    pathRevisionId: "path-revision.sample-source-corroboration-accepted",
    nodeId: "path-node.sample-source-corroboration",
    stateVersion: 1,
    status,
    updatedAt: "2026-08-25T08:30:00.000Z",
  };
}

async function request(
  changes: Partial<UniversityTodayRequestV1["context"]> = {},
): Promise<UniversityTodayRequestV1> {
  return {
    schemaVersion: "university-today-request.v1",
    context: {
      schemaVersion: "university-term-context.v1",
      goalRef: GOAL_REF,
      scope: SCOPE,
      asOf: "2026-08-25T09:00:00.000Z",
      termLabel: "Autumn 2026",
      courseLabel: "CS102 · Evidence and computation",
      timeZone: "Asia/Kolkata",
      studyWindow: {
        startsAt: "2026-08-25T08:30:00.000Z",
        endsAt: "2026-08-25T10:30:00.000Z",
        availableMinutes: 60,
        energy: "steady",
        declaredBy: "learner_fixture",
      },
      effortEstimate: {
        pathId: "path.sample-source-corroboration",
        pathRevisionId: "path-revision.sample-source-corroboration-accepted",
        nodeId: "path-node.sample-source-corroboration",
        minutesLow: 30,
        minutesHigh: 45,
        basis: "fixture_authored",
      },
      ...changes,
    },
    reconciliationRequest: readySources(),
    pathRevision: await acceptedPath(),
    activityStates: [activityState()],
  };
}

function nullPrototypeClone(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(nullPrototypeClone);
  if (value === null || typeof value !== "object") return value;
  const clone = Object.create(null) as Record<string, unknown>;
  for (const key of Object.keys(value)) {
    clone[key] = nullPrototypeClone((value as Record<string, unknown>)[key]);
  }
  return clone;
}

describe("projectUniversityToday", () => {
  it("projects one exact accepted-path action when reviewed copies and declared capacity fit", async () => {
    const projection = await projectUniversityToday(await request());

    expect(projection.status).toBe("ready");
    expect(projection.action).toMatchObject({
      pathId: "path.sample-source-corroboration",
      nodeId: "path-node.sample-source-corroboration",
      title: "Test one claim against two sources",
      selectedBecause: "next_in_existing_learner_accepted_path",
      selectedFromCourseSourceFacts: false,
      startAllowedFromThisProjection: false,
    });
    expect(projection.source).toMatchObject({
      reconciliationStatus: "connected_sources_reviewed",
      sourceAuthenticity: "not_established",
      institutionalCompleteness: "not_established",
      reviewedContextFactCount: 1,
    });
    expect(projection.capacity?.state).toBe("fits_declared_window");
    expect(projection.authority).toMatchObject({
      sourceRecommendationAllowed: false,
      pathActivationAllowed: false,
      sessionStartAllowed: false,
      persistenceAllowed: false,
      eventEmissionAllowed: false,
      externalSideEffectsAllowed: false,
    });
    expect(projection.projectionDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("withholds the learning action when connected copies still need review", async () => {
    const input = await request();
    const sources = readySources();
    input.reconciliationRequest = { ...sources, decisions: [] };

    const projection = await projectUniversityToday(input);

    expect(projection.status).toBe("source_review_required");
    expect(projection.action).toBeNull();
    expect(projection.recovery).toBe("review_connected_source_copies");
    expect(projection.source?.reconciliationStatus).toBe("review_required");
  });

  it.each([
    { availableMinutes: 20, status: "capacity_conflict", state: "insufficient_declared_window" },
    { availableMinutes: 35, status: "learner_choice_required", state: "tight_declared_window" },
  ] as const)("does not pretend a $state task fits", async ({ availableMinutes, status, state }) => {
    const input = await request({
      studyWindow: {
        startsAt: "2026-08-25T08:30:00.000Z",
        endsAt: "2026-08-25T10:30:00.000Z",
        availableMinutes,
        energy: "low",
        declaredBy: "learner_fixture",
      },
    });
    const projection = await projectUniversityToday(input);

    expect(projection.status).toBe(status);
    expect(projection.capacity?.state).toBe(state);
    expect(projection.recovery).toBe("learner_replan_required");
    expect(projection.action?.startAllowedFromThisProjection).toBe(false);
  });

  it("does not fabricate an action for a completed or blocked accepted path", async () => {
    const completedInput = await request();
    completedInput.activityStates = [activityState("completed")];
    const blockedInput = await request();
    blockedInput.activityStates = [activityState("blocked")];

    const [completed, blocked] = await Promise.all([
      projectUniversityToday(completedInput),
      projectUniversityToday(blockedInput),
    ]);

    expect(completed).toMatchObject({ status: "complete", action: null, recovery: "accepted_path_complete" });
    expect(blocked).toMatchObject({ status: "blocked", action: null, recovery: "repair_or_replace_accepted_path" });
  });

  it("blocks a candidate unreviewed path instead of promoting it", async () => {
    const input = await request({
      effortEstimate: {
        pathId: "path.sample-unreviewed",
        pathRevisionId: "path-revision.sample-unreviewed",
        nodeId: "path-node.sample-unreviewed",
        minutesLow: 30,
        minutesHigh: 45,
        basis: "fixture_authored",
      },
    });
    input.pathRevision = await createLearningPathRevision({
      schemaVersion: "learning-path-revision.v1",
      pathId: "path.sample-unreviewed",
      revisionId: "path-revision.sample-unreviewed",
      revisionNumber: 1,
      goalRef: { goalId: GOAL_REF.goalId },
      planKind: "exploratory_source_plan",
      status: "candidate",
      title: "Unreviewed source-discovery candidate",
      authority: {
        kind: "candidate_unverified",
        executionEligible: false,
        sourceMode: "curated",
        limitationCodes: ["no_reviewed_world"],
      },
      nodes: [{
        nodeId: "path-node.sample-unreviewed",
        position: 0,
        title: "Find a reviewed activity",
        objective: "Locate a reviewed World before execution.",
        prerequisiteNodeIds: [],
        authority: {
          kind: "identified_gap",
          executionEligible: false,
          reasonCode: "no_reviewed_world",
          limitationCodes: ["no_reviewed_world"],
        },
        activity: {
          activityId: "activity.sample-source-discovery",
          kind: "source_discovery_candidate",
          runnable: false,
          discoveryStepId: "find_reviewed_world",
          exitGate: "An exact reviewed World reference is required.",
        },
      }],
      sourcePlanDigest: `sha256:${"e".repeat(64)}`,
      executionAllowed: false,
      acceptanceDecisionId: null,
      supersedesRevisionId: null,
      createdAt: "2026-08-20T09:00:00.000Z",
    });
    input.activityStates = [{
      schemaVersion: "activity-state.v1",
      pathId: "path.sample-unreviewed",
      pathRevisionId: "path-revision.sample-unreviewed",
      nodeId: "path-node.sample-unreviewed",
      stateVersion: 1,
      status: "ready",
      updatedAt: "2026-08-25T08:30:00.000Z",
    }];

    const projection = await projectUniversityToday(input);

    expect(projection).toMatchObject({
      status: "blocked",
      action: null,
      recovery: "repair_or_replace_accepted_path",
      pathState: { kind: "blocked", reason: "path_not_accepted" },
    });
  });

  it("rejects a tampered immutable path digest", async () => {
    const input = await request();
    input.pathRevision = {
      ...(input.pathRevision as LearningPathRevisionV1),
      revisionDigest: `sha256:${"f".repeat(64)}`,
    };

    const projection = await projectUniversityToday(input);

    expect(projection.status).toBe("invalid");
    expect(projection.action).toBeNull();
    expect(projection.issues.map((issue) => issue.code)).toContain("path.integrity_invalid");
  });

  it("cannot change the accepted-path action by changing a reviewed deadline", async () => {
    const firstInput = await request();
    const secondInput = await request();
    const sources = readySources();
    const deadline = sources.candidates[0]!;
    secondInput.reconciliationRequest = parseCourseSourceReconciliationRequest({
      ...sources,
      candidates: [{
        ...deadline,
        fact: {
          ...deadline.fact,
          dueAt: "2026-09-18T12:30:00+05:30",
        },
      }],
    });

    const [first, second] = await Promise.all([
      projectUniversityToday(firstInput),
      projectUniversityToday(secondInput),
    ]);

    expect(first.status).toBe("ready");
    expect(second.status).toBe("ready");
    expect(second.action).toEqual(first.action);
    expect(second.source?.facts).not.toEqual(first.source?.facts);
    expect(second.projectionDigest).not.toBe(first.projectionDigest);
  });

  it.each([
    ["cross-goal", async () => request({ goalRef: { ...GOAL_REF, goalId: "goal.sample-other" } }), "path.goal_mismatch"],
    ["cross-scope", async () => request({ scope: { ...SCOPE, courseId: "course.sample-other" } }), "source.scope_mismatch"],
    ["cross-path effort", async () => request({
      effortEstimate: {
        pathId: "path.sample-other",
        pathRevisionId: "path-revision.sample-source-corroboration-accepted",
        nodeId: "path-node.sample-source-corroboration",
        minutesLow: 30,
        minutesHigh: 45,
        basis: "fixture_authored",
      },
    }), "effort.path_mismatch"],
  ] as const)("fails closed for %s input", async (_label, build, issueCode) => {
    const projection = await projectUniversityToday(await build());
    expect(projection.status).toBe("invalid");
    expect(projection.action).toBeNull();
    expect(projection.projectionDigest).toBeNull();
    expect(projection.issues.map((issue) => issue.code)).toContain(issueCode);
  });

  it("is deterministic and deeply immutable", async () => {
    const input = await request();
    const first = await projectUniversityToday(input);
    const second = await projectUniversityToday(input);

    expect(second).toEqual(first);
    expect(second.projectionDigest).toBe(first.projectionDigest);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.authority)).toBe(true);
    expect(Object.isFrozen(first.source?.facts)).toBe(true);
    expect(() => {
      (first.authority as { persistenceAllowed: boolean }).persistenceAllowed = true;
    }).toThrow();
  });

  it("accepts a valid internally detached null-prototype request", async () => {
    const detached = nullPrototypeClone(await request());

    expect(Object.getPrototypeOf(detached)).toBe(null);
    const projection = await projectUniversityToday(detached);

    expect(projection).toMatchObject({
      status: "ready",
      action: {
        nodeId: "path-node.sample-source-corroboration",
        startAllowedFromThisProjection: false,
      },
    });
    expect(projection.projectionDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("totally classifies malformed and hostile inputs without network or storage effects", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    let getterCalls = 0;
    const hostile = {};
    Object.defineProperty(hostile, "schemaVersion", {
      enumerable: true,
      get: () => {
        getterCalls += 1;
        throw new Error("must fail closed");
      },
    });
    let proxyTrapCalls = 0;
    const hostileProxy = new Proxy({}, {
      ownKeys: () => {
        proxyTrapCalls += 1;
        throw new Error("must fail closed");
      },
    });

    await expect(projectUniversityToday(hostile)).resolves.toMatchObject({
      status: "invalid",
      action: null,
      projectionDigest: null,
    });
    await expect(projectUniversityToday(hostileProxy)).resolves.toMatchObject({
      status: "invalid",
      action: null,
      projectionDigest: null,
    });
    expect(getterCalls).toBe(0);
    expect(proxyTrapCalls).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
