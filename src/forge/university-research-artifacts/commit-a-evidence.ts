import { deepFreeze } from "../deep-freeze";
import {
  UNIVERSITY_RESEARCH_ACCEPTED_SOURCE_COMMIT,
  UNIVERSITY_RESEARCH_CANDIDATE_A_LOCAL_BUILD_DIGEST,
  UNIVERSITY_RESEARCH_CANDIDATE_ROUTE,
} from "../university-research-operations/contracts";

export const UNIVERSITY_RESEARCH_COMMIT_A_EVIDENCE_SCHEMA_VERSION =
  "university-research-commit-a-evidence.v1" as const;

/**
 * This is a checked-in binding record about the exact clean Commit A
 * candidate. It is unsigned local engineering evidence, not an attestation,
 * independent review, participant authorization, deployment, or production
 * receipt.
 */
export const UNIVERSITY_RESEARCH_COMMIT_A_EVIDENCE = deepFreeze({
  schemaVersion: UNIVERSITY_RESEARCH_COMMIT_A_EVIDENCE_SCHEMA_VERSION,
  candidate: {
    sourceCommit: UNIVERSITY_RESEARCH_ACCEPTED_SOURCE_COMMIT,
    sourceTree: "9b3fd9d1beb924aa4018201971559ddd18b017e0",
    route: UNIVERSITY_RESEARCH_CANDIDATE_ROUTE,
    artifactVersion: "1.1.0",
  },
  supersededCandidate: {
    sourceCommit: "526bf55ebfc0f477f50921728b5d171b1ce9ce17",
    disposition: "rejected_before_binding",
    reason:
      "css_module_selector_list_was_dropped_and_all_seven_scenarios_rendered_visible",
  },
  build: {
    receiptSchemaVersion: "forge-production-build-receipt.v3",
    sourceState: "clean",
    buildId:
      "forge-source-v1-9fb4d22142deec7c29f1c15a59d0dcc4b7d118c1",
    artifactDigest: UNIVERSITY_RESEARCH_CANDIDATE_A_LOCAL_BUILD_DIGEST,
    artifactFileCount: 1_404,
    publicAssetDigest:
      "sha256:3e9e04785d6247fdce6012fb48d47c26f3f1ac75869beac3f9aab1d421fff5ba",
    publicAssetCount: 73,
    publicDirectoryDigest:
      "sha256:e0096e369f47666ca5a3f962b71b6f5199a17117ac5ce4a598d1b77dc42abac9",
    publicDirectoryFileCount: 5,
    runtimeConfigurationDigest:
      "sha256:0348d8eb5ea74ad2d84ea08c00fb6d48bcd99bf09d613d9f14330ea67061c1a6",
    runtimeConfigurationFileCount: 4,
    runtimeCachePolicy: "fresh_ephemeral_next_cache_v1",
  },
  compiler: {
    compilerId: "university-research-candidate-compiler.v1",
    descriptorDigest:
      "sha256:1d017c4a913fc1a87d4ef502d0f143b6231b01cdaef6e984fc5d26b72534181c",
  },
  sharedSurface: {
    packetSchemaVersion: "university-research-surface-packet.v1",
    rendererBindingDigest:
      "sha256:921a230df8b244a75f576bf3adf7772902ac98943e04f913d16054783fe22fa4",
    packP: {
      packDigest:
        "sha256:986aea9801ff837ddffb843ff4a046fe0cd832ea96d69ac7dcd4311687225e53",
      packetDigest:
        "sha256:8d4ee7b1f403a67ba656f5f2017d9553788a5c2aa5d58d6794681587d14b4d94",
    },
    packQ: {
      packDigest:
        "sha256:2eba40adc6327828a6afbf3c7c9822baae5037611902166e2d1f3a8111d97ab7",
      packetDigest:
        "sha256:72c1e93bc752c68f94a3acb3cabfbcdc0616ea3b66e6b0394496150f7800b566",
    },
    neutralArtifactDigest:
      "sha256:dc4adaaeb3b16773f26f3c244373549802b389e2413639414aa179acce7f23ec",
    moderatorPacketDigest:
      "sha256:44cd3c50ec4964b7959ddd499e2a9213c5a2182e810bcd2df584839bdbcef3df",
  },
  automatedVerification: {
    primaryTestFilesPassed: 135,
    primaryTestsPassed: 1_235,
    evaluatorTestFilesPassed: 2,
    evaluatorTestsPassed: 13,
    typecheckPassed: true,
    lintPassed: true,
    diffCheckPassed: true,
    publicBuildBoundaryPassed: true,
  },
  browserObservation: {
    browser: "connected_chrome",
    mobileCssViewport: { width: 320, height: 900 },
    desktopCssViewport: { width: 2_000, height: 1_183 },
    packPSevenStatesShowExactlyOneScenario: true,
    packQSevenStatesShowExactlyOneScenario: true,
    minimumScenarioControlHeightCssPx: 44,
    horizontalOverflowObserved: false,
    nativeArrowNavigationObserved: true,
    exactLocalFragmentFocusObserved: true,
    movingElementsAtObservedPreference: 0,
    productionTokenStillRenderedUnavailableBoundary: true,
    productionCandidateMarkersObserved: false,
    productionHealthBuildSourceCommit:
      UNIVERSITY_RESEARCH_ACCEPTED_SOURCE_COMMIT,
    browserGeneratedErrors: [],
    extensionGeneratedErrors: ["darkreader_hydration_attribute_injection"],
    screenshotEvidence:
      "not_captured_macos_screen_recording_permission_missing",
  },
  authority: {
    evidenceClass: "unsigned_local_engineering_observation",
    buildHermeticityEstablished: false,
    trustedBuilderEstablished: false,
    dependencyProvenanceEstablished: false,
    renderedCandidateSubstituteParityEstablished: false,
    forcedColorsReviewCompleted: false,
    manualAssistiveTechnologyReviewCompleted: false,
    independentEquivalenceReviewCompleted: false,
    artifactApprovalEstablished: false,
    participantOperationAuthorized: false,
    realStudentOrCourseDataAuthorized: false,
    deployed: false,
    productionOperationEstablished: false,
    learningOrEfficacyEstablished: false,
  },
  openGates: [
    "rendered_candidate_substitute_parity",
    "forced_colors_and_manual_assistive_technology_review",
    "independent_difficulty_equivalence_review",
    "artifact_approval_and_synthetic_persona_rehearsal",
    "participant_data_incident_withdrawal_and_operator_authority",
    "live_data_identity_tenant_persistence_and_rights_boundary",
    "pushed_provider_bound_deployment_and_rollback_authority",
  ],
} as const);
