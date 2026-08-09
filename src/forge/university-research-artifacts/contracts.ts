import { z } from "zod";

import {
  UNIVERSITY_RESEARCH_ACCEPTED_SOURCE_COMMIT,
  UNIVERSITY_RESEARCH_CANDIDATE_ROUTE,
  UNIVERSITY_RESEARCH_EXPOSURE_TASKS,
  UNIVERSITY_RESEARCH_EXPOSURE_TASK_SET_DIGEST,
  UNIVERSITY_RESEARCH_INFORMATION_ITEM_IDS,
  UNIVERSITY_RESEARCH_NEUTRAL_PROMPTS,
  UNIVERSITY_RESEARCH_NEUTRAL_PROMPT_SET_DIGEST,
  UNIVERSITY_RESEARCH_POST_COMPARISON_QUESTIONS,
  UNIVERSITY_RESEARCH_POST_COMPARISON_QUESTION_SET_DIGEST,
  UNIVERSITY_RESEARCH_PROTOCOL_DOCUMENT_DIGEST,
  UNIVERSITY_RESEARCH_PROTOCOL_ID,
  UNIVERSITY_RESEARCH_PROTOCOL_VERSION,
  UNIVERSITY_RESEARCH_SCENARIO_IDS,
  UNIVERSITY_RESEARCH_STOP_CHECKLIST,
  UNIVERSITY_RESEARCH_STOP_CHECKLIST_DIGEST,
  UNIVERSITY_RESEARCH_TASK_FAMILIES,
} from "../university-research-operations/contracts";

z.config({ jitless: true });

export const UNIVERSITY_RESEARCH_ARTIFACT_PREFLIGHT_REQUEST_SCHEMA_VERSION =
  "university-research-artifact-preflight-request.v1" as const;
export const UNIVERSITY_RESEARCH_ARTIFACT_PREFLIGHT_PROJECTION_SCHEMA_VERSION =
  "university-research-artifact-preflight-projection.v1" as const;
export const UNIVERSITY_RESEARCH_SCENARIO_PACK_SCHEMA_VERSION =
  "university-research-scenario-pack.v1" as const;
export const UNIVERSITY_RESEARCH_NEUTRAL_SUBSTITUTE_SCHEMA_VERSION =
  "university-research-neutral-substitute.v1" as const;
export const UNIVERSITY_RESEARCH_ARTIFACT_ADAPTER_ID =
  "university-research-semester-loop-adapter.v1" as const;
export const UNIVERSITY_RESEARCH_NEUTRAL_RENDERER_ID =
  "university-research-neutral-worksheet-renderer.v1" as const;

export const UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS = Object.freeze({
  scenario: "forge.university-research.scenario.v1",
  scenarioPack: "forge.university-research.scenario-pack.v1",
  candidateFixture: "forge.university-research.candidate-fixture.v1",
  candidateAdapter: "forge.university-research.candidate-adapter.v1",
  semanticSignature: "forge.university-research.semantic-signature.v1",
  informationItem: "forge.university-research.information-item.v1",
  rendererBinding: "forge.university-research.renderer-binding.v1",
  neutralSubstituteTemplate:
    "forge.university-research.neutral-substitute-template.v1",
  neutralSubstituteArtifact:
    "forge.university-research.neutral-substitute-artifact.v1",
  moderatorPacket: "forge.university-research.moderator-packet.v1",
  reviewChecklist: "forge.university-research.review-checklist.v1",
  reviewEnvelope: "forge.university-research.equivalence-review-envelope.v1",
  projection: "forge.university-research.artifact-preflight-projection.v1",
} as const);

export const UNIVERSITY_RESEARCH_EXPECTED_STATUSES = Object.freeze([
  "protected_study_ready",
  "source_review_required",
  "recovery_required",
  "learner_choice_required",
  "world_review_required",
  "path_complete",
  "path_blocked",
] as const);

export const UNIVERSITY_RESEARCH_NEXT_JOB_KINDS = Object.freeze([
  "inspect_protected_study_boundary",
  "review_copied_sources",
  "inspect_bounded_recovery",
  "make_learner_capacity_choice",
  "seek_exact_world_review",
  "honest_return_after_action",
  "repair_or_replace_accepted_path",
] as const);

export const UNIVERSITY_RESEARCH_CHOICE_KINDS = Object.freeze([
  "inspect_protected_study",
  "review_copied_sources",
  "inspect_recovery_draft",
  "continue_with_declared_window",
  "stop_and_replan",
  "seek_world_review",
  "acknowledge_action_complete",
  "repair_or_replace_path",
] as const);

const digestSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const identifierSchema = z.string().min(3).max(180).regex(
  /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/,
);
const timestampSchema = z.string().datetime({ offset: true });
const safeTextSchema = z.string().min(1).max(240).superRefine(
  (value, context) => {
    if (
      value !== value.trim()
      || value !== value.normalize("NFC")
      || /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u.test(value)
      || /\p{Default_Ignorable_Code_Point}/u.test(value)
    ) {
      context.addIssue({
        code: "custom",
        message: "Text must have canonical surrounding whitespace and normalized NFC without control, line-separator, bidi, or default-ignorable characters.",
      });
    }
  },
);

const protocolBindingSchema = z.strictObject({
  protocolId: z.literal(UNIVERSITY_RESEARCH_PROTOCOL_ID),
  protocolVersion: z.literal(UNIVERSITY_RESEARCH_PROTOCOL_VERSION),
  protocolDocumentDigest: z.literal(
    UNIVERSITY_RESEARCH_PROTOCOL_DOCUMENT_DIGEST,
  ),
  exposureTaskSetDigest: z.literal(
    UNIVERSITY_RESEARCH_EXPOSURE_TASK_SET_DIGEST,
  ),
  postComparisonQuestionSetDigest: z.literal(
    UNIVERSITY_RESEARCH_POST_COMPARISON_QUESTION_SET_DIGEST,
  ),
  neutralPromptSetDigest: z.literal(
    UNIVERSITY_RESEARCH_NEUTRAL_PROMPT_SET_DIGEST,
  ),
  stopChecklistDigest: z.literal(UNIVERSITY_RESEARCH_STOP_CHECKLIST_DIGEST),
});

const syntheticBoundarySchema = z.strictObject({
  syntheticOnly: z.literal(true),
  realInstitutionAllowed: z.literal(false),
  realPersonAllowed: z.literal(false),
  realCourseAllowed: z.literal(false),
  realAccountAllowed: z.literal(false),
  realAssignmentAllowed: z.literal(false),
  participantDataCaptureAllowed: z.literal(false),
});

const choiceSchema = z.strictObject({
  choiceId: identifierSchema,
  kind: z.enum(UNIVERSITY_RESEARCH_CHOICE_KINDS),
  label: safeTextSchema,
  owner: z.enum(["learner_fixture", "source_reviewer", "human_reviewer"]),
});

const scenarioSchema = z.strictObject({
  scenarioId: z.enum(UNIVERSITY_RESEARCH_SCENARIO_IDS),
  scenarioRef: identifierSchema,
  expectedStatus: z.enum(UNIVERSITY_RESEARCH_EXPECTED_STATUSES),
  difficultyClass: z.literal("semester-loop-state-identification.v1"),
  context: z.strictObject({
    termRef: identifierSchema,
    termLabel: safeTextSchema,
    courseRef: identifierSchema,
    courseLabel: safeTextSchema,
    sourceRef: identifierSchema,
    asOf: timestampSchema,
    timeZone: z.literal("Etc/UTC"),
  }),
  source: z.strictObject({
    state: z.enum(["reviewed_copy", "copy_review_required"]),
    conflictCount: z.number().int().min(0).max(4),
    freshness: z.enum(["current_for_fixture", "conflicting_fixture_copies"]),
    institutionalCompleteness: z.literal("not_established"),
    authority: z.literal("synthetic_copied_fact_not_university_truth"),
  }),
  deadline: z.strictObject({
    deadlineRef: identifierSchema,
    title: safeTextSchema,
    at: timestampSchema,
    relativeMinutes: z.number().int().min(60).max(100_000),
    consequence: z.literal("learner_fixture_declared_course_consequence"),
    universityTruth: z.literal(false),
  }),
  capacity: z.strictObject({
    availableMinutes: z.number().int().min(0).max(1_440),
    effortMinutesLow: z.number().int().min(1).max(1_440),
    effortMinutesHigh: z.number().int().min(1).max(1_440),
    relation: z.enum(["fits", "below_low", "low_only"]),
    declaredBy: z.literal("learner_fixture"),
    effortBasis: z.literal("fixture_authored"),
  }),
  path: z.strictObject({
    pathRef: identifierSchema,
    actionRef: identifierSchema,
    actionTitle: safeTextSchema,
    state: z.enum(["accepted_active", "accepted_complete", "accepted_blocked"]),
    owner: z.literal("learner_fixture"),
    selectedBySourceFacts: z.literal(false),
  }),
  world: z.strictObject({
    acceptedWorldRef: identifierSchema,
    suppliedWorldRef: identifierSchema,
    state: z.enum(["exact_binding", "binding_changed", "not_exposed"]),
    similarWorldSubstitutionAllowed: z.literal(false),
  }),
  terminal: z.strictObject({
    state: z.enum(["action_open", "action_complete", "action_blocked"]),
    courseCompleteClaimed: z.literal(false),
    learnerStatusClaimed: z.literal(false),
    semesterCompleteClaimed: z.literal(false),
  }),
  choices: z.array(choiceSchema).min(1).max(3),
  nextJob: z.strictObject({
    kind: z.enum(UNIVERSITY_RESEARCH_NEXT_JOB_KINDS),
    reasonCode: identifierSchema,
    owner: z.enum(["learner_fixture", "source_reviewer", "human_reviewer"]),
    primaryControl: z.strictObject({
      kind: z.enum(["local_anchor_navigation", "no_control"]),
      label: safeTextSchema.nullable(),
      effect: z.enum(["navigate_to_local_synthetic_detail", "remain_in_place"]),
    }),
  }),
  effects: z.strictObject({
    navigationOnly: z.boolean(),
    saves: z.literal(false),
    sends: z.literal(false),
    startsSession: z.literal(false),
    submits: z.literal(false),
    records: z.literal(false),
    createsEvidence: z.literal(false),
    changesPath: z.literal(false),
    externalEffect: z.literal(false),
    institutionalAction: z.literal(false),
  }),
  answerKey: z.strictObject({
    copiedFactsAreUniversityTruth: z.literal(false),
    deadlineIsUniversityTruth: z.literal(false),
    surfaceSelectedPath: z.literal(false),
    learnerOwnsPath: z.literal(true),
    effectPrediction: z.enum(["navigation_only", "no_effect"]),
    stopOwner: z.enum(["learner_fixture", "source_reviewer", "human_reviewer"]),
  }),
  difficulty: z.strictObject({
    informationCategoryCount: z.literal(8),
    choiceCount: z.number().int().min(1).max(3),
    navigationStepCount: z.number().int().min(0).max(1),
    dependencyCount: z.number().int().min(0).max(4),
    timingArithmetic: z.literal("absolute_time_plus_relative_minutes"),
    taskAnswerCount: z.literal(9),
  }),
});

export const universityResearchScenarioPackSchema = z.strictObject({
  schemaVersion: z.literal(UNIVERSITY_RESEARCH_SCENARIO_PACK_SCHEMA_VERSION),
  packId: z.enum(["pack-p", "pack-q"]),
  artifactRef: identifierSchema,
  artifactVersion: z.literal("1.1.0"),
  protocolBinding: protocolBindingSchema,
  syntheticBoundary: syntheticBoundarySchema,
  scenarios: z.array(scenarioSchema).length(
    UNIVERSITY_RESEARCH_SCENARIO_IDS.length,
  ),
});

export type UniversityResearchScenarioPackV1 = z.infer<
  typeof universityResearchScenarioPackSchema
>;

const substituteNodeSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("heading"),
    nodeRef: identifierSchema,
    text: safeTextSchema,
  }),
  z.strictObject({
    kind: z.literal("fact_table"),
    nodeRef: identifierSchema,
    heading: safeTextSchema,
    informationItemIds: z.array(
      z.enum(UNIVERSITY_RESEARCH_INFORMATION_ITEM_IDS),
    ).length(UNIVERSITY_RESEARCH_INFORMATION_ITEM_IDS.length),
  }),
  z.strictObject({
    kind: z.literal("choice_list"),
    nodeRef: identifierSchema,
    heading: safeTextSchema,
    source: z.literal("scenario.choices"),
  }),
  z.strictObject({
    kind: z.literal("next_job"),
    nodeRef: identifierSchema,
    heading: safeTextSchema,
    source: z.literal("scenario.nextJob"),
  }),
  z.strictObject({
    kind: z.literal("effect_boundary"),
    nodeRef: identifierSchema,
    heading: safeTextSchema,
    source: z.literal("scenario.effects"),
  }),
  z.strictObject({
    kind: z.literal("task_prompt"),
    nodeRef: identifierSchema,
    heading: safeTextSchema,
    taskSetDigest: z.literal(UNIVERSITY_RESEARCH_EXPOSURE_TASK_SET_DIGEST),
  }),
  z.strictObject({
    kind: z.literal("terminal_note"),
    nodeRef: identifierSchema,
    heading: safeTextSchema,
    source: z.literal("scenario.terminal"),
  }),
  z.strictObject({
    kind: z.literal("anchor_navigation"),
    nodeRef: identifierSchema,
    heading: safeTextSchema,
    labelStrategy: z.literal("locked_ordinal_example_labels"),
    items: z.array(z.strictObject({
      scenarioId: z.enum(UNIVERSITY_RESEARCH_SCENARIO_IDS),
      label: safeTextSchema,
    })).length(UNIVERSITY_RESEARCH_SCENARIO_IDS.length),
  }),
]);

export const universityResearchNeutralSubstituteSchema = z.strictObject({
  schemaVersion: z.literal(UNIVERSITY_RESEARCH_NEUTRAL_SUBSTITUTE_SCHEMA_VERSION),
  artifactRef: z.literal("matched-substitute.phase-minus-one.v1"),
  artifactVersion: z.literal("1.1.0"),
  rendererId: z.literal(UNIVERSITY_RESEARCH_NEUTRAL_RENDERER_ID),
  rendererBindingDigest: digestSchema,
  protocolBinding: protocolBindingSchema,
  delivery: z.literal("static_local_keyboard_packet"),
  surface: z.strictObject({
    title: safeTextSchema,
    nodes: z.array(substituteNodeSchema).length(8),
    brandPresence: z.literal("none"),
    candidateStatusNamesAllowed: z.literal(false),
    computedHierarchyAllowed: z.literal(false),
    aiRecommendationAllowed: z.literal(false),
    automatedSynthesisAllowed: z.literal(false),
    scoringAllowed: z.literal(false),
    rankingAllowed: z.literal(false),
    persistenceAllowed: z.literal(false),
    externalActionAllowed: z.literal(false),
  }),
  access: z.strictObject({
    minimumCssWidth: z.literal(320),
    keyboardModel: z.literal("native_radio_group_then_document_order"),
    allSevenStatesKeyboardReachable: z.literal(true),
    motionRequired: z.literal(false),
    nonMotionAlternative: z.literal("identical_static_content"),
    remoteAssetsAllowed: z.literal(false),
    rawHtmlAllowed: z.literal(false),
    scriptAllowed: z.literal(false),
    urlInputAllowed: z.literal(false),
  }),
  density: z.strictObject({
    maximumVisibleCharactersPerScenario: z.literal(2_400),
    maximumFactRows: z.literal(8),
    maximumChoices: z.literal(3),
  }),
  taskFamilies: z.array(z.enum(UNIVERSITY_RESEARCH_TASK_FAMILIES)).length(
    UNIVERSITY_RESEARCH_TASK_FAMILIES.length,
  ),
  packBindings: z.tuple([
    z.strictObject({
      packId: z.literal("pack-p"),
      packDigest: digestSchema,
    }),
    z.strictObject({
      packId: z.literal("pack-q"),
      packDigest: digestSchema,
    }),
  ]),
});

export type UniversityResearchNeutralSubstituteV1 = z.infer<
  typeof universityResearchNeutralSubstituteSchema
>;

export const universityResearchArtifactPreflightRequestSchema = z.strictObject({
  schemaVersion: z.literal(
    UNIVERSITY_RESEARCH_ARTIFACT_PREFLIGHT_REQUEST_SCHEMA_VERSION,
  ),
  protocolBinding: protocolBindingSchema,
  candidateBaseline: z.strictObject({
    sourceCommit: z.literal(UNIVERSITY_RESEARCH_ACCEPTED_SOURCE_COMMIT),
    route: z.literal(UNIVERSITY_RESEARCH_CANDIDATE_ROUTE),
    buildDigest: digestSchema,
    requestSchemaVersion: z.literal("university-semester-loop-request.v1"),
    projectionSchemaVersion: z.literal(
      "university-semester-loop-projection.v1",
    ),
    adapterId: z.literal(UNIVERSITY_RESEARCH_ARTIFACT_ADAPTER_ID),
    adapterDigest: digestSchema,
    bindingStatus: z.literal("manifest_only_not_rendered"),
  }),
  informationItems: z.array(z.strictObject({
    itemId: z.enum(UNIVERSITY_RESEARCH_INFORMATION_ITEM_IDS),
    label: safeTextSchema,
    covers: z.array(z.enum([
      "term",
      "course",
      "source",
      "deadline",
      "capacity",
      "accepted_action",
      "world_binding",
      "terminal_state",
      "effect_boundaries",
    ])).min(1).max(3),
  })).length(UNIVERSITY_RESEARCH_INFORMATION_ITEM_IDS.length),
  scenarioPacks: z.tuple([
    universityResearchScenarioPackSchema.extend({
      packId: z.literal("pack-p"),
    }),
    universityResearchScenarioPackSchema.extend({
      packId: z.literal("pack-q"),
    }),
  ]),
  substitute: universityResearchNeutralSubstituteSchema,
  moderatorPacket: z.strictObject({
    artifactRef: z.literal("moderator-packet.phase-minus-one.v1"),
    exposureTasks: z.tuple(
      UNIVERSITY_RESEARCH_EXPOSURE_TASKS.map((task) => z.literal(task)) as [
        z.ZodLiteral<(typeof UNIVERSITY_RESEARCH_EXPOSURE_TASKS)[0]>,
        z.ZodLiteral<(typeof UNIVERSITY_RESEARCH_EXPOSURE_TASKS)[1]>,
        z.ZodLiteral<(typeof UNIVERSITY_RESEARCH_EXPOSURE_TASKS)[2]>,
        z.ZodLiteral<(typeof UNIVERSITY_RESEARCH_EXPOSURE_TASKS)[3]>,
        z.ZodLiteral<(typeof UNIVERSITY_RESEARCH_EXPOSURE_TASKS)[4]>,
        z.ZodLiteral<(typeof UNIVERSITY_RESEARCH_EXPOSURE_TASKS)[5]>,
        z.ZodLiteral<(typeof UNIVERSITY_RESEARCH_EXPOSURE_TASKS)[6]>,
        z.ZodLiteral<(typeof UNIVERSITY_RESEARCH_EXPOSURE_TASKS)[7]>,
        z.ZodLiteral<(typeof UNIVERSITY_RESEARCH_EXPOSURE_TASKS)[8]>,
      ],
    ),
    postComparisonQuestions: z.tuple(
      UNIVERSITY_RESEARCH_POST_COMPARISON_QUESTIONS.map(
        (question) => z.literal(question),
      ) as [
        z.ZodLiteral<(typeof UNIVERSITY_RESEARCH_POST_COMPARISON_QUESTIONS)[0]>,
        z.ZodLiteral<(typeof UNIVERSITY_RESEARCH_POST_COMPARISON_QUESTIONS)[1]>,
        z.ZodLiteral<(typeof UNIVERSITY_RESEARCH_POST_COMPARISON_QUESTIONS)[2]>,
      ],
    ),
    neutralPrompts: z.tuple(
      UNIVERSITY_RESEARCH_NEUTRAL_PROMPTS.map((prompt) => z.literal(prompt)) as [
        z.ZodLiteral<(typeof UNIVERSITY_RESEARCH_NEUTRAL_PROMPTS)[0]>,
        z.ZodLiteral<(typeof UNIVERSITY_RESEARCH_NEUTRAL_PROMPTS)[1]>,
        z.ZodLiteral<(typeof UNIVERSITY_RESEARCH_NEUTRAL_PROMPTS)[2]>,
      ],
    ),
    stopChecklist: z.tuple(
      UNIVERSITY_RESEARCH_STOP_CHECKLIST.map((entry) => z.literal(entry)) as [
        z.ZodLiteral<(typeof UNIVERSITY_RESEARCH_STOP_CHECKLIST)[0]>,
        z.ZodLiteral<(typeof UNIVERSITY_RESEARCH_STOP_CHECKLIST)[1]>,
        z.ZodLiteral<(typeof UNIVERSITY_RESEARCH_STOP_CHECKLIST)[2]>,
        z.ZodLiteral<(typeof UNIVERSITY_RESEARCH_STOP_CHECKLIST)[3]>,
        z.ZodLiteral<(typeof UNIVERSITY_RESEARCH_STOP_CHECKLIST)[4]>,
        z.ZodLiteral<(typeof UNIVERSITY_RESEARCH_STOP_CHECKLIST)[5]>,
        z.ZodLiteral<(typeof UNIVERSITY_RESEARCH_STOP_CHECKLIST)[6]>,
        z.ZodLiteral<(typeof UNIVERSITY_RESEARCH_STOP_CHECKLIST)[7]>,
        z.ZodLiteral<(typeof UNIVERSITY_RESEARCH_STOP_CHECKLIST)[8]>,
        z.ZodLiteral<(typeof UNIVERSITY_RESEARCH_STOP_CHECKLIST)[9]>,
        z.ZodLiteral<(typeof UNIVERSITY_RESEARCH_STOP_CHECKLIST)[10]>,
        z.ZodLiteral<(typeof UNIVERSITY_RESEARCH_STOP_CHECKLIST)[11]>,
        z.ZodLiteral<(typeof UNIVERSITY_RESEARCH_STOP_CHECKLIST)[12]>,
      ],
    ),
    taskSetDigest: z.literal(UNIVERSITY_RESEARCH_EXPOSURE_TASK_SET_DIGEST),
    questionSetDigest: z.literal(
      UNIVERSITY_RESEARCH_POST_COMPARISON_QUESTION_SET_DIGEST,
    ),
    neutralPromptSetDigest: z.literal(
      UNIVERSITY_RESEARCH_NEUTRAL_PROMPT_SET_DIGEST,
    ),
    stopChecklistDigest: z.literal(UNIVERSITY_RESEARCH_STOP_CHECKLIST_DIGEST),
    exposureMinutes: z.literal(12),
    resetMinutes: z.literal(3),
    authorityCoachingAllowed: z.literal(false),
    sellingAllowed: z.literal(false),
    hypothesisDisclosureAllowed: z.literal(false),
    participantCaptureAllowed: z.literal(false),
  }),
  pairings: z.tuple([
    z.strictObject({
      pairingId: z.literal("candidate-pack-p"),
      surface: z.literal("candidate"),
      packId: z.literal("pack-p"),
      bindingStatus: z.literal("declared_not_runtime_verified"),
    }),
    z.strictObject({
      pairingId: z.literal("candidate-pack-q"),
      surface: z.literal("candidate"),
      packId: z.literal("pack-q"),
      bindingStatus: z.literal("declared_not_runtime_verified"),
    }),
    z.strictObject({
      pairingId: z.literal("substitute-pack-p"),
      surface: z.literal("substitute"),
      packId: z.literal("pack-p"),
      bindingStatus: z.literal("manifest_bound_not_rendered"),
    }),
    z.strictObject({
      pairingId: z.literal("substitute-pack-q"),
      surface: z.literal("substitute"),
      packId: z.literal("pack-q"),
      bindingStatus: z.literal("manifest_bound_not_rendered"),
    }),
  ]),
  reviewRequest: z.strictObject({
    reviewRef: z.literal("review.fixture.pack-pq-independent-equivalence"),
    status: z.literal("requested"),
    checklistDigest: digestSchema,
  }),
});

export type UniversityResearchArtifactPreflightRequestV1 = z.infer<
  typeof universityResearchArtifactPreflightRequestSchema
>;

export const UNIVERSITY_RESEARCH_ARTIFACT_PREFLIGHT_ISSUE_CODES =
  Object.freeze([
    "schema.invalid",
    "protocol.binding_mismatch",
    "information.coverage_mismatch",
    "scenario.structure_mismatch",
    "scenario.semantic_mismatch",
    "scenario.reference_collision",
    "scenario.lexical_variation_missing",
    "scenario.pack_digest_collision",
    "substitute.neutrality_mismatch",
    "substitute.node_reference_collision",
    "substitute.binding_mismatch",
    "substitute.renderer_binding_mismatch",
    "substitute.density_mismatch",
    "candidate.adapter_binding_mismatch",
    "pairing.manifest_mismatch",
    "review.checklist_mismatch",
  ] as const);

export type UniversityResearchArtifactPreflightIssueCode =
  (typeof UNIVERSITY_RESEARCH_ARTIFACT_PREFLIGHT_ISSUE_CODES)[number];

export interface UniversityResearchArtifactPreflightIssue {
  readonly code: UniversityResearchArtifactPreflightIssueCode;
  readonly path: string;
  readonly message: string;
}

export type UniversityResearchArtifactPreflightStatus =
  | "invalid"
  | "neutrality_mismatch"
  | "scenario_structure_mismatch"
  | "mechanical_parity_mismatch"
  | "mechanical_parity_passed_review_required";

export interface UniversityResearchArtifactPreflightProjectionV1 {
  readonly schemaVersion:
    typeof UNIVERSITY_RESEARCH_ARTIFACT_PREFLIGHT_PROJECTION_SCHEMA_VERSION;
  readonly status: UniversityResearchArtifactPreflightStatus;
  readonly artifacts: {
    readonly packP: {
      readonly artifactRef: string;
      readonly artifactVersion: string;
      readonly digest: string;
      readonly scenarios: readonly {
        readonly scenarioId: string;
        readonly scenarioDigest: string;
        readonly semanticSignatureDigest: string;
      }[];
    };
    readonly packQ: {
      readonly artifactRef: string;
      readonly artifactVersion: string;
      readonly digest: string;
      readonly scenarios: readonly {
        readonly scenarioId: string;
        readonly scenarioDigest: string;
        readonly semanticSignatureDigest: string;
      }[];
    };
    readonly substitute: {
      readonly artifactRef: string;
      readonly artifactVersion: string;
      readonly rendererId: string;
      readonly rendererBindingDigest: string;
      readonly expectedRendererBindingDigest: string;
      readonly delivery: "static_local_keyboard_packet";
      readonly templateDigest: string;
      readonly artifactDigest: string;
    };
    readonly moderatorPacket: {
      readonly artifactRef: string;
      readonly digest: string;
    };
    readonly independentReview: {
      readonly reviewRef: string;
      readonly requestStatus: "requested";
      readonly checklistDigest: string;
      readonly expectedChecklistDigest: string;
      readonly envelopeDigest: string;
    };
  } | null;
  readonly informationItems: readonly {
    readonly itemId: string;
    readonly digest: string;
    readonly covers: readonly string[];
  }[];
  readonly mechanicalChecks: {
    readonly exactScenarioOrder: boolean;
    readonly canonicalScenarioSemantics: boolean;
    readonly uniqueReferences: boolean;
    readonly distinctLexicalVariants: boolean;
    readonly semanticSignaturesMatch: boolean;
    readonly distinctPackDigests: boolean;
    readonly substituteNeutrality: boolean;
    readonly substituteManifestDensity: boolean;
    readonly rendererBindingVerified: boolean;
    readonly candidateAdapterBindingVerified: boolean;
    readonly substitutePackBindings: boolean;
    readonly pairingManifestComplete: boolean;
    readonly candidateRenderParity: "not_rendered";
    readonly substituteRenderParity: "not_rendered";
  };
  readonly openGates: readonly [
    "candidate_pack_adapter_not_implemented",
    "candidate_substitute_render_parity_not_run",
    "independent_difficulty_equivalence_review_required",
    "artifact_approval_not_established",
    "synthetic_persona_rehearsal_not_run",
    "participant_operation_not_authorized",
  ];
  readonly authority: {
    readonly projectionClass: "fixture_only_research_artifact_preflight";
    readonly inputAuthority: "caller_asserted_synthetic_manifest_only";
    readonly digestAuthority: "local_canonical_identity_only";
    readonly candidateBuildIdentityAuthority: "caller_asserted_not_verified";
    readonly candidateAdapterIdentityAuthority:
      "locally_recomputed_manifest_only";
    readonly rendererBindingIdentityAuthority:
      "locally_recomputed_manifest_only";
    readonly artifactApprovalAuthority: "not_established";
    readonly syntheticContentTruthAuthority: "not_established";
    readonly realEntityExclusionAuthority: "not_established";
    readonly candidateRenderParityAuthority: "manifest_only_not_rendered";
    readonly substituteNeutralityAuthority: "mechanical_constraints_only";
    readonly packEquivalenceAuthority:
      "not_established_independent_review_required";
    readonly reviewerIdentityAuthority: "not_established";
    readonly rehearsalReadiness: false;
    readonly participantEnrollmentAllowed: false;
    readonly participantDataCaptureAllowed: false;
    readonly courseworkCaptureAllowed: false;
    readonly persistenceAllowed: false;
    readonly publishAllowed: false;
    readonly sendAllowed: false;
    readonly externalEffectsAllowed: false;
    readonly claimUpgradeAllowed: false;
    readonly gateClosureAllowed: false;
  };
  readonly issues: readonly UniversityResearchArtifactPreflightIssue[];
  readonly projectionDigest: string | null;
}
