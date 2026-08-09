import { z } from "zod";

import type {
  CourseSourceCandidateProjection,
  CourseSourceReconciliationRequestV1,
} from "../course-sources";
import { forgeEventDigestSchema } from "../events";
import type { UniversityStudentContextRequestV2 } from "../university-student-context";

z.config({ jitless: true });

export const UNIVERSITY_SOURCE_MAP_CONTEXT_REQUEST_SCHEMA_VERSION =
  "university-source-map-context-request.v2" as const;
export const UNIVERSITY_SOURCE_MAP_CONTEXT_PROJECTION_SCHEMA_VERSION =
  "university-source-map-context-projection.v2" as const;

export const UNIVERSITY_SOURCE_MAP_CONTEXT_STATUSES = Object.freeze([
  "invalid",
  "review_required",
  "bound_review_candidate",
] as const);
export type UniversitySourceMapContextStatus =
  (typeof UNIVERSITY_SOURCE_MAP_CONTEXT_STATUSES)[number];

const courseIdSchema = z.string().min(3).max(160).regex(
  /^course\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/,
);
const degreeSourceRefSchema = z.string().min(3).max(120).regex(
  /^source\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/,
);
const sourceRevisionIdSchema = z.string().min(3).max(180).regex(
  /^course-source-revision\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/,
);
const candidateIdSchema = z.string().min(3).max(180).regex(
  /^course-source-candidate\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/,
);
const claimKeySchema = z.string().min(3).max(180).regex(
  /^course-claim\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/,
);
const conceptRefSchema = z.string().min(3).max(120).regex(
  /^concept\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/,
);

/**
 * Every identifier is exact. This schema does not trim or normalize strings.
 */
export const universitySourceMapBindingSchema = z.strictObject({
  courseId: courseIdSchema,
  degreeSourceRef: degreeSourceRefSchema,
  sourceRevisionId: sourceRevisionIdSchema,
  sourceDigest: forgeEventDigestSchema,
  conceptRef: conceptRefSchema,
  candidateId: candidateIdSchema,
  claimKey: claimKeySchema,
});
export type UniversitySourceMapBindingV1 = z.infer<
  typeof universitySourceMapBindingSchema
>;

const requiredRawChildSchema = z.unknown().refine(
  (value) => value !== undefined,
  "A raw child request is required.",
);

/**
 * The child requests remain raw at this boundary. The projector recomputes
 * both child projections after it detaches the complete input graph.
 */
export const universitySourceMapContextRequestSchema = z.strictObject({
  schemaVersion: z.literal(
    UNIVERSITY_SOURCE_MAP_CONTEXT_REQUEST_SCHEMA_VERSION,
  ),
  studentContextRequest: requiredRawChildSchema,
  courseSourceReconciliationRequest: requiredRawChildSchema,
  bindings: z.array(universitySourceMapBindingSchema).min(1).max(256),
});

export interface UniversitySourceMapContextRequestV2 {
  readonly schemaVersion:
    typeof UNIVERSITY_SOURCE_MAP_CONTEXT_REQUEST_SCHEMA_VERSION;
  readonly studentContextRequest: UniversityStudentContextRequestV2;
  readonly courseSourceReconciliationRequest:
    CourseSourceReconciliationRequestV1;
  readonly bindings: readonly UniversitySourceMapBindingV1[];
}

export const UNIVERSITY_SOURCE_MAP_CONTEXT_ISSUE_CODES = Object.freeze([
  "schema.invalid",
  "student_context.invalid",
  "course_source.invalid",
  "binding.raw_identity_mismatch",
  "binding.course_mismatch",
  "binding.degree_source_missing",
  "binding.degree_source_digest_mismatch",
  "binding.source_revision_missing",
  "binding.source_digest_mismatch",
  "binding.candidate_missing",
  "binding.candidate_source_mismatch",
  "binding.claim_mismatch",
  "binding.concept_missing",
  "binding.duplicate",
  "map.review_required",
  "map.concept_unbound",
  "source.reconciliation_review_required",
  "source.coverage_review_required",
  "source.freshness_review_required",
  "source.candidate_review_required",
  "source.candidate_rejected",
  "source.duplicate_review_required",
  "source.conflict_review_required",
  "source.fact_unbound",
  "projection.unexpected",
] as const);
export type UniversitySourceMapContextIssueCode =
  (typeof UNIVERSITY_SOURCE_MAP_CONTEXT_ISSUE_CODES)[number];

export interface UniversitySourceMapContextIssue {
  readonly code: UniversitySourceMapContextIssueCode;
  readonly path: string;
  readonly message: string;
}

export interface UniversityDegreeSourceInspectionRecordV1 {
  readonly courseId: string;
  readonly degreeSourceRef: string;
  readonly sourceRevisionId: string;
  readonly sourceDigest: string;
  readonly degreeCourseState:
    | "completed"
    | "in_progress"
    | "planned"
    | null;
  readonly observedAt: string;
  readonly freshnessReviewDueAt: string | null;
  readonly freshnessState:
    | "current_within_declared_window"
    | "stale"
    | "unknown";
  readonly coverageState:
    | "unknown"
    | "partial"
    | "connected_sources_reviewed";
  readonly reconciliationStatus:
    | "review_required"
    | "connected_sources_reviewed";
  readonly bindingState: "review_required" | "bound_review_candidate";
  readonly sourceAuthenticity: "not_established";
  readonly institutionalCompleteness: "not_established";
}

export interface UniversityLearningSourceInspectionRecordV1 {
  readonly courseId: string;
  readonly conceptRef: string;
  readonly candidateId: string;
  readonly claimKey: string;
  readonly sourceRevisionId: string;
  readonly sourceDigest: string;
  readonly factKind: CourseSourceCandidateProjection["originalFact"]["kind"];
  readonly extractionState: CourseSourceCandidateProjection["extractionState"];
  readonly factAuthority: CourseSourceCandidateProjection["factAuthority"];
  readonly bindingState: "review_required" | "bound_review_candidate";
  readonly conceptAssociationAuthority:
    "caller_supplied_not_verified";
  readonly learningContentGrounding: "not_established";
  readonly answerGenerationAllowed: false;
  readonly masteryInferenceAllowed: false;
}

export interface UniversitySourceMapContextAuthority {
  readonly projectionClass:
    "learner_declared_source_map_inspection";
  readonly bindingAuthority: "caller_supplied_not_verified";
  readonly identityAuthority: "not_established";
  readonly identityEstablished: false;
  readonly adultStatusAuthority: "self_attested_not_verified";
  readonly tenantIsolationAuthority: "not_established";
  readonly sourceClass: "learner_connected_source_copy";
  readonly sourceAuthenticity: "not_established";
  readonly institutionalCompleteness: "not_established";
  readonly learningContentGrounding: "not_established";
  readonly conceptSourceGroundingEstablished: false;
  readonly persistenceAllowed: false;
  readonly eventEmissionAllowed: false;
  readonly providerAllowed: false;
  readonly networkAllowed: false;
  readonly recommendationAllowed: false;
  readonly answerGenerationAllowed: false;
  readonly masteryInferenceAllowed: false;
  readonly pathActivationAllowed: false;
  readonly externalSideEffectsAllowed: false;
}

export interface UniversitySourceMapContextProjectionV2 {
  readonly schemaVersion:
    typeof UNIVERSITY_SOURCE_MAP_CONTEXT_PROJECTION_SCHEMA_VERSION;
  readonly status: UniversitySourceMapContextStatus;
  readonly courseId: string | null;
  readonly asOf: string | null;
  readonly studentContextStatus:
    | "review_required"
    | "ready_for_inspection"
    | null;
  readonly courseSourceStatus:
    | "review_required"
    | "connected_sources_reviewed"
    | null;
  readonly degreeSources:
    readonly UniversityDegreeSourceInspectionRecordV1[];
  readonly learningSources:
    readonly UniversityLearningSourceInspectionRecordV1[];
  readonly unboundCandidateIds: readonly string[];
  readonly unboundConceptRefs: readonly string[];
  readonly authority: UniversitySourceMapContextAuthority;
  readonly issues: readonly UniversitySourceMapContextIssue[];
  readonly projectionDigest: string | null;
}
