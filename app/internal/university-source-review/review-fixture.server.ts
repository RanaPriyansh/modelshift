import "server-only";

import {
  parseCourseSourceReconciliationRequest,
  type CourseSourceReconciliationRequestV1,
} from "@/src/forge/course-sources";

const SCOPE = Object.freeze({
  ownerUserId: "11111111-1111-4111-8111-111111111111",
  tenantId: "22222222-2222-4222-8222-222222222222",
  termId: "term.sample-autumn-2026",
  courseId: "course.sample-cs102",
});

/**
 * Deliberately contains a stale calendar, partial coverage, a disagreement, and
 * an assessment-policy claim. These are reviewed sample copies only.
 */
export function reviewedUniversitySourceRequest(): Readonly<CourseSourceReconciliationRequestV1> {
  return parseCourseSourceReconciliationRequest({
    schemaVersion: "course-source-reconciliation.v1",
    scope: SCOPE,
    asOf: "2026-08-25T09:00:00.000Z",
    sourceRevisions: [
      {
        schemaVersion: "course-source-revision.v1",
        revisionId: "course-source-revision.sample-syllabus",
        scope: SCOPE,
        inputKind: "manual",
        sourceLabel: "Copied syllabus",
        sourceDigest: `sha256:${"a".repeat(64)}`,
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
        privacy: {
          visibility: "private_to_owner",
          retentionClass: "derived_fields_only",
          originalBytesRetained: false,
          redistributionAllowed: false,
        },
      },
      {
        schemaVersion: "course-source-revision.v1",
        revisionId: "course-source-revision.sample-calendar",
        scope: SCOPE,
        inputKind: "ics",
        sourceLabel: "Exported course calendar",
        sourceDigest: `sha256:${"b".repeat(64)}`,
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
        privacy: {
          visibility: "private_to_owner",
          retentionClass: "derived_fields_only",
          originalBytesRetained: false,
          redistributionAllowed: false,
        },
      },
    ],
    candidates: [
      {
        schemaVersion: "course-source-candidate.v1",
        candidateId: "course-source-candidate.sample-syllabus-deadline",
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
      },
      {
        schemaVersion: "course-source-candidate.v1",
        candidateId: "course-source-candidate.sample-calendar-deadline",
        scope: SCOPE,
        sourceRevisionId: "course-source-revision.sample-calendar",
        claimKey: "course-claim.sample-assignment-one-deadline",
        locator: {
          kind: "ics_component",
          uid: "sample-assignment-one@calendar.invalid",
          propertyName: "DUE",
        },
        extractedBy: "deterministic_ics_parser",
        fact: {
          kind: "deadline",
          title: "Assignment one",
          dueAt: "2026-09-13T12:30:00+05:30",
          timeZone: "Asia/Kolkata",
          consequenceClass: "consequential",
        },
        createdAt: "2026-07-15T09:05:00.000Z",
      },
      {
        schemaVersion: "course-source-candidate.v1",
        candidateId: "course-source-candidate.sample-assistance-policy",
        scope: SCOPE,
        sourceRevisionId: "course-source-revision.sample-syllabus",
        claimKey: "course-claim.sample-assignment-one-assistance",
        locator: { kind: "manual_field", fieldKey: "assignment_one_assistance_policy" },
        extractedBy: "learner_manual",
        fact: {
          kind: "assessment_assistance_policy",
          assessmentRef: "assessment.sample-assignment-one",
          statementSummary: "Generative tools may be used for brainstorming.",
          assertedAssistance: "allowed",
        },
        createdAt: "2026-08-01T09:06:00.000Z",
      },
    ],
    decisions: [],
  });
}
