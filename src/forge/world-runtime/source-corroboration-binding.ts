import type { WorldRuntimeBinding } from "../contracts";

/**
 * Binds the existing authored source-corroboration package to the shared
 * runtime. Its PNAS and arXiv metadata is legacy metadata only: it does not
 * create a source snapshot, locator, claim, rights, or review authority.
 */
export const SOURCE_CORROBORATION_RUNTIME_BINDING = {
  protocolVersion: "1.1.0",
  semanticStages: [
    "encounter",
    "commit_model",
    "interpret_two_readings",
    "name_disagreement",
    "commit_test_prediction",
    "run_separating_experience",
    "governed_support",
    "reconstruct",
    "withdraw_instructional_ai",
    "cold_transfer",
    "bounded_result",
    "return_or_apply",
  ],
  actions: [
    { id: "action.source-corroboration.learner-operation", kind: "learner_operation", label: "Learner-authored evidence operation" },
    { id: "action.source-corroboration.support", kind: "instructional_support", label: "Explicit authored support action" },
    { id: "action.source-corroboration.model", kind: "model_action", label: "Model action request" },
    { id: "action.source-corroboration.replay", kind: "experience_replay", label: "Separating-evidence replay" },
    { id: "action.source-corroboration.access", kind: "access_accommodation", label: "Construct-preserving access accommodation" },
    { id: "action.source-corroboration.reset", kind: "reset", label: "Start a new corroboration attempt" },
  ],
  support: {
    policyId: "policy.source-corroboration.authored-support.v1",
    allowedDuringProof: false,
    recordsCognitiveSupport: false,
    catalog: [],
  },
  proof: {
    proofClaimId: "proof.ai-literacy.independent-corroboration",
    validatorId: "validator.source-corroboration-transfer.v1",
    taskCode: "source_corroboration_transfer",
    taskFamilyId: "task-family.source-corroboration.cold-transfer.v1",
    blockedActionKinds: ["instructional_support", "model_action", "experience_replay"],
    accessAllowed: true,
  },
  evidence: {
    receiptSchemaVersion: "1.1.0",
    proofAuthority: "honour_based",
    persistence: "not_persisted",
    remainsUntested: [
      "Delayed retention and repeat reliability are untested.",
      "Other subjects, populations, contexts, delivery roles, models, and tool designs are untested.",
      "Causal isolation across the study differences is untested.",
      "Open-web source quality and adversarial misinformation are untested.",
      "Representative learner and accessibility validity are untested.",
    ],
  },
  returnProof: {
    enabled: false,
    policyId: "policy.source-corroboration.return-proof.unavailable.v1",
  },
  access: {
    accommodations: [
      {
        id: "access.source-corroboration.text-alternatives",
        kind: "text_alternative",
        modality: "textual",
        representation: "text_description",
        constructPreservation: "preserves_construct",
        answerChanging: false,
        policyVersion: "1.0.0",
        nonvisualAlternative: true,
      },
      {
        id: "access.source-corroboration.keyboard-operation",
        kind: "keyboard_operation",
        modality: "keyboard",
        representation: "native_control",
        constructPreservation: "preserves_construct",
        answerChanging: false,
        policyVersion: "1.0.0",
        nonvisualAlternative: false,
      },
      {
        id: "access.source-corroboration.reduced-motion",
        kind: "motion_reduction",
        modality: "motion",
        representation: "reduced_motion",
        constructPreservation: "preserves_construct",
        answerChanging: false,
        policyVersion: "1.0.0",
        nonvisualAlternative: false,
      },
    ],
    focusTargetId: "focus.source-corroboration.stage-main",
    reducedMotionPolicyId: "motion.source-corroboration.reduce-stage-transition",
  },
  sourceBindings: [
    {
      domainSourceRef: "source.bastani-pnas.genai-learning-2025",
      sourceItemId: "source.bastani-pnas.genai-learning-2025",
      sourcePackageId: null,
      sourcePackageVersion: null,
      sourceSnapshotDigest: null,
      locatorIds: [],
      claimIds: [],
      rightsRecordId: null,
      reviewDecisionIds: [],
      provenanceStatus: "legacy_metadata_only",
    },
    {
      domainSourceRef: "source.tutor-copilot.arxiv-2024",
      sourceItemId: "source.tutor-copilot.arxiv-2024",
      sourcePackageId: null,
      sourcePackageVersion: null,
      sourceSnapshotDigest: null,
      locatorIds: [],
      claimIds: [],
      rightsRecordId: null,
      reviewDecisionIds: [],
      provenanceStatus: "legacy_metadata_only",
    },
  ],
} as const satisfies WorldRuntimeBinding;
