import { z } from "zod";

import type { CourseSourceScopeV1 } from "../course-sources";
import type { UniversityProtectedStudyProjectionV1 } from "../university-protected-study";
import type { UniversityRecoveryProjectionV1 } from "../university-recovery";
import type { UniversityTodayProjectionV1 } from "../university-today";

z.config({ jitless: true });

export const UNIVERSITY_SEMESTER_LOOP_REQUEST_SCHEMA_VERSION =
  "university-semester-loop-request.v1" as const;
export const UNIVERSITY_SEMESTER_LOOP_PROJECTION_SCHEMA_VERSION =
  "university-semester-loop-projection.v1" as const;

/**
 * The compositor accepts only raw child requests. In particular, callers
 * cannot submit child projections, readiness flags, or selected actions.
 */
export const universitySemesterLoopRequestSchema = z.strictObject({
  schemaVersion: z.literal(UNIVERSITY_SEMESTER_LOOP_REQUEST_SCHEMA_VERSION),
  todayRequest: z.unknown(),
  recoveryRequest: z.unknown(),
  worldPack: z.unknown(),
});
export type UniversitySemesterLoopRequestV1 = z.infer<
  typeof universitySemesterLoopRequestSchema
>;

export const UNIVERSITY_SEMESTER_LOOP_ISSUE_CODES = Object.freeze([
  "schema.invalid",
  "child.invalid",
  "envelope.mismatch",
  "course.missing",
  "source.binding_mismatch",
  "projection.unexpected",
] as const);
export type UniversitySemesterLoopIssueCode =
  (typeof UNIVERSITY_SEMESTER_LOOP_ISSUE_CODES)[number];

export interface UniversitySemesterLoopIssue {
  readonly code: UniversitySemesterLoopIssueCode;
  readonly path: string;
  readonly message: string;
}

export interface UniversitySemesterLoopAuthority {
  readonly projectionClass: "fixture_only_university_semester_loop";
  readonly identityScopeAuthority: "caller_asserted_fixture_only";
  readonly actionSelectionBasis: "today_existing_learner_accepted_path_only";
  readonly sourceFactsMaySelectAction: false;
  readonly recommendationAllowed: false;
  readonly sessionStartAllowed: false;
  readonly persistenceAllowed: false;
  readonly evidenceClaimAllowed: false;
  readonly messageSendAllowed: false;
  readonly eventEmissionAllowed: false;
  readonly externalSideEffectsAllowed: false;
}

export type UniversitySemesterLoopProjectionStatus =
  | "invalid"
  | "source_review_required"
  | "recovery_required"
  | "learner_choice_required"
  | "protected_study_ready"
  | "world_review_required"
  | "path_complete"
  | "path_blocked";

export interface UniversitySemesterLoopProjectionV1 {
  readonly schemaVersion: typeof UNIVERSITY_SEMESTER_LOOP_PROJECTION_SCHEMA_VERSION;
  readonly status: UniversitySemesterLoopProjectionStatus;
  readonly scope: CourseSourceScopeV1 | null;
  readonly asOf: string | null;
  readonly termLabel: string | null;
  readonly courseLabel: string | null;
  readonly timeZone: string | null;
  readonly authority: UniversitySemesterLoopAuthority;
  readonly today: UniversityTodayProjectionV1 | null;
  readonly recoveryDraft: UniversityRecoveryProjectionV1 | null;
  readonly protectedStudy: UniversityProtectedStudyProjectionV1 | null;
  readonly issues: readonly UniversitySemesterLoopIssue[];
  readonly projectionDigest: string | null;
}
