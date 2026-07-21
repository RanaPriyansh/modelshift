import { z } from "zod";

import { identifierSchema } from "../contracts";

export const PATHWAY_AGE_BANDS = [
  "early-childhood-3-6",
  "foundation-7-9",
  "upper-primary-10-12",
  "middle-secondary-13-15",
  "upper-secondary-16-17",
  "adult-18-plus",
] as const;

export const ENTITLEMENT_AREAS = [
  "communication-and-literacy",
  "mathematics-and-numeracy",
  "science-and-environment",
  "humanities-and-civic-understanding",
  "health-and-safeguarding",
  "computing-and-ai-literacy",
  "arts-and-culture",
  "physical-development",
  "practical-life-and-making",
] as const;

export const RIGHTS_QUALITY_TESTS = [
  "capability",
  "autonomy",
  "relationships",
  "protection",
  "portability",
] as const;

export const PATHWAY_ACTIONS = [
  "persist-learner-evidence",
  "use-open-web-sources",
  "share-externally",
  "contact-external-person",
  "retain-sensitive-artifact",
  "purchase-or-contract",
  "join-research",
  "send-notifications",
] as const;

export const GUARDIAN_VISIBLE_SUMMARIES = [
  "capability-summary",
  "assistance-summary",
  "safety-summary",
  "upcoming-human-interactions",
  "consent-history",
  "access-history",
] as const;

export const PRIVATE_GUARDIAN_FIELDS = [
  "raw-chat",
  "private-notebook",
  "every-mistake",
  "precise-click-history",
  "emotion-inference",
  "personality-labels",
  "peer-messages",
  "comparative-rank",
] as const;

export const ACCESS_REQUIREMENTS = [
  "keyboard-and-switch",
  "semantic-controls",
  "non-drag-alternative",
  "scalable-text",
  "high-contrast",
  "reduced-motion",
  "caption-or-transcript",
  "no-mandatory-speech-camera-or-fine-motor-input",
  "low-bandwidth-or-printable-equivalent",
  "no-material-or-travel-equivalent",
] as const;

export const PATHWAY_NON_GOALS = [
  "course-completion-tracking",
  "grades-and-mastery-scores",
  "points-badges-and-streaks",
  "leaderboards-and-social-ranking",
  "infinite-feeds-and-engagement-nudges",
  "automated-homeschool-certification",
  "open-minor-messaging",
] as const;

export const EVIDENCE_AUTHORITIES = [
  "deterministic-validator",
  "identified-source",
  "physical-observation",
  "external-benchmark",
  "qualified-human-review",
  "learner-reflection",
] as const;

export type PathwayAgeBand = (typeof PATHWAY_AGE_BANDS)[number];
export type EntitlementArea = (typeof ENTITLEMENT_AREAS)[number];
export type RightsQualityTest = (typeof RIGHTS_QUALITY_TESTS)[number];
export type PathwayAction = (typeof PATHWAY_ACTIONS)[number];
export type AccessRequirement = (typeof ACCESS_REQUIREMENTS)[number];

const semverSchema = z.string().regex(/^\d+\.\d+\.\d+$/, "Use semantic versioning such as 1.0.0.");
const timestampSchema = z.string().datetime({ offset: true });
const shortTextSchema = z.string().trim().min(1).max(240);
const longTextSchema = z.string().trim().min(1).max(1_500);
const referenceSchema = identifierSchema;

function uniqueValues<T extends z.ZodTypeAny>(item: T, minimum = 0) {
  return z.array(item).min(minimum).superRefine((values, context) => {
    const seen = new Set<unknown>();
    values.forEach((value, index) => {
      const key = typeof value === "object" && value !== null && "id" in value ? value.id : value;
      if (seen.has(key)) {
        context.addIssue({ code: "custom", message: `Duplicate value: ${String(key)}`, path: [index] });
      }
      seen.add(key);
    });
  });
}

export const pathwaySourceSchema = z.strictObject({
  id: identifierSchema,
  documentPath: z.string().min(1).max(180),
  section: shortTextSchema,
  role: z.enum(["preserve", "countermeasure", "constraint", "experiment"]),
  claimBoundary: longTextSchema,
});

export type PathwaySource = z.infer<typeof pathwaySourceSchema>;

export const ageBandPolicySchema = z.strictObject({
  id: identifierSchema,
  ageBand: z.enum(PATHWAY_AGE_BANDS),
  relationshipMode: z.enum([
    "adult-facing-shared-activity",
    "guardian-managed-with-learner-assent",
    "learner-owned-with-bounded-guardian-authority",
    "learner-primary-authority",
  ]),
  aiBoundary: z.enum([
    "no-independent-ai",
    "authored-worlds-ai-behind-interface",
    "curated-bounded-ai",
    "guardrailed-research-and-creation",
    "wider-disclosed-tools",
    "learner-selected-declared-mode",
  ]),
  sourceAccess: z.enum(["none", "curated-only", "risk-gated", "learner-governed"]),
  adultPresenceRequired: z.boolean(),
  guardianConsentPurposes: uniqueValues(z.enum(PATHWAY_ACTIONS)),
  learnerAssentPurposes: uniqueValues(z.enum(PATHWAY_ACTIONS)),
  guardianVisibleSummaries: uniqueValues(z.enum(GUARDIAN_VISIBLE_SUMMARIES)),
  privateByDefault: uniqueValues(z.enum(PRIVATE_GUARDIAN_FIELDS), 1),
  agencyPromise: longTextSchema,
  sourceRefs: uniqueValues(referenceSchema, 1),
});

export type AgeBandPolicy = z.infer<typeof ageBandPolicySchema>;

export const entitlementDefinitionSchema = z.strictObject({
  id: identifierSchema,
  area: z.enum(ENTITLEMENT_AREAS),
  title: shortTextSchema,
  subjectExamples: uniqueValues(shortTextSchema, 1),
  entitlementPromise: longTextSchema,
  evidenceTheory: longTextSchema,
  allowedEvidenceAuthorities: uniqueValues(z.enum(EVIDENCE_AUTHORITIES), 1),
  softwareCannotEstablish: longTextSchema,
  sourceRefs: uniqueValues(referenceSchema, 1),
});

export type EntitlementDefinition = z.infer<typeof entitlementDefinitionSchema>;

export const rightsQualityCriterionSchema = z.strictObject({
  id: identifierSchema,
  description: longTextSchema,
  requiresHumanJudgment: z.boolean(),
});

export const rightsQualityDefinitionSchema = z.strictObject({
  id: z.enum(RIGHTS_QUALITY_TESTS),
  title: shortTextSchema,
  criteria: uniqueValues(rightsQualityCriterionSchema, 1),
  softwareCannotEstablish: longTextSchema,
  sourceRefs: uniqueValues(referenceSchema, 1),
});

export type RightsQualityDefinition = z.infer<typeof rightsQualityDefinitionSchema>;

export const homeschoolPathwayArchitectureSchema = z.strictObject({
  schemaVersion: z.literal("1.0"),
  id: z.literal("forge.homeschool-pathways"),
  version: semverSchema,
  status: z.literal("design-candidate"),
  sources: uniqueValues(pathwaySourceSchema, 1),
  ageBandPolicies: uniqueValues(ageBandPolicySchema, 1),
  entitlements: uniqueValues(entitlementDefinitionSchema, 1),
  rightsQualityTests: uniqueValues(rightsQualityDefinitionSchema, 1),
  accessRequirements: uniqueValues(z.enum(ACCESS_REQUIREMENTS), 1),
  nonGoals: uniqueValues(z.enum(PATHWAY_NON_GOALS), 1),
  claimBoundary: z.strictObject({
    currentClaimLevel: z.literal("C0"),
    permittedOutcome: z.literal("evidence-complete-for-independent-review"),
    certifiesLearningEfficacy: z.literal(false),
    certifiesSafetyOrLegalCompliance: z.literal(false),
    certifiesHomeschoolQuality: z.literal(false),
  }),
});

export type HomeschoolPathwayArchitecture = z.infer<typeof homeschoolPathwayArchitectureSchema>;

export const entitlementCoverageSchema = z
  .strictObject({
    area: z.enum(ENTITLEMENT_AREAS),
    opportunityRef: referenceSchema,
    learnerPosition: z.enum(["chosen", "accepted-shared-entitlement", "requested-alternative", "deferred-with-review"]),
    reviewAt: timestampSchema.optional(),
  })
  .superRefine((coverage, context) => {
    if (coverage.learnerPosition === "deferred-with-review" && !coverage.reviewAt) {
      context.addIssue({ code: "custom", message: "Deferred opportunities require a review time.", path: ["reviewAt"] });
    }
  });

export type EntitlementCoverage = z.infer<typeof entitlementCoverageSchema>;

export const accessPlanSchema = z.strictObject({
  area: z.enum(ENTITLEMENT_AREAS),
  planRef: referenceSchema,
  noMaterialOrTravelAlternativeRef: referenceSchema,
  constructImpact: z.enum(["unchanged", "changed-and-disclosed"]),
});

export type AccessPlan = z.infer<typeof accessPlanSchema>;

export const authorityGrantSchema = z.strictObject({
  id: identifierSchema,
  purpose: z.enum(PATHWAY_ACTIONS),
  state: z.enum(["granted", "denied", "revoked", "expired"]),
  relationshipRef: referenceSchema,
  relationshipVerified: z.boolean(),
  learnerAssent: z.enum(["granted", "declined", "not-required"]),
  validFrom: timestampSchema,
  expiresAt: timestampSchema,
  visibleToLearner: z.boolean(),
  visibilityScopes: uniqueValues(z.enum(GUARDIAN_VISIBLE_SUMMARIES), 1),
});

export type AuthorityGrant = z.infer<typeof authorityGrantSchema>;

export const rightsEvidenceSchema = z.strictObject({
  id: identifierSchema,
  testId: z.enum(RIGHTS_QUALITY_TESTS),
  criterionId: identifierSchema,
  status: z.enum(["documented", "unavailable", "not-reviewed"]),
  evidenceRefs: uniqueValues(referenceSchema),
  limitations: uniqueValues(shortTextSchema, 1),
});

export type RightsEvidence = z.infer<typeof rightsEvidenceSchema>;

export const pathwayReviewPacketSchema = z.strictObject({
  schemaVersion: z.literal("1.0"),
  id: identifierSchema,
  architecture: z.strictObject({
    id: z.literal("forge.homeschool-pathways"),
    version: semverSchema,
  }),
  ageBand: z.enum(PATHWAY_AGE_BANDS),
  reviewedAt: timestampSchema,
  learnerAgency: z.strictObject({
    objectiveRef: referenceSchema,
    objectiveAuthorship: z.enum(["learner-authored", "learner-adopted", "shared-with-learner"]),
    learnerPositionRecorded: z.boolean(),
    canPauseWithoutPenalty: z.boolean(),
    canRequestHelp: z.boolean(),
    canSayIDontKnow: z.boolean(),
    canContestEvidence: z.boolean(),
    contestPathRef: referenceSchema,
    externalAdviserRef: referenceSchema.optional(),
    transitionOptionRefs: uniqueValues(referenceSchema),
    guardianActionsVisibleToLearner: z.boolean(),
    responsibleAdultPresent: z.boolean(),
  }),
  entitlementCoverage: uniqueValues(entitlementCoverageSchema, 1),
  accessibility: z.strictObject({
    supportedRequirements: uniqueValues(z.enum(ACCESS_REQUIREMENTS), 1),
    plans: uniqueValues(accessPlanSchema, 1),
    cognitiveAssistanceRecordedSeparately: z.boolean(),
    noMandatoryCameraOrVoice: z.boolean(),
  }),
  plannedActions: uniqueValues(z.enum(PATHWAY_ACTIONS)),
  authorityGrants: uniqueValues(authorityGrantSchema),
  rightsEvidence: uniqueValues(rightsEvidenceSchema),
});

export type PathwayReviewPacket = z.infer<typeof pathwayReviewPacketSchema>;
