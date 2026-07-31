import { z } from "zod";

import {
  type UniversityDegreeMapProjectionV1,
  type UniversityDegreeMapRequestV1,
  universityDegreeMapRequestSchema,
} from "../university-degree-map";
import {
  type UniversityLearningMapProjectionV1,
  type UniversityLearningMapRequestV1,
  universityLearningMapRequestSchema,
} from "../university-learning-map";

z.config({ jitless: true });

export const UNIVERSITY_STUDENT_CONTEXT_REQUEST_SCHEMA_VERSION =
  "university-student-context-request.v1" as const;
export const UNIVERSITY_STUDENT_CONTEXT_PROJECTION_SCHEMA_VERSION =
  "university-student-context-projection.v1" as const;

export const UNIVERSITY_STUDENT_CONTEXT_STATUSES = Object.freeze([
  "invalid",
  "review_required",
  "ready_for_inspection",
] as const);
export type UniversityStudentContextStatus =
  (typeof UNIVERSITY_STUDENT_CONTEXT_STATUSES)[number];

const opaqueBindingIdSchema = z.string().min(3).max(120).regex(
  /^[a-z0-9]+(?:[._-][a-z0-9]+)+$/,
);

/**
 * The binding is an opaque caller-owned correlation value. The projector
 * preserves it exactly and does not parse it into identity or institutional
 * authority.
 */
export const universityStudentContextBindingSchema = z.strictObject({
  bindingId: opaqueBindingIdSchema,
  ownership: z.literal("adult_learner_owned"),
});
export type UniversityStudentContextBindingV1 = z.infer<
  typeof universityStudentContextBindingSchema
>;

/**
 * The compositor accepts only strict raw child requests. It does not accept a
 * child projection, claimed status, score, action, rank, or recommendation.
 */
export const universityStudentContextRequestSchema = z.strictObject({
  schemaVersion: z.literal(UNIVERSITY_STUDENT_CONTEXT_REQUEST_SCHEMA_VERSION),
  contextBinding: universityStudentContextBindingSchema,
  degreeMapRequest: universityDegreeMapRequestSchema,
  learningMapRequest: universityLearningMapRequestSchema,
});

export interface UniversityStudentContextRequestV1 {
  readonly schemaVersion:
    typeof UNIVERSITY_STUDENT_CONTEXT_REQUEST_SCHEMA_VERSION;
  readonly contextBinding: UniversityStudentContextBindingV1;
  readonly degreeMapRequest: UniversityDegreeMapRequestV1;
  readonly learningMapRequest: UniversityLearningMapRequestV1;
}

export const UNIVERSITY_STUDENT_CONTEXT_ISSUE_CODES = Object.freeze([
  "schema.invalid",
  "child.invalid",
  "binding.course_mismatch",
  "projection.unexpected",
] as const);
export type UniversityStudentContextIssueCode =
  (typeof UNIVERSITY_STUDENT_CONTEXT_ISSUE_CODES)[number];

export interface UniversityStudentContextIssue {
  readonly code: UniversityStudentContextIssueCode;
  readonly path: string;
  readonly message: string;
}

export interface UniversityStudentContextAuthority {
  readonly projectionClass:
    "adult_learner_owned_student_context_inspection";
  readonly bindingAuthority: "caller_supplied_opaque_not_verified";
  readonly adultStatusAuthority: "self_attested_not_verified";
  readonly degreeAndLearningAxesMerged: false;
  readonly rankingAllowed: false;
  readonly recommendationAllowed: false;
  readonly globalActionSelectionAllowed: false;
  readonly readinessInferenceAllowed: false;
  readonly masteryInferenceAllowed: false;
  readonly persistenceAllowed: false;
  readonly networkAllowed: false;
  readonly eventEmissionAllowed: false;
}

export interface UniversityStudentContextProjectionV1 {
  readonly schemaVersion:
    typeof UNIVERSITY_STUDENT_CONTEXT_PROJECTION_SCHEMA_VERSION;
  readonly status: UniversityStudentContextStatus;
  readonly contextBinding: UniversityStudentContextBindingV1 | null;
  readonly degreeAxis: Readonly<UniversityDegreeMapProjectionV1> | null;
  readonly learningAxis: Readonly<UniversityLearningMapProjectionV1> | null;
  readonly authority: UniversityStudentContextAuthority;
  readonly issues: readonly UniversityStudentContextIssue[];
}
