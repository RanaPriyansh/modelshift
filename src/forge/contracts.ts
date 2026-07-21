import { z } from "zod";

export const LEARNER_AGE_MODES = ["under-13", "13-17", "18-plus"] as const;
export const LEARNER_DEPTH_MODES = ["introductory", "core", "advanced"] as const;
export const EVIDENCE_TIERS = ["verified", "grounded", "exploratory", "restricted"] as const;
export const WORLD_KINDS = ["model", "evidence", "practice", "project"] as const;

export type LearnerAgeMode = (typeof LEARNER_AGE_MODES)[number];
export type LearnerDepthMode = (typeof LEARNER_DEPTH_MODES)[number];
export type EvidenceTier = (typeof EVIDENCE_TIERS)[number];
export type WorldKind = (typeof WORLD_KINDS)[number];

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

export const learningWorldPackSchema = z.strictObject({
  manifest: learningWorldManifestSchema,
  release: z.strictObject({
    status: z.enum(["released", "draft", "suspended"]),
    contentVersion: semverSchema,
  }),
  capabilities: uniqueIdentifiers(capabilityDefinitionSchema, 1),
  proofClaims: uniqueIdentifiers(proofClaimSchema, 1),
  deterministicValidators: uniqueIdentifiers(deterministicValidatorDefinitionSchema),
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
  passed: z.boolean(),
  score: z.number().min(0).max(1),
  code: identifierSchema,
  evidence: uniqueIdentifiers(shortTextSchema),
});

export type DeterministicValidationResult = z.infer<typeof deterministicValidationResultSchema>;

export interface DeterministicValidator {
  readonly id: string;
  validate(input: unknown): DeterministicValidationResult;
}
