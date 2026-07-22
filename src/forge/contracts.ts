import { z } from "zod";

// This module is imported by the client World runtime. Disable Zod's runtime
// JIT before defining schemas so strict CSP never requires dynamic evaluation.
z.config({ jitless: true });

export const LEARNER_AGE_MODES = ["under-13", "13-17", "18-plus"] as const;
export const LEARNER_DEPTH_MODES = ["introductory", "core", "advanced"] as const;
export const EVIDENCE_TIERS = ["verified", "grounded", "exploratory", "restricted"] as const;
export const WORLD_KINDS = ["model", "evidence", "practice", "project"] as const;

/**
 * The runtime speaks these semantic stages even when a World presents them as
 * fewer or differently named screens. Domain reducers retain their own
 * display-stage vocabulary.
 */
export const WORLD_RUNTIME_STAGES = [
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
] as const;

export const WORLD_RUNTIME_ACTION_KINDS = [
  "learner_operation",
  "instructional_support",
  "model_action",
  "experience_replay",
  "access_accommodation",
  "return_proof",
  "reset",
] as const;

export const WORLD_RUNTIME_PROOF_BLOCKED_ACTION_KINDS = [
  "instructional_support",
  "model_action",
  "experience_replay",
] as const;

export type LearnerAgeMode = (typeof LEARNER_AGE_MODES)[number];
export type LearnerDepthMode = (typeof LEARNER_DEPTH_MODES)[number];
export type EvidenceTier = (typeof EVIDENCE_TIERS)[number];
export type WorldKind = (typeof WORLD_KINDS)[number];
export type WorldRuntimeStage = (typeof WORLD_RUNTIME_STAGES)[number];
export type WorldRuntimeActionKind = (typeof WORLD_RUNTIME_ACTION_KINDS)[number];

export const WORLD_RUNTIME_ACCESS_ACCOMMODATION_KINDS = [
  "text_alternative",
  "keyboard_operation",
  "motion_reduction",
] as const;

export const WORLD_RUNTIME_ACCESS_MODALITIES = [
  "textual",
  "keyboard",
  "motion",
] as const;

export const WORLD_RUNTIME_ACCESS_REPRESENTATIONS = [
  "text_description",
  "native_control",
  "reduced_motion",
] as const;

export type WorldRuntimeAccessAccommodationKind =
  (typeof WORLD_RUNTIME_ACCESS_ACCOMMODATION_KINDS)[number];
export type WorldRuntimeAccessModality = (typeof WORLD_RUNTIME_ACCESS_MODALITIES)[number];
export type WorldRuntimeAccessRepresentation =
  (typeof WORLD_RUNTIME_ACCESS_REPRESENTATIONS)[number];

export const AI_ACTIONS = [
  "clarify-input",
  "classify-evidence",
  "rank-hypotheses",
  "phrase-authored-hint",
  "summarize-learner-work",
  "translate-reviewed-content",
  "retrieve-reviewed-source",
  "coach-question",
  "evaluate-open-explanation",
] as const;

export const ASSISTANCE_KINDS = [
  "accessibility",
  "attention-cue",
  "contrast",
  "representation",
  "explanation",
  "solution",
] as const;

export const identifierSchema = z
  .string()
  .min(3)
  .max(128)
  .regex(/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/, "Use a lowercase, namespaced identifier.");

export const routeSchema = z
  .string()
  .max(160)
  .regex(/^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$/, "Use an absolute, normalized route.");

const semverSchema = z.string().regex(/^\d+\.\d+\.\d+$/, "Use a semantic version such as 1.0.0.");
const timestampSchema = z.string().datetime({ offset: true });
const shortTextSchema = z.string().trim().min(1).max(240);
const longTextSchema = z.string().trim().min(1).max(1_200);

function uniqueIdentifiers<T extends z.ZodTypeAny>(item: T, minimum = 0) {
  return z
    .array(item)
    .min(minimum)
    .superRefine((values, context) => {
      const seen = new Set<unknown>();
      values.forEach((value, index) => {
        const key = typeof value === "object" && value !== null && "id" in value ? value.id : value;
        if (seen.has(key)) {
          context.addIssue({ code: "custom", message: `Duplicate identifier: ${String(key)}`, path: [index] });
        }
        seen.add(key);
      });
    });
}

export const aiActionBoundarySchema = z
  .strictObject({
    mode: z.enum(["off", "bounded"]),
    allowedActions: uniqueIdentifiers(z.enum(AI_ACTIONS)),
    retrievalMode: z.enum(["none", "curated-only", "open-web"]),
    modelMayDetermineCorrectness: z.literal(false),
    modelMayChangePolicy: z.literal(false),
  })
  .superRefine((boundary, context) => {
    if (boundary.mode === "off" && boundary.allowedActions.length > 0) {
      context.addIssue({ code: "custom", message: "AI-off boundaries cannot allow AI actions.", path: ["allowedActions"] });
    }
    if (boundary.mode === "off" && boundary.retrievalMode !== "none") {
      context.addIssue({ code: "custom", message: "AI-off boundaries cannot perform retrieval.", path: ["retrievalMode"] });
    }
  });

export type AIActionBoundary = z.infer<typeof aiActionBoundarySchema>;

export const sourceProvenanceSchema = z.strictObject({
  id: identifierSchema,
  title: shortTextSchema,
  publisher: shortTextSchema,
  kind: z.enum(["primary", "institutional", "peer-reviewed", "expert-authored", "open-educational-resource"]),
  url: z.string().url(),
  contentVersion: z.string().trim().min(1).max(80),
  publishedAt: z.string().date().optional(),
  accessedAt: timestampSchema,
  license: z.string().trim().min(1).max(160).optional(),
  review: z.discriminatedUnion("status", [
    z.strictObject({
      status: z.literal("reviewed"),
      reviewedBy: shortTextSchema,
      reviewedAt: timestampSchema,
    }),
    z.strictObject({
      status: z.literal("pending"),
    }),
    z.strictObject({
      status: z.literal("rejected"),
      reason: shortTextSchema,
    }),
  ]),
});

export type SourceProvenance = z.infer<typeof sourceProvenanceSchema>;

export const safetyPolicySchema = z.strictObject({
  guardianManaged: z.boolean(),
  retrievalMode: z.enum(["none", "curated-only", "open-web"]),
  inputModeration: z.boolean(),
  outputModeration: z.boolean(),
  escalationMessage: shortTextSchema,
  data: z.strictObject({
    collectPreciseLocation: z.literal(false),
    trainOnLearnerContent: z.literal(false),
    rawMediaRetention: z.enum(["none", "ephemeral"]),
  }),
  prohibitedPhysicalRisks: uniqueIdentifiers(
    z.enum(["chemicals", "flames", "roads", "heights", "weapons", "mains-electricity", "stranger-contact"]),
  ),
});

export type SafetyPolicy = z.infer<typeof safetyPolicySchema>;

export const capabilityDefinitionSchema = z.strictObject({
  id: identifierSchema,
  version: semverSchema,
  title: shortTextSchema,
  description: longTextSchema,
  domain: shortTextSchema,
  learnerCan: uniqueIdentifiers(shortTextSchema, 1),
  prerequisites: uniqueIdentifiers(identifierSchema),
  representations: uniqueIdentifiers(shortTextSchema, 1),
  proofClaimIds: uniqueIdentifiers(identifierSchema, 1),
});

export type CapabilityDefinition = z.infer<typeof capabilityDefinitionSchema>;

export const proofClaimSchema = z
  .strictObject({
    id: identifierSchema,
    capabilityId: identifierSchema,
    statement: longTextSchema,
    successCriteria: uniqueIdentifiers(shortTextSchema, 1),
    minimumEvidenceRecords: z.number().int().min(1).max(20),
    aiBoundary: aiActionBoundarySchema,
  })
  .superRefine((claim, context) => {
    if (claim.aiBoundary.mode !== "off") {
      context.addIssue({ code: "custom", message: "Proof claims require AI to be off.", path: ["aiBoundary", "mode"] });
    }
  });

export type ProofClaim = z.infer<typeof proofClaimSchema>;

export const deterministicValidatorDefinitionSchema = z.strictObject({
  id: identifierSchema,
  capabilityId: identifierSchema,
  description: shortTextSchema,
  inputContractVersion: semverSchema,
  outputContractVersion: semverSchema,
});

export type DeterministicValidatorDefinition = z.infer<typeof deterministicValidatorDefinitionSchema>;

export const returnProofPolicySchema = z
  .discriminatedUnion("enabled", [
    z.strictObject({
      enabled: z.literal(true),
      delayDays: uniqueIdentifiers(z.number().int().min(1).max(365), 1),
      completionWindowDays: z.number().int().min(1).max(30),
      taskFamilyId: identifierSchema,
      aiBoundary: aiActionBoundarySchema,
    }),
    z.strictObject({
      enabled: z.literal(false),
      reason: shortTextSchema,
      aiBoundary: aiActionBoundarySchema,
    }),
  ])
  .superRefine((policy, context) => {
    if (policy.aiBoundary.mode !== "off") {
      context.addIssue({ code: "custom", message: "Return proof requires AI to be off.", path: ["aiBoundary", "mode"] });
    }
  });

export type ReturnProofPolicy = z.infer<typeof returnProofPolicySchema>;

export const learningWorldManifestSchema = z.strictObject({
  schemaVersion: z.literal("1.0"),
  id: identifierSchema,
  version: semverSchema,
  route: routeSchema,
  title: shortTextSchema,
  summary: longTextSchema,
  kind: z.enum(WORLD_KINDS),
  evidenceTier: z.enum(EVIDENCE_TIERS),
  ageModes: uniqueIdentifiers(z.enum(LEARNER_AGE_MODES), 1),
  depthModes: uniqueIdentifiers(z.enum(LEARNER_DEPTH_MODES), 1),
  availability: z.discriminatedUnion("status", [
    z.strictObject({ status: z.literal("available") }),
    z.strictObject({ status: z.literal("unavailable"), reason: shortTextSchema }),
  ]),
  capabilityIds: uniqueIdentifiers(identifierSchema, 1),
  sources: uniqueIdentifiers(sourceProvenanceSchema),
  deterministicValidatorId: identifierSchema.optional(),
  aiBoundary: aiActionBoundarySchema,
  returnProof: returnProofPolicySchema,
  safety: safetyPolicySchema,
});

export type LearningWorldManifest = z.infer<typeof learningWorldManifestSchema>;

const runtimeStageIdsSchema = uniqueIdentifiers(z.enum(WORLD_RUNTIME_STAGES), WORLD_RUNTIME_STAGES.length)
  .length(WORLD_RUNTIME_STAGES.length)
  .superRefine((stages, context) => {
    for (const stage of WORLD_RUNTIME_STAGES) {
      if (!stages.includes(stage)) {
        context.addIssue({ code: "custom", message: `Missing canonical runtime stage: ${stage}` });
      }
    }
  });

export const worldRuntimeActionSchema = z.strictObject({
  id: identifierSchema,
  kind: z.enum(WORLD_RUNTIME_ACTION_KINDS),
  label: shortTextSchema,
});

const sourceSnapshotDigestSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);

export const worldRuntimeSourceBindingSchema = z.discriminatedUnion("provenanceStatus", [
  z.strictObject({
    /** Domain-authored reference preserved for compatibility with a legacy World. */
    domainSourceRef: identifierSchema,
    /** Existing manifest/registry source identity; this is not a new source ID. */
    sourceItemId: identifierSchema,
    sourcePackageId: identifierSchema,
    sourcePackageVersion: semverSchema,
    sourceSnapshotDigest: sourceSnapshotDigestSchema,
    locatorIds: uniqueIdentifiers(identifierSchema, 1),
    claimIds: uniqueIdentifiers(identifierSchema, 1),
    rightsRecordId: identifierSchema,
    reviewDecisionIds: uniqueIdentifiers(identifierSchema, 1),
    provenanceStatus: z.literal("bound"),
  }),
  z.strictObject({
    /** Legacy source metadata is explicitly incomplete, never reviewed authority. */
    domainSourceRef: identifierSchema,
    sourceItemId: identifierSchema,
    sourcePackageId: z.null(),
    sourcePackageVersion: z.null(),
    sourceSnapshotDigest: z.null(),
    locatorIds: z.array(identifierSchema).length(0),
    claimIds: z.array(identifierSchema).length(0),
    rightsRecordId: z.null(),
    reviewDecisionIds: z.array(identifierSchema).length(0),
    provenanceStatus: z.literal("legacy_metadata_only"),
  }),
]);

export const worldRuntimeAccessAccommodationSchema = z.strictObject({
  id: identifierSchema,
  kind: z.enum(WORLD_RUNTIME_ACCESS_ACCOMMODATION_KINDS),
  modality: z.enum(WORLD_RUNTIME_ACCESS_MODALITIES),
  representation: z.enum(WORLD_RUNTIME_ACCESS_REPRESENTATIONS),
  constructPreservation: z.enum(["preserves_construct", "changes_construct"]),
  answerChanging: z.boolean(),
  policyVersion: semverSchema,
  nonvisualAlternative: z.boolean(),
});

export const worldRuntimeBindingSchema = z
  .strictObject({
    protocolVersion: semverSchema,
    semanticStages: runtimeStageIdsSchema,
    actions: uniqueIdentifiers(worldRuntimeActionSchema, 1),
    support: z.strictObject({
      policyId: identifierSchema,
      allowedDuringProof: z.literal(false),
      recordsCognitiveSupport: z.literal(true),
    }),
    proof: z.strictObject({
      proofClaimId: identifierSchema,
      validatorId: identifierSchema,
      taskFamilyId: identifierSchema,
      blockedActionKinds: uniqueIdentifiers(z.enum(WORLD_RUNTIME_PROOF_BLOCKED_ACTION_KINDS), 3),
      accessAllowed: z.literal(true),
    }),
    evidence: z.strictObject({
      receiptSchemaVersion: semverSchema,
      // This client-only runtime cannot honestly claim durable or server-side
      // authority. A future durable projection needs its own reviewed adapter.
      proofAuthority: z.literal("honour_based"),
      persistence: z.literal("not_persisted"),
    }),
    returnProof: z.strictObject({
      enabled: z.boolean(),
      policyId: identifierSchema,
    }),
    access: z.strictObject({
      accommodations: uniqueIdentifiers(worldRuntimeAccessAccommodationSchema, 1),
      focusTargetId: identifierSchema,
      reducedMotionPolicyId: identifierSchema,
    }),
    sourceBindings: z.array(worldRuntimeSourceBindingSchema).min(1),
  })
  .superRefine((binding, context) => {
    for (const kind of WORLD_RUNTIME_PROOF_BLOCKED_ACTION_KINDS) {
      if (!binding.proof.blockedActionKinds.includes(kind)) {
        context.addIssue({
          code: "custom",
          path: ["proof", "blockedActionKinds"],
          message: `Proof mode must block ${kind}.`,
        });
      }
    }
    const actionKinds = new Set(binding.actions.map((action) => action.kind));
    for (const kind of [...WORLD_RUNTIME_PROOF_BLOCKED_ACTION_KINDS, "access_accommodation"] as const) {
      if (!actionKinds.has(kind)) {
        context.addIssue({
          code: "custom",
          path: ["actions"],
          message: `Runtime action catalog must declare ${kind}.`,
        });
      }
    }
    const sourceItemIds = new Set<string>();
    const domainSourceRefs = new Set<string>();
    for (const source of binding.sourceBindings) {
      if (sourceItemIds.has(source.sourceItemId) || domainSourceRefs.has(source.domainSourceRef)) {
        context.addIssue({
          code: "custom",
          path: ["sourceBindings"],
          message: "Runtime source bindings must have unique domain references and manifest source IDs.",
        });
      }
      sourceItemIds.add(source.sourceItemId);
      domainSourceRefs.add(source.domainSourceRef);
    }
  });

export type WorldRuntimeBinding = z.infer<typeof worldRuntimeBindingSchema>;

export const learningWorldPackSchema = z.strictObject({
  manifest: learningWorldManifestSchema,
  release: z.strictObject({
    status: z.enum(["released", "draft", "suspended"]),
    contentVersion: semverSchema,
  }),
  capabilities: uniqueIdentifiers(capabilityDefinitionSchema, 1),
  proofClaims: uniqueIdentifiers(proofClaimSchema, 1),
  deterministicValidators: uniqueIdentifiers(deterministicValidatorDefinitionSchema),
  /** Optional while the other pre-runtime Worlds retain legacy adapters. */
  runtime: worldRuntimeBindingSchema.optional(),
});

export type LearningWorldPack = z.infer<typeof learningWorldPackSchema>;

export const assistanceEventSchema = z
  .strictObject({
    id: identifierSchema,
    learnerRef: identifierSchema,
    worldId: identifierSchema,
    capabilityId: identifierSchema,
    occurredAt: timestampSchema,
    stageId: identifierSchema,
    kind: z.enum(ASSISTANCE_KINDS),
    source: z.enum(["ai", "authored", "accessibility", "human"]),
    aiAction: z.enum(AI_ACTIONS).optional(),
    modelVersion: z.string().trim().min(1).max(120).optional(),
    policyDecision: z.enum(["allowed", "denied", "fallback"]),
    reasonCode: identifierSchema,
    assistanceWeight: z.number().min(0).max(1),
    protectedOperationOverlap: z.number().min(0).max(1),
    evidenceRecordIds: uniqueIdentifiers(identifierSchema),
    contentReference: identifierSchema.optional(),
  })
  .superRefine((event, context) => {
    if (event.source === "ai" && !event.aiAction) {
      context.addIssue({ code: "custom", message: "AI assistance must identify its bounded action.", path: ["aiAction"] });
    }
    if (event.source === "ai" && !event.modelVersion) {
      context.addIssue({ code: "custom", message: "AI assistance must identify the model version.", path: ["modelVersion"] });
    }
    if (event.source !== "ai" && (event.aiAction || event.modelVersion)) {
      context.addIssue({ code: "custom", message: "Non-AI assistance cannot claim AI metadata.", path: ["source"] });
    }
  });

export type AssistanceEvent = z.infer<typeof assistanceEventSchema>;

export const evidenceRecordSchema = z
  .strictObject({
    id: identifierSchema,
    learnerRef: identifierSchema,
    worldId: identifierSchema,
    capabilityId: identifierSchema,
    proofClaimId: identifierSchema.optional(),
    taskId: identifierSchema,
    taskVersion: semverSchema,
    observedAt: timestampSchema,
    kind: z.enum(["attempt", "transfer", "proof", "return-proof"]),
    result: z.enum(["demonstrated", "partial", "not-demonstrated", "unscored"]),
    score: z.number().min(0).max(1).optional(),
    aiMode: z.enum(["off", "bounded"]),
    assistanceEventIds: uniqueIdentifiers(identifierSchema),
    sourceIds: uniqueIdentifiers(identifierSchema),
    validatorId: identifierSchema.optional(),
    responseDigest: z.string().regex(/^sha256:[a-f0-9]{64}$/).optional(),
  })
  .superRefine((record, context) => {
    if ((record.kind === "proof" || record.kind === "return-proof") && record.aiMode !== "off") {
      context.addIssue({ code: "custom", message: "Proof evidence requires AI to be off.", path: ["aiMode"] });
    }
    if ((record.kind === "proof" || record.kind === "return-proof") && !record.proofClaimId) {
      context.addIssue({ code: "custom", message: "Proof evidence must identify a proof claim.", path: ["proofClaimId"] });
    }
  });

export type EvidenceRecord = z.infer<typeof evidenceRecordSchema>;

export const returnProofScheduleSchema = z
  .strictObject({
    id: identifierSchema,
    learnerRef: identifierSchema,
    worldId: identifierSchema,
    capabilityId: identifierSchema,
    proofClaimId: identifierSchema,
    taskFamilyId: identifierSchema,
    excludedTaskIds: uniqueIdentifiers(identifierSchema, 1),
    scheduledAt: timestampSchema,
    opensAt: timestampSchema,
    dueAt: timestampSchema,
    status: z.enum(["scheduled", "open", "completed", "expired", "cancelled"]),
    aiBoundary: aiActionBoundarySchema,
  })
  .superRefine((schedule, context) => {
    const scheduledAt = Date.parse(schedule.scheduledAt);
    const opensAt = Date.parse(schedule.opensAt);
    const dueAt = Date.parse(schedule.dueAt);
    if (!(scheduledAt < opensAt && opensAt < dueAt)) {
      context.addIssue({ code: "custom", message: "Return-proof times must satisfy scheduledAt < opensAt < dueAt.", path: ["opensAt"] });
    }
    if (schedule.aiBoundary.mode !== "off") {
      context.addIssue({ code: "custom", message: "Return proof requires AI to be off.", path: ["aiBoundary", "mode"] });
    }
  });

export type ReturnProofSchedule = z.infer<typeof returnProofScheduleSchema>;

export const deterministicValidationResultSchema = z.strictObject({
  inputStatus: z.enum(["valid", "invalid"]),
  passed: z.boolean(),
  score: z.number().min(0).max(1),
  code: identifierSchema,
  evidence: uniqueIdentifiers(shortTextSchema),
}).superRefine((result, context) => {
  if (
    result.inputStatus === "invalid" &&
    (result.passed || result.score !== 0 || result.evidence.length !== 0)
  ) {
    context.addIssue({
      code: "custom",
      message: "Invalid validator input cannot retain a passing result, score, or evidence.",
      path: ["inputStatus"],
    });
  }
});

export type DeterministicValidationResult = z.infer<typeof deterministicValidationResultSchema>;

export interface DeterministicValidator {
  readonly id: string;
  validate(input: unknown): DeterministicValidationResult;
}
