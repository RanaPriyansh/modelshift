import { deepFreeze } from "../deep-freeze";
import { canonicalJson, sha256Digest } from "../events";
import {
  UNIVERSITY_RESEARCH_ACCEPTED_SOURCE_COMMIT,
  UNIVERSITY_RESEARCH_CANDIDATE_ROUTE,
  UNIVERSITY_RESEARCH_EXPOSURE_TASKS,
  UNIVERSITY_RESEARCH_EXPOSURE_TASK_SET_DIGEST,
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
import {
  UNIVERSITY_RESEARCH_ARTIFACT_ADAPTER_ID,
  UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS,
  UNIVERSITY_RESEARCH_ARTIFACT_PREFLIGHT_REQUEST_SCHEMA_VERSION,
  UNIVERSITY_RESEARCH_NEUTRAL_RENDERER_ID,
  UNIVERSITY_RESEARCH_NEUTRAL_SUBSTITUTE_SCHEMA_VERSION,
  UNIVERSITY_RESEARCH_SCENARIO_PACK_SCHEMA_VERSION,
  type UniversityResearchArtifactPreflightRequestV1,
  type UniversityResearchNeutralSubstituteV1,
  type UniversityResearchScenarioPackV1,
} from "./contracts";

const PROTOCOL_BINDING = deepFreeze({
  protocolId: UNIVERSITY_RESEARCH_PROTOCOL_ID,
  protocolVersion: UNIVERSITY_RESEARCH_PROTOCOL_VERSION,
  protocolDocumentDigest: UNIVERSITY_RESEARCH_PROTOCOL_DOCUMENT_DIGEST,
  exposureTaskSetDigest: UNIVERSITY_RESEARCH_EXPOSURE_TASK_SET_DIGEST,
  postComparisonQuestionSetDigest:
    UNIVERSITY_RESEARCH_POST_COMPARISON_QUESTION_SET_DIGEST,
  neutralPromptSetDigest: UNIVERSITY_RESEARCH_NEUTRAL_PROMPT_SET_DIGEST,
  stopChecklistDigest: UNIVERSITY_RESEARCH_STOP_CHECKLIST_DIGEST,
});

const SYNTHETIC_BOUNDARY = deepFreeze({
  syntheticOnly: true,
  realInstitutionAllowed: false,
  realPersonAllowed: false,
  realCourseAllowed: false,
  realAccountAllowed: false,
  realAssignmentAllowed: false,
  participantDataCaptureAllowed: false,
} as const);

export const UNIVERSITY_RESEARCH_ARTIFACT_INFORMATION_ITEMS = deepFreeze([
  {
    itemId: "research-information.term",
    label: "Term and course",
    covers: ["term", "course"],
  },
  {
    itemId: "research-information.source",
    label: "Copied source",
    covers: ["source"],
  },
  {
    itemId: "research-information.deadline",
    label: "Deadline",
    covers: ["deadline"],
  },
  {
    itemId: "research-information.capacity",
    label: "Declared capacity",
    covers: ["capacity"],
  },
  {
    itemId: "research-information.path",
    label: "Accepted action",
    covers: ["accepted_action"],
  },
  {
    itemId: "research-information.world",
    label: "Activity binding",
    covers: ["world_binding"],
  },
  {
    itemId: "research-information.effects",
    label: "Terminal state and effects",
    covers: ["terminal_state", "effect_boundaries"],
  },
] as const);

export const UNIVERSITY_RESEARCH_INDEPENDENT_REVIEW_CHECKLIST = deepFreeze([
  "same_semantic_state_and_bounded_job",
  "same_source_authority_and_effect_boundaries",
  "same_information_order_and_visible_density",
  "same_choice_order_and_navigation_burden",
  "same_task_answer_and_timing_burden",
  "neutral_substitute_has_no_brand_or_candidate_status_names",
  "keyboard_path_reaches_all_states_at_320_css_px",
  "non_motion_alternative_preserves_identical_information",
  "candidate_and_substitute_render_from_the_same_pack_facts",
  "no_real_institution_person_course_account_or_assignment",
] as const);

type PackVariant = Readonly<{
  packId: "pack-p" | "pack-q";
  prefix: "northstar" | "riverglass";
  artifactRef:
    | "research-scenario-pack.northstar.v1"
    | "research-scenario-pack.riverglass.v1";
  termLabel: "Autumn Studio Term" | "Spring Lab Term";
  courseLabel: "Systems Sketching" | "Evidence Mapping";
  times: readonly {
    asOf: string;
    deadline: string;
  }[];
}>;

const PACK_P = deepFreeze({
  packId: "pack-p",
  prefix: "northstar",
  artifactRef: "research-scenario-pack.northstar.v1",
  termLabel: "Autumn Studio Term",
  courseLabel: "Systems Sketching",
  times: [
    { asOf: "2026-09-07T09:00:00.000Z", deadline: "2026-09-08T17:00:00.000Z" },
    { asOf: "2026-09-09T09:00:00.000Z", deadline: "2026-09-10T17:00:00.000Z" },
    { asOf: "2026-09-11T09:00:00.000Z", deadline: "2026-09-12T17:00:00.000Z" },
    { asOf: "2026-09-13T09:00:00.000Z", deadline: "2026-09-14T17:00:00.000Z" },
    { asOf: "2026-09-15T09:00:00.000Z", deadline: "2026-09-16T17:00:00.000Z" },
    { asOf: "2026-09-17T09:00:00.000Z", deadline: "2026-09-18T17:00:00.000Z" },
    { asOf: "2026-09-19T09:00:00.000Z", deadline: "2026-09-20T17:00:00.000Z" },
  ],
} satisfies PackVariant);

const PACK_Q = deepFreeze({
  packId: "pack-q",
  prefix: "riverglass",
  artifactRef: "research-scenario-pack.riverglass.v1",
  termLabel: "Spring Lab Term",
  courseLabel: "Evidence Mapping",
  times: [
    { asOf: "2027-02-12T14:30:00.000Z", deadline: "2027-02-13T22:30:00.000Z" },
    { asOf: "2027-02-14T14:30:00.000Z", deadline: "2027-02-15T22:30:00.000Z" },
    { asOf: "2027-02-16T14:30:00.000Z", deadline: "2027-02-17T22:30:00.000Z" },
    { asOf: "2027-02-18T14:30:00.000Z", deadline: "2027-02-19T22:30:00.000Z" },
    { asOf: "2027-02-20T14:30:00.000Z", deadline: "2027-02-21T22:30:00.000Z" },
    { asOf: "2027-02-22T14:30:00.000Z", deadline: "2027-02-23T22:30:00.000Z" },
    { asOf: "2027-02-24T14:30:00.000Z", deadline: "2027-02-25T22:30:00.000Z" },
  ],
} satisfies PackVariant);

const SEMANTICS = deepFreeze([
  {
    scenarioId: "ready",
    expectedStatus: "protected_study_ready",
    sourceState: "reviewed_copy",
    conflictCount: 0,
    freshness: "current_for_fixture",
    availableMinutes: 90,
    effortMinutesLow: 45,
    effortMinutesHigh: 60,
    capacityRelation: "fits",
    pathState: "accepted_active",
    worldState: "exact_binding",
    terminalState: "action_open",
    choices: [
      {
        kind: "inspect_protected_study",
        label: "Inspect the study boundary",
        owner: "learner_fixture",
      },
    ],
    nextJobKind: "inspect_protected_study_boundary",
    nextJobReason: "reason.ready.exact-source-capacity-path-world",
    nextJobOwner: "learner_fixture",
    controlKind: "local_anchor_navigation",
    controlLabel: "Open the separate study boundary",
    controlEffect: "navigate_to_separate_synthetic_view",
    navigationOnly: true,
    stopOwner: "learner_fixture",
    dependencyCount: 4,
  },
  {
    scenarioId: "source-review",
    expectedStatus: "source_review_required",
    sourceState: "copy_review_required",
    conflictCount: 1,
    freshness: "conflicting_fixture_copies",
    availableMinutes: 90,
    effortMinutesLow: 45,
    effortMinutesHigh: 60,
    capacityRelation: "fits",
    pathState: "accepted_active",
    worldState: "not_exposed",
    terminalState: "action_open",
    choices: [
      {
        kind: "review_copied_sources",
        label: "Review the copied sources",
        owner: "source_reviewer",
      },
    ],
    nextJobKind: "review_copied_sources",
    nextJobReason: "reason.source.copies-conflict",
    nextJobOwner: "source_reviewer",
    controlKind: "local_anchor_navigation",
    controlLabel: "Open the separate source review",
    controlEffect: "navigate_to_separate_synthetic_view",
    navigationOnly: true,
    stopOwner: "source_reviewer",
    dependencyCount: 1,
  },
  {
    scenarioId: "capacity-break",
    expectedStatus: "recovery_required",
    sourceState: "reviewed_copy",
    conflictCount: 0,
    freshness: "current_for_fixture",
    availableMinutes: 30,
    effortMinutesLow: 45,
    effortMinutesHigh: 60,
    capacityRelation: "below_low",
    pathState: "accepted_active",
    worldState: "not_exposed",
    terminalState: "action_open",
    choices: [
      {
        kind: "inspect_recovery_draft",
        label: "Inspect the recovery draft",
        owner: "learner_fixture",
      },
    ],
    nextJobKind: "inspect_bounded_recovery",
    nextJobReason: "reason.capacity.below-authored-low",
    nextJobOwner: "learner_fixture",
    controlKind: "local_anchor_navigation",
    controlLabel: "Open the separate recovery draft",
    controlEffect: "navigate_to_separate_synthetic_view",
    navigationOnly: true,
    stopOwner: "learner_fixture",
    dependencyCount: 2,
  },
  {
    scenarioId: "tight-window",
    expectedStatus: "learner_choice_required",
    sourceState: "reviewed_copy",
    conflictCount: 0,
    freshness: "current_for_fixture",
    availableMinutes: 50,
    effortMinutesLow: 45,
    effortMinutesHigh: 60,
    capacityRelation: "low_only",
    pathState: "accepted_active",
    worldState: "not_exposed",
    terminalState: "action_open",
    choices: [
      {
        kind: "continue_with_declared_window",
        label: "Continue with the declared window",
        owner: "learner_fixture",
      },
      {
        kind: "stop_and_replan",
        label: "Stop and replan",
        owner: "learner_fixture",
      },
    ],
    nextJobKind: "make_learner_capacity_choice",
    nextJobReason: "reason.capacity.low-only-fits",
    nextJobOwner: "learner_fixture",
    controlKind: "no_control",
    controlLabel: null,
    controlEffect: "remain_in_place",
    navigationOnly: false,
    stopOwner: "learner_fixture",
    dependencyCount: 2,
  },
  {
    scenarioId: "world-changed",
    expectedStatus: "world_review_required",
    sourceState: "reviewed_copy",
    conflictCount: 0,
    freshness: "current_for_fixture",
    availableMinutes: 90,
    effortMinutesLow: 45,
    effortMinutesHigh: 60,
    capacityRelation: "fits",
    pathState: "accepted_active",
    worldState: "binding_changed",
    terminalState: "action_open",
    choices: [
      {
        kind: "seek_world_review",
        label: "Seek review of the exact activity binding",
        owner: "human_reviewer",
      },
    ],
    nextJobKind: "seek_exact_world_review",
    nextJobReason: "reason.world.exact-binding-changed",
    nextJobOwner: "human_reviewer",
    controlKind: "no_control",
    controlLabel: null,
    controlEffect: "remain_in_place",
    navigationOnly: false,
    stopOwner: "human_reviewer",
    dependencyCount: 4,
  },
  {
    scenarioId: "path-complete",
    expectedStatus: "path_complete",
    sourceState: "reviewed_copy",
    conflictCount: 0,
    freshness: "current_for_fixture",
    availableMinutes: 90,
    effortMinutesLow: 45,
    effortMinutesHigh: 60,
    capacityRelation: "fits",
    pathState: "accepted_complete",
    worldState: "not_exposed",
    terminalState: "action_complete",
    choices: [
      {
        kind: "acknowledge_action_complete",
        label: "Return without selecting another action",
        owner: "learner_fixture",
      },
    ],
    nextJobKind: "honest_return_after_action",
    nextJobReason: "reason.path.action-complete-only",
    nextJobOwner: "learner_fixture",
    controlKind: "no_control",
    controlLabel: null,
    controlEffect: "remain_in_place",
    navigationOnly: false,
    stopOwner: "learner_fixture",
    dependencyCount: 1,
  },
  {
    scenarioId: "path-blocked",
    expectedStatus: "path_blocked",
    sourceState: "reviewed_copy",
    conflictCount: 0,
    freshness: "current_for_fixture",
    availableMinutes: 90,
    effortMinutesLow: 45,
    effortMinutesHigh: 60,
    capacityRelation: "fits",
    pathState: "accepted_blocked",
    worldState: "not_exposed",
    terminalState: "action_blocked",
    choices: [
      {
        kind: "repair_or_replace_path",
        label: "Repair or replace the accepted path",
        owner: "learner_fixture",
      },
    ],
    nextJobKind: "repair_or_replace_accepted_path",
    nextJobReason: "reason.path.accepted-action-blocked",
    nextJobOwner: "learner_fixture",
    controlKind: "no_control",
    controlLabel: null,
    controlEffect: "remain_in_place",
    navigationOnly: false,
    stopOwner: "learner_fixture",
    dependencyCount: 1,
  },
] as const);

function scenarioFor(
  variant: PackVariant,
  index: number,
): UniversityResearchScenarioPackV1["scenarios"][number] {
  const semantic = SEMANTICS[index]!;
  const time = variant.times[index]!;
  const base = `${variant.prefix}.${semantic.scenarioId}`;
  const neutralWorldSlot = String(index + 1).padStart(2, "0");
  const acceptedWorldRef =
    `world.${variant.prefix}.activity-${neutralWorldSlot}.accepted`;
  const suppliedWorldRef = semantic.worldState === "binding_changed"
    ? `world.${variant.prefix}.activity-${neutralWorldSlot}.supplied`
    : acceptedWorldRef;

  return {
    scenarioId: semantic.scenarioId,
    scenarioRef: `scenario.${base}`,
    expectedStatus: semantic.expectedStatus,
    difficultyClass: "semester-loop-state-identification.v1",
    context: {
      termRef: `term.${base}`,
      termLabel: variant.termLabel,
      courseRef: `course.${base}`,
      courseLabel: variant.courseLabel,
      sourceRef: `source.${base}`,
      asOf: time.asOf,
      timeZone: "Etc/UTC",
    },
    source: {
      state: semantic.sourceState,
      conflictCount: semantic.conflictCount,
      freshness: semantic.freshness,
      institutionalCompleteness: "not_established",
      authority: "synthetic_copied_fact_not_university_truth",
    },
    deadline: {
      deadlineRef: `deadline.${base}`,
      title: "Concept check closes",
      at: time.deadline,
      relativeMinutes: 1_920,
      consequence: "learner_fixture_declared_course_consequence",
      universityTruth: false,
    },
    capacity: {
      availableMinutes: semantic.availableMinutes,
      effortMinutesLow: semantic.effortMinutesLow,
      effortMinutesHigh: semantic.effortMinutesHigh,
      relation: semantic.capacityRelation,
      declaredBy: "learner_fixture",
      effortBasis: "fixture_authored",
    },
    path: {
      pathRef: `path.${base}`,
      actionRef: `action.${base}`,
      actionTitle: "Map the disputed claims",
      state: semantic.pathState,
      owner: "learner_fixture",
      selectedBySourceFacts: false,
    },
    world: {
      acceptedWorldRef,
      suppliedWorldRef,
      state: semantic.worldState,
      similarWorldSubstitutionAllowed: false,
    },
    terminal: {
      state: semantic.terminalState,
      courseCompleteClaimed: false,
      learnerStatusClaimed: false,
      semesterCompleteClaimed: false,
    },
    choices: semantic.choices.map((choice, choiceIndex) => ({
      choiceId: `choice.${base}.${choiceIndex + 1}`,
      kind: choice.kind,
      label: choice.label,
      owner: choice.owner,
    })),
    nextJob: {
      kind: semantic.nextJobKind,
      reasonCode: semantic.nextJobReason,
      owner: semantic.nextJobOwner,
      primaryControl: {
        kind: semantic.controlKind,
        label: semantic.controlLabel,
        effect: semantic.controlEffect,
      },
    },
    effects: {
      navigationOnly: semantic.navigationOnly,
      saves: false,
      sends: false,
      startsSession: false,
      submits: false,
      records: false,
      createsEvidence: false,
      changesPath: false,
      externalEffect: false,
      institutionalAction: false,
    },
    answerKey: {
      copiedFactsAreUniversityTruth: false,
      deadlineIsUniversityTruth: false,
      surfaceSelectedPath: false,
      learnerOwnsPath: true,
      effectPrediction: semantic.navigationOnly ? "navigation_only" : "no_effect",
      stopOwner: semantic.stopOwner,
    },
    difficulty: {
      informationCategoryCount: 8,
      choiceCount: semantic.choices.length,
      navigationStepCount: semantic.navigationOnly ? 1 : 0,
      dependencyCount: semantic.dependencyCount,
      timingArithmetic: "absolute_time_plus_relative_minutes",
      taskAnswerCount: 9,
    },
  };
}

function packFor<const T extends PackVariant>(
  variant: T,
): UniversityResearchScenarioPackV1 & { readonly packId: T["packId"] } {
  return deepFreeze({
    schemaVersion: UNIVERSITY_RESEARCH_SCENARIO_PACK_SCHEMA_VERSION,
    packId: variant.packId,
    artifactRef: variant.artifactRef,
    artifactVersion: "1.0.0",
    protocolBinding: { ...PROTOCOL_BINDING },
    syntheticBoundary: { ...SYNTHETIC_BOUNDARY },
    scenarios: UNIVERSITY_RESEARCH_SCENARIO_IDS.map((_, index) => (
      scenarioFor(variant, index)
    )),
  }) as UniversityResearchScenarioPackV1 & {
    readonly packId: T["packId"];
  };
}

export const AUTHORED_UNIVERSITY_RESEARCH_PACK_P = packFor(PACK_P);
export const AUTHORED_UNIVERSITY_RESEARCH_PACK_Q = packFor(PACK_Q);

async function domainDigest(
  digestDomain: string,
  value: unknown,
): Promise<string> {
  return sha256Digest(canonicalJson({ digestDomain, value }));
}

export const UNIVERSITY_RESEARCH_CANDIDATE_ADAPTER_DESCRIPTOR = deepFreeze({
  adapterId: UNIVERSITY_RESEARCH_ARTIFACT_ADAPTER_ID,
  bindingStatus: "manifest_only_not_rendered",
  candidateRoute: UNIVERSITY_RESEARCH_CANDIDATE_ROUTE,
  sourceCommit: UNIVERSITY_RESEARCH_ACCEPTED_SOURCE_COMMIT,
  requestSchemaVersion: "university-semester-loop-request.v1",
  projectionSchemaVersion: "university-semester-loop-projection.v1",
  sourceOfFacts: "canonical_scenario_pack",
  runtimeBindingImplemented: false,
} as const);

export const UNIVERSITY_RESEARCH_RENDERER_BINDING_DESCRIPTOR = deepFreeze({
  rendererId: UNIVERSITY_RESEARCH_NEUTRAL_RENDERER_ID,
  nodeKinds: [
    "heading",
    "anchor_navigation",
    "fact_table",
    "choice_list",
    "effect_boundary",
    "task_prompt",
    "terminal_note",
  ],
  dataSource: "same_canonical_scenario_record_for_both_surfaces",
  anchorNavigation: {
    controlKind: "native_radio_group",
    groupLabelSource: "anchor_navigation.heading",
    optionLabelSource: "anchor_navigation.items.label",
    optionValueSource: "anchor_navigation.items.scenarioId",
    labelStrategy: "locked_ordinal_example_labels",
    scenarioIdentifiersVisible: false,
  },
  rawHtmlAllowed: false,
  scriptAllowed: false,
  externalActionAllowed: false,
} as const);

export const UNIVERSITY_RESEARCH_NEUTRAL_NAVIGATION_ITEMS = deepFreeze(
  UNIVERSITY_RESEARCH_SCENARIO_IDS.map((scenarioId, index) => ({
    scenarioId,
    label: `Example ${index + 1}`,
  })),
);

export const UNIVERSITY_RESEARCH_NEUTRAL_SUBSTITUTE_DECLARATION = deepFreeze({
  delivery: "static_local_keyboard_packet",
  surface: {
    title: "Course worksheet",
    nodes: [
      {
        kind: "heading",
        nodeRef: "worksheet.heading",
        text: "Course worksheet",
      },
      {
        kind: "anchor_navigation",
        nodeRef: "worksheet.state-navigation",
        heading: "Compare the seven examples",
        labelStrategy: "locked_ordinal_example_labels",
        items: UNIVERSITY_RESEARCH_NEUTRAL_NAVIGATION_ITEMS.map(
          (item) => ({ ...item }),
        ),
      },
      {
        kind: "fact_table",
        nodeRef: "worksheet.fact-table",
        heading: "What the example contains",
        informationItemIds:
          UNIVERSITY_RESEARCH_ARTIFACT_INFORMATION_ITEMS.map(
            (item) => item.itemId,
          ),
      },
      {
        kind: "choice_list",
        nodeRef: "worksheet.choice-list",
        heading: "Available next steps",
        source: "scenario.choices",
      },
      {
        kind: "effect_boundary",
        nodeRef: "worksheet.effect-boundary",
        heading: "What this page can and cannot do",
        source: "scenario.effects",
      },
      {
        kind: "task_prompt",
        nodeRef: "worksheet.task-prompt",
        heading: "Questions for this example",
        taskSetDigest: UNIVERSITY_RESEARCH_EXPOSURE_TASK_SET_DIGEST,
      },
      {
        kind: "terminal_note",
        nodeRef: "worksheet.terminal-note",
        heading: "Where this example stops",
        source: "scenario.terminal",
      },
    ],
    brandPresence: "none",
    candidateStatusNamesAllowed: false,
    computedHierarchyAllowed: false,
    aiRecommendationAllowed: false,
    automatedSynthesisAllowed: false,
    scoringAllowed: false,
    rankingAllowed: false,
    persistenceAllowed: false,
    externalActionAllowed: false,
  },
  access: {
    minimumCssWidth: 320,
    keyboardModel: "native_radio_group_then_document_order",
    allSevenStatesKeyboardReachable: true,
    motionRequired: false,
    nonMotionAlternative: "identical_static_content",
    remoteAssetsAllowed: false,
    rawHtmlAllowed: false,
    scriptAllowed: false,
    urlInputAllowed: false,
  },
  density: {
    maximumVisibleCharactersPerScenario: 1_800,
    maximumFactRows: 8,
    maximumChoices: 3,
  },
  taskFamilies: [...UNIVERSITY_RESEARCH_TASK_FAMILIES],
} as const);

async function neutralSubstitute(
  packPDigest: string,
  packQDigest: string,
): Promise<UniversityResearchNeutralSubstituteV1> {
  const rendererBindingDigest = await domainDigest(
    UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS.rendererBinding,
    UNIVERSITY_RESEARCH_RENDERER_BINDING_DESCRIPTOR,
  );

  return deepFreeze({
    schemaVersion: UNIVERSITY_RESEARCH_NEUTRAL_SUBSTITUTE_SCHEMA_VERSION,
    artifactRef: "matched-substitute.phase-minus-one.v1",
    artifactVersion: "1.0.0",
    rendererId: UNIVERSITY_RESEARCH_NEUTRAL_RENDERER_ID,
    rendererBindingDigest,
    protocolBinding: { ...PROTOCOL_BINDING },
    ...UNIVERSITY_RESEARCH_NEUTRAL_SUBSTITUTE_DECLARATION,
    packBindings: [
      { packId: "pack-p", packDigest: packPDigest },
      { packId: "pack-q", packDigest: packQDigest },
    ],
  }) as unknown as UniversityResearchNeutralSubstituteV1;
}

export async function authoredUniversityResearchArtifactPreflightRequest():
Promise<Readonly<UniversityResearchArtifactPreflightRequestV1>> {
  const [packPDigest, packQDigest, adapterDigest, checklistDigest] =
    await Promise.all([
      domainDigest(
        UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS.scenarioPack,
        AUTHORED_UNIVERSITY_RESEARCH_PACK_P,
      ),
      domainDigest(
        UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS.scenarioPack,
        AUTHORED_UNIVERSITY_RESEARCH_PACK_Q,
      ),
      domainDigest(
        UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS.candidateAdapter,
        UNIVERSITY_RESEARCH_CANDIDATE_ADAPTER_DESCRIPTOR,
      ),
      domainDigest(
        UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS.reviewChecklist,
        UNIVERSITY_RESEARCH_INDEPENDENT_REVIEW_CHECKLIST,
      ),
    ]);
  const substitute = await neutralSubstitute(packPDigest, packQDigest);

  return deepFreeze({
    schemaVersion: UNIVERSITY_RESEARCH_ARTIFACT_PREFLIGHT_REQUEST_SCHEMA_VERSION,
    protocolBinding: { ...PROTOCOL_BINDING },
    candidateBaseline: {
      sourceCommit: UNIVERSITY_RESEARCH_ACCEPTED_SOURCE_COMMIT,
      route: UNIVERSITY_RESEARCH_CANDIDATE_ROUTE,
      buildDigest:
        "sha256:65dbe36be81ad208c52b22e627feef33601e3a1bc46df09c746a72db2da3e58d",
      requestSchemaVersion: "university-semester-loop-request.v1",
      projectionSchemaVersion: "university-semester-loop-projection.v1",
      adapterId: UNIVERSITY_RESEARCH_ARTIFACT_ADAPTER_ID,
      adapterDigest,
      bindingStatus: "manifest_only_not_rendered",
    },
    informationItems: UNIVERSITY_RESEARCH_ARTIFACT_INFORMATION_ITEMS.map(
      (item) => ({
        itemId: item.itemId,
        label: item.label,
        covers: [...item.covers],
      }),
    ),
    scenarioPacks: [
      AUTHORED_UNIVERSITY_RESEARCH_PACK_P,
      AUTHORED_UNIVERSITY_RESEARCH_PACK_Q,
    ],
    substitute,
    moderatorPacket: {
      artifactRef: "moderator-packet.phase-minus-one.v1",
      exposureTasks: [...UNIVERSITY_RESEARCH_EXPOSURE_TASKS],
      postComparisonQuestions: [
        ...UNIVERSITY_RESEARCH_POST_COMPARISON_QUESTIONS,
      ],
      neutralPrompts: [...UNIVERSITY_RESEARCH_NEUTRAL_PROMPTS],
      stopChecklist: [...UNIVERSITY_RESEARCH_STOP_CHECKLIST],
      taskSetDigest: UNIVERSITY_RESEARCH_EXPOSURE_TASK_SET_DIGEST,
      questionSetDigest:
        UNIVERSITY_RESEARCH_POST_COMPARISON_QUESTION_SET_DIGEST,
      neutralPromptSetDigest: UNIVERSITY_RESEARCH_NEUTRAL_PROMPT_SET_DIGEST,
      stopChecklistDigest: UNIVERSITY_RESEARCH_STOP_CHECKLIST_DIGEST,
      exposureMinutes: 12,
      resetMinutes: 3,
      authorityCoachingAllowed: false,
      sellingAllowed: false,
      hypothesisDisclosureAllowed: false,
      participantCaptureAllowed: false,
    },
    pairings: [
      {
        pairingId: "candidate-pack-p",
        surface: "candidate",
        packId: "pack-p",
        bindingStatus: "declared_not_runtime_verified",
      },
      {
        pairingId: "candidate-pack-q",
        surface: "candidate",
        packId: "pack-q",
        bindingStatus: "declared_not_runtime_verified",
      },
      {
        pairingId: "substitute-pack-p",
        surface: "substitute",
        packId: "pack-p",
        bindingStatus: "manifest_bound_not_rendered",
      },
      {
        pairingId: "substitute-pack-q",
        surface: "substitute",
        packId: "pack-q",
        bindingStatus: "manifest_bound_not_rendered",
      },
    ],
    reviewRequest: {
      reviewRef: "review.fixture.pack-pq-independent-equivalence",
      status: "requested",
      checklistDigest,
    },
  });
}
