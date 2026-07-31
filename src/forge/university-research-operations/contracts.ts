import { z } from "zod";

z.config({ jitless: true });

export const UNIVERSITY_RESEARCH_READINESS_REQUEST_SCHEMA_VERSION =
  "university-research-readiness-request.v1" as const;
export const UNIVERSITY_RESEARCH_READINESS_PROJECTION_SCHEMA_VERSION =
  "university-research-readiness-projection.v1" as const;

export const UNIVERSITY_RESEARCH_ACCEPTED_SOURCE_COMMIT =
  "9e857542b3c348aeead55157d0f47443eb9e7e86" as const;
export const UNIVERSITY_RESEARCH_CANDIDATE_ROUTE =
  "/internal/university-semester-loop" as const;
export const UNIVERSITY_RESEARCH_PROTOCOL_ID =
  "university-observation-protocol.phase-minus-one" as const;
export const UNIVERSITY_RESEARCH_PROTOCOL_VERSION = "1.0.0" as const;
export const UNIVERSITY_RESEARCH_APPROVAL_ENVELOPE_PURPOSE =
  "university-research-approval-envelope.v1" as const;
export const UNIVERSITY_RESEARCH_PROTOCOL_DOCUMENT_DIGEST =
  "sha256:f28a6e4396b949cfdcb8a371e5c6f882f2dd828dc79934b8ba3da17732764bd1" as const;

export const UNIVERSITY_RESEARCH_INFORMATION_ITEM_IDS = Object.freeze([
  "research-information.term",
  "research-information.source",
  "research-information.deadline",
  "research-information.capacity",
  "research-information.path",
  "research-information.world",
  "research-information.effects",
] as const);

export const UNIVERSITY_RESEARCH_SCENARIO_IDS = Object.freeze([
  "ready",
  "source-review",
  "capacity-break",
  "tight-window",
  "world-changed",
  "path-complete",
  "path-blocked",
] as const);

export const UNIVERSITY_RESEARCH_TASK_FAMILIES = Object.freeze([
  "identify_current_state",
  "explain_bounded_reason",
  "calibrate_source_authority",
  "identify_path_owner",
  "predict_navigation_effect",
  "predict_storage_effect",
  "repair_blocked_state",
  "keyboard_compare_all_states",
] as const);

export const UNIVERSITY_RESEARCH_EXPOSURE_TASKS = Object.freeze([
  "Identify the current state and single next bounded job.",
  "Explain which facts are synthetic learner declarations or copied-source facts.",
  "State whether the deadline is verified university truth.",
  "State whether the surface selected or changed a learning path.",
  "Predict what the primary control will do.",
  "State whether anything will be saved, sent, started, submitted, or recorded.",
  "Distinguish one action complete or blocked from course or learner status.",
  "Traverse the seven states using the available keyboard path.",
  "Identify the state in which you would stop and seek source, learner, or human review.",
] as const);

export const UNIVERSITY_RESEARCH_POST_COMPARISON_QUESTIONS = Object.freeze([
  "Which surface, if either, would you choose for this same synthetic job?",
  "What part of an existing workflow, if any, could it replace?",
  "What would prevent you from using either surface?",
] as const);

export const UNIVERSITY_RESEARCH_NEUTRAL_PROMPTS = Object.freeze([
  "What led you to that?",
  "Who made that choice?",
  "What do you expect to happen next?",
] as const);

export const UNIVERSITY_RESEARCH_STOP_CHECKLIST = Object.freeze([
  "participant_withdrawal_or_distress",
  "minor_or_uncertain_age",
  "prohibited_real_or_third_party_data",
  "unapproved_capture",
  "wrong_artifact_allocation_script_or_timebox",
  "live_or_external_effect",
  "operator_interference_or_stop_override",
  "privacy_security_safeguarding_or_consent_incident",
  "repeated_authority_confusion",
  "attempted_real_world_action_from_misunderstanding",
  "unverifiable_artifact_or_allocation_record",
  "post_starter_protocol_amendment",
  "required_operator_or_data_process_unavailable",
] as const);

export const UNIVERSITY_RESEARCH_EXPOSURE_TASK_SET_DIGEST =
  "sha256:7a478d5e05d1cfc638ed3e4a76f6811a36ba5bc5239b8283193d4912a5eb4b9b" as const;
export const UNIVERSITY_RESEARCH_POST_COMPARISON_QUESTION_SET_DIGEST =
  "sha256:c0c91df4216e4e0c37e5c10797b8c3f0e26155e91e41c99db65142c254158123" as const;
export const UNIVERSITY_RESEARCH_NEUTRAL_PROMPT_SET_DIGEST =
  "sha256:9ae98972ea1c79213dbe69e210e36a5172b0852c10376922ea45f9eea7398913" as const;
export const UNIVERSITY_RESEARCH_STOP_CHECKLIST_DIGEST =
  "sha256:9812e2c429e18b214a09f30b80ae7890467507530abbd9786968e0403f77c90e" as const;

export const UNIVERSITY_RESEARCH_EVIDENCE_DIMENSIONS = Object.freeze([
  "loop_comprehension",
  "source_calibration",
  "learner_control",
  "effect_prediction",
  "substitution_choice",
  "task_time",
  "navigation_error",
  "emotional_safety",
  "access_barrier",
  "contradictory_account",
] as const);

export const UNIVERSITY_RESEARCH_REQUIRED_ROLES = Object.freeze([
  "principal_research_owner",
  "research_data_approver",
  "study_operator",
  "observation_operator",
  "incident_withdrawal_owner",
  "analysis_adjudicator",
] as const);

export const UNIVERSITY_RESEARCH_REQUIRED_APPROVALS = Object.freeze([
  "protocol",
  "data_management",
  "incident",
  "withdrawal",
] as const);

export const UNIVERSITY_RESEARCH_DECISION_OUTCOMES = Object.freeze([
  "accept",
  "narrow",
  "repair",
  "reject",
] as const);

const boundedCodeSchema = z.string().trim().min(1).max(180).regex(
  /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/,
);
const digestSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const timestampSchema = z.string().datetime({ offset: true });

const informationItemSchema = z.strictObject({
  itemId: z.enum(UNIVERSITY_RESEARCH_INFORMATION_ITEM_IDS),
  digest: digestSchema,
});

const conditionBaseSchema = z.strictObject({
  conditionId: boundedCodeSchema,
  informationItems: z.array(informationItemSchema).length(
    UNIVERSITY_RESEARCH_INFORMATION_ITEM_IDS.length,
  ),
  taskFamilies: z.array(z.enum(UNIVERSITY_RESEARCH_TASK_FAMILIES)).min(1).max(
    UNIVERSITY_RESEARCH_TASK_FAMILIES.length,
  ),
  taskScriptDigest: z.literal(UNIVERSITY_RESEARCH_EXPOSURE_TASK_SET_DIGEST),
  automatedSynthesisAllowed: z.literal(false),
  participantDataCaptureAllowed: z.literal(false),
});

const candidateConditionSchema = conditionBaseSchema.extend({
  kind: z.literal("forge_semester_loop"),
  delivery: z.literal("deterministic_internal_fixture"),
  artifactDigest: digestSchema,
});

const substituteConditionSchema = conditionBaseSchema.extend({
  kind: z.literal("matched_manual"),
  delivery: z.literal("static_manual_packet"),
  artifactRef: boundedCodeSchema,
  artifactDigest: digestSchema,
});

const roleAssignmentSchema = z.strictObject({
  role: z.enum(UNIVERSITY_RESEARCH_REQUIRED_ROLES),
  operatorRef: z.string().trim().min(1).max(180).regex(
    /^operator\.fixture\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/,
  ),
});

const approvalReferenceSchema = z.strictObject({
  kind: z.enum(UNIVERSITY_RESEARCH_REQUIRED_APPROVALS),
  referenceId: z.string().trim().min(1).max(180).regex(
    /^approval\.fixture\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/,
  ),
  declaredStatus: z.enum(["missing", "independent_approved"]),
  approvedEnvelopeDigest: digestSchema,
});

const scenarioPackSchema = z.strictObject({
  packId: z.enum(["pack-p", "pack-q"]),
  packDigest: digestSchema,
  scenarioIds: z.array(z.enum(UNIVERSITY_RESEARCH_SCENARIO_IDS)).min(1).max(
    UNIVERSITY_RESEARCH_SCENARIO_IDS.length,
  ),
  equivalenceReviewRef: z.string().trim().min(1).max(180).regex(
    /^review\.fixture\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/,
  ),
  equivalenceReviewStatus: z.literal("requested"),
});

export const universityResearchReadinessRequestSchema = z.strictObject({
  schemaVersion: z.literal(UNIVERSITY_RESEARCH_READINESS_REQUEST_SCHEMA_VERSION),
  protocol: z.strictObject({
    protocolId: z.literal(UNIVERSITY_RESEARCH_PROTOCOL_ID),
    protocolVersion: z.literal(UNIVERSITY_RESEARCH_PROTOCOL_VERSION),
    protocolDocumentDigest: z.literal(
      UNIVERSITY_RESEARCH_PROTOCOL_DOCUMENT_DIGEST,
    ),
    sourceCommit: z.string().regex(/^[a-f0-9]{40}$/),
    candidateRoute: z.literal(UNIVERSITY_RESEARCH_CANDIDATE_ROUTE),
    candidateRequestSchemaVersion: z.literal(
      "university-semester-loop-request.v1",
    ),
    candidateProjectionSchemaVersion: z.literal(
      "university-semester-loop-projection.v1",
    ),
    scenarioIds: z.array(z.enum(UNIVERSITY_RESEARCH_SCENARIO_IDS)).min(1).max(
      UNIVERSITY_RESEARCH_SCENARIO_IDS.length,
    ),
    fixtureDigest: digestSchema,
    candidateBuildDigest: digestSchema,
    lockedAt: timestampSchema,
    amendmentVersion: z.number().int().min(0).max(100),
    comparability: z.enum(["baseline", "invalidated_by_amendment"]),
  }),
  conditions: z.strictObject({
    candidate: candidateConditionSchema,
    substitute: substituteConditionSchema,
  }),
  counterbalance: z.strictObject({
    plan: z.literal("paired_four_cell_two_pack"),
    scenarioPacks: z.array(scenarioPackSchema).min(1).max(2),
    cells: z.array(z.enum([
      "candidate_p_then_substitute_q",
      "substitute_p_then_candidate_q",
      "candidate_q_then_substitute_p",
      "substitute_q_then_candidate_p",
    ])).min(1).max(4),
    assignmentBasis: z.literal("rotating_approval_order_sequence"),
  }),
  taskScript: z.strictObject({
    exposureTaskCount: z.literal(UNIVERSITY_RESEARCH_EXPOSURE_TASKS.length),
    postComparisonQuestionCount: z.literal(
      UNIVERSITY_RESEARCH_POST_COMPARISON_QUESTIONS.length,
    ),
    exposureMinutes: z.literal(12),
    resetMinutes: z.literal(3),
    exposureTaskSetDigest: z.literal(
      UNIVERSITY_RESEARCH_EXPOSURE_TASK_SET_DIGEST,
    ),
    postComparisonQuestionSetDigest: z.literal(
      UNIVERSITY_RESEARCH_POST_COMPARISON_QUESTION_SET_DIGEST,
    ),
    neutralPromptSetDigest: z.literal(
      UNIVERSITY_RESEARCH_NEUTRAL_PROMPT_SET_DIGEST,
    ),
    stopChecklistDigest: z.literal(
      UNIVERSITY_RESEARCH_STOP_CHECKLIST_DIGEST,
    ),
  }),
  sample: z.strictObject({
    targetMinimum: z.number().int().min(5).max(10),
    targetMaximum: z.number().int().min(5).max(10),
    adultOnly: z.literal(true),
    syntheticOnly: z.literal(true),
    allStartersDenominator: z.literal(true),
    withdrawalsRemainInDenominator: z.literal(true),
    operatorAndSafetyStopsRemainInDenominator: z.literal(true),
    technicalStopsRemainInDenominator: z.literal(true),
    protocolDeviationsRemainInDenominator: z.literal(true),
    unusablePermittedFieldsRemainInDenominator: z.literal(true),
    incompletesReportedSeparately: z.literal(true),
    attritionReportedSeparately: z.literal(true),
    notExposedReportedSeparately: z.literal(true),
    replacementAllowed: z.literal(false),
    completersOnlyPrimaryAllowed: z.literal(false),
  }),
  evidence: z.strictObject({
    dimensions: z.array(z.enum(UNIVERSITY_RESEARCH_EVIDENCE_DIMENSIONS)).min(1)
      .max(UNIVERSITY_RESEARCH_EVIDENCE_DIMENSIONS.length),
    compositeScoreAllowed: z.literal(false),
    rawQuoteCaptureAllowed: z.literal(false),
    freeFormNotesCaptureAllowed: z.literal(false),
  }),
  decisionPlan: z.strictObject({
    outcomes: z.array(z.enum(UNIVERSITY_RESEARCH_DECISION_OUTCOMES)).min(1)
      .max(UNIVERSITY_RESEARCH_DECISION_OUTCOMES.length),
    minimumStartersReported: z.number().int().min(5).max(10),
    accept: z.strictObject({
      nextJobCorrectRateMinimum: z.literal(0.8),
      authorityErrorMaximum: z.literal(0),
      unresolvedMaterialHarmMaximum: z.literal(0),
      candidateMustMeetOrExceedSubstitute: z.literal(true),
    }),
    narrow: z.strictObject({
      stateSpecificValueOnly: z.literal(true),
    }),
    repair: z.strictObject({
      repairableComprehensionOrAccessFailure: z.literal(true),
    }),
    reject: z.strictObject({
      noIncrementalValueOrMaterialHarm: z.literal(true),
    }),
    preserveNegativeFindings: z.literal(true),
    preserveDissent: z.literal(true),
  }),
  operations: z.strictObject({
    roles: z.array(roleAssignmentSchema).max(
      UNIVERSITY_RESEARCH_REQUIRED_ROLES.length,
    ),
    approvalReferences: z.array(approvalReferenceSchema).max(
      UNIVERSITY_RESEARCH_REQUIRED_APPROVALS.length,
    ),
    incidentStopRule: z.literal("stop_rehearsal_and_escalate"),
    withdrawalRule: z.literal("honor_immediately_and_capture_nothing_further"),
    amendmentRule: z.literal("any_change_invalidates_comparability"),
  }),
});

export type UniversityResearchReadinessRequestV1 = z.infer<
  typeof universityResearchReadinessRequestSchema
>;

export const UNIVERSITY_RESEARCH_READINESS_ISSUE_CODES = Object.freeze([
  "schema.invalid",
  "protocol.source_commit_mismatch",
  "protocol.scenario_set_mismatch",
  "protocol.fixture_digest_mismatch",
  "protocol.amendment_invalidates_comparability",
  "sample.plan_invalid",
  "evidence.plan_invalid",
  "decision.plan_invalid",
  "approval.missing",
  "approval.conflict",
  "approval.envelope_mismatch",
  "operator.missing",
  "operator.conflict",
  "comparator.information_mismatch",
  "comparator.task_mismatch",
  "comparator.counterbalance_missing",
] as const);

export type UniversityResearchReadinessIssueCode =
  (typeof UNIVERSITY_RESEARCH_READINESS_ISSUE_CODES)[number];

export interface UniversityResearchReadinessIssue {
  readonly code: UniversityResearchReadinessIssueCode;
  readonly path: string;
  readonly message: string;
}

export type UniversityResearchReadinessStatus =
  | "draft_invalid"
  | "approval_required"
  | "operator_gap"
  | "substitute_mismatch"
  | "synthetic_plan_coherent";

export interface UniversityResearchReadinessProjectionV1 {
  readonly schemaVersion:
    typeof UNIVERSITY_RESEARCH_READINESS_PROJECTION_SCHEMA_VERSION;
  readonly status: UniversityResearchReadinessStatus;
  readonly protocol: {
    readonly protocolId: string;
    readonly protocolVersion: string;
    readonly protocolDocumentDigest: string;
    readonly sourceCommit: string;
    readonly candidateRoute: typeof UNIVERSITY_RESEARCH_CANDIDATE_ROUTE;
    readonly fixtureDigest: string;
    readonly candidateBuildDigest: string;
    readonly lockedAt: string;
    readonly amendmentVersion: number;
    readonly protocolPlanDigest: string;
  } | null;
  readonly comparator: {
    readonly informationParity: boolean;
    readonly taskParity: boolean;
    readonly counterbalanceScheduleDeclared: boolean;
    readonly scenarioPackCount: number;
    readonly candidateInformationItemCount: number;
    readonly candidateTaskFamilyCount: number;
    readonly exposureTaskSetDigest: string;
    readonly comparisonPlanDigest: string;
  } | null;
  readonly sample: {
    readonly targetMinimum: number;
    readonly targetMaximum: number;
    readonly adultOnly: true;
    readonly syntheticOnly: true;
    readonly allStartersDenominator: true;
  } | null;
  readonly operations: {
    readonly requiredRoleCount: number;
    readonly validFixtureRoleBindingCount: number;
    readonly requiredApprovalCount: number;
    readonly boundApprovalReferenceCount: number;
    readonly operationsPlanDigest: string | null;
  };
  readonly evidenceDimensions: readonly string[];
  readonly decisionOutcomes: readonly ["accept", "narrow", "repair", "reject"];
  readonly authority: {
    readonly projectionClass: "fixture_only_research_operations_preflight";
    readonly artifactIdentityAuthority: "caller_asserted_fixture_only";
    readonly operatorIdentityAuthority: "caller_asserted_fixture_only";
    readonly independentApprovalAuthority: "not_established";
    readonly participantEnrollmentAllowed: false;
    readonly participantDataCaptureAllowed: false;
    readonly courseworkCaptureAllowed: false;
    readonly claimUpgradeAllowed: false;
    readonly externalSendAllowed: false;
    readonly persistenceAllowed: false;
    readonly eventEmissionAllowed: false;
  };
  readonly issues: readonly UniversityResearchReadinessIssue[];
  readonly projectionDigest: string | null;
}
