import { z } from "zod";

import type { UniversityRecoveryProjectionV1 } from "../university-recovery";
import type {
  UniversitySemesterLoopProjectionStatus,
} from "../university-semester-loop";
import type { UniversityTodayProjectionStatus } from "../university-today";

z.config({ jitless: true });

export const UNIVERSITY_SEMESTER_OVERVIEW_REQUEST_SCHEMA_VERSION =
  "university-semester-overview-request.v1" as const;
export const UNIVERSITY_SEMESTER_OVERVIEW_PROJECTION_SCHEMA_VERSION =
  "university-semester-overview-projection.v1" as const;

export const universitySemesterOverviewCourseRequestSchema = z.strictObject({
  todayRequest: z.unknown(),
  worldPack: z.unknown(),
});

export const universitySemesterOverviewRequestSchema = z.strictObject({
  schemaVersion: z.literal(
    UNIVERSITY_SEMESTER_OVERVIEW_REQUEST_SCHEMA_VERSION,
  ),
  recoveryRequest: z.unknown(),
  courses: z.array(universitySemesterOverviewCourseRequestSchema).min(1).max(8),
});

export type UniversitySemesterOverviewRequestV1 = z.infer<
  typeof universitySemesterOverviewRequestSchema
>;

export const UNIVERSITY_SEMESTER_OVERVIEW_ISSUE_CODES = Object.freeze([
  "schema.invalid",
  "recovery.invalid",
  "course.invalid",
  "course.duplicate",
  "envelope.mismatch",
  "course_set.mismatch",
  "course_label.mismatch",
  "source.binding_mismatch",
  "child.invalid",
  "projection.unexpected",
] as const);

export type UniversitySemesterOverviewIssueCode =
  (typeof UNIVERSITY_SEMESTER_OVERVIEW_ISSUE_CODES)[number];

export interface UniversitySemesterOverviewIssue {
  readonly code: UniversitySemesterOverviewIssueCode;
  readonly path: string;
  readonly message: string;
}

export interface UniversitySemesterOverviewAuthority {
  readonly projectionClass: "fixture_only_semester_inspection";
  readonly orderBasis: "course_id_not_priority";
  readonly identityScopeAuthority: "not_established";
  readonly tenantIsolationAuthority: "not_established";
  readonly rightsEnforcementAuthority: "not_established";
  readonly institutionalCompleteness: "not_established";
  readonly termFeasibilityAllowed: false;
  readonly courseSelectionAllowed: false;
  readonly globalActionAllowed: false;
  readonly recommendationAllowed: false;
  readonly schedulingAllowed: false;
  readonly providerCallAllowed: false;
  readonly sessionStartAllowed: false;
  readonly persistenceAllowed: false;
  readonly evidenceClaimAllowed: false;
  readonly messageSendAllowed: false;
  readonly eventEmissionAllowed: false;
  readonly externalSideEffectsAllowed: false;
}

export interface UniversitySemesterOverviewTermRecovery {
  readonly status: Exclude<
    UniversityRecoveryProjectionV1["status"],
    "invalid"
  >;
  readonly projectionDigest: string;
}

export interface UniversitySemesterOverviewCourse {
  readonly courseId: string;
  readonly courseLabel: string;
  readonly todayStatus: Exclude<UniversityTodayProjectionStatus, "invalid">;
  readonly semesterLoopStatus: Exclude<
    UniversitySemesterLoopProjectionStatus,
    "invalid"
  >;
  readonly todayProjectionDigest: string;
  readonly semesterLoopDigest: string;
}

export type UniversitySemesterOverviewProjectionStatus =
  | "invalid"
  | "ready_for_inspection";

export interface UniversitySemesterOverviewProjectionV1 {
  readonly schemaVersion:
    typeof UNIVERSITY_SEMESTER_OVERVIEW_PROJECTION_SCHEMA_VERSION;
  readonly status: UniversitySemesterOverviewProjectionStatus;
  readonly authority: UniversitySemesterOverviewAuthority;
  readonly termRecovery: UniversitySemesterOverviewTermRecovery | null;
  readonly courses: readonly UniversitySemesterOverviewCourse[];
  readonly issues: readonly UniversitySemesterOverviewIssue[];
  readonly projectionDigest: string | null;
}
