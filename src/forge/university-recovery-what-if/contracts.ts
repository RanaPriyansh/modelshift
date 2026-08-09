import { z } from "zod";

import {
  universityRecoveryRequestSchema,
  type UniversityRecoveryProjectionV1,
  type UniversityRecoveryRequestV1,
} from "../university-recovery";

z.config({ jitless: true });

export const UNIVERSITY_RECOVERY_WHAT_IF_REQUEST_SCHEMA_VERSION =
  "university-recovery-what-if-request.v1" as const;
export const UNIVERSITY_RECOVERY_WHAT_IF_PROJECTION_SCHEMA_VERSION =
  "university-recovery-what-if-projection.v1" as const;

/**
 * This server-internal boundary accepts one raw Recovery request and one
 * available-time declaration. It accepts no projection, claimed status,
 * recommendation, plan command, or effect request.
 */
export const universityRecoveryWhatIfRequestSchema = z.strictObject({
  schemaVersion: z.literal(UNIVERSITY_RECOVERY_WHAT_IF_REQUEST_SCHEMA_VERSION),
  recoveryRequest: universityRecoveryRequestSchema,
  availableMinutes: z.number().int().min(0).max(10_080),
});

export interface UniversityRecoveryWhatIfRequestV1 {
  readonly schemaVersion: typeof UNIVERSITY_RECOVERY_WHAT_IF_REQUEST_SCHEMA_VERSION;
  readonly recoveryRequest: UniversityRecoveryRequestV1;
  readonly availableMinutes: number;
}

export const UNIVERSITY_RECOVERY_WHAT_IF_ISSUE_CODES = Object.freeze([
  "schema.invalid",
  "baseline.invalid",
  "source.review_required",
  "result.invalid",
  "projection.unexpected",
] as const);
export type UniversityRecoveryWhatIfIssueCode =
  (typeof UNIVERSITY_RECOVERY_WHAT_IF_ISSUE_CODES)[number];

export interface UniversityRecoveryWhatIfIssue {
  readonly code: UniversityRecoveryWhatIfIssueCode;
  readonly path: string;
  readonly message: string;
}

export interface UniversityRecoveryWhatIfAuthority {
  readonly identityAuthority: false;
  readonly tenantIsolationAuthority: false;
  readonly rightsEnforcementAuthority: false;
  readonly sourceAuthenticityAuthority: false;
  readonly institutionalCompletenessAuthority: false;
  readonly capacityDeclarationAuthority: "learner_fixture_only";
  readonly protectedBufferChangeAllowed: false;
  readonly courseworkChangeAllowed: false;
  readonly deadlineChangeAllowed: false;
  readonly effortChangeAllowed: false;
  readonly dispositionChangeAllowed: false;
  readonly recommendationAllowed: false;
  readonly planApplicationAllowed: false;
  readonly sessionStartAllowed: false;
  readonly persistenceAllowed: false;
  readonly evidenceClaimAllowed: false;
  readonly messageSendAllowed: false;
  readonly eventEmissionAllowed: false;
  readonly externalSideEffectsAllowed: false;
}

export type UniversityRecoveryWhatIfStatus =
  | "invalid"
  | "source_review_required"
  | "draft_ready"
  | "learner_choice_required"
  | "human_help_required";

export interface UniversityRecoveryWhatIfProjectionV1 {
  readonly schemaVersion:
    typeof UNIVERSITY_RECOVERY_WHAT_IF_PROJECTION_SCHEMA_VERSION;
  readonly projectionClass:
    "development_only_transient_recovery_capacity_what_if";
  readonly status: UniversityRecoveryWhatIfStatus;
  readonly authority: UniversityRecoveryWhatIfAuthority;
  readonly baseline: Readonly<{
    availableMinutes: number;
    protectedBufferMinutes: number;
    lockedFieldsDigest: string;
    recoveryProjectionDigest: string;
  }> | null;
  readonly selection: Readonly<{
    availableMinutes: number;
  }> | null;
  readonly recovery: Readonly<UniversityRecoveryProjectionV1> | null;
  readonly issues: readonly UniversityRecoveryWhatIfIssue[];
  readonly projectionDigest: string | null;
}
