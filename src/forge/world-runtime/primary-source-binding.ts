import type { WorldRuntimeBinding } from "../contracts";

/**
 * This is a binding to existing package, validator, and source IDs. It does
 * not duplicate subject content or make the source metadata look like a
 * durable reviewed snapshot.
 */
export const PRIMARY_SOURCE_RUNTIME_BINDING = {
  protocolVersion: "1.0.0",
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
    { id: "action.primary-source.learner-operation", kind: "learner_operation", label: "Learner-authored investigation action" },
    { id: "action.primary-source.support", kind: "instructional_support", label: "Authored support ladder action" },
    { id: "action.primary-source.model", kind: "model_action", label: "Model action request" },
    { id: "action.primary-source.replay", kind: "experience_replay", label: "Separating-experience replay" },
    { id: "action.primary-source.access", kind: "access_accommodation", label: "Construct-preserving access accommodation" },
    { id: "action.primary-source.return", kind: "return_proof", label: "Reviewed return-proof action" },
    { id: "action.primary-source.reset", kind: "reset", label: "Start a new investigation" },
  ],
  support: {
    policyId: "policy.primary-source.authored-support.v1",
    allowedDuringProof: false,
    recordsCognitiveSupport: true,
  },
  proof: {
    proofClaimId: "proof.primary-source-reasoning.independent-transfer",
    validatorId: "validator.primary-source-reasoning-transfer.v1",
    taskFamilyId: "task-family.primary-source-reasoning.cold-transfer.v1",
    blockedActionKinds: ["instructional_support", "model_action", "experience_replay"],
    accessAllowed: true,
  },
  evidence: {
    receiptSchemaVersion: "1.0.0",
    proofAuthority: "honour_based",
    persistence: "not_persisted",
  },
  returnProof: {
    enabled: false,
    policyId: "policy.primary-source.return-proof.unavailable.v1",
  },
  access: {
    accommodationIds: [
      "access.primary-source.text-alternatives",
      "access.primary-source.keyboard-classification",
      "access.primary-source.reduced-motion",
    ],
    nonvisualAlternativeIds: [
      "alternative.primary-source.image-description",
      "alternative.primary-source.catalog-text",
      "alternative.primary-source.evidence-layer-text",
    ],
    focusTargetId: "focus.primary-source.stage-main",
    reducedMotionPolicyId: "motion.primary-source.reduce-stage-transition",
  },
  sourceBindings: [
    {
      domainSourceRef: "loc.primary-source-analysis",
      sourceItemId: "source.loc.primary-source-analysis",
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
      domainSourceRef: "loc.90706156",
      sourceItemId: "source.loc.picture.90706156",
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
      domainSourceRef: "loc.2017716911",
      sourceItemId: "source.loc.picture.2017716911",
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
