import "server-only";

import {
  createLearningPathRevision,
  type ActivityStateV1,
} from "@/src/forge/continuity";
import {
  parseCourseSourceReconciliationRequest,
  type CourseSourceReconciliationRequestV1,
} from "@/src/forge/course-sources";
import {
  projectUniversityToday,
  type UniversityTodayProjectionV1,
  type UniversityTodayRequestV1,
} from "@/src/forge/university-today";

import { reviewedUniversitySourceRequest } from "../university-source-review/review-fixture.server";

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

function reviewedSources(): Readonly<CourseSourceReconciliationRequestV1> {
  return parseCourseSourceReconciliationRequest({
    schemaVersion: "course-source-reconciliation.v1",
    scope: SCOPE,
    asOf: "2026-08-25T09:00:00.000Z",
    sourceRevisions: [{
      schemaVersion: "course-source-revision.v1",
      revisionId: "course-source-revision.sample-today-syllabus",
      scope: SCOPE,
      inputKind: "manual",
      sourceLabel: "Reviewed syllabus copy",
      sourceDigest: `sha256:${"c".repeat(64)}`,
      observedAt: "2026-08-20T09:00:00.000Z",
      freshnessReviewDueAt: "2026-09-20T09:00:00.000Z",
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
      candidateId: "course-source-candidate.sample-today-deadline",
      scope: SCOPE,
      sourceRevisionId: "course-source-revision.sample-today-syllabus",
      claimKey: "course-claim.sample-today-assignment-deadline",
      locator: { kind: "manual_field", fieldKey: "assignment_one_deadline" },
      extractedBy: "learner_manual",
      fact: {
        kind: "deadline",
        title: "Assignment one",
        dueAt: "2026-09-12T12:30:00+05:30",
        timeZone: "Asia/Kolkata",
        consequenceClass: "consequential",
      },
      createdAt: "2026-08-20T09:05:00.000Z",
    }],
    decisions: [{
      schemaVersion: "course-source-decision.v1",
      decisionId: "course-source-decision.sample-today-deadline-accept",
      candidateId: "course-source-candidate.sample-today-deadline",
      scope: SCOPE,
      actor: "learner",
      kind: "accept",
      extractionMatch: "learner_confirmed",
      decidedAt: "2026-08-25T08:00:00.000Z",
    }],
  });
}

async function pathRevision() {
  return createLearningPathRevision({
    schemaVersion: "learning-path-revision.v1",
    pathId: "path.sample-today-source-corroboration",
    revisionId: "path-revision.sample-today-source-corroboration-accepted",
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
      nodeId: "path-node.sample-today-source-corroboration",
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
    sourcePlanDigest: `sha256:${"d".repeat(64)}`,
    executionAllowed: true,
    acceptanceDecisionId: "path-decision.sample-today-source-corroboration-accept",
    supersedesRevisionId: "path-revision.sample-today-source-corroboration-candidate",
    createdAt: "2026-08-20T09:00:00.000Z",
  });
}

function activityState(): ActivityStateV1 {
  return {
    schemaVersion: "activity-state.v1",
    pathId: "path.sample-today-source-corroboration",
    pathRevisionId: "path-revision.sample-today-source-corroboration-accepted",
    nodeId: "path-node.sample-today-source-corroboration",
    stateVersion: 1,
    status: "ready",
    updatedAt: "2026-08-25T08:30:00.000Z",
  };
}

async function request(
  availableMinutes: number,
  sources: Readonly<CourseSourceReconciliationRequestV1> = reviewedSources(),
): Promise<UniversityTodayRequestV1> {
  return {
    schemaVersion: "university-today-request.v1",
    context: {
      schemaVersion: "university-term-context.v1",
      goalRef: GOAL_REF,
      scope: SCOPE,
      asOf: "2026-08-25T09:00:00.000Z",
      termLabel: "Autumn 2026",
      courseLabel: "CS102: Evidence and computation",
      timeZone: "Asia/Kolkata",
      studyWindow: {
        startsAt: "2026-08-25T08:30:00.000Z",
        endsAt: "2026-08-25T10:30:00.000Z",
        availableMinutes,
        energy: availableMinutes < 30 ? "low" : "steady",
        declaredBy: "learner_fixture",
      },
      effortEstimate: {
        pathId: "path.sample-today-source-corroboration",
        pathRevisionId: "path-revision.sample-today-source-corroboration-accepted",
        nodeId: "path-node.sample-today-source-corroboration",
        minutesLow: 30,
        minutesHigh: 45,
        basis: "fixture_authored",
      },
    },
    reconciliationRequest: sources,
    pathRevision: await pathRevision(),
    activityStates: [activityState()],
  };
}

export type UniversityTodayFixtureScenario = Readonly<{
  id: "ready" | "source-review" | "tight" | "no-room";
  label: string;
  projection: Readonly<UniversityTodayProjectionV1>;
}>;

export async function universityTodayFixtureRequest(
  scenario: UniversityTodayFixtureScenario["id"],
): Promise<UniversityTodayRequestV1> {
  switch (scenario) {
    case "ready":
      return request(60);
    case "source-review":
      return request(60, await reviewedUniversitySourceRequest());
    case "tight":
      return request(35);
    case "no-room":
      return request(20);
  }
}

export async function universityTodayFixtureScenarios(): Promise<readonly UniversityTodayFixtureScenario[]> {
  const scenarios = await Promise.all([
    projectUniversityToday(await universityTodayFixtureRequest("ready")),
    projectUniversityToday(await universityTodayFixtureRequest("source-review")),
    projectUniversityToday(await universityTodayFixtureRequest("tight")),
    projectUniversityToday(await universityTodayFixtureRequest("no-room")),
  ]);
  return Object.freeze([
    Object.freeze({ id: "ready", label: "Ready", projection: scenarios[0]! }),
    Object.freeze({ id: "source-review", label: "Source conflict", projection: scenarios[1]! }),
    Object.freeze({ id: "tight", label: "Tight window", projection: scenarios[2]! }),
    Object.freeze({ id: "no-room", label: "No room", projection: scenarios[3]! }),
  ]);
}
