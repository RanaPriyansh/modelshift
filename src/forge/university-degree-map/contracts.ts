import { z } from "zod";

z.config({ jitless: true });

export const UNIVERSITY_DEGREE_MAP_REQUEST_SCHEMA_VERSION =
  "university-degree-map-request.v1" as const;
export const UNIVERSITY_DEGREE_MAP_PROJECTION_SCHEMA_VERSION =
  "university-degree-map-projection.v1" as const;

export const UNIVERSITY_DEGREE_MAP_STATUSES = Object.freeze([
  "invalid",
  "review_required",
  "ready_for_inspection",
] as const);

export const UNIVERSITY_DEGREE_MAP_ISSUE_CODES = Object.freeze([
  "schema.invalid",
  "sources.duplicate_ref",
  "sources.missing_or_unbound",
  "courses.duplicate_id",
  "courses.conflicting_state",
  "courses.duplicate_prerequisite",
  "requirements.duplicate_id",
  "requirements.duplicate_course_reference",
  "references.unknown_course",
  "prerequisites.cycle",
  "prerequisites.active_course_unmet",
] as const);

export type UniversityDegreeMapIssueCode =
  (typeof UNIVERSITY_DEGREE_MAP_ISSUE_CODES)[number];
export type UniversityDegreeMapStatus =
  (typeof UNIVERSITY_DEGREE_MAP_STATUSES)[number];

export interface UniversityDegreeMapIssue {
  readonly code: UniversityDegreeMapIssueCode;
  readonly path: string;
  readonly message: string;
}

const opaqueIdSchema = z.string().min(3).max(96).regex(
  /^[a-z0-9]+(?:[._-][a-z0-9]+)+$/,
);
const sourceRefSchema = z.string().min(3).max(120).regex(
  /^source\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/,
);
const digestSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);

const sourceSchema = z.strictObject({
  sourceRef: sourceRefSchema,
  declaredSourceDigest: digestSchema,
  authority: z.literal("learner_supplied_not_verified"),
});

const courseSchema = z.strictObject({
  courseId: opaqueIdSchema,
  creditUnits: z.number().int().min(0).max(60),
  state: z.enum(["completed", "in_progress", "planned"]),
  prerequisiteCourseIds: z.array(opaqueIdSchema).max(32),
  sourceRef: sourceRefSchema.optional(),
});

const courseRequirementSchema = z.strictObject({
  requirementId: opaqueIdSchema,
  kind: z.literal("required_course"),
  courseId: opaqueIdSchema,
  sourceRef: sourceRefSchema.optional(),
});

const creditRequirementSchema = z.strictObject({
  requirementId: opaqueIdSchema,
  kind: z.literal("minimum_credits"),
  minimumCreditUnits: z.number().int().min(1).max(500),
  eligibleCourseIds: z.array(opaqueIdSchema).min(1).max(256),
  sourceRef: sourceRefSchema.optional(),
});

export const universityDegreeMapRequestSchema = z.strictObject({
  schemaVersion: z.literal(UNIVERSITY_DEGREE_MAP_REQUEST_SCHEMA_VERSION),
  ownership: z.strictObject({
    ownerClass: z.literal("adult_learner"),
    control: z.literal("learner_managed"),
    adultAttestation: z.literal(true),
  }),
  program: z.strictObject({
    programRef: opaqueIdSchema,
    creditUnit: z.literal("institution_credit_unit"),
    sourceRef: sourceRefSchema.optional(),
  }),
  sourceRegistry: z.array(sourceSchema).max(256),
  courses: z.array(courseSchema).max(256),
  requirements: z.array(
    z.discriminatedUnion("kind", [
      courseRequirementSchema,
      creditRequirementSchema,
    ]),
  ).max(128),
});

export type UniversityDegreeMapRequestV1 = z.infer<
  typeof universityDegreeMapRequestSchema
>;

export interface UniversityDegreeMapCourseProjection {
  readonly courseId: string;
  readonly creditUnits: number;
  readonly state: "completed" | "in_progress" | "planned";
  readonly prerequisiteCourseIds: readonly string[];
  readonly unmetPrerequisiteCourseIds: readonly string[];
}

export interface UniversityDegreeMapRequirementProjection {
  readonly requirementId: string;
  readonly kind: "required_course" | "minimum_credits";
  readonly met: boolean;
  readonly earnedCreditUnits: number;
  readonly requiredCreditUnits: number;
  readonly referencedCourseIds: readonly string[];
}

export interface UniversityDegreeMapProjectionV1 {
  readonly schemaVersion:
    typeof UNIVERSITY_DEGREE_MAP_PROJECTION_SCHEMA_VERSION;
  readonly status: UniversityDegreeMapStatus;
  readonly programRef: string | null;
  readonly courses: readonly UniversityDegreeMapCourseProjection[];
  readonly requirements: readonly UniversityDegreeMapRequirementProjection[];
  readonly creditTotals: {
    readonly completed: number;
    readonly inProgress: number;
    readonly planned: number;
    readonly allDeclared: number;
  } | null;
  readonly unmetRequirementIds: readonly string[];
  readonly flags: {
    readonly duplicateSourceRefs: readonly string[];
    readonly duplicateCourseIds: readonly string[];
    readonly conflictingStateCourseIds: readonly string[];
    readonly duplicatePrerequisiteCourseIds: readonly string[];
    readonly duplicateRequirementIds: readonly string[];
    readonly duplicateRequirementCourseReferenceIds: readonly string[];
    readonly unknownCourseIds: readonly string[];
    readonly prerequisiteCycleCourseIds: readonly string[];
    readonly activeCourseUnmetPrerequisiteIds: readonly string[];
    readonly missingSources: {
      readonly program: boolean;
      readonly courseIds: readonly string[];
      readonly requirementIds: readonly string[];
    };
  };
  readonly authority: {
    readonly projectionClass: "adult_learner_owned_degree_map_inspection";
    readonly adultStatusAuthority: "self_attested_not_verified";
    readonly sourceAuthority: "learner_supplied_not_verified";
    readonly rankingAllowed: false;
    readonly recommendationAllowed: false;
    readonly persistenceAllowed: false;
    readonly networkAllowed: false;
    readonly eventEmissionAllowed: false;
  };
  readonly issues: readonly UniversityDegreeMapIssue[];
}
