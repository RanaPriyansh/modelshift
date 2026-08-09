import "server-only";

import {
  ingestCourseSource,
  parseCourseSourceReconciliationRequest,
  type CourseSourceReconciliationRequestV1,
  type CourseSourceIngestionResultV1,
} from "@/src/forge/course-sources";

const SCOPE = Object.freeze({
  ownerUserId: "11111111-1111-4111-8111-111111111111",
  tenantId: "22222222-2222-4222-8222-222222222222",
  termId: "term.sample-autumn-2026",
  courseId: "course.sample-cs102",
});

function requireReviewable(
  result: Readonly<CourseSourceIngestionResultV1>,
): asserts result is Readonly<CourseSourceIngestionResultV1> & {
  readonly status: "review_required";
  readonly sourceRevision: NonNullable<CourseSourceIngestionResultV1["sourceRevision"]>;
} {
  if (result.status !== "review_required" || !result.sourceRevision) {
    throw new Error("The internal university source fixture failed its ingestion boundary.");
  }
}

/**
 * Deliberately derives a stale calendar, partial coverage, a disagreement, and
 * a copied assessment-policy claim through the same transient boundary. These
 * remain synthetic reviewed sample copies only.
 */
export async function reviewedUniversitySourceRequest(): Promise<Readonly<CourseSourceReconciliationRequestV1>> {
  const syllabus = await ingestCourseSource({
    schemaVersion: "course-source-ingestion.v1",
    scope: SCOPE,
    revisionId: "course-source-revision.sample-syllabus",
    sourceLabel: "Copied syllabus",
    observedAt: "2026-08-01T09:00:00.000Z",
    freshnessReviewDueAt: "2026-09-01T09:00:00.000Z",
    coverage: {
      status: "partial",
      window: {
        startsAt: "2026-08-01T00:00:00.000Z",
        endsAt: "2026-12-31T23:59:59.000Z",
      },
      inspectedScopes: ["deadlines", "assessment_policies"],
      unknownOrOmittedScopes: ["course_commitments"],
    },
    createdAt: "2026-08-01T09:05:00.000Z",
    inputKind: "manual",
    entries: [
      {
        candidateId: "course-source-candidate.sample-syllabus-deadline",
        claimKey: "course-claim.sample-assignment-one-deadline",
        fieldKey: "assignment_one_deadline",
        fact: {
          kind: "deadline",
          title: "Assignment one",
          dueAt: "2026-09-12T12:30:00+05:30",
          timeZone: "Asia/Kolkata",
          consequenceClass: "consequential",
        },
      },
      {
        candidateId: "course-source-candidate.sample-assistance-policy",
        claimKey: "course-claim.sample-assignment-one-assistance",
        fieldKey: "assignment_one_assistance_policy",
        fact: {
          kind: "assessment_assistance_policy",
          assessmentRef: "assessment.sample-assignment-one",
          statementSummary: "Generative tools may be used for brainstorming.",
          assertedAssistance: "allowed",
        },
      },
    ],
  });
  const calendar = await ingestCourseSource({
    schemaVersion: "course-source-ingestion.v1",
    scope: SCOPE,
    revisionId: "course-source-revision.sample-calendar",
    sourceLabel: "Exported course calendar",
    observedAt: "2026-07-15T09:00:00.000Z",
    freshnessReviewDueAt: "2026-08-20T09:00:00.000Z",
    coverage: {
      status: "partial",
      window: {
        startsAt: "2026-08-01T00:00:00.000Z",
        endsAt: "2026-12-31T23:59:59.000Z",
      },
      inspectedScopes: ["course_commitments", "deadlines"],
      unknownOrOmittedScopes: ["assessment_policies"],
    },
    createdAt: "2026-07-15T09:05:00.000Z",
    inputKind: "ics",
    calendarText: [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//FORGE//Internal university research fixture//EN",
      "BEGIN:VTODO",
      "UID:sample-assignment-one@calendar.invalid",
      "SUMMARY:Assignment one",
      "DUE;TZID=Asia/Kolkata:20260913T123000",
      "END:VTODO",
      "END:VCALENDAR",
    ].join("\r\n"),
    mappings: [{
      kind: "deadline",
      uid: "sample-assignment-one@calendar.invalid",
      candidateId: "course-source-candidate.sample-calendar-deadline",
      claimKey: "course-claim.sample-assignment-one-deadline",
      dueProperty: "DUE",
      consequenceClass: "consequential",
    }],
  });
  requireReviewable(syllabus);
  requireReviewable(calendar);

  return parseCourseSourceReconciliationRequest({
    schemaVersion: "course-source-reconciliation.v1",
    scope: SCOPE,
    asOf: "2026-08-25T09:00:00.000Z",
    sourceRevisions: [syllabus.sourceRevision, calendar.sourceRevision],
    candidates: [...syllabus.candidates, ...calendar.candidates],
    decisions: [],
  });
}
