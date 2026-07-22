import type { WorldRuntimeBinding } from "../contracts";

/**
 * This binds the existing Ratio pack, validator, and manifest source identity
 * to the shared runtime. The source record is intentionally legacy/incomplete:
 * its review metadata is not an ADR-003 snapshot, locator, claim, rights, or
 * named-review authority.
 */
export const PROPORTIONAL_REASONING_RUNTIME_BINDING = {
  protocolVersion: "1.0.1",
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
    { id: "action.proportional-reasoning.learner-operation", kind: "learner_operation", label: "Learner-authored ratio operation" },
    { id: "action.proportional-reasoning.support", kind: "instructional_support", label: "Authored ratio support ladder action" },
    { id: "action.proportional-reasoning.model", kind: "model_action", label: "Model action request" },
    { id: "action.proportional-reasoning.replay", kind: "experience_replay", label: "Separating-experience replay" },
    { id: "action.proportional-reasoning.access", kind: "access_accommodation", label: "Construct-preserving access accommodation" },
    { id: "action.proportional-reasoning.reset", kind: "reset", label: "Start a new ratio investigation" },
  ],
  support: {
    policyId: "policy.proportional-reasoning.authored-support.v1",
    allowedDuringProof: false,
    recordsCognitiveSupport: true,
  },
  proof: {
    proofClaimId: "proof.proportional-reasoning.independent-transfer",
    validatorId: "validator.proportional-reasoning-transfer.v1",
    taskFamilyId: "task-family.proportional-reasoning.map-scale-transfer.v1",
    blockedActionKinds: ["instructional_support", "model_action", "experience_replay"],
    accessAllowed: true,
  },
  evidence: {
    receiptSchemaVersion: "1.0.1",
    proofAuthority: "honour_based",
    persistence: "not_persisted",
  },
  // The authored World names a future return task, but no task/scheduler is
  // published. This remains disabled and is not an operational action.
  returnProof: {
    enabled: false,
    policyId: "policy.proportional-reasoning.return-proof.unavailable.v1",
  },
  access: {
    accommodations: [
      {
        id: "access.proportional-reasoning.text-alternatives",
        kind: "text_alternative",
        modality: "textual",
        representation: "text_description",
        constructPreservation: "preserves_construct",
        answerChanging: false,
        policyVersion: "1.0.0",
        nonvisualAlternative: true,
      },
      {
        id: "access.proportional-reasoning.keyboard-operation",
        kind: "keyboard_operation",
        modality: "keyboard",
        representation: "native_control",
        constructPreservation: "preserves_construct",
        answerChanging: false,
        policyVersion: "1.0.0",
        nonvisualAlternative: false,
      },
      {
        id: "access.proportional-reasoning.reduced-motion",
        kind: "motion_reduction",
        modality: "motion",
        representation: "reduced_motion",
        constructPreservation: "preserves_construct",
        answerChanging: false,
        policyVersion: "1.0.0",
        nonvisualAlternative: false,
      },
    ],
    focusTargetId: "focus.proportional-reasoning.stage-main",
    reducedMotionPolicyId: "motion.proportional-reasoning.reduce-stage-transition",
  },
  sourceBindings: [
    {
      domainSourceRef: "legacy.openstax.ratios-and-rate",
      sourceItemId: "source.openstax.ratios-and-rate",
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
