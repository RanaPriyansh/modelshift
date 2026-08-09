import { z } from "zod";

z.config({ jitless: true });

export const UNIVERSITY_RESEARCH_DATA_OPERATIONS_REQUEST_SCHEMA_VERSION =
  "university-research-data-operations-request.v1" as const;
export const UNIVERSITY_RESEARCH_DATA_OPERATIONS_PROJECTION_SCHEMA_VERSION =
  "university-research-data-operations-projection.v1" as const;
export const UNIVERSITY_RESEARCH_DATA_OPERATIONS_PROTOCOL_DOCUMENT_DIGEST =
  "sha256:f28a6e4396b949cfdcb8a371e5c6f882f2dd828dc79934b8ba3da17732764bd1" as const;

export const UNIVERSITY_RESEARCH_DATA_OPERATIONS_STATUSES = Object.freeze([
  "invalid",
  "requirements_requested",
  "synthetic_data_operations_plan_coherent",
] as const);

export const UNIVERSITY_RESEARCH_CAPTURE_FIELD_IDS = Object.freeze([
  "study_ref",
  "allocation_ref",
  "exposure_id",
  "condition",
  "pack_id",
  "scenario_id",
  "task_id",
  "dimension",
  "result_code",
  "misconception_code",
  "missingness_code",
  "barrier_code",
  "contradiction_code",
  "stop_code",
  "duration_ms",
  "recorded_by_role_ref",
] as const);

export const UNIVERSITY_RESEARCH_PROHIBITED_DATA_CLASSES = Object.freeze([
  "direct_name",
  "email_address",
  "phone_number",
  "date_of_birth",
  "identity_document",
  "student_or_institution_identifier",
  "real_coursework_or_graded_work",
  "account_credential_or_token",
  "accommodation_or_disability_detail",
  "wellbeing_detail",
  "instructor_or_third_party_contact",
  "raw_quote_or_free_form_note",
  "audio_video_or_screenshot",
  "telemetry_ip_or_device_fingerprint",
  "precise_location",
  "provider_or_connector_payload",
] as const);

export const UNIVERSITY_RESEARCH_DATA_PLAN_IDS = Object.freeze([
  "capture_schema",
  "adult_verification",
  "consent_withdrawal",
  "retention_deletion",
  "access_pseudonymization",
  "incident_response",
  "compensation",
  "rights_requests",
  "operator_audit",
] as const);

export const UNIVERSITY_RESEARCH_DATA_OPERATION_ROLES = Object.freeze([
  "principal_research_owner",
  "research_data_approver",
  "study_operator",
  "observation_operator",
  "incident_withdrawal_owner",
  "analysis_adjudicator",
] as const);

export const UNIVERSITY_RESEARCH_ALLOCATION_CELLS = Object.freeze([
  "candidate_p_then_substitute_q",
  "substitute_p_then_candidate_q",
  "candidate_q_then_substitute_p",
  "substitute_q_then_candidate_p",
] as const);

export const UNIVERSITY_RESEARCH_DATA_OPERATIONS_ISSUE_CODES = Object.freeze([
  "schema.invalid",
  "capture.allowlist_mismatch",
  "capture.prohibited_vocabulary_mismatch",
  "plans.incomplete_or_conflicting",
  "roles.incomplete_or_conflicting",
  "allocation.cells_incomplete_or_conflicting",
] as const);

export type UniversityResearchDataOperationsIssueCode =
  (typeof UNIVERSITY_RESEARCH_DATA_OPERATIONS_ISSUE_CODES)[number];

export interface UniversityResearchDataOperationsIssue {
  readonly code: UniversityResearchDataOperationsIssueCode;
  readonly path: string;
  readonly message: string;
}

const digestSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const fixturePlanRefSchema = z.string().trim().min(1).max(180).regex(
  /^plan\.fixture\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/,
);
const fixtureOperatorRefSchema = z.string().trim().min(1).max(180).regex(
  /^operator\.fixture\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/,
);

const planBindingSchema = z.strictObject({
  planId: z.enum(UNIVERSITY_RESEARCH_DATA_PLAN_IDS),
  planRef: fixturePlanRefSchema,
  status: z.literal("requested"),
  declaredPlanDigest: digestSchema,
  authority: z.literal("not_established"),
});

const roleBindingSchema = z.strictObject({
  role: z.enum(UNIVERSITY_RESEARCH_DATA_OPERATION_ROLES),
  operatorRef: fixtureOperatorRefSchema,
  identityAuthority: z.literal("not_established"),
});

export const universityResearchDataOperationsRequestSchema = z.strictObject({
  schemaVersion: z.literal(
    UNIVERSITY_RESEARCH_DATA_OPERATIONS_REQUEST_SCHEMA_VERSION,
  ),
  protocol: z.strictObject({
    protocolId: z.literal(
      "university-observation-protocol.phase-minus-one",
    ),
    protocolVersion: z.literal("1.0.0"),
    protocolDocumentDigest: z.literal(
      UNIVERSITY_RESEARCH_DATA_OPERATIONS_PROTOCOL_DOCUMENT_DIGEST,
    ),
  }),
  captureSchema: z.strictObject({
    schemaRef: z.literal("capture-schema.fixture.phase-minus-one.v1"),
    status: z.literal("requested"),
    authority: z.literal("not_established"),
    allowedFields: z.array(z.enum(UNIVERSITY_RESEARCH_CAPTURE_FIELD_IDS))
      .max(UNIVERSITY_RESEARCH_CAPTURE_FIELD_IDS.length),
    prohibitedDataClasses: z.array(
      z.enum(UNIVERSITY_RESEARCH_PROHIBITED_DATA_CLASSES),
    ).max(UNIVERSITY_RESEARCH_PROHIBITED_DATA_CLASSES.length),
    rawQuoteCaptureAllowed: z.literal(false),
    freeFormNotesCaptureAllowed: z.literal(false),
    realCourseworkCaptureAllowed: z.literal(false),
    identityDocumentCaptureAllowed: z.literal(false),
    telemetryCaptureAllowed: z.literal(false),
  }),
  requestedPlans: z.array(planBindingSchema).max(
    UNIVERSITY_RESEARCH_DATA_PLAN_IDS.length,
  ),
  roles: z.array(roleBindingSchema).max(
    UNIVERSITY_RESEARCH_DATA_OPERATION_ROLES.length,
  ),
  allocation: z.strictObject({
    plan: z.literal("paired_four_cell_two_pack"),
    cells: z.array(z.enum(UNIVERSITY_RESEARCH_ALLOCATION_CELLS)).max(
      UNIVERSITY_RESEARCH_ALLOCATION_CELLS.length,
    ),
    assignmentBasis: z.literal("rotating_approval_order_sequence"),
    responseBasedReassignmentAllowed: z.literal(false),
    withdrawnCellRemainsOccupied: z.literal(true),
  }),
  stopAndRightsRules: z.strictObject({
    captureAfterWithdrawalAllowed: z.literal(false),
    minorOrUncertainAgeAction: z.literal(
      "stop_before_or_during_exposure_and_escalate",
    ),
    prohibitedDataAction: z.literal(
      "stop_do_not_echo_and_escalate",
    ),
    deletionCompletionRule: z.literal(
      "requested_verification_per_declared_target",
    ),
    restartRule: z.literal(
      "separate_principal_and_research_data_approval_requested",
    ),
  }),
  authority: z.strictObject({
    approvalAuthority: z.literal("not_established"),
    operatorIdentityAuthority: z.literal("not_established"),
    adultVerificationAuthority: z.literal("not_established"),
    consentAuthority: z.literal("not_established"),
    participantOperationAllowed: z.literal(false),
    participantDataCaptureAllowed: z.literal(false),
    courseworkCaptureAllowed: z.literal(false),
    persistenceAllowed: z.literal(false),
    exportAllowed: z.literal(false),
    eventEmissionAllowed: z.literal(false),
    restartAllowed: z.literal(false),
  }),
});

export type UniversityResearchDataOperationsRequestV1 = z.infer<
  typeof universityResearchDataOperationsRequestSchema
>;

export type UniversityResearchDataOperationsStatus =
  (typeof UNIVERSITY_RESEARCH_DATA_OPERATIONS_STATUSES)[number];

export interface UniversityResearchDataOperationsProjectionV1 {
  readonly schemaVersion:
    typeof UNIVERSITY_RESEARCH_DATA_OPERATIONS_PROJECTION_SCHEMA_VERSION;
  readonly status: UniversityResearchDataOperationsStatus;
  readonly protocol: {
    readonly protocolId: string;
    readonly protocolVersion: string;
    readonly protocolDocumentDigest: string;
  } | null;
  readonly capture: {
    readonly allowedFieldCount: number;
    readonly prohibitedDataClassCount: number;
    readonly exactAllowlist: boolean;
    readonly exactProhibitedVocabulary: boolean;
  } | null;
  readonly requirements: {
    readonly requestedPlanCount: number;
    readonly requiredPlanCount: number;
    readonly distinctRoleCount: number;
    readonly requiredRoleCount: number;
    readonly allocationCellCount: number;
    readonly requiredAllocationCellCount: number;
    readonly planDeclarationDigest: string;
  } | null;
  readonly authority: {
    readonly projectionClass:
      "fixture_only_synthetic_data_operations_preflight";
    readonly approvalAuthority: "not_established";
    readonly operatorIdentityAuthority: "not_established";
    readonly adultVerificationAuthority: "not_established";
    readonly consentAuthority: "not_established";
    readonly planContentAuthority: "not_established";
    readonly participantOperationAllowed: false;
    readonly participantDataCaptureAllowed: false;
    readonly courseworkCaptureAllowed: false;
    readonly persistenceAllowed: false;
    readonly exportAllowed: false;
    readonly eventEmissionAllowed: false;
    readonly restartAllowed: false;
  };
  readonly issues: readonly UniversityResearchDataOperationsIssue[];
  readonly requestDigest: string | null;
  readonly projectionDigest: string | null;
}
