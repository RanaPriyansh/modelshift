import "server-only";

import { deepFreeze } from "@/src/forge/deep-freeze";
import {
  createLearningPathRevision,
} from "@/src/forge/continuity";
import type {
  UniversityRecoveryItemV1,
  UniversityRecoveryRequestV1,
} from "@/src/forge/university-recovery";
import {
  projectUniversitySemesterOverview,
  type UniversitySemesterOverviewCourse,
  type UniversitySemesterOverviewProjectionV1,
  type UniversitySemesterOverviewRequestV1,
} from "@/src/forge/university-semester-overview/index.server";
import type {
  UniversitySemesterLoopProjectionStatus,
} from "@/src/forge/university-semester-loop";
import type {
  UniversityTodayRequestV1,
} from "@/src/forge/university-today";
import { SOURCE_CORROBORATION_WORLD } from "@/src/forge/worlds";

import { universityTodayFixtureRequest } from "../university-today/today-fixture.server";

export type UniversitySemesterOverviewFixtureScenarioId =
  | "mixed-term"
  | "term-source-review"
  | "capacity-choice"
  | "world-changed";

export type UniversitySemesterOverviewCourseTone =
  | "inspectable"
  | "choice"
  | "stopped"
  | "complete";

export type UniversitySemesterOverviewFixtureCourseView = Readonly<{
  courseLabel: string;
  todayStatusLabel: string;
  semesterLoopStatusLabel: string;
  explanation: string;
  tone: UniversitySemesterOverviewCourseTone;
}>;

export type UniversitySemesterOverviewFixtureView = Readonly<{
  status: "ready_for_inspection" | "invalid";
  eyebrow: string;
  title: string;
  body: string;
  termBoundary: Readonly<{
    statusLabel: string;
    courseCountLabel: string;
    readinessBoundary: string;
  }> | null;
  courses: readonly UniversitySemesterOverviewFixtureCourseView[];
  announcement: string;
}>;

export type UniversitySemesterOverviewFixtureScenario = Readonly<{
  id: UniversitySemesterOverviewFixtureScenarioId;
  label: string;
  description: string;
  view: UniversitySemesterOverviewFixtureView;
}>;

export type UniversitySemesterOverviewFixture = Readonly<{
  schemaVersion: "university-semester-overview-fixture.v1";
  termLabel: string;
  timeZone: string;
  scenarios: readonly UniversitySemesterOverviewFixtureScenario[];
  authority: Readonly<{
    projectionClass: "Fixture-only semester inspection";
    orderBasis: "Course ID, not priority";
    identity: "Caller-asserted synthetic input; not verified";
    tenantIsolation: "Not established";
    rightsEnforcement: "Not established";
    institutionalCompleteness: "Not established";
    termFeasibility: "Not allowed";
    courseSelection: "Not allowed";
    globalAction: "Not allowed";
    recommendation: "Not allowed";
    scheduling: "Not allowed";
    providerCall: "Not allowed";
    persistence: "Not allowed";
    session: "Not allowed";
    evidence: "Not allowed";
    message: "Not allowed";
    event: "Not allowed";
    externalEffect: "Not allowed";
  }>;
}>;

type CourseSpec = Readonly<{
  token: "01-cs102" | "02-math110" | "03-hist204" | "04-bio120";
  label:
    | "CS102: Evidence and computation"
    | "MATH110: Discrete structures"
    | "HIST204: Modern history"
    | "BIO120: Cell systems";
  todayScenario: "ready" | "source-review" | "tight" | "no-room";
  activityStatus?: "completed";
  worldChanged?: boolean;
}>;

const BASE_COURSES: readonly CourseSpec[] = Object.freeze([
  Object.freeze({
    token: "01-cs102",
    label: "CS102: Evidence and computation",
    todayScenario: "ready",
  }),
  Object.freeze({
    token: "02-math110",
    label: "MATH110: Discrete structures",
    todayScenario: "tight",
  }),
  Object.freeze({
    token: "03-hist204",
    label: "HIST204: Modern history",
    todayScenario: "no-room",
  }),
  Object.freeze({
    token: "04-bio120",
    label: "BIO120: Cell systems",
    todayScenario: "ready",
    activityStatus: "completed",
  }),
]);

function rewriteStrings(
  value: unknown,
  replacements: readonly (readonly [string, string])[],
): unknown {
  if (typeof value === "string") {
    return replacements.reduce(
      (current, [from, to]) => current.replaceAll(from, to),
      value,
    );
  }
  if (Array.isArray(value)) {
    return value.map((entry) => rewriteStrings(entry, replacements));
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        rewriteStrings(entry, replacements),
      ]),
    );
  }
  return value;
}

function detachJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function todayRequestFor(
  spec: CourseSpec,
): Promise<UniversityTodayRequestV1> {
  const rewritten = rewriteStrings(
    await universityTodayFixtureRequest(spec.todayScenario),
    [
      ["course.sample-cs102", `course.sample-${spec.token}`],
      ["CS102: Evidence and computation", spec.label],
      ["sample-today", `sample-overview-${spec.token}`],
      ["sample-syllabus", `sample-overview-${spec.token}-syllabus`],
      ["sample-calendar", `sample-overview-${spec.token}-calendar`],
    ],
  ) as UniversityTodayRequestV1;
  const rewrittenPathRevision = Object.fromEntries(
    Object.entries(rewritten.pathRevision as Record<string, unknown>).filter(
      ([key]) => key !== "revisionDigest",
    ),
  );
  const requestWithValidPath = {
    ...rewritten,
    pathRevision: await createLearningPathRevision(rewrittenPathRevision),
  };

  if (spec.activityStatus !== "completed") return requestWithValidPath;
  const state = requestWithValidPath.activityStates[0] as {
    readonly schemaVersion: "activity-state.v1";
    readonly pathId: string;
    readonly pathRevisionId: string;
    readonly nodeId: string;
    readonly stateVersion: number;
    readonly status: string;
    readonly updatedAt: string;
  } | undefined;
  if (!state || requestWithValidPath.activityStates.length !== 1) {
    throw new Error(
      "The semester overview fixture requires one exact activity state.",
    );
  }
  return {
    ...requestWithValidPath,
    activityStates: [{
      ...state,
      stateVersion: state.stateVersion + 1,
      status: "completed",
      updatedAt: requestWithValidPath.context.asOf,
    }],
  };
}

function exactDeadlineCandidateId(
  request: UniversityTodayRequestV1,
): string {
  const candidates = (
    request.reconciliationRequest as {
      readonly candidates?: readonly {
        readonly candidateId?: string;
        readonly fact?: { readonly kind?: string };
      }[];
    }
  ).candidates;
  const deadline = candidates?.find(
    (candidate) => candidate.fact?.kind === "deadline",
  );
  if (!deadline?.candidateId) {
    throw new Error(
      "The semester overview fixture requires one copied deadline per course.",
    );
  }
  return deadline.candidateId;
}

function recoveryItemFor(
  request: UniversityTodayRequestV1,
  index: number,
): UniversityRecoveryItemV1 {
  return {
    schemaVersion: "university-recovery-item.v1",
    itemId: `recovery-item.sample-overview-${String(index + 1).padStart(2, "0")}`,
    courseId: request.context.scope.courseId,
    deadlineCandidateId: exactDeadlineCandidateId(request),
    learnerDisposition: "required",
    learningEssential: {
      value: true,
      declaredBy: "learner_fixture",
    },
    effort: {
      minutesLow: request.context.effortEstimate.minutesLow,
      minutesHigh: request.context.effortEstimate.minutesHigh,
      basis: "fixture_authored",
    },
    dependencyItemIds: [],
    humanRoute: {
      owner: "instructor",
      declaredBy: "learner_fixture",
    },
  };
}

function recoveryRequestFor(
  todayRequests: readonly UniversityTodayRequestV1[],
  capacityChoice: boolean,
): UniversityRecoveryRequestV1 {
  const first = todayRequests[0];
  if (!first || todayRequests.length !== 4) {
    throw new Error(
      "The semester overview fixture requires four exact Today requests.",
    );
  }
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
      availableMinutes: capacityChoice ? 160 : 480,
      bufferMinutes: capacityChoice ? 20 : 60,
      declaredBy: "learner_fixture",
    },
    courses: todayRequests.map((request) => ({
      courseId: request.context.scope.courseId,
      courseLabel: request.context.courseLabel,
      reconciliationRequest: structuredClone(request.reconciliationRequest),
    })),
    items: todayRequests.map(recoveryItemFor),
  };
}

export async function universitySemesterOverviewFixtureRequest(
  scenario: UniversitySemesterOverviewFixtureScenarioId,
): Promise<UniversitySemesterOverviewRequestV1> {
  const specs = BASE_COURSES.map((course, index) => {
    if (scenario === "term-source-review" && index === 0) {
      return { ...course, todayScenario: "source-review" as const };
    }
    if (scenario === "world-changed" && index === 0) {
      return { ...course, worldChanged: true };
    }
    return course;
  });
  const todayRequests = await Promise.all(specs.map(todayRequestFor));
  const recoveryRequest = recoveryRequestFor(
    todayRequests,
    scenario === "capacity-choice",
  );
  return {
    schemaVersion: "university-semester-overview-request.v1",
    recoveryRequest,
    courses: todayRequests.map((todayRequest, index) => {
      const worldPack = specs[index]?.worldChanged
        ? {
            ...detachJson(SOURCE_CORROBORATION_WORLD),
            manifest: {
              ...detachJson(SOURCE_CORROBORATION_WORLD.manifest),
              version: "1.0.2",
            },
          }
        : detachJson(SOURCE_CORROBORATION_WORLD);
      return {
        todayRequest,
        worldPack,
      };
    }),
  };
}

function readable(value: string): string {
  return value.replaceAll("_", " ");
}

function coursePresentation(
  course: UniversitySemesterOverviewCourse,
): UniversitySemesterOverviewFixtureCourseView {
  const presentation: Record<
    UniversitySemesterLoopProjectionStatus,
    Readonly<{
      explanation: string;
      tone: UniversitySemesterOverviewCourseTone;
    }>
  > = {
    invalid: {
      explanation: "This course boundary failed closed.",
      tone: "stopped",
    },
    source_review_required: {
      explanation:
        "Copied course context must be reviewed before the loop can continue.",
      tone: "stopped",
    },
    recovery_required: {
      explanation:
        "The accepted action does not fit the learner-declared window.",
      tone: "choice",
    },
    learner_choice_required: {
      explanation: "Only the low authored effort bound fits.",
      tone: "choice",
    },
    protected_study_ready: {
      explanation:
        "One accepted action can be inspected; nothing starts here.",
      tone: "inspectable",
    },
    world_review_required: {
      explanation:
        "The exact World binding changed; no similar activity is substituted.",
      tone: "stopped",
    },
    path_complete: {
      explanation: "This action is complete; the course is not.",
      tone: "complete",
    },
    path_blocked: {
      explanation:
        "The accepted path is blocked; the overview does not route around it.",
      tone: "stopped",
    },
  };
  const selected = presentation[course.semesterLoopStatus];
  return {
    courseLabel: course.courseLabel,
    todayStatusLabel: readable(course.todayStatus),
    semesterLoopStatusLabel: readable(course.semesterLoopStatus),
    explanation: selected.explanation,
    tone: selected.tone,
  };
}

function view(
  projection: Readonly<UniversitySemesterOverviewProjectionV1>,
): UniversitySemesterOverviewFixtureView {
  if (
    projection.status !== "ready_for_inspection"
    || projection.termRecovery === null
  ) {
    return {
      status: "invalid",
      eyebrow: "Semester envelope stopped",
      title: "No course overview is available.",
      body:
        "The exact synthetic term, course set, sources, Today inputs, and World bindings did not form one inspectable envelope.",
      termBoundary: null,
      courses: [],
      announcement:
        "Semester overview stopped. No course states or actions were exposed.",
    };
  }
  const courses = projection.courses.map(coursePresentation);
  return {
    status: projection.status,
    eyebrow: "All current courses / shallow inspection",
    title: "Every course. No false priority.",
    body:
      "See each bounded course state without a score, recommendation, or hidden ranking.",
    termBoundary: {
      statusLabel: readable(projection.termRecovery.status),
      courseCountLabel: `${courses.length} synthetic courses inspected`,
      readinessBoundary:
        "Ready for inspection does not mean the semester is ready.",
    },
    courses,
    announcement:
      `${courses.length} courses are available for shallow inspection. `
      + `Term recovery is ${readable(projection.termRecovery.status)}.`,
  };
}

export async function universitySemesterOverviewFixture(): Promise<
  UniversitySemesterOverviewFixture
> {
  const scenarioDefinitions = [
    {
      id: "mixed-term",
      label: "Mixed term",
      description: "Four distinct course boundaries",
    },
    {
      id: "term-source-review",
      label: "Term source review",
      description: "One copied-source conflict",
    },
    {
      id: "capacity-choice",
      label: "Capacity choice",
      description: "Term recovery needs learner choice",
    },
    {
      id: "world-changed",
      label: "World changed",
      description: "One exact World binding changed",
    },
  ] as const;
  const projections = await Promise.all(
    scenarioDefinitions.map(async (scenario) => (
      projectUniversitySemesterOverview(
        await universitySemesterOverviewFixtureRequest(scenario.id),
      )
    )),
  );
  if (projections.some((projection) => (
    projection.status !== "ready_for_inspection"
  ))) {
    throw new Error(
      `Semester overview fixture taxonomy drifted: ${projections.map(
        (projection, index) => (
          `${scenarioDefinitions[index]?.id ?? index}=${projection.status}`
          + (
            projection.issues.length > 0
              ? `[${projection.issues.map(
                  (issue) => `${issue.code}:${issue.path || "<root>"}`,
                ).join("|")}]`
              : ""
          )
        ),
      ).join(", ")}.`,
    );
  }

  const firstRequest = await todayRequestFor(BASE_COURSES[0]!);
  return deepFreeze({
    schemaVersion: "university-semester-overview-fixture.v1",
    termLabel: firstRequest.context.termLabel,
    timeZone: firstRequest.context.timeZone,
    scenarios: scenarioDefinitions.map((scenario, index) => ({
      ...scenario,
      view: view(projections[index]!),
    })),
    authority: {
      projectionClass: "Fixture-only semester inspection",
      orderBasis: "Course ID, not priority",
      identity: "Caller-asserted synthetic input; not verified",
      tenantIsolation: "Not established",
      rightsEnforcement: "Not established",
      institutionalCompleteness: "Not established",
      termFeasibility: "Not allowed",
      courseSelection: "Not allowed",
      globalAction: "Not allowed",
      recommendation: "Not allowed",
      scheduling: "Not allowed",
      providerCall: "Not allowed",
      persistence: "Not allowed",
      session: "Not allowed",
      evidence: "Not allowed",
      message: "Not allowed",
      event: "Not allowed",
      externalEffect: "Not allowed",
    },
  });
}
