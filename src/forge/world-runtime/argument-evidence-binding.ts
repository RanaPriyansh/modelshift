import type { WorldRuntimeBinding } from "../contracts";
import { ARGUMENT_EVIDENCE_AUTHORED_FIXTURE } from "../../worlds/argument-evidence";

export const ARGUMENT_EVIDENCE_RUNTIME_BINDING = {
  protocolVersion: "1.1.0",
  semanticStages: [
    "encounter", "commit_model", "interpret_two_readings", "name_disagreement",
    "commit_test_prediction", "run_separating_experience", "governed_support",
    "reconstruct", "withdraw_instructional_ai", "cold_transfer", "bounded_result", "return_or_apply",
  ],
  actions: [
    { id: "action.argument-evidence.learner-operation", kind: "learner_operation", label: "Learner-authored claim-to-evidence action" },
    { id: "action.argument-evidence.support.attention", kind: "instructional_support", label: "Authored attention support" },
    { id: "action.argument-evidence.support.cue", kind: "instructional_support", label: "Authored comparison cue" },
    { id: "action.argument-evidence.support.representation", kind: "instructional_support", label: "Authored table representation support" },
    { id: "action.argument-evidence.model", kind: "model_action", label: "Model action request" },
    { id: "action.argument-evidence.replay", kind: "experience_replay", label: "Separating-comparison replay" },
    { id: "action.argument-evidence.access", kind: "access_accommodation", label: "Construct-preserving access accommodation" },
    { id: "action.argument-evidence.reset", kind: "reset", label: "Start a new argument-and-evidence attempt" },
  ],
  support: {
    policyId: "policy.argument-evidence.authored-support.v1",
    allowedDuringProof: false,
    recordsCognitiveSupport: true,
    catalog: [
      { actionId: "action.argument-evidence.support.attention", stage: "governed_support", source: "authored", tier: "attention", maxOccurrences: 1, answerExposing: false, policyId: "policy.argument-evidence.authored-support.v1", providerId: null, modelIdentity: { mode: "not_applicable" }, fallbackReason: null },
      { actionId: "action.argument-evidence.support.cue", stage: "governed_support", source: "authored", tier: "cue", maxOccurrences: 1, answerExposing: false, policyId: "policy.argument-evidence.authored-support.v1", providerId: null, modelIdentity: { mode: "not_applicable" }, fallbackReason: null },
      { actionId: "action.argument-evidence.support.representation", stage: "governed_support", source: "authored", tier: "representation", maxOccurrences: 1, answerExposing: false, policyId: "policy.argument-evidence.authored-support.v1", providerId: null, modelIdentity: { mode: "not_applicable" }, fallbackReason: null },
    ],
  },
  proof: {
    proofClaimId: "proof.argument-evidence.independent-transfer",
    validatorId: "validator.argument-evidence-transfer.v1",
    taskCode: "bus_route_late_arrivals_table",
    taskFamilyId: "task-family.argument-evidence.claim-relevance-transfer.v1",
    blockedActionKinds: ["instructional_support", "model_action", "experience_replay"],
    accessAllowed: true,
  },
  evidence: {
    receiptSchemaVersion: "1.1.0",
    proofAuthority: "honour_based",
    persistence: "not_persisted",
    remainsUntested: ARGUMENT_EVIDENCE_AUTHORED_FIXTURE.results.remainsUntested,
  },
  returnProof: { enabled: false, policyId: "policy.argument-evidence.return-proof.unavailable.v1" },
  access: {
    accommodations: [
      { id: "access.argument-evidence.text-table", kind: "text_alternative", modality: "textual", representation: "text_description", constructPreservation: "preserves_construct", answerChanging: false, policyVersion: "1.0.0", nonvisualAlternative: true },
      { id: "access.argument-evidence.keyboard-operation", kind: "keyboard_operation", modality: "keyboard", representation: "native_control", constructPreservation: "preserves_construct", answerChanging: false, policyVersion: "1.0.0", nonvisualAlternative: false },
      { id: "access.argument-evidence.reduced-motion", kind: "motion_reduction", modality: "motion", representation: "reduced_motion", constructPreservation: "preserves_construct", answerChanging: false, policyVersion: "1.0.0", nonvisualAlternative: false },
    ],
    focusTargetId: "focus.argument-evidence.stage-main",
    reducedMotionPolicyId: "motion.argument-evidence.reduce-stage-transition",
  },
  sourceBindings: [
    {
      domainSourceRef: "source.argument-evidence.authored-fixture",
      sourceItemId: "source.argument-evidence.authored-fixture",
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
