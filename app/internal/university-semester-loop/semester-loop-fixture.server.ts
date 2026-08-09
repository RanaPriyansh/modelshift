import "server-only";

import type { ActivityStateV1 } from "@/src/forge/continuity";
import type { UniversityRecoveryRequestV1 } from "@/src/forge/university-recovery";
import {
  projectUniversitySemesterLoop,
  type UniversitySemesterLoopProjectionV1,
  type UniversitySemesterLoopRequestV1,
} from "@/src/forge/university-semester-loop";
import type { UniversityTodayRequestV1 } from "@/src/forge/university-today";
import { SOURCE_CORROBORATION_WORLD } from "@/src/forge/worlds";

import { universityTodayFixtureRequest } from "../university-today/today-fixture.server";

export type UniversitySemesterLoopFixtureId =
  | "ready"
  | "source-review"
  | "capacity-break"
  | "tight-window"
  | "world-changed"
  | "path-complete"
  | "path-blocked";

function exactActivityState(todayRequest: UniversityTodayRequestV1): ActivityStateV1 {
  const state = todayRequest.activityStates[0] as ActivityStateV1 | undefined;
  if (!state || todayRequest.activityStates.length !== 1) {
    throw new Error(
      "The internal semester-loop fixture requires one exact Today activity state.",
    );
  }
  return state;
}

function withActivityStatus(
  todayRequest: UniversityTodayRequestV1,
  status: "completed" | "blocked",
): UniversityTodayRequestV1 {
  const state = exactActivityState(todayRequest);
  return {
    ...todayRequest,
    activityStates: [{
      ...state,
      stateVersion: state.stateVersion + 1,
      status,
      updatedAt: todayRequest.context.asOf,
    }],
  };
}

function recoveryRequestFor(
  todayRequest: UniversityTodayRequestV1,
  deadlineCandidateId: string,
): UniversityRecoveryRequestV1 {
  const { context } = todayRequest;
  const matchingDeadline = (
    todayRequest.reconciliationRequest as {
      candidates?: readonly {
        candidateId?: string;
        fact?: { kind?: string };
      }[];
    }
  ).candidates?.find((candidate) => (
    candidate.candidateId === deadlineCandidateId
    && candidate.fact?.kind === "deadline"
  ));

  if (!matchingDeadline) {
    throw new Error(
      "The internal semester-loop fixture requires the exact Today copied deadline.",
    );
  }

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
      endsAt: "2026-09-13T09:00:00.000Z",
      availableMinutes: context.studyWindow.availableMinutes,
      bufferMinutes: Math.min(5, context.studyWindow.availableMinutes),
      declaredBy: "learner_fixture",
    },
    courses: [{
      courseId: context.scope.courseId,
      courseLabel: context.courseLabel,
      reconciliationRequest: todayRequest.reconciliationRequest,
    }],
    items: [{
      schemaVersion: "university-recovery-item.v1",
      itemId: "recovery-item.sample-semester-loop-assignment-one",
      courseId: context.scope.courseId,
      deadlineCandidateId,
      learnerDisposition: "required",
      learningEssential: {
        value: true,
        declaredBy: "learner_fixture",
      },
      effort: {
        minutesLow: context.effortEstimate.minutesLow,
        minutesHigh: context.effortEstimate.minutesHigh,
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

export async function universitySemesterLoopFixtureRequest(
  scenario: UniversitySemesterLoopFixtureId,
): Promise<UniversitySemesterLoopRequestV1> {
  const todayScenario = scenario === "source-review"
    ? "source-review"
    : scenario === "capacity-break"
      ? "no-room"
      : scenario === "tight-window"
        ? "tight"
        : "ready";
  const baseTodayRequest = await universityTodayFixtureRequest(todayScenario);
  const todayRequest = scenario === "path-complete"
    ? withActivityStatus(baseTodayRequest, "completed")
    : scenario === "path-blocked"
      ? withActivityStatus(baseTodayRequest, "blocked")
      : baseTodayRequest;
  const deadlineCandidateId = scenario === "source-review"
    ? "course-source-candidate.sample-syllabus-deadline"
    : "course-source-candidate.sample-today-deadline";
  const worldPack = scenario === "world-changed"
    ? {
        ...SOURCE_CORROBORATION_WORLD,
        manifest: {
          ...SOURCE_CORROBORATION_WORLD.manifest,
          version: "1.0.2",
        },
      }
    : SOURCE_CORROBORATION_WORLD;

  return {
    schemaVersion: "university-semester-loop-request.v1",
    todayRequest,
    recoveryRequest: recoveryRequestFor(todayRequest, deadlineCandidateId),
    worldPack,
  };
}

export type UniversitySemesterLoopFixtureScenario = Readonly<{
  id: UniversitySemesterLoopFixtureId;
  label: string;
  projection: Readonly<UniversitySemesterLoopProjectionV1>;
}>;

export async function universitySemesterLoopFixtureScenarios(): Promise<
  readonly UniversitySemesterLoopFixtureScenario[]
> {
  const [
    ready,
    sourceReview,
    capacityBreak,
    tightWindow,
    worldChanged,
    pathComplete,
    pathBlocked,
  ] = await Promise.all([
    projectUniversitySemesterLoop(
      await universitySemesterLoopFixtureRequest("ready"),
    ),
    projectUniversitySemesterLoop(
      await universitySemesterLoopFixtureRequest("source-review"),
    ),
    projectUniversitySemesterLoop(
      await universitySemesterLoopFixtureRequest("capacity-break"),
    ),
    projectUniversitySemesterLoop(
      await universitySemesterLoopFixtureRequest("tight-window"),
    ),
    projectUniversitySemesterLoop(
      await universitySemesterLoopFixtureRequest("world-changed"),
    ),
    projectUniversitySemesterLoop(
      await universitySemesterLoopFixtureRequest("path-complete"),
    ),
    projectUniversitySemesterLoop(
      await universitySemesterLoopFixtureRequest("path-blocked"),
    ),
  ]);

  return Object.freeze([
    Object.freeze({ id: "ready", label: "Ready", projection: ready }),
    Object.freeze({
      id: "source-review",
      label: "Source review",
      projection: sourceReview,
    }),
    Object.freeze({
      id: "capacity-break",
      label: "Capacity break",
      projection: capacityBreak,
    }),
    Object.freeze({
      id: "tight-window",
      label: "Tight window",
      projection: tightWindow,
    }),
    Object.freeze({
      id: "world-changed",
      label: "World changed",
      projection: worldChanged,
    }),
    Object.freeze({
      id: "path-complete",
      label: "Path complete",
      projection: pathComplete,
    }),
    Object.freeze({
      id: "path-blocked",
      label: "Path blocked",
      projection: pathBlocked,
    }),
  ]);
}
