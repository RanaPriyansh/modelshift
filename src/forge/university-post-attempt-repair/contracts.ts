export const UNIVERSITY_POST_ATTEMPT_REPAIR_REQUEST_SCHEMA_VERSION =
  "university-post-attempt-repair-request.v1" as const;
export const UNIVERSITY_POST_ATTEMPT_REPAIR_PROJECTION_SCHEMA_VERSION =
  "university-post-attempt-repair-projection.v1" as const;

export type UniversityPostAttemptRepairProjectionStatus =
  | "invalid"
  | "repair_ready"
  | "repair_mapping_missing"
  | "not_applicable";

export const UNIVERSITY_POST_ATTEMPT_REPAIR_ISSUE_CODES = Object.freeze([
  "request.invalid",
  "protected_study.not_ready",
  "receipt.unattested",
  "binding.mismatch",
  "repair.mapping_missing",
  "projection.unexpected",
] as const);

export type UniversityPostAttemptRepairIssueCode =
  (typeof UNIVERSITY_POST_ATTEMPT_REPAIR_ISSUE_CODES)[number];

export interface UniversityPostAttemptRepairIssue {
  readonly code: UniversityPostAttemptRepairIssueCode;
  readonly message: string;
}

export interface UniversityPostAttemptRepairAuthority {
  readonly projectionClass: "fixture_only_authored_post_attempt_repair_brief";
  readonly identityScopeAuthority: "caller_asserted_fixture_only";
  readonly courseSourceAuthority: "learner_connected_copy_not_institutional_truth";
  readonly receiptContextBinding: "not_established";
  readonly receiptAuthority: "exact_process_local_runtime_attestation";
  readonly repairSelectionAuthority: "fixed_internal_authored_research_mapping";
  readonly modelUsed: false;
  readonly retrievalUsed: false;
  readonly answerGenerationAllowed: false;
  readonly diagnosisAllowed: false;
  readonly masteryClaimAllowed: false;
  readonly gradeAllowed: false;
  readonly capabilityClaimAllowed: false;
  readonly personalizedRecommendationAllowed: false;
  readonly assignmentAllowed: false;
  readonly pathMutationAllowed: false;
  readonly sessionStartAllowed: false;
  readonly retryStartAllowed: false;
  readonly proofStartAllowed: false;
  readonly persistenceAllowed: false;
  readonly eventEmissionAllowed: false;
  readonly evidenceUpgradeAllowed: false;
  readonly messagingAllowed: false;
  readonly schedulingAllowed: false;
  readonly providerCallAllowed: false;
  readonly externalSideEffectsAllowed: false;
}

export interface UniversityPostAttemptRepairContext {
  readonly binding: "server_paired_synthetic_not_receipt_bound";
  readonly termLabel: string;
  readonly courseLabel: string;
  readonly activityTitle: string;
  readonly worldTitle: string;
  readonly worldVersion: string;
  readonly taskLabel: string;
  readonly resultBoundary: string;
}

export type UniversityPostAttemptRepairCheckState =
  | "held_this_attempt"
  | "still_open";

export interface UniversityPostAttemptRepairCheck {
  readonly id: "bounded_conclusion" | "unresolved_condition";
  readonly label: string;
  readonly state: UniversityPostAttemptRepairCheckState;
}

export interface UniversityPostAttemptRepairEvidence {
  readonly checksTotal: 2;
  readonly checksHeld: 0 | 1 | 2;
  readonly countLabel: string;
  readonly summary: string;
  readonly checks: readonly UniversityPostAttemptRepairCheck[];
  readonly immediateAttemptOnly: true;
}

export interface UniversityPostAttemptRepairMove {
  readonly errorClass: "unresolved_condition";
  readonly title: string;
  readonly instruction: string;
  readonly responseFrame: {
    readonly firstSlot: string;
    readonly connective: string;
    readonly secondSlot: string;
  };
  readonly completionCondition: string;
  readonly whyThisMove: string;
  readonly supportBoundary: string;
  readonly freshProofBoundary: string;
  readonly answerExposing: false;
}

export interface UniversityPostAttemptRepairProjectionV1 {
  readonly schemaVersion:
    typeof UNIVERSITY_POST_ATTEMPT_REPAIR_PROJECTION_SCHEMA_VERSION;
  readonly status: UniversityPostAttemptRepairProjectionStatus;
  readonly authority: UniversityPostAttemptRepairAuthority;
  readonly context: UniversityPostAttemptRepairContext | null;
  readonly evidence: UniversityPostAttemptRepairEvidence | null;
  readonly repair: UniversityPostAttemptRepairMove | null;
  readonly message: string;
  readonly issues: readonly UniversityPostAttemptRepairIssue[];
  readonly projectionDigest: string | null;
}

export interface UniversityPostAttemptRepairRequestV1 {
  readonly schemaVersion:
    typeof UNIVERSITY_POST_ATTEMPT_REPAIR_REQUEST_SCHEMA_VERSION;
  readonly todayRequest: unknown;
  readonly worldPack: unknown;
  readonly runtimeReceipt: unknown;
}
