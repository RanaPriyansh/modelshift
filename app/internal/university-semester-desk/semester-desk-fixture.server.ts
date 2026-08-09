import "server-only";

import { deepFreeze } from "@/src/forge/deep-freeze";
import {
  projectUniversityRecovery,
  universityRecoveryRequestSchema,
} from "@/src/forge/university-recovery";
import {
  projectUniversitySemesterLoop,
  type UniversitySemesterLoopProjectionStatus,
  type UniversitySemesterLoopProjectionV1,
} from "@/src/forge/university-semester-loop";
import {
  projectUniversitySemesterOverview,
  type UniversitySemesterOverviewCourse,
} from "@/src/forge/university-semester-overview/index.server";
import {
  universityTodayRequestSchema,
  type UniversityTodayProjectionStatus,
} from "@/src/forge/university-today";

import {
  universitySemesterOverviewFixtureRequest,
  type UniversitySemesterOverviewFixtureScenarioId,
} from "../university-semester-overview/semester-overview-fixture.server";

export type UniversitySemesterDeskCourseTone =
  | "inspectable"
  | "choice"
  | "stopped"
  | "complete";

export type UniversitySemesterDeskJourneyState =
  | "checked"
  | "current"
  | "not_needed"
  | "stopped"
  | "waiting";

export type UniversitySemesterDeskJourneyStage = Readonly<{
  id: "sources" | "today" | "recovery" | "study" | "return";
  label: string;
  state: UniversitySemesterDeskJourneyState;
}>;

export type UniversitySemesterDeskCurrentJob = Readonly<{
  index: string;
  eyebrow: string;
  title: string;
  body: string;
  boundary: string;
}>;

export type UniversitySemesterDeskEvidence = Readonly<{
  sourceReviewState: string;
  reviewedFactCountLabel: string;
  conflictCountLabel: string;
  institutionalCompleteness: "Not established";
  availableTimeLabel: string;
  effortLabel: string;
  capacityState: string;
  actionStatement: string;
  actionSelectionBasis: "Existing learner-accepted reviewed path only";
  worldState: string;
  protectedStudyState: string;
}>;

export type UniversitySemesterDeskCourseOption = Readonly<{
  optionId:
    | "semester-desk-option-6f2d"
    | "semester-desk-option-91ac"
    | "semester-desk-option-b8e4"
    | "semester-desk-option-3c75";
  courseLabel: string;
  todayStatusLabel: string;
  semesterLoopStatusLabel: string;
  explanation: string;
  tone: UniversitySemesterDeskCourseTone;
  learnerSelectionStatement:
    "You choose what to inspect. FORGE does not choose what to do.";
  journey: readonly UniversitySemesterDeskJourneyStage[];
  currentJob: UniversitySemesterDeskCurrentJob;
  evidence: UniversitySemesterDeskEvidence;
  announcement: string;
  noEffectBoundary:
    "Inspection changes only this refresh-clear synthetic view. No course work, priority, source, capacity, path, schedule, session, evidence, message, or external state changes.";
}>;

export type UniversitySemesterDeskScenario = Readonly<{
  id: UniversitySemesterOverviewFixtureScenarioId;
  label: string;
  description: string;
  termBoundary: Readonly<{
    statusLabel: string;
    courseCountLabel: "4 synthetic courses in one exact term envelope";
    readinessBoundary:
      "Inspectable does not mean the term, Recovery plan, or any course is ready or feasible.";
  }>;
  courses: readonly UniversitySemesterDeskCourseOption[];
}>;

export type UniversitySemesterDeskFixture = Readonly<{
  schemaVersion: "university-semester-desk-fixture.v1";
  termLabel: string;
  timeZone: string;
  authority: Readonly<{
    projectionClass: "Fixture-only semester inspection desk";
    orderBasis: "Course ID, not priority";
    identity: "Caller-asserted synthetic input; not verified";
    tenantIsolation: "Not established";
    rightsEnforcement: "Not established";
    institutionalCompleteness: "Not established";
    inspectionSelection:
      "Allowed only for explicit refresh-clear synthetic inspection";
    courseWorkSelection: "Not allowed";
    priority: "Not allowed";
    recommendation: "Not allowed";
    termFeasibility: "Not allowed";
    scheduling: "Not allowed";
    session: "Not allowed";
    persistence: "Not allowed";
    providerCall: "Not allowed";
    evidence: "Not allowed";
    message: "Not allowed";
    event: "Not allowed";
    externalEffect: "Not allowed";
  }>;
  scenarios: readonly UniversitySemesterDeskScenario[];
}>;

export type UniversitySemesterDeskServerEnvelope = Readonly<{
  ownerUserId: string;
  tenantId: string;
  termId: string;
  asOf: string;
  termLabel: string;
  timeZone: string;
  courses: readonly Readonly<{
    courseId: string;
    courseLabel: string;
  }>[];
}>;

type BuiltUniversitySemesterDeskScenario = Readonly<{
  envelope: UniversitySemesterDeskServerEnvelope;
  scenario: UniversitySemesterDeskScenario;
}>;

const SCENARIOS = Object.freeze([
  Object.freeze({
    id: "mixed-term",
    label: "Mixed term",
    description: "Four distinct course boundaries",
  }),
  Object.freeze({
    id: "term-source-review",
    label: "Term source review",
    description: "One copied-source conflict",
  }),
  Object.freeze({
    id: "capacity-choice",
    label: "Capacity choice",
    description: "Term Recovery needs learner choice",
  }),
  Object.freeze({
    id: "world-changed",
    label: "World changed",
    description: "One exact World binding changed",
  }),
] as const satisfies readonly Readonly<{
  id: UniversitySemesterOverviewFixtureScenarioId;
  label: string;
  description: string;
}>[]);

const OPTION_IDS = Object.freeze([
  "semester-desk-option-6f2d",
  "semester-desk-option-91ac",
  "semester-desk-option-b8e4",
  "semester-desk-option-3c75",
] as const);

const LEARNER_SELECTION_STATEMENT =
  "You choose what to inspect. FORGE does not choose what to do." as const;

const NO_EFFECT_BOUNDARY =
  "Inspection changes only this refresh-clear synthetic view. No course work, priority, source, capacity, path, schedule, session, evidence, message, or external state changes." as const;

const JOURNEY_LABELS = Object.freeze({
  sources: "Sources",
  today: "Today",
  recovery: "Recovery",
  study: "Protected study",
  return: "Return",
});

function readable(value: string): string {
  return value.replaceAll("_", " ");
}

function journeyFor(
  status: UniversitySemesterLoopProjectionStatus,
): readonly UniversitySemesterDeskJourneyStage[] {
  const states: Record<
    UniversitySemesterDeskJourneyStage["id"],
    UniversitySemesterDeskJourneyState
  > = {
    sources: "waiting",
    today: "waiting",
    recovery: "waiting",
    study: "waiting",
    return: "waiting",
  };

  switch (status) {
    case "source_review_required":
      states.sources = "current";
      break;
    case "recovery_required":
      states.sources = "checked";
      states.today = "stopped";
      states.recovery = "current";
      break;
    case "learner_choice_required":
      states.sources = "checked";
      states.today = "current";
      break;
    case "protected_study_ready":
    case "world_review_required":
      states.sources = "checked";
      states.today = "checked";
      states.recovery = "not_needed";
      states.study = "current";
      break;
    case "path_complete":
      states.sources = "checked";
      states.today = "checked";
      states.recovery = "not_needed";
      states.study = "not_needed";
      states.return = "current";
      break;
    case "path_blocked":
      states.sources = "checked";
      states.today = "stopped";
      break;
    case "invalid":
      states.sources = "stopped";
      break;
  }

  return (
    Object.keys(JOURNEY_LABELS) as UniversitySemesterDeskJourneyStage["id"][]
  ).map((id) => ({
    id,
    label: JOURNEY_LABELS[id],
    state: states[id],
  }));
}

function currentJobFor(
  status: UniversitySemesterLoopProjectionStatus,
): UniversitySemesterDeskCurrentJob {
  switch (status) {
    case "source_review_required":
      return {
        index: "01",
        eyebrow: "Current job / copied sources",
        title: "Review what the copied sources disagree about.",
        body:
          "The course stops before capacity or study while a copied source is uncertain. Learner review can confirm the copy, not turn it into university truth.",
        boundary:
          "Inspection only. No source decision is made, transferred, or saved.",
      };
    case "recovery_required":
      return {
        index: "03",
        eyebrow: "Current job / Recovery",
        title: "Inspect the exact capacity boundary.",
        body:
          "The accepted action does not fit the learner-declared window. Recovery preserves the copied deadline and full authored effort range.",
        boundary:
          "Inspection only. No capacity, classification, message, or plan is applied.",
      };
    case "learner_choice_required":
      return {
        index: "02",
        eyebrow: "Current job / learner choice",
        title: "Only the learner can decide whether the tight window works.",
        body:
          "Only the low end of the authored effort range fits. FORGE does not compress the work, infer capacity, or choose whether to continue.",
        boundary:
          "Inspection only. No learner choice or course work selection occurs.",
      };
    case "protected_study_ready":
      return {
        index: "04",
        eyebrow: "Current job / protected study",
        title: "Inspect how help turns off before proof.",
        body:
          "The reviewed copy, accepted action, declared window, and exact released learning boundary align. Nothing starts from this desk.",
        boundary:
          "Inspection only. No session, completion, evidence, or progress starts.",
      };
    case "world_review_required":
      return {
        index: "04",
        eyebrow: "Current job / exact learning boundary",
        title: "The reviewed learning activity changed.",
        body:
          "The supplied learning boundary no longer matches the exact accepted binding. FORGE does not substitute a similar activity.",
        boundary:
          "Inspection only. No activity or session control is available.",
      };
    case "path_complete":
      return {
        index: "05",
        eyebrow: "Current job / honest return",
        title: "This action is complete. The course is not.",
        body:
          "The accepted path has no next action in this fixture. That does not establish course completion, capability, retention, or a learning record.",
        boundary:
          "Inspection only. No new action or semester outcome is selected.",
      };
    case "path_blocked":
      return {
        index: "02",
        eyebrow: "Current job / accepted path",
        title: "The accepted action is blocked. Do not route around it.",
        body:
          "The learner-accepted path cannot expose a runnable action. The desk does not infer why, score the learner, or choose a replacement.",
        boundary:
          "Inspection only. Repair requires a separately authorized learner decision.",
      };
    case "invalid":
      return {
        index: "00",
        eyebrow: "Current job / repair input",
        title: "This course envelope did not line up.",
        body:
          "Term, course, source, Today, Recovery, and learning inputs must recompute inside one exact bounded envelope.",
        boundary: "No course detail or learner effect is available.",
      };
  }
}

function explanationFor(
  status: UniversitySemesterLoopProjectionStatus,
): Readonly<{
  explanation: string;
  tone: UniversitySemesterDeskCourseTone;
}> {
  const presentations: Record<
    UniversitySemesterLoopProjectionStatus,
    Readonly<{
      explanation: string;
      tone: UniversitySemesterDeskCourseTone;
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
        "The exact learning boundary changed; no similar activity is substituted.",
      tone: "stopped",
    },
    path_complete: {
      explanation: "This action is complete; the course is not.",
      tone: "complete",
    },
    path_blocked: {
      explanation:
        "The accepted path is blocked; the desk does not route around it.",
      tone: "stopped",
    },
  };
  return presentations[status];
}

function countLabel(
  count: number,
  singular: string,
  plural: string,
): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function actionStatement(
  projection: Readonly<UniversitySemesterLoopProjectionV1>,
): string {
  if (projection.today?.action) {
    return "One accepted-path action is available to inspect; it does not start.";
  }
  if (projection.status === "path_complete") {
    return "No next action remains in the accepted path.";
  }
  if (projection.status === "path_blocked") {
    return "The accepted path is blocked; no replacement is selected.";
  }
  return "No action is exposed in this course state.";
}

function evidenceFor(
  projection: Readonly<UniversitySemesterLoopProjectionV1>,
): UniversitySemesterDeskEvidence {
  const source = projection.today?.source;
  const capacity = projection.today?.capacity;
  const protectedStudy = projection.protectedStudy;
  const reviewedFactCount = source?.reviewedContextFactCount ?? 0;
  const conflictCount = source?.unresolvedConflictCount ?? 0;

  return {
    sourceReviewState: source
      ? readable(source.reconciliationStatus)
      : "not exposed",
    reviewedFactCountLabel: countLabel(
      reviewedFactCount,
      "reviewed copied fact",
      "reviewed copied facts",
    ),
    conflictCountLabel: countLabel(
      conflictCount,
      "unresolved conflict",
      "unresolved conflicts",
    ),
    institutionalCompleteness: "Not established",
    availableTimeLabel: capacity
      ? `${capacity.availableMinutes} learner-fixture minutes`
      : "not exposed",
    effortLabel: capacity
      ? `${capacity.effortMinutesLow} to ${capacity.effortMinutesHigh} fixture-authored minutes`
      : "not exposed",
    capacityState: capacity ? readable(capacity.state) : "not exposed",
    actionStatement: actionStatement(projection),
    actionSelectionBasis: "Existing learner-accepted reviewed path only",
    worldState: projection.status === "world_review_required"
      ? "Exact supplied learning boundary requires review"
      : protectedStudy?.world
        ? "Exact supplied learning boundary matched"
        : "not exposed",
    protectedStudyState: protectedStudy
      ? readable(protectedStudy.status)
      : "not available",
  };
}

export function assertUniversitySemesterDeskCourseParity(
  overviewCourse: Readonly<UniversitySemesterOverviewCourse>,
  direct: Readonly<UniversitySemesterLoopProjectionV1>,
): asserts direct is Readonly<UniversitySemesterLoopProjectionV1> & {
  readonly status: Exclude<UniversitySemesterLoopProjectionStatus, "invalid">;
  readonly today: NonNullable<UniversitySemesterLoopProjectionV1["today"]> & {
    readonly status: Exclude<UniversityTodayProjectionStatus, "invalid">;
    readonly projectionDigest: string;
  };
  readonly projectionDigest: string;
} {
  if (
    direct.status === "invalid"
    || direct.today === null
    || direct.today.status === "invalid"
    || direct.today.projectionDigest === null
    || direct.projectionDigest === null
    || direct.courseLabel !== overviewCourse.courseLabel
    || direct.today.status !== overviewCourse.todayStatus
    || direct.status !== overviewCourse.semesterLoopStatus
    || direct.today.projectionDigest !== overviewCourse.todayProjectionDigest
    || direct.projectionDigest !== overviewCourse.semesterLoopDigest
  ) {
    throw new Error(
      "Semester Desk refused a course whose direct canonical loop drifted from the exact overview summary.",
    );
  }
}

export function assertUniversitySemesterDeskEnvelopeParity(
  baseline: UniversitySemesterDeskServerEnvelope,
  candidate: UniversitySemesterDeskServerEnvelope,
): void {
  const exactFields = [
    "ownerUserId",
    "tenantId",
    "termId",
    "asOf",
    "termLabel",
    "timeZone",
  ] as const;
  for (const field of exactFields) {
    if (candidate[field] !== baseline[field]) {
      throw new Error(
        `Semester Desk refused a scenario whose exact ${field} drifted from the baseline term envelope.`,
      );
    }
  }
  if (candidate.courses.length !== baseline.courses.length) {
    throw new Error(
      "Semester Desk refused a scenario whose exact ordered course identities drifted from the baseline term envelope.",
    );
  }
  for (const [index, baselineCourse] of baseline.courses.entries()) {
    const candidateCourse = candidate.courses[index];
    if (
      candidateCourse?.courseId !== baselineCourse.courseId
      || candidateCourse.courseLabel !== baselineCourse.courseLabel
    ) {
      throw new Error(
        "Semester Desk refused a scenario whose exact ordered course identities drifted from the baseline term envelope.",
      );
    }
  }
}

async function buildScenario(
  definition: (typeof SCENARIOS)[number],
): Promise<BuiltUniversitySemesterDeskScenario> {
  const request = await universitySemesterOverviewFixtureRequest(definition.id);
  const recoveryRequest = universityRecoveryRequestSchema.safeParse(
    request.recoveryRequest,
  );
  if (!recoveryRequest.success) {
    throw new Error(
      `Semester Desk scenario ${definition.id} has an invalid Recovery request.`,
    );
  }
  const [overview, directRecovery] = await Promise.all([
    projectUniversitySemesterOverview(request),
    projectUniversityRecovery(recoveryRequest.data),
  ]);
  if (
    overview.status !== "ready_for_inspection"
    || overview.termRecovery === null
    || overview.projectionDigest === null
    || directRecovery.status === "invalid"
    || directRecovery.projectionDigest === null
    || overview.termRecovery.status !== directRecovery.status
    || overview.termRecovery.projectionDigest
      !== directRecovery.projectionDigest
    || overview.courses.length !== 4
    || request.courses.length !== 4
  ) {
    throw new Error(
      `Semester Desk scenario ${definition.id} drifted from its exact term overview.`,
    );
  }

  const rawCourses = request.courses.map((course, inputIndex) => {
    const today = universityTodayRequestSchema.safeParse(course.todayRequest);
    if (!today.success) {
      throw new Error(
        `Semester Desk scenario ${definition.id} course ${inputIndex} has an invalid Today request.`,
      );
    }
    return {
      today: today.data,
      worldPack: course.worldPack,
    };
  });

  const courses = await Promise.all(overview.courses.map(
    async (overviewCourse, index): Promise<UniversitySemesterDeskCourseOption> => {
      const raw = rawCourses.find(
        (course) => (
          course.today.context.scope.courseId === overviewCourse.courseId
        ),
      );
      const optionId = OPTION_IDS[index];
      if (!raw || !optionId) {
        throw new Error(
          `Semester Desk scenario ${definition.id} cannot bind one exact opaque course option.`,
        );
      }
      const direct = await projectUniversitySemesterLoop({
        schemaVersion: "university-semester-loop-request.v1",
        todayRequest: raw.today,
        recoveryRequest: recoveryRequest.data,
        worldPack: raw.worldPack,
      });
      assertUniversitySemesterDeskCourseParity(overviewCourse, direct);
      const presentation = explanationFor(direct.status);
      return {
        optionId,
        courseLabel: overviewCourse.courseLabel,
        todayStatusLabel: readable(direct.today.status),
        semesterLoopStatusLabel: readable(direct.status),
        explanation: presentation.explanation,
        tone: presentation.tone,
        learnerSelectionStatement: LEARNER_SELECTION_STATEMENT,
        journey: journeyFor(direct.status),
        currentJob: currentJobFor(direct.status),
        evidence: evidenceFor(direct),
        announcement:
          `${overviewCourse.courseLabel} selected for inspection. `
          + "This changes only the refresh-clear desk view and does not choose course work or priority.",
        noEffectBoundary: NO_EFFECT_BOUNDARY,
      };
    },
  ));

  return {
    envelope: {
      ownerUserId: recoveryRequest.data.scope.ownerUserId,
      tenantId: recoveryRequest.data.scope.tenantId,
      termId: recoveryRequest.data.scope.termId,
      asOf: recoveryRequest.data.asOf,
      termLabel: recoveryRequest.data.termLabel,
      timeZone: recoveryRequest.data.timeZone,
      courses: overview.courses.map((course) => ({
        courseId: course.courseId,
        courseLabel: course.courseLabel,
      })),
    },
    scenario: {
      ...definition,
      termBoundary: {
        statusLabel: readable(overview.termRecovery.status),
        courseCountLabel: "4 synthetic courses in one exact term envelope",
        readinessBoundary:
          "Inspectable does not mean the term, Recovery plan, or any course is ready or feasible.",
      },
      courses,
    },
  };
}

/**
 * Recomputes the four closed Semester Desk scenarios from the exact raw
 * semester-overview fixtures. Every option is accepted only after its direct
 * canonical semester loop matches the overview-retained status and digests.
 * Only the deeply frozen presentation DTO escapes this server module.
 */
export async function universitySemesterDeskFixture(): Promise<
  UniversitySemesterDeskFixture
> {
  const builtScenarios = await Promise.all(SCENARIOS.map(buildScenario));
  const baseline = builtScenarios[0];
  if (!baseline) {
    throw new Error("Semester Desk cannot derive its exact term envelope.");
  }
  for (const built of builtScenarios) {
    assertUniversitySemesterDeskEnvelopeParity(
      baseline.envelope,
      built.envelope,
    );
    const scenario = built.scenario;
    if (
      scenario.courses.length !== 4
      || new Set(scenario.courses.map((course) => course.optionId)).size !== 4
    ) {
      throw new Error(
        `Semester Desk scenario ${scenario.id} did not retain four unique opaque course options.`,
      );
    }
  }
  const scenarios = builtScenarios.map(({ scenario }) => scenario);

  return deepFreeze({
    schemaVersion: "university-semester-desk-fixture.v1",
    termLabel: baseline.envelope.termLabel,
    timeZone: baseline.envelope.timeZone,
    authority: {
      projectionClass: "Fixture-only semester inspection desk",
      orderBasis: "Course ID, not priority",
      identity: "Caller-asserted synthetic input; not verified",
      tenantIsolation: "Not established",
      rightsEnforcement: "Not established",
      institutionalCompleteness: "Not established",
      inspectionSelection:
        "Allowed only for explicit refresh-clear synthetic inspection",
      courseWorkSelection: "Not allowed",
      priority: "Not allowed",
      recommendation: "Not allowed",
      termFeasibility: "Not allowed",
      scheduling: "Not allowed",
      session: "Not allowed",
      persistence: "Not allowed",
      providerCall: "Not allowed",
      evidence: "Not allowed",
      message: "Not allowed",
      event: "Not allowed",
      externalEffect: "Not allowed",
    },
    scenarios,
  });
}
