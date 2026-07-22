import { z } from "zod";

import { EVIDENCE_TIERS, LEARNER_AGE_MODES, identifierSchema } from "../contracts";
import { FORGE_EVENT_TYPES, forgeEventReferenceSchema } from "../events";

z.config({ jitless: true });

export const PATHWAY_ENTITLEMENT_AREAS = [
  "language-literacy",
  "mathematics",
  "science",
  "history-source-reasoning",
  "computing-ai",
  "arts-design",
  "practical-life",
  "civic-media",
  "health-movement",
] as const;

export const PATHWAY_SOURCE_POLICIES = ["authored_only", "curated", "guardian_curated", "open_web"] as const;

export const PATHWAY_ACCESS_REQUIREMENTS = [
  "keyboard-or-switch-route",
  "semantic-controls",
  "non-drag-alternative",
  "scalable-text-and-contrast",
  "reduced-motion",
  "caption-or-transcript",
  "no-mandatory-camera-voice-or-fine-motor-input",
  "low-bandwidth-print-or-no-material-route",
] as const;

export const PATHWAY_SOURCE_REFS = [
  "source.forge.delivery-gates.pathway-rights",
  "source.forge.research.homeschool-rights",
  "source.forge.design-system.quiet-completion",
] as const;

export type PathwayEntitlementArea = (typeof PATHWAY_ENTITLEMENT_AREAS)[number];
export type PathwaySourcePolicy = (typeof PATHWAY_SOURCE_POLICIES)[number];

const timestampSchema = z.string().datetime({ offset: true });
const shortTextSchema = z.string().trim().min(1).max(280);

function uniqueArray<T extends z.ZodTypeAny>(item: T, minimum = 0) {
  return z.array(item).min(minimum).superRefine((values, context) => {
    const seen = new Set<unknown>();
    values.forEach((value, index) => {
      if (seen.has(value)) {
        context.addIssue({ code: "custom", message: `Duplicate value: ${String(value)}`, path: [index] });
      }
      seen.add(value);
    });
  });
}

export const pathwayCapabilitySchema = z.strictObject({
  capabilityId: identifierSchema,
  worldId: identifierSchema,
  ageModes: uniqueArray(z.enum(LEARNER_AGE_MODES), 1),
  evidenceTier: z.enum(EVIDENCE_TIERS),
  sourcePolicies: uniqueArray(z.enum(PATHWAY_SOURCE_POLICIES), 1),
  sourceIds: uniqueArray(identifierSchema),
  evidenceEventTypes: uniqueArray(z.enum(FORGE_EVENT_TYPES), 1),
  guardianManaged: z.boolean(),
});

export type PathwayCapability = z.infer<typeof pathwayCapabilitySchema>;

export const pathwayCapabilityCatalogSchema = z.strictObject({
  schemaVersion: z.literal("1.0"),
  generatedFrom: z.literal("released-world-packs"),
  capabilities: uniqueArray(pathwayCapabilitySchema, 1),
});

export type PathwayCapabilityCatalog = z.infer<typeof pathwayCapabilityCatalogSchema>;

const publishedEntitlementSchema = z.strictObject({
  area: z.enum(PATHWAY_ENTITLEMENT_AREAS),
  state: z.literal("published-capability"),
  capabilityId: identifierSchema,
  worldId: identifierSchema,
  evidenceTier: z.enum(EVIDENCE_TIERS),
  sourcePolicy: z.enum(PATHWAY_SOURCE_POLICIES),
  learnerPosition: z.enum(["chosen", "shared", "alternative-requested", "deferred-for-review"]),
  limitationRef: identifierSchema.optional(),
});

const identifiedGapEntitlementSchema = z.strictObject({
  area: z.enum(PATHWAY_ENTITLEMENT_AREAS),
  state: z.literal("identified-gap"),
  learnerPosition: z.enum(["chosen", "shared", "alternative-requested", "deferred-for-review"]),
  limitationRef: identifierSchema,
});

export const pathwayEntitlementSchema = z.discriminatedUnion("state", [
  publishedEntitlementSchema,
  identifiedGapEntitlementSchema,
]);

export type PathwayEntitlement = z.infer<typeof pathwayEntitlementSchema>;

export const pathwayEvidenceClaimSchema = z.strictObject({
  id: identifierSchema,
  capabilityId: identifierSchema,
  eventType: z.enum(FORGE_EVENT_TYPES),
  eventRef: forgeEventReferenceSchema,
  claimKind: z.enum(["participation-recorded", "deterministic-result-recorded", "open-question-recorded"]),
  statement: shortTextSchema,
  sourceIds: uniqueArray(identifierSchema),
});

export type PathwayEvidenceClaim = z.infer<typeof pathwayEvidenceClaimSchema>;

export const pathwayReviewPacketSchema = z.strictObject({
  schemaVersion: z.literal("1.0"),
  id: identifierSchema,
  reviewedAt: timestampSchema,
  ageMode: z.enum(LEARNER_AGE_MODES),
  sourceRefs: uniqueArray(z.enum(PATHWAY_SOURCE_REFS), 1),
  entitlements: uniqueArray(pathwayEntitlementSchema, 1),
  evidenceClaims: uniqueArray(pathwayEvidenceClaimSchema),
  foundations: z.strictObject({
    status: z.enum(["documented-for-review", "not-documented"]),
    benchmarkPlanRef: identifierSchema.optional(),
    limitationRef: identifierSchema,
  }),
  learnerAgency: z.strictObject({
    learnerPositionRecorded: z.boolean(),
    canChooseAlternative: z.boolean(),
    canPauseWithoutPenalty: z.boolean(),
    canDeclineWithoutPenalty: z.boolean(),
    canRequestHelp: z.boolean(),
    canStateUncertainty: z.boolean(),
    canContestEvidence: z.boolean(),
    independentReviewPathRef: identifierSchema.optional(),
  }),
  accessibility: z.strictObject({
    supportedRequirements: uniqueArray(z.enum(PATHWAY_ACCESS_REQUIREMENTS), 1),
    assistanceRecordedSeparately: z.boolean(),
    constructChangesDisclosed: z.boolean(),
  }),
  consentAssent: z.strictObject({
    externalAction: z.enum(["none", "open-web", "external-sharing", "external-contact"]),
    relationshipEvidence: z.enum(["not-needed", "declared-for-review", "not-documented"]),
    guardianConsent: z.enum(["not-needed", "declared-for-review", "not-documented"]),
    learnerAssent: z.enum(["not-needed", "recorded-for-review", "not-documented"]),
    visibilityToLearner: z.boolean(),
  }),
  relationships: z.strictObject({
    status: z.enum(["documented-for-review", "not-documented"]),
    humanReviewRef: identifierSchema.optional(),
    limitationRef: identifierSchema,
  }),
  protection: z.strictObject({
    noOpenMinorMessaging: z.boolean(),
    noMandatoryPublicPosting: z.boolean(),
    noPreciseLocation: z.boolean(),
    accessibleReportingPathRef: identifierSchema.optional(),
    limitationRef: identifierSchema,
  }),
  portability: z.strictObject({
    status: z.enum(["documented-untested", "not-documented"]),
    exportPlanRef: identifierSchema.optional(),
    transitionOptionRefs: uniqueArray(identifierSchema),
    limitationRef: identifierSchema,
  }),
  coercion: z.strictObject({
    noPenaltyForPause: z.boolean(),
    noEngagementQuota: z.boolean(),
    noGuiltOrUrgencyNudges: z.boolean(),
  }),
  interfaceSignals: z.strictObject({
    hasPoints: z.boolean(),
    hasBadges: z.boolean(),
    hasStreaks: z.boolean(),
    hasLeaderboards: z.boolean(),
    hasComparativeRank: z.boolean(),
    hasCompletionRace: z.boolean(),
  }),
});

export type PathwayReviewPacket = z.infer<typeof pathwayReviewPacketSchema>;
