import { z } from "zod";

import {
  type UniversityDegreeMapProjectionV2,
  type UniversityDegreeMapRequestV2,
  universityDegreeMapRequestSchema,
} from "../university-degree-map";
import {
  type UniversityLearningMapProjectionV2,
  type UniversityLearningMapRequestV2,
  universityLearningMapRequestSchema,
} from "../university-learning-map";

z.config({ jitless: true });

export const UNIVERSITY_STUDENT_CONTEXT_REQUEST_SCHEMA_VERSION =
  "university-student-context-request.v2" as const;
export const UNIVERSITY_STUDENT_CONTEXT_PROJECTION_SCHEMA_VERSION =
  "university-student-context-projection.v2" as const;

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
 * The binding is an opaque caller-supplied correlation value. The projector
 * preserves it exactly. The value establishes no ownership, identity, or
 * institutional authority.
 */
export const universityStudentContextBindingSchema = z.strictObject({
  bindingId: opaqueBindingIdSchema,
  ownershipDeclaration: z.literal("adult_learner_self_attested"),
});
export type UniversityStudentContextBindingV2 = z.infer<
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

export interface UniversityStudentContextRequestV2 {
  readonly schemaVersion:
    typeof UNIVERSITY_STUDENT_CONTEXT_REQUEST_SCHEMA_VERSION;
  readonly contextBinding: UniversityStudentContextBindingV2;
  readonly degreeMapRequest: UniversityDegreeMapRequestV2;
  readonly learningMapRequest: UniversityLearningMapRequestV2;
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
    "learner_declared_student_context_inspection";
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

export interface UniversityStudentContextProjectionV2 {
  readonly schemaVersion:
    typeof UNIVERSITY_STUDENT_CONTEXT_PROJECTION_SCHEMA_VERSION;
  readonly status: UniversityStudentContextStatus;
  readonly contextBinding: UniversityStudentContextBindingV2 | null;
  readonly degreeAxis: Readonly<UniversityDegreeMapProjectionV2> | null;
  readonly learningAxis: Readonly<UniversityLearningMapProjectionV2> | null;
  readonly authority: UniversityStudentContextAuthority;
  readonly issues: readonly UniversityStudentContextIssue[];
}
