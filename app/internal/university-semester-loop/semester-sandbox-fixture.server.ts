import "server-only";

import {
  courseSourceReconciliationRequestSchema,
  type CourseSourceCandidateV1,
  type CourseSourceDecisionV1,
  type CourseSourceReconciliationRequestV1,
} from "@/src/forge/course-sources";
import { deepFreeze } from "@/src/forge/deep-freeze";
import {
  projectUniversitySemesterSandbox,
  type UniversitySemesterSandboxStatus,
} from "@/src/forge/university-semester-sandbox";
import {
  universityRecoveryRequestSchema,
  type UniversityRecoveryRequestV1,
} from "@/src/forge/university-recovery";
import type {
  UniversitySemesterLoopProjectionStatus,
  UniversitySemesterLoopRequestV1,
} from "@/src/forge/university-semester-loop";
import {
  universityTodayRequestSchema,
  type UniversityTodayRequestV1,
} from "@/src/forge/university-today";

import { universitySemesterLoopFixtureRequest } from "./semester-loop-fixture.server";

export const UNIVERSITY_SEMESTER_SANDBOX_FIXTURE_SCHEMA_VERSION =
  "university-semester-sandbox-fixture.v1" as const;

export type UniversitySemesterSandboxChoiceId =
  | "pending"
  | "accept"
  | "fixed_correct"
  | "reject";

export interface UniversitySemesterSandboxClientProjection {
  readonly status: UniversitySemesterSandboxStatus;
  readonly loopStatus: UniversitySemesterLoopProjectionStatus | null;
  readonly action: Readonly<{
    title: string;
    objective: string;
  }> | null;
  readonly projectionDigest: string | null;
}

export interface UniversitySemesterSandboxFixtureScenario {
  readonly id: UniversitySemesterSandboxChoiceId;
  readonly label: string;
  readonly description: string;
  readonly projection: Readonly<UniversitySemesterSandboxClientProjection>;
}

export interface UniversitySemesterSandboxFixture {
  readonly schemaVersion: typeof UNIVERSITY_SEMESTER_SANDBOX_FIXTURE_SCHEMA_VERSION;
  readonly termLabel: string;
  readonly courseLabel: string;
  readonly sourceLabel: string;
  readonly copiedDeadline: Readonly<{
    title: string;
    dueAt: string;
    timeZone: string;
  }>;
  readonly fixedCorrection: Readonly<{
    dueAt: string;
    timeZone: string;
  }>;
  readonly scenarios: readonly Readonly<UniversitySemesterSandboxFixtureScenario>[];
}

type DeadlineCandidate = Omit<CourseSourceCandidateV1, "fact"> & {
  readonly fact: Extract<CourseSourceCandidateV1["fact"], { kind: "deadline" }>;
};

type DeadlineCorrection = Extract<CourseSourceDecisionV1, { kind: "correct" }> & {
  readonly correctedFact: Extract<
    CourseSourceCandidateV1["fact"],
    { kind: "deadline" }
  >;
};

function deadlineCandidate(
  source: CourseSourceReconciliationRequestV1,
): DeadlineCandidate {
  const candidates = source.candidates.filter(
    (candidate) => candidate.fact.kind === "deadline",
  );
  if (candidates.length !== 1) {
    throw new Error(
      "The semester sandbox requires one exact copied deadline candidate.",
    );
  }
  return candidates[0] as DeadlineCandidate;
}

function pendingLoop(
  loop: UniversitySemesterLoopRequestV1,
): {
  readonly loop: UniversitySemesterLoopRequestV1;
  readonly today: UniversityTodayRequestV1;
  readonly source: CourseSourceReconciliationRequestV1;
} {
  const today = universityTodayRequestSchema.parse(
    loop.todayRequest,
  ) as UniversityTodayRequestV1;
  const recovery = universityRecoveryRequestSchema.parse(
    loop.recoveryRequest,
  ) as UniversityRecoveryRequestV1;
  const source = courseSourceReconciliationRequestSchema.parse(
    today.reconciliationRequest,
  );
  const matchingCourseIndexes = recovery.courses.flatMap((course, index) => (
    course.courseId === today.context.scope.courseId ? [index] : []
  ));
  if (matchingCourseIndexes.length !== 1) {
    throw new Error(
      "The semester sandbox requires one exact matching Recovery course.",
    );
  }

  const pendingSource: CourseSourceReconciliationRequestV1 = {
    ...source,
    decisions: [],
  };
  const pendingToday: UniversityTodayRequestV1 = {
    ...today,
    reconciliationRequest: pendingSource,
  };
  const pendingRecovery: UniversityRecoveryRequestV1 = {
    ...recovery,
    courses: recovery.courses.map((course, index) => (
      index === matchingCourseIndexes[0]
        ? { ...course, reconciliationRequest: pendingSource }
        : course
    )),
  };

  return {
    loop: {
      ...loop,
      todayRequest: pendingToday,
      recoveryRequest: pendingRecovery,
    },
    today: pendingToday,
    source,
  };
}

function fixedCorrection(
  source: CourseSourceReconciliationRequestV1,
  candidate: DeadlineCandidate,
): DeadlineCorrection {
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

function rejection(
  accepted: CourseSourceDecisionV1,
): Extract<CourseSourceDecisionV1, { kind: "reject" }> {
  return {
    schemaVersion: "course-source-decision.v1",
    decisionId: "course-source-decision.sample-today-deadline-reject",
    candidateId: accepted.candidateId,
    scope: accepted.scope,
    actor: "learner",
    kind: "reject",
    extractionMatch: "learner_rejected",
    rejectionReasonCode: "learner_fixture_not_current",
    decidedAt: "2026-08-25T08:00:00.000Z",
  };
}

export async function universitySemesterSandboxFixture(): Promise<
  Readonly<UniversitySemesterSandboxFixture>
> {
  const readyLoop = await universitySemesterLoopFixtureRequest("ready");
  const pending = pendingLoop(readyLoop);
  const accepted = pending.source.decisions[0];
  if (
    pending.source.decisions.length !== 1
    || !accepted
    || accepted.kind !== "accept"
    || accepted.decisionId
      !== "course-source-decision.sample-today-deadline-accept"
    || accepted.decidedAt !== "2026-08-25T08:00:00.000Z"
  ) {
    throw new Error(
      "The semester sandbox retained accept decision identity changed.",
    );
  }
  const candidate = deadlineCandidate(pending.source);
  const corrected = fixedCorrection(pending.source, candidate);
  const rejected = rejection(accepted);

  const scenarioInputs = [
    {
      id: "pending",
      label: "Not reviewed",
      description: "Keep this copy outside the semester loop.",
      decisions: [],
    },
    {
      id: "accept",
      label: "Copy matches",
      description: "Confirm transcription only—not university authority.",
      decisions: [accepted],
    },
    {
      id: "fixed_correct",
      label: "Use sample correction",
      description: "Use the fixed server-authored sample correction.",
      decisions: [corrected],
    },
    {
      id: "reject",
      label: "Copy is not current",
      description: "Refuse this copy and require a replacement source.",
      decisions: [rejected],
    },
  ] as const;

  const projections = await Promise.all(scenarioInputs.map((scenario) => (
    projectUniversitySemesterSandbox({
      schemaVersion: "university-semester-sandbox-request.v1",
      semesterLoopRequest: pending.loop,
      sourceDecisions: scenario.decisions,
    })
  )));
  const expectedStatuses = [
    "review_required",
    "ready",
    "ready",
    "invalid",
  ] as const;
  projections.forEach((projection, index) => {
    if (projection.status !== expectedStatuses[index]) {
      throw new Error(
        `The semester sandbox ${scenarioInputs[index]!.id} scenario failed closed unexpectedly.`,
      );
    }
  });

  const sourceRevision = pending.source.sourceRevisions.find(
    (revision) => revision.revisionId === candidate.sourceRevisionId,
  );
  if (!sourceRevision) {
    throw new Error(
      "The semester sandbox copied deadline source revision is missing.",
    );
  }

  return deepFreeze({
    schemaVersion: UNIVERSITY_SEMESTER_SANDBOX_FIXTURE_SCHEMA_VERSION,
    termLabel: pending.today.context.termLabel,
    courseLabel: pending.today.context.courseLabel,
    sourceLabel: "Sample syllabus copy",
    copiedDeadline: {
      title: candidate.fact.title,
      dueAt: candidate.fact.dueAt,
      timeZone: candidate.fact.timeZone,
    },
    fixedCorrection: {
      dueAt: corrected.correctedFact.dueAt,
      timeZone: corrected.correctedFact.timeZone,
    },
    scenarios: scenarioInputs.map((scenario, index) => {
      const projection = projections[index]!;
      const action = projection.semesterLoop?.today?.action ?? null;
      return {
        id: scenario.id,
        label: scenario.label,
        description: scenario.description,
        projection: {
          status: projection.status,
          loopStatus: projection.semesterLoop?.status ?? null,
          action: action
            ? {
                title: action.title,
                objective: action.objective,
              }
            : null,
          projectionDigest: projection.projectionDigest,
        },
      };
    }),
  });
}
