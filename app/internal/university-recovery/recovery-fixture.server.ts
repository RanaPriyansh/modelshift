import "server-only";

import {
  parseCourseSourceReconciliationRequest,
  type CourseSourceReconciliationRequestV1,
} from "@/src/forge/course-sources";
import {
  projectUniversityRecovery,
  type UniversityRecoveryItemV1,
  type UniversityRecoveryProjectionV1,
  type UniversityRecoveryRequestV1,
} from "@/src/forge/university-recovery";

const OWNER_USER_ID = "11111111-1111-4111-8111-111111111111";
const TENANT_ID = "22222222-2222-4222-8222-222222222222";
const TERM_ID = "term.sample-autumn-2026";
const AS_OF = "2026-09-14T09:00:00.000Z";

function sourceRequest(
  courseToken: "cs102" | "math110",
  dueAt: string,
  options: {
    conflict?: boolean;
    consequenceClass?: "routine" | "consequential";
  } = {},
): Readonly<CourseSourceReconciliationRequestV1> {
  const courseId = `course.sample-${courseToken}`;
  const scope = {
    ownerUserId: OWNER_USER_ID,
    tenantId: TENANT_ID,
    termId: TERM_ID,
    courseId,
  };
  const title = courseToken === "cs102" ? "Argument analysis" : "Problem set four";
  const sourceRevisions: CourseSourceReconciliationRequestV1["sourceRevisions"] = [{
    schemaVersion: "course-source-revision.v1",
    revisionId: `course-source-revision.sample-recovery-${courseToken}-syllabus`,
    scope,
    inputKind: "manual",
    sourceLabel: `${courseToken.toUpperCase()} syllabus copy`,
    sourceDigest: `sha256:${courseToken === "cs102" ? "a".repeat(64) : "b".repeat(64)}`,
    observedAt: "2026-09-10T09:00:00.000Z",
    freshnessReviewDueAt: "2026-10-10T09:00:00.000Z",
    coverage: {
      status: "declared_complete_for_source",
      window: {
        startsAt: "2026-08-01T00:00:00.000Z",
        endsAt: "2026-12-31T23:59:59.000Z",
      },
      inspectedScopes: ["deadlines"],
      unknownOrOmittedScopes: [],
    },
    privacy: {
      visibility: "private_to_owner",
      retentionClass: "derived_fields_only",
      originalBytesRetained: false,
      redistributionAllowed: false,
    },
  }];
  const candidates: CourseSourceReconciliationRequestV1["candidates"] = [{
    schemaVersion: "course-source-candidate.v1",
    candidateId: `course-source-candidate.sample-recovery-${courseToken}-deadline`,
    scope,
    sourceRevisionId: `course-source-revision.sample-recovery-${courseToken}-syllabus`,
    claimKey: `course-claim.sample-recovery-${courseToken}-deadline`,
    locator: { kind: "manual_field", fieldKey: `${courseToken}_deadline` },
    extractedBy: "learner_manual",
    fact: {
      kind: "deadline",
      title,
      dueAt,
      timeZone: "Asia/Kolkata",
      consequenceClass: options.consequenceClass ?? "consequential",
    },
    createdAt: "2026-09-10T09:05:00.000Z",
  }];
  const decisions: CourseSourceReconciliationRequestV1["decisions"] = [{
    schemaVersion: "course-source-decision.v1",
    decisionId: `course-source-decision.sample-recovery-${courseToken}-deadline-accept`,
    candidateId: `course-source-candidate.sample-recovery-${courseToken}-deadline`,
    scope,
    actor: "learner",
    kind: "accept",
    extractionMatch: "learner_confirmed",
    decidedAt: "2026-09-13T09:00:00.000Z",
  }];

  if (options.conflict) {
    sourceRevisions.push({
      ...sourceRevisions[0]!,
      revisionId: `course-source-revision.sample-recovery-${courseToken}-calendar`,
      sourceLabel: `${courseToken.toUpperCase()} calendar copy`,
      sourceDigest: `sha256:${"c".repeat(64)}`,
    });
    candidates.push({
      ...candidates[0]!,
      candidateId: `course-source-candidate.sample-recovery-${courseToken}-deadline-conflict`,
      sourceRevisionId: `course-source-revision.sample-recovery-${courseToken}-calendar`,
      locator: { kind: "manual_field", fieldKey: `${courseToken}_calendar_deadline` },
      fact: {
        kind: "deadline",
        title,
        dueAt: "2026-09-19T12:30:00+05:30",
        timeZone: "Asia/Kolkata",
        consequenceClass: "consequential",
      },
    });
    decisions.push({
      ...decisions[0]!,
      decisionId: `course-source-decision.sample-recovery-${courseToken}-deadline-conflict-accept`,
      candidateId: `course-source-candidate.sample-recovery-${courseToken}-deadline-conflict`,
    });
  }

  return parseCourseSourceReconciliationRequest({
    schemaVersion: "course-source-reconciliation.v1",
    scope,
    asOf: AS_OF,
    sourceRevisions,
    candidates,
    decisions,
  });
}

function recoveryItem(
  courseToken: "cs102" | "math110",
  learnerDisposition: UniversityRecoveryItemV1["learnerDisposition"],
  options: {
    learningEssential?: boolean;
  } = {},
): UniversityRecoveryItemV1 {
  return {
    schemaVersion: "university-recovery-item.v1",
    itemId: `recovery-item.sample-${courseToken}`,
    courseId: `course.sample-${courseToken}`,
    deadlineCandidateId: `course-source-candidate.sample-recovery-${courseToken}-deadline`,
    learnerDisposition,
    learningEssential: {
      value: options.learningEssential ?? learnerDisposition === "required",
      declaredBy: "learner_fixture",
    },
    effort: {
      minutesLow: courseToken === "cs102" ? 90 : 40,
      minutesHigh: courseToken === "cs102" ? 120 : 60,
      basis: "fixture_authored",
    },
    dependencyItemIds: [],
    humanRoute: learnerDisposition === "required"
      ? { owner: "instructor", declaredBy: "learner_fixture" }
      : null,
  };
}

export function universityRecoveryFixtureRequest(options: {
  availableMinutes?: number;
  bufferMinutes?: number;
  csDueAt?: string;
  conflict?: boolean;
  includeNegotiable?: boolean;
} = {}): UniversityRecoveryRequestV1 {
  return {
    schemaVersion: "university-recovery-request.v1",
    scope: {
      ownerUserId: OWNER_USER_ID,
      tenantId: TENANT_ID,
      termId: TERM_ID,
    },
    asOf: AS_OF,
    termLabel: "Autumn 2026",
    timeZone: "Asia/Kolkata",
    declaredChange: {
      kind: "capacity_changed",
      declaredBy: "learner_fixture",
    },
    recoveryWindow: {
      startsAt: AS_OF,
      endsAt: "2026-09-21T09:00:00.000Z",
      availableMinutes: options.availableMinutes ?? 240,
      bufferMinutes: options.bufferMinutes ?? 30,
      declaredBy: "learner_fixture",
    },
    courses: [
      {
        courseId: "course.sample-cs102",
        courseLabel: "CS102: Evidence and computation",
        reconciliationRequest: sourceRequest(
          "cs102",
          options.csDueAt ?? "2026-09-16T12:30:00+05:30",
          { conflict: options.conflict },
        ),
      },
      {
        courseId: "course.sample-math110",
        courseLabel: "MATH110: Discrete structures",
        reconciliationRequest: sourceRequest(
          "math110",
          "2026-09-25T12:30:00+05:30",
          { consequenceClass: "routine" },
        ),
      },
    ],
    items: [
      recoveryItem("cs102", "required"),
      recoveryItem(
        "math110",
        options.includeNegotiable ? "negotiable" : "deferrable",
        { learningEssential: options.includeNegotiable },
      ),
    ],
  };
}

export type UniversityRecoveryFixtureScenario = Readonly<{
  id: "reset-fits" | "choice-needed" | "ask-for-help" | "source-review";
  label: string;
  projection: Readonly<UniversityRecoveryProjectionV1>;
}>;

export async function universityRecoveryFixtureScenarios(): Promise<
  readonly UniversityRecoveryFixtureScenario[]
> {
  const projections = await Promise.all([
    projectUniversityRecovery(universityRecoveryFixtureRequest()),
    projectUniversityRecovery(universityRecoveryFixtureRequest({
      availableMinutes: 130,
      includeNegotiable: true,
    })),
    projectUniversityRecovery(universityRecoveryFixtureRequest({
      csDueAt: "2026-09-13T12:30:00+05:30",
    })),
    projectUniversityRecovery(universityRecoveryFixtureRequest({
      conflict: true,
    })),
  ]);
  return Object.freeze([
    Object.freeze({ id: "reset-fits", label: "Reset fits", projection: projections[0]! }),
    Object.freeze({ id: "choice-needed", label: "Choice needed", projection: projections[1]! }),
    Object.freeze({ id: "ask-for-help", label: "Ask for help", projection: projections[2]! }),
    Object.freeze({ id: "source-review", label: "Source review", projection: projections[3]! }),
  ]);
}
