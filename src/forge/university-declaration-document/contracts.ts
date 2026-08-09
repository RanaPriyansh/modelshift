import { z } from "zod";

import {
  UNIVERSITY_DEGREE_MAP_PROJECTION_SCHEMA_VERSION,
  UNIVERSITY_DEGREE_MAP_REQUEST_SCHEMA_VERSION,
  type UniversityDegreeMapRequestV2,
  universityDegreeMapRequestSchema,
} from "../university-degree-map";
import {
  UNIVERSITY_LEARNING_MAP_PROJECTION_VERSION,
  UNIVERSITY_LEARNING_MAP_REQUEST_VERSION,
  type UniversityLearningMapRequestV2,
  universityLearningMapRequestSchema,
} from "../university-learning-map";

z.config({ jitless: true });

export const UNIVERSITY_DECLARATION_DOCUMENT_REQUEST_SCHEMA_VERSION =
  "university-declaration-document-request.v1" as const;
export const UNIVERSITY_DECLARATION_DOCUMENT_SCHEMA_VERSION =
  "university-declaration-document.v1" as const;
export const UNIVERSITY_DECLARATION_DOCUMENT_RESULT_SCHEMA_VERSION =
  "university-declaration-document-result.v1" as const;
export const UNIVERSITY_DECLARATION_DOCUMENT_CANONICALIZER_VERSION =
  "university-declaration-document-canonicalizer.v1" as const;
export const UNIVERSITY_DECLARATION_DOCUMENT_DIGEST_DOMAIN =
  "forge.university-declaration-document.v1" as const;

export const UNIVERSITY_DECLARATION_DOCUMENT_STATUSES = Object.freeze([
  "invalid",
  "review_required",
  "ready_for_inspection",
] as const);

export type UniversityDeclarationDocumentStatus =
  (typeof UNIVERSITY_DECLARATION_DOCUMENT_STATUSES)[number];

/**
 * This request accepts complete raw declarations only. It has no identity,
 * revision, persistence, recommendation, action, or caller-projected field.
 */
export const universityDeclarationDocumentRequestSchema = z.strictObject({
  schemaVersion: z.literal(
    UNIVERSITY_DECLARATION_DOCUMENT_REQUEST_SCHEMA_VERSION,
  ),
  degreeMapRequest: universityDegreeMapRequestSchema,
  learningMapRequest: universityLearningMapRequestSchema,
});

export interface UniversityDeclarationDocumentRequestV1 {
  readonly schemaVersion:
    typeof UNIVERSITY_DECLARATION_DOCUMENT_REQUEST_SCHEMA_VERSION;
  readonly degreeMapRequest: UniversityDegreeMapRequestV2;
  readonly learningMapRequest: UniversityLearningMapRequestV2;
}

export const UNIVERSITY_DECLARATION_DOCUMENT_ISSUE_CODES = Object.freeze([
  "schema.invalid",
  "child.invalid",
  "linkage.course_mismatch",
  "degree.review_required",
  "learning.review_required",
  "projection.unexpected",
] as const);

export type UniversityDeclarationDocumentIssueCode =
  (typeof UNIVERSITY_DECLARATION_DOCUMENT_ISSUE_CODES)[number];

export interface UniversityDeclarationDocumentIssue {
  readonly code: UniversityDeclarationDocumentIssueCode;
  readonly path: string;
  readonly message: string;
}

export interface UniversityDeclarationDocumentV1 {
  readonly schemaVersion: typeof UNIVERSITY_DECLARATION_DOCUMENT_SCHEMA_VERSION;
  readonly canonicalizerVersion:
    typeof UNIVERSITY_DECLARATION_DOCUMENT_CANONICALIZER_VERSION;
  readonly degreeMapRequestSchemaVersion:
    typeof UNIVERSITY_DEGREE_MAP_REQUEST_SCHEMA_VERSION;
  readonly learningMapRequestSchemaVersion:
    typeof UNIVERSITY_LEARNING_MAP_REQUEST_VERSION;
  readonly degreeMapProjectionSchemaVersion:
    typeof UNIVERSITY_DEGREE_MAP_PROJECTION_SCHEMA_VERSION;
  readonly learningMapProjectionSchemaVersion:
    typeof UNIVERSITY_LEARNING_MAP_PROJECTION_VERSION;
  readonly degreeMapRequest: UniversityDegreeMapRequestV2;
  readonly learningMapRequest: UniversityLearningMapRequestV2;
  readonly documentDigest: `sha256:${string}`;
}

export interface UniversityDeclarationDocumentInspection {
  readonly status: UniversityDeclarationDocumentStatus;
  readonly issues: readonly UniversityDeclarationDocumentIssue[];
}

export interface UniversityDeclarationDocumentAuthority {
  readonly ownerAuthorityEstablished: false;
  readonly tenantAuthorityEstablished: false;
  readonly adultStatusAuthority: "self_attested_not_verified";
  readonly adultEntitlementEstablished: false;
  readonly institutionalAuthorityEstablished: false;
  readonly sourceAuthorityEstablished: false;
  readonly persistenceAllowed: false;
  readonly networkAllowed: false;
  readonly eventEmissionAllowed: false;
  readonly providerCallAllowed: false;
  readonly identityAuthorityEstablished: false;
  readonly recommendationAllowed: false;
  readonly masteryInferenceAllowed: false;
  readonly tutoringAllowed: false;
  readonly answerGenerationAllowed: false;
  readonly externalEffectsAllowed: false;
}

export interface UniversityDeclarationDocumentResult {
  readonly schemaVersion:
    typeof UNIVERSITY_DECLARATION_DOCUMENT_RESULT_SCHEMA_VERSION;
  readonly document: Readonly<UniversityDeclarationDocumentV1> | null;
  readonly inspection: UniversityDeclarationDocumentInspection;
  readonly authority: UniversityDeclarationDocumentAuthority;
}
