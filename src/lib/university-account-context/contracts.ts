import "server-only";

import { z } from "zod";

import {
  type UniversityDegreeMapProjectionV1,
  type UniversityDegreeMapRequestV1,
  universityDegreeMapRequestSchema,
} from "@/src/forge/university-degree-map";
import {
  type UniversityLearningMapProjectionV1,
  type UniversityLearningMapRequestV1,
  universityLearningMapRequestSchema,
} from "@/src/forge/university-learning-map";
import type {
  UniversityStudentContextBindingV1,
  UniversityStudentContextStatus,
} from "@/src/forge/university-student-context";

z.config({ jitless: true });

export const UNIVERSITY_ACCOUNT_CONTEXT_REQUEST_VERSION =
  "university-account-context-request.v1" as const;
export const UNIVERSITY_ACCOUNT_CONTEXT_RESULT_VERSION =
  "university-account-context-result.v1" as const;

export const UNIVERSITY_ACCOUNT_CONTEXT_STATUSES = Object.freeze([
  "unavailable",
  "invalid",
  "bound_for_inspection",
] as const);
export type UniversityAccountContextStatus =
  (typeof UNIVERSITY_ACCOUNT_CONTEXT_STATUSES)[number];

/**
 * A caller supplies only learner declarations. Account, age, tenant, binding,
 * and authority values are not part of this request boundary.
 */
export const universityAccountContextRequestSchema = z.strictObject({
  schemaVersion: z.literal(UNIVERSITY_ACCOUNT_CONTEXT_REQUEST_VERSION),
  degreeMapRequest: universityDegreeMapRequestSchema,
  learningMapRequest: universityLearningMapRequestSchema,
});

export interface UniversityAccountContextRequestV1 {
  readonly schemaVersion: typeof UNIVERSITY_ACCOUNT_CONTEXT_REQUEST_VERSION;
  readonly degreeMapRequest: UniversityDegreeMapRequestV1;
  readonly learningMapRequest: UniversityLearningMapRequestV1;
}

export const UNIVERSITY_ACCOUNT_CONTEXT_ISSUE_CODES = Object.freeze([
  "input.invalid",
  "identity.reader_failed",
  "identity.record_invalid",
  "student_context.invalid",
  "adapter.unexpected",
] as const);
export type UniversityAccountContextIssueCode =
  (typeof UNIVERSITY_ACCOUNT_CONTEXT_ISSUE_CODES)[number];

export interface UniversityAccountContextIssue {
  readonly code: UniversityAccountContextIssueCode;
  readonly path: string;
  readonly message: string;
}

export type UniversityAccountContextInvalidReason =
  | "input_invalid"
  | "identity_reader_failed"
  | "identity_record_invalid"
  | "student_context_invalid"
  | "adapter_unexpected";

export interface UniversityAccountContextAuthority {
  readonly accountBindingAuthority:
    | "not_established"
    | "authenticated_active_adult_cloud_profile";
  readonly bindingIdentifierAuthority:
    | "not_established"
    | "server_derived_context_specific_hmac_sha256_v1";
  readonly bindingKeyAuthority:
    | "not_established"
    | "server_injected_minimum_32_byte_key";
  readonly ageVerificationAuthority: "not_established";
  readonly learnerContentAuthority: "learner_declared_not_verified";
  readonly institutionalAuthorityEstablished: false;
  readonly tenantAuthorityEstablished: false;
  readonly persistenceAllowed: false;
  readonly eventEmissionAllowed: false;
  readonly providerCallAllowed: false;
  readonly recommendationAllowed: false;
  readonly answerGenerationAllowed: false;
  readonly masteryInferenceAllowed: false;
  readonly networkBeyondIdentityReaderAllowed: false;
  readonly externalEffectsAllowed: false;
}

export interface UniversityAccountBoundInspectionContext {
  readonly canonicalStatus: Exclude<
    UniversityStudentContextStatus,
    "invalid"
  >;
  readonly contextBinding: UniversityStudentContextBindingV1;
  readonly degreeAxis: Readonly<UniversityDegreeMapProjectionV1>;
  readonly learningAxis: Readonly<UniversityLearningMapProjectionV1>;
}

export interface UniversityAccountContextUnavailableResult {
  readonly schemaVersion: typeof UNIVERSITY_ACCOUNT_CONTEXT_RESULT_VERSION;
  readonly status: "unavailable";
  readonly reason:
    | "cloud_identity_unavailable"
    | "binding_key_unavailable"
    | "binding_key_invalid";
  readonly context: null;
  readonly authority: UniversityAccountContextAuthority;
  readonly issues: readonly [];
}

export interface UniversityAccountContextInvalidResult {
  readonly schemaVersion: typeof UNIVERSITY_ACCOUNT_CONTEXT_RESULT_VERSION;
  readonly status: "invalid";
  readonly reason: UniversityAccountContextInvalidReason;
  readonly context: null;
  readonly authority: UniversityAccountContextAuthority;
  readonly issues: readonly UniversityAccountContextIssue[];
}

export interface UniversityAccountContextBoundResult {
  readonly schemaVersion: typeof UNIVERSITY_ACCOUNT_CONTEXT_RESULT_VERSION;
  readonly status: "bound_for_inspection";
  readonly reason: null;
  readonly context: UniversityAccountBoundInspectionContext;
  readonly authority: UniversityAccountContextAuthority;
  readonly issues: readonly [];
}

export type UniversityAccountContextResult =
  | UniversityAccountContextUnavailableResult
  | UniversityAccountContextInvalidResult
  | UniversityAccountContextBoundResult;
