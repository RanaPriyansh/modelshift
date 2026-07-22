import type { WorldRuntimeBinding } from "../contracts";

/**
 * The Force & Motion package predates durable source snapshots. Its OpenStax
 * reference is retained as explicitly incomplete legacy metadata, rather than
 * being promoted to reviewed source authority by this runtime binding.
 */
export const FORCE_AND_MOTION_RUNTIME_BINDING = {
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
    { id: "action.force-and-motion.learner-operation", kind: "learner_operation", label: "Learner-authored force and motion operation" },
    { id: "action.force-and-motion.support", kind: "instructional_support", label: "Authored force and motion support action" },
    { id: "action.force-and-motion.interpretation", kind: "instructional_support", label: "Representation support for the two-reading compiler" },
    { id: "action.force-and-motion.model", kind: "model_action", label: "Bounded force and motion interpretation action" },
    { id: "action.force-and-motion.replay", kind: "experience_replay", label: "Separating-experience replay" },
    { id: "action.force-and-motion.access", kind: "access_accommodation", label: "Construct-preserving access accommodation" },
    { id: "action.force-and-motion.reset", kind: "reset", label: "Start a new force and motion investigation" },
  ],
  support: {
    policyId: "policy.force-and-motion.authored-support.v1",
    allowedDuringProof: false,
    recordsCognitiveSupport: true,
  },
  proof: {
    proofClaimId: "proof.force-motion.independent-transfer",
    validatorId: "validator.force-motion-transfer.v1",
    taskFamilyId: "task-family.force-motion.cargo-pod-cold-transfer.v1",
    blockedActionKinds: ["instructional_support", "model_action", "experience_replay"],
    accessAllowed: true,
  },
  evidence: {
    receiptSchemaVersion: "1.0.1",
    proofAuthority: "honour_based",
    persistence: "not_persisted",
  },
  returnProof: {
    enabled: false,
    policyId: "policy.force-and-motion.return-proof.unavailable.v1",
  },
  access: {
    accommodations: [
      {
        id: "access.force-and-motion.text-alternative",
        kind: "text_alternative",
        modality: "textual",
        representation: "text_description",
        constructPreservation: "preserves_construct",
        answerChanging: false,
        policyVersion: "1.0.0",
        nonvisualAlternative: true,
      },
      {
        id: "access.force-and-motion.keyboard-operation",
        kind: "keyboard_operation",
        modality: "keyboard",
        representation: "native_control",
        constructPreservation: "preserves_construct",
        answerChanging: false,
        policyVersion: "1.0.0",
        nonvisualAlternative: false,
      },
      {
        id: "access.force-and-motion.reduced-motion",
        kind: "motion_reduction",
        modality: "motion",
        representation: "reduced_motion",
        constructPreservation: "preserves_construct",
        answerChanging: false,
        policyVersion: "1.0.0",
        nonvisualAlternative: false,
      },
    ],
    focusTargetId: "focus.force-and-motion.stage-main",
    reducedMotionPolicyId: "motion.force-and-motion.reduce-stage-transition",
  },
  sourceBindings: [
    {
      domainSourceRef: "source.openstax.newtons-first-law",
      sourceItemId: "source.openstax.newtons-first-law",
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
