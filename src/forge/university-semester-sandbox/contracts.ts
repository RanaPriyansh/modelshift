import { z } from "zod";

import {
  courseSourceDecisionSchema,
  type CourseSourceDecisionV1,
} from "../course-sources";
import {
  universitySemesterLoopRequestSchema,
  type UniversitySemesterLoopProjectionV1,
  type UniversitySemesterLoopRequestV1,
} from "../university-semester-loop";

z.config({ jitless: true });

export const UNIVERSITY_SEMESTER_SANDBOX_REQUEST_SCHEMA_VERSION =
  "university-semester-sandbox-request.v1" as const;
export const UNIVERSITY_SEMESTER_SANDBOX_PROJECTION_SCHEMA_VERSION =
  "university-semester-sandbox-projection.v1" as const;

/**
 * This development-only boundary accepts raw inputs, not a caller's claimed
 * status, child projection, readiness flag, or effect request.
 */
export const universitySemesterSandboxRequestSchema = z.strictObject({
  schemaVersion: z.literal(UNIVERSITY_SEMESTER_SANDBOX_REQUEST_SCHEMA_VERSION),
  semesterLoopRequest: universitySemesterLoopRequestSchema,
  sourceDecisions: z.array(courseSourceDecisionSchema).max(512),
});

export interface UniversitySemesterSandboxRequestV1 {
  readonly schemaVersion: typeof UNIVERSITY_SEMESTER_SANDBOX_REQUEST_SCHEMA_VERSION;
  readonly semesterLoopRequest: UniversitySemesterLoopRequestV1;
  readonly sourceDecisions: readonly CourseSourceDecisionV1[];
}

export const UNIVERSITY_SEMESTER_SANDBOX_ISSUE_CODES = Object.freeze([
  "schema.invalid",
  "today.invalid",
  "recovery.invalid",
  "source.invalid",
  "source.course_missing",
  "source.binding_mismatch",
  "semester.invalid",
  "projection.unexpected",
] as const);
export type UniversitySemesterSandboxIssueCode =
  (typeof UNIVERSITY_SEMESTER_SANDBOX_ISSUE_CODES)[number];

export interface UniversitySemesterSandboxIssue {
  readonly code: UniversitySemesterSandboxIssueCode;
  readonly path: string;
  readonly message: string;
}

/**
 * Every authority and side-effect bit is deliberately false. This module is a
 * transient development compositor, not source review, identity, path, study,
 * evidence, persistence, or external-operation authority.
 */
export interface UniversitySemesterSandboxAuthority {
  readonly identityAuthority: false;
  readonly tenantIsolationAuthority: false;
  readonly sourceAuthenticityAuthority: false;
  readonly institutionalCompletenessAuthority: false;
  readonly sourceReviewAuthority: false;
  readonly actionSelectionAuthority: false;
  readonly recommendationAllowed: false;
  readonly sessionStartAllowed: false;
  readonly persistenceAllowed: false;
  readonly evidenceClaimAllowed: false;
  readonly messageSendAllowed: false;
  readonly eventEmissionAllowed: false;
  readonly externalSideEffectsAllowed: false;
}

export type UniversitySemesterSandboxStatus =
  | "invalid"
  | "review_required"
  | "ready"
  | "recovery_required"
  | "learner_choice_required"
  | "world_review_required"
  | "path_complete"
  | "path_blocked";

export interface UniversitySemesterSandboxProjectionV1 {
  readonly schemaVersion: typeof UNIVERSITY_SEMESTER_SANDBOX_PROJECTION_SCHEMA_VERSION;
  readonly projectionClass: "development_only_transient_semester_sandbox";
  readonly status: UniversitySemesterSandboxStatus;
  readonly authority: UniversitySemesterSandboxAuthority;
  readonly sourceDecisionCount: number | null;
  readonly semesterLoop: Readonly<UniversitySemesterLoopProjectionV1> | null;
  readonly issues: readonly UniversitySemesterSandboxIssue[];
  readonly projectionDigest: string | null;
}
