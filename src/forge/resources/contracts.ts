import { z } from "zod";

import { deepFreeze } from "../deep-freeze";
import { canonicalJson, forgeEventDigestSchema, sha256Digest } from "../events";

z.config({ jitless: true });

/**
 * W6-B is intentionally a fixture-only, caller-asserted contract boundary.
 * These records do not retrieve media, establish an identity, publish a
 * resource, or authorize a learner/runtime assignment.
 */
export const RESOURCE_OBSERVATION_SCHEMA_VERSION = "resource-observation.v1" as const;
export const RESOURCE_REVIEW_SCHEMA_VERSION = "resource-review.v1" as const;
export const RESOURCE_DECISION_SCHEMA_VERSION = "resource-decision.v1" as const;
export const RESOURCE_LIFECYCLE_SCHEMA_VERSION = "resource-lifecycle.v1" as const;
export const RESOURCE_CATALOG_SCHEMA_VERSION = "resource-catalog.v1" as const;
export const RESOURCE_SELECTION_POLICY_SCHEMA_VERSION = "resource-selection-policy.v1" as const;
export const RESOURCE_ALTERNATIVE_AUTHORITY_SCHEMA_VERSION = "resource-alternative-authority.v1" as const;

const RESOURCE_CONTENT_TYPE_LITERALS = ["text", "video", "audio", "interactive", "dataset", "image"] as const;
const RESOURCE_REVIEW_SCOPE_LITERALS = ["learning-fit", "accessibility", "age-safety", "rights-commercial"] as const;
const RESOURCE_PEDAGOGICAL_ROLE_LITERALS = [
  "orient", "demonstrate", "worked-example", "compare", "practice-setup", "project-reference", "source",
] as const;
const RESOURCE_ACCESS_TOKEN_LITERALS = [
  "captions", "transcript", "audio-description", "screen-reader", "keyboard-only", "reduced-motion", "low-bandwidth", "print-route",
] as const;
const RESOURCE_LIFECYCLE_TYPE_LITERALS = [
  "withdrawn", "superseded", "incident-held", "incident-released", "review-revoked", "observation-edited",
] as const;
const RESOURCE_SELECTION_CRITERION_LITERALS = [
  "reviewed-fit-band", "access-match", "construct-preservation", "provider-diversity", "freshness", "stable-resource-id",
] as const;
const RESOURCE_DISCLOSED_RISK_POLICY_LITERALS = ["allow-disclosed-reviewed", "reject-present"] as const;
const RESOURCE_PROVIDER_LITERALS = ["forge", "youtube", "oer", "institution", "learner-supplied", "fixture-external"] as const;

function frozenVocabulary<const T extends readonly string[]>(values: T): Readonly<T> {
  return Object.freeze([...values]) as unknown as Readonly<T>;
}

/** Exported vocabularies are immutable observations; authority code uses the private literals above. */
export const RESOURCE_CONTENT_TYPES = frozenVocabulary(RESOURCE_CONTENT_TYPE_LITERALS);
export const RESOURCE_REVIEW_SCOPES = frozenVocabulary(RESOURCE_REVIEW_SCOPE_LITERALS);
export const RESOURCE_PEDAGOGICAL_ROLES = frozenVocabulary(RESOURCE_PEDAGOGICAL_ROLE_LITERALS);
export const RESOURCE_ACCESS_TOKENS = frozenVocabulary(RESOURCE_ACCESS_TOKEN_LITERALS);
export const RESOURCE_LIFECYCLE_TYPES = frozenVocabulary(RESOURCE_LIFECYCLE_TYPE_LITERALS);
export const RESOURCE_SELECTION_CRITERIA = frozenVocabulary(RESOURCE_SELECTION_CRITERION_LITERALS);
export const RESOURCE_DISCLOSED_RISK_POLICIES = frozenVocabulary(RESOURCE_DISCLOSED_RISK_POLICY_LITERALS);
export const RESOURCE_PROVIDERS = frozenVocabulary(RESOURCE_PROVIDER_LITERALS);

const timestampSchema = z.string().datetime({ offset: true });
const semverSchema = z.string().regex(/^\d+\.\d+\.\d+$/, "Use semantic versioning such as 1.0.0.");
const codeSchema = z.string().trim().min(1).max(160).regex(/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/);
export const resourceIdSchema = z.string().trim().max(160).regex(/^resource\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const observationIdSchema = z.string().trim().max(160).regex(/^resource-observation\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const reviewDecisionIdSchema = z.string().trim().max(160).regex(/^resource-decision\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const lifecycleEventIdSchema = z.string().trim().max(160).regex(/^resource-lifecycle\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const alternativeIdSchema = z.string().trim().max(160).regex(/^resource-alternative\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const identityRefSchema = z.string().trim().max(160).regex(/^identity\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const grantRefSchema = z.string().trim().max(160).regex(/^grant\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const capabilityIdSchema = z.string().trim().max(160).regex(/^capability\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const curriculumNodeIdSchema = z.string().trim().max(160).regex(/^curriculum-node\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const sourceItemIdSchema = z.string().trim().max(160).regex(/^source\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const sourceClaimIdSchema = z.string().trim().max(160).regex(/^source-claim\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const sourcePackageIdSchema = z.string().trim().max(160).regex(/^source-package\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const countryCodeSchema = z.string().regex(/^[A-Z]{2}$/);
const httpsUrlSchema = z.string().url().max(2_048).refine((value) => new URL(value).protocol === "https:", "Use an HTTPS URL.");
export const resourceProviderSchema = z.enum(RESOURCE_PROVIDER_LITERALS);

function sortStrings<T extends string>(values: readonly T[]): T[] {
  return [...values].sort(resourceCodeUnitCompare);
}

function exactSet<T extends string>(actual: readonly T[], expected: readonly T[]): boolean {
  return actual.length === expected.length && expected.every((value) => actual.includes(value));
}

function uniqueValues<T extends z.ZodTypeAny>(item: T, minimum = 0, maximum = 64) {
  return z.array(item).min(minimum).max(maximum).superRefine((values, context) => {
    const seen = new Set<string>();
    values.forEach((value, index) => {
      const key = typeof value === "string" ? value : canonicalJson(value);
      if (seen.has(key)) context.addIssue({ code: "custom", path: [index], message: "Values must be unique." });
      seen.add(key);
    });
  });
}

function uniqueBy<T extends z.ZodTypeAny>(item: T, key: (value: z.infer<T>) => string, minimum = 0, maximum = 64) {
  return z.array(item).min(minimum).max(maximum).superRefine((values, context) => {
    const seen = new Set<string>();
    values.forEach((value, index) => {
      const identity = key(value);
      if (seen.has(identity)) context.addIssue({ code: "custom", path: [index], message: `Duplicate identity: ${identity}` });
      seen.add(identity);
    });
  });
}

export const resourceImmutableRefSchema = z.strictObject({
  id: codeSchema,
  version: semverSchema,
  digest: forgeEventDigestSchema,
});
export type ResourceImmutableRefV1 = z.infer<typeof resourceImmutableRefSchema>;

export const resourceAccessTokenSchema = z.enum(RESOURCE_ACCESS_TOKEN_LITERALS);
export type ResourceAccessToken = z.infer<typeof resourceAccessTokenSchema>;

const captionsSchema = z.strictObject({
  presence: z.enum(["available", "unavailable", "unknown"]),
  languages: uniqueValues(z.string().trim().min(2).max(32), 0, 16),
  source: z.enum(["human", "automatic", "mixed", "unknown"]),
  accuracyReview: z.enum(["not-reviewed", "accepted", "rejected"]),
  descriptiveTranscript: z.enum(["available", "unavailable", "unknown"]),
}).superRefine((captions, context) => {
  if (captions.presence === "available" && captions.languages.length === 0) {
    context.addIssue({ code: "custom", path: ["languages"], message: "Available captions require at least one language." });
  }
  if (captions.presence !== "available" && captions.languages.length > 0) {
    context.addIssue({ code: "custom", path: ["languages"], message: "Only available captions may declare languages." });
  }
});

const knownRightsSignalsSchema = z.strictObject({
  status: z.literal("known"),
  useBasis: z.string().trim().min(1).max(320),
  attributionRequired: z.enum(["yes", "no"]),
  commercialInfluence: z.enum(["present", "absent", "unknown"]),
  rightsReviewRef: codeSchema,
});
const unknownRightsSignalsSchema = z.strictObject({
  status: z.literal("unknown"),
  commercialInfluence: z.enum(["present", "absent", "unknown"]),
});

const regionSignalsSchema = z.strictObject({
  mode: z.enum(["allowed-list", "blocked-list", "unrestricted-observed", "unknown"]),
  countryCodes: uniqueValues(countryCodeSchema, 0, 256),
}).superRefine((region, context) => {
  const listMode = region.mode === "allowed-list" || region.mode === "blocked-list";
  if (listMode && region.countryCodes.length === 0) {
    context.addIssue({ code: "custom", path: ["countryCodes"], message: "A region list requires countries." });
  }
  if (!listMode && region.countryCodes.length > 0) {
    context.addIssue({ code: "custom", path: ["countryCodes"], message: "Only a region list may declare countries." });
  }
});

const observationCommonSchema = z.strictObject({
  schemaVersion: z.literal(RESOURCE_OBSERVATION_SCHEMA_VERSION),
  observationId: observationIdSchema,
  resourceId: resourceIdSchema,
  /** Caller asserted fixture identity only; this does not prove a human identity. */
  observerIdentityRef: identityRefSchema,
  observedAt: timestampSchema,
  creator: z.string().trim().min(1).max(240),
  title: z.string().trim().min(1).max(600),
  language: z.string().trim().min(2).max(32),
  contentType: z.enum(RESOURCE_CONTENT_TYPE_LITERALS),
  durationSeconds: z.number().int().positive().max(86_400).optional(),
  captions: captionsSchema,
  transcriptUse: z.enum(["authorized", "metadata-only", "not-available"]),
  rightsSignals: z.discriminatedUnion("status", [knownRightsSignalsSchema, unknownRightsSignalsSchema]),
  ageSignals: z.strictObject({
    madeForKids: z.enum(["true", "false", "unspecified"]),
    ageRestriction: z.enum(["none-observed", "restricted", "unknown"]),
    manualAudienceReview: z.enum(["not-reviewed", "accepted", "rejected"]),
  }),
  trackingAndAds: z.strictObject({
    thirdPartyDataFlow: z.enum(["present", "absent", "unknown"]),
    adsMayAppear: z.enum(["yes", "no", "unknown"]),
    paidPlacement: z.enum(["present", "absent", "unknown"]),
  }),
  regionSignals: regionSignalsSchema,
  embedStatus: z.enum(["allowed", "not-allowed", "unknown"]),
  /** Link-out remains separately reviewed and must be HTTPS when available. */
  linkOut: z.discriminatedUnion("status", [
    z.strictObject({ status: z.literal("reviewed-https"), href: httpsUrlSchema }),
    z.strictObject({ status: z.literal("unavailable") }),
    z.strictObject({ status: z.literal("not-reviewed") }),
  ]),
});

const internalObservationInputSchema = observationCommonSchema.extend({
  authorityKind: z.literal("internal-package"),
  provider: z.literal("forge"),
  packageRef: resourceImmutableRefSchema,
  contentDigest: forgeEventDigestSchema,
  retentionClass: z.literal("immutable-package"),
});

const externalObservationInputSchema = observationCommonSchema.extend({
  authorityKind: z.literal("external-provider-metadata"),
  provider: resourceProviderSchema.exclude(["forge"]),
  externalId: z.string().trim().min(1).max(320),
  canonicalUrl: httpsUrlSchema,
  providerMetadataVersion: z.string().trim().min(1).max(160).optional(),
  retentionClass: z.literal("provider-metadata-ttl"),
  refreshOrDeleteAt: timestampSchema,
});

export const resourceObservationInputSchema = z.discriminatedUnion("authorityKind", [
  internalObservationInputSchema,
  externalObservationInputSchema,
]).superRefine((observation, context) => {
  if (observation.authorityKind === "external-provider-metadata" && Date.parse(observation.refreshOrDeleteAt) <= Date.parse(observation.observedAt)) {
    context.addIssue({ code: "custom", path: ["refreshOrDeleteAt"], message: "Refresh or delete must follow the observation." });
  }
});

const internalObservationSchema = internalObservationInputSchema.extend({
  observationRecordDigest: forgeEventDigestSchema,
  reviewSignalDigest: forgeEventDigestSchema,
});
const externalObservationSchema = externalObservationInputSchema.extend({
  observationRecordDigest: forgeEventDigestSchema,
  reviewSignalDigest: forgeEventDigestSchema,
});

export const resourceObservationSchema = z.discriminatedUnion("authorityKind", [
  internalObservationSchema,
  externalObservationSchema,
]);
export type ResourceObservationV1 = z.infer<typeof resourceObservationSchema>;

function normalizeObservationInput(observation: z.infer<typeof resourceObservationInputSchema>): z.infer<typeof resourceObservationInputSchema> {
  return resourceObservationInputSchema.parse({
    ...observation,
    captions: { ...observation.captions, languages: sortStrings(observation.captions.languages) },
    regionSignals: { ...observation.regionSignals, countryCodes: sortStrings(observation.regionSignals.countryCodes) },
  });
}

function observationInputFromValue(value: unknown): z.infer<typeof resourceObservationInputSchema> {
  const full = resourceObservationSchema.safeParse(value);
  if (!full.success) return normalizeObservationInput(resourceObservationInputSchema.parse(value));
  const { observationRecordDigest: _observationRecordDigest, reviewSignalDigest: _reviewSignalDigest, ...input } = full.data;
  void _observationRecordDigest; void _reviewSignalDigest;
  return normalizeObservationInput(resourceObservationInputSchema.parse(input));
}

export function canonicalResourceObservationRecordPayload(value: unknown): string {
  return canonicalJson(observationInputFromValue(value));
}

/** Review signals deliberately omit routine observation/TTL timestamps and observer identity. */
export function canonicalResourceReviewSignalPayload(value: unknown): string {
  const observation = observationInputFromValue(value);
  const {
    observationId: _observationId,
    observerIdentityRef: _observerIdentityRef,
    observedAt: _observedAt,
    ...withoutObservationTime
  } = observation;
  void _observationId; void _observerIdentityRef; void _observedAt;
  if (withoutObservationTime.authorityKind === "external-provider-metadata") {
    const { refreshOrDeleteAt: _refreshOrDeleteAt, ...withoutTtl } = withoutObservationTime;
    void _refreshOrDeleteAt;
    return canonicalJson(withoutTtl);
  }
  return canonicalJson(withoutObservationTime);
}

export async function resourceObservationRecordDigest(value: unknown): Promise<string> {
  return sha256Digest(canonicalResourceObservationRecordPayload(value));
}

export async function resourceReviewSignalDigest(value: unknown): Promise<string> {
  return sha256Digest(canonicalResourceReviewSignalPayload(value));
}

/** Adds exact digest receipts; it performs no provider retrieval or persistence. */
export async function createResourceObservation(value: unknown): Promise<Readonly<ResourceObservationV1>> {
  const observation = observationInputFromValue(value);
  return deepFreeze(resourceObservationSchema.parse({
    ...observation,
    observationRecordDigest: await resourceObservationRecordDigest(observation),
    reviewSignalDigest: await resourceReviewSignalDigest(observation),
  }));
}

export function normalizeResourceObservation(value: unknown): ResourceObservationV1 {
  const parsed = resourceObservationSchema.parse(value);
  const input = observationInputFromValue(parsed);
  return resourceObservationSchema.parse({
    ...input,
    observationRecordDigest: parsed.observationRecordDigest,
    reviewSignalDigest: parsed.reviewSignalDigest,
  });
}

export const resourceObservationReferenceSchema = z.discriminatedUnion("authorityKind", [
  z.strictObject({
    authorityKind: z.literal("internal-package"),
    packageRef: resourceImmutableRefSchema,
    contentDigest: forgeEventDigestSchema,
    observationRecordDigest: forgeEventDigestSchema,
    reviewSignalDigest: forgeEventDigestSchema,
  }),
  z.strictObject({
    authorityKind: z.literal("external-provider-metadata"),
    resourceId: resourceIdSchema,
    provider: resourceProviderSchema.exclude(["forge"]),
    externalId: z.string().trim().min(1).max(320),
    canonicalUrl: httpsUrlSchema,
    reviewSignalDigest: forgeEventDigestSchema,
  }),
]);
export type ResourceObservationReferenceV1 = z.infer<typeof resourceObservationReferenceSchema>;

export function resourceObservationReference(observation: ResourceObservationV1): Readonly<ResourceObservationReferenceV1> {
  return deepFreeze(resourceObservationReferenceSchema.parse(observation.authorityKind === "internal-package"
    ? {
        authorityKind: observation.authorityKind,
        packageRef: observation.packageRef,
        contentDigest: observation.contentDigest,
        observationRecordDigest: observation.observationRecordDigest,
        reviewSignalDigest: observation.reviewSignalDigest,
      }
    : {
        authorityKind: observation.authorityKind,
        resourceId: observation.resourceId,
        provider: observation.provider,
        externalId: observation.externalId,
        canonicalUrl: observation.canonicalUrl,
        reviewSignalDigest: observation.reviewSignalDigest,
      }));
}

export const resourceDecisionSchema = z.strictObject({
  schemaVersion: z.literal(RESOURCE_DECISION_SCHEMA_VERSION),
  decisionId: reviewDecisionIdSchema,
  resourceId: resourceIdSchema,
  /** Accepted decisions are syntactically human-only; identity/grant truth remains caller asserted. */
  reviewerKind: z.literal("accountable-human"),
  reviewerIdentityRef: identityRefSchema,
  reviewerGrantRef: grantRefSchema,
  scope: z.enum(RESOURCE_REVIEW_SCOPE_LITERALS),
  outcome: z.enum(["accepted", "rejected"]),
  /** Exact ordered pair: review material digest, then observation review-signal digest. */
  inputDigests: z.tuple([forgeEventDigestSchema, forgeEventDigestSchema]),
  evidenceDigest: forgeEventDigestSchema,
  decidedAt: timestampSchema,
  expiresAt: timestampSchema,
  independence: z.enum(["independent", "declared-conflict"]),
  supersedesDecisionId: reviewDecisionIdSchema.optional(),
}).superRefine((decision, context) => {
  if (Date.parse(decision.expiresAt) <= Date.parse(decision.decidedAt)) {
    context.addIssue({ code: "custom", path: ["expiresAt"], message: "Decision expiry must follow its decision time." });
  }
});
export type ResourceDecisionV1 = z.infer<typeof resourceDecisionSchema>;

const capabilityReferenceSchema = z.strictObject({
  curriculumNodeId: curriculumNodeIdSchema,
  capabilityId: capabilityIdSchema,
  capabilityVersion: semverSchema,
});

const sourceUseSchema = z.discriminatedUnion("mode", [
  z.strictObject({
    mode: z.literal("not-source-authority"),
    /** A pedagogical role never turns this item into factual/claim authority. */
    prohibitedClaimUses: uniqueValues(z.enum(["factual-claim", "claim-evidence", "curriculum-authority"]), 3, 3),
  }),
  z.strictObject({
    mode: z.literal("bound-source-authority"),
    sourceAuthorityRef: resourceImmutableRefSchema.extend({ id: sourcePackageIdSchema }),
    sourceItemIds: uniqueValues(sourceItemIdSchema, 1, 32),
    claimIds: uniqueValues(sourceClaimIdSchema, 1, 64),
    /** This receipt is only compared to an explicit caller-supplied replay status in eligibility. */
    sourceAuthorityReplayDigest: forgeEventDigestSchema,
  }),
]);

const alternativeRouteSchema = z.strictObject({
  id: alternativeIdSchema,
  /** Must resolve to an exact current alternative-authority receipt during eligibility. */
  reviewedAlternativeRef: resourceImmutableRefSchema,
  alternativeReviewRecordDigest: forgeEventDigestSchema,
  reviewedCapabilityRef: capabilityIdSchema,
  accessEffect: z.enum(["construct-preserving", "construct-changing"]),
  satisfiesAccessTokens: uniqueValues(resourceAccessTokenSchema, 1, RESOURCE_ACCESS_TOKEN_LITERALS.length),
  reviewedAt: timestampSchema,
  expiresAt: timestampSchema,
}).superRefine((alternative, context) => {
  if (Date.parse(alternative.expiresAt) <= Date.parse(alternative.reviewedAt)) {
    context.addIssue({ code: "custom", path: ["expiresAt"], message: "Alternative expiry must follow review time." });
  }
});

const resourceAlternativeAuthorityMaterialSchema = z.strictObject({
  schemaVersion: z.literal(RESOURCE_ALTERNATIVE_AUTHORITY_SCHEMA_VERSION),
  authorityOrigin: z.literal("caller-asserted-fixture"),
  alternativeRef: resourceImmutableRefSchema,
  alternativeReviewRecordDigest: forgeEventDigestSchema,
  reviewedCapabilityRef: capabilityIdSchema,
  accessEffect: z.enum(["construct-preserving", "construct-changing"]),
  satisfiesAccessTokens: uniqueValues(resourceAccessTokenSchema, 1, RESOURCE_ACCESS_TOKEN_LITERALS.length),
  reviewedAt: timestampSchema,
  expiresAt: timestampSchema,
  current: z.boolean(),
}).superRefine((receipt, context) => {
  if (Date.parse(receipt.expiresAt) <= Date.parse(receipt.reviewedAt)) {
    context.addIssue({ code: "custom", path: ["expiresAt"], message: "Alternative authority expiry must follow review time." });
  }
});

export const resourceAlternativeAuthorityReceiptSchema = z.strictObject({
  schemaVersion: z.literal(RESOURCE_ALTERNATIVE_AUTHORITY_SCHEMA_VERSION),
  authorityOrigin: z.literal("caller-asserted-fixture"),
  alternativeRef: resourceImmutableRefSchema,
  alternativeReviewRecordDigest: forgeEventDigestSchema,
  reviewedCapabilityRef: capabilityIdSchema,
  accessEffect: z.enum(["construct-preserving", "construct-changing"]),
  satisfiesAccessTokens: uniqueValues(resourceAccessTokenSchema, 1, RESOURCE_ACCESS_TOKEN_LITERALS.length),
  reviewedAt: timestampSchema,
  expiresAt: timestampSchema,
  current: z.boolean(),
  authorityRecordDigest: forgeEventDigestSchema,
}).superRefine((receipt, context) => {
  if (Date.parse(receipt.expiresAt) <= Date.parse(receipt.reviewedAt)) {
    context.addIssue({ code: "custom", path: ["expiresAt"], message: "Alternative authority expiry must follow review time." });
  }
});
export type ResourceAlternativeAuthorityReceiptV1 = z.infer<typeof resourceAlternativeAuthorityReceiptSchema>;

function normalizeAlternativeAuthorityMaterial(value: unknown): z.infer<typeof resourceAlternativeAuthorityMaterialSchema> {
  const full = resourceAlternativeAuthorityReceiptSchema.safeParse(value);
  const raw = full.success
    ? (() => {
        const { authorityRecordDigest: _authorityRecordDigest, ...material } = full.data;
        void _authorityRecordDigest;
        return material;
      })()
    : resourceAlternativeAuthorityMaterialSchema.parse(value);
  return resourceAlternativeAuthorityMaterialSchema.parse({
    ...raw,
    satisfiesAccessTokens: sortStrings(raw.satisfiesAccessTokens),
  });
}

export async function resourceAlternativeAuthorityRecordDigest(value: unknown): Promise<string> {
  return sha256Digest(canonicalJson(normalizeAlternativeAuthorityMaterial(value)));
}

export async function createResourceAlternativeAuthorityReceipt(value: unknown): Promise<Readonly<ResourceAlternativeAuthorityReceiptV1>> {
  const material = normalizeAlternativeAuthorityMaterial(value);
  return deepFreeze(resourceAlternativeAuthorityReceiptSchema.parse({
    ...material,
    authorityRecordDigest: await resourceAlternativeAuthorityRecordDigest(material),
  }));
}

const resourceReviewMaterialSchema = z.strictObject({
  schemaVersion: z.literal(RESOURCE_REVIEW_SCHEMA_VERSION),
  resourceId: resourceIdSchema,
  observationRef: resourceObservationReferenceSchema,
  capabilityRefs: uniqueBy(capabilityReferenceSchema, (value) => `${value.curriculumNodeId}@${value.capabilityId}@${value.capabilityVersion}`, 1, 32),
  pedagogicalRoles: uniqueValues(z.enum(RESOURCE_PEDAGOGICAL_ROLE_LITERALS), 1, RESOURCE_PEDAGOGICAL_ROLE_LITERALS.length),
  /** Explicit fit is reviewed editorial metadata, never popularity or model preference. */
  reviewedFitBand: z.enum(["exact", "supporting"]),
  sourceUse: sourceUseSchema,
  prerequisiteIds: uniqueValues(codeSchema, 0, 64),
  learningOperation: z.discriminatedUnion("mode", [
    z.strictObject({ mode: z.literal("instructional"), activeCheckpointIds: uniqueValues(codeSchema, 1, 32) }),
    z.strictObject({ mode: z.literal("source-only"), activeCheckpointIds: z.tuple([]) }),
  ]),
  audience: z.literal("adult"),
  riskFlags: uniqueValues(z.enum([
    "none-observed", "sensitive-topic", "physical-risk", "tracking", "advertising", "sponsorship", "age-unknown", "rights-unknown", "region-unknown", "access-gap", "active-content", "reported-incident",
  ]), 1, 16).superRefine((flags, context) => {
    if (flags.includes("none-observed") && flags.length > 1) context.addIssue({ code: "custom", message: "none-observed cannot coexist with a risk flag." });
  }),
  permittedDeliveryModes: uniqueValues(z.enum(["embed", "link-out"]), 1, 2),
  alternativeRoutes: uniqueBy(alternativeRouteSchema, (value) => value.id, 0, 16),
});

const candidateReviewSchema = resourceReviewMaterialSchema.extend({
  reviewState: z.literal("candidate"),
  reviewInputDigest: forgeEventDigestSchema,
  scopedDecisionRefs: uniqueBy(resourceDecisionSchema, (value) => value.decisionId, 0, 32).optional(),
});
const reviewedReviewSchema = resourceReviewMaterialSchema.extend({
  reviewState: z.literal("reviewed"),
  reviewInputDigest: forgeEventDigestSchema,
  scopedDecisionRefs: uniqueBy(resourceDecisionSchema, (value) => value.decisionId, 1, 32),
  reviewRecordDigest: forgeEventDigestSchema,
  /** Caller asserted release-adjacent reference only; review does not publish. */
  publisherAuthorityRef: identityRefSchema,
  reviewedAt: timestampSchema,
  expiresAt: timestampSchema,
}).superRefine((review, context) => {
  if (review.alternativeRoutes.length === 0) {
    context.addIssue({ code: "custom", path: ["alternativeRoutes"], message: "A reviewed resource requires a reviewed accessible alternative." });
  }
  if (Date.parse(review.expiresAt) <= Date.parse(review.reviewedAt)) {
    context.addIssue({ code: "custom", path: ["expiresAt"], message: "Review expiry must follow review time." });
  }
});
const rejectedReviewSchema = resourceReviewMaterialSchema.extend({
  reviewState: z.literal("rejected"),
  reviewInputDigest: forgeEventDigestSchema,
  scopedDecisionRefs: uniqueBy(resourceDecisionSchema, (value) => value.decisionId, 1, 32),
  rejectedAt: timestampSchema,
  rejectionDecisionId: reviewDecisionIdSchema,
});

export const resourceReviewSchema = z.discriminatedUnion("reviewState", [candidateReviewSchema, reviewedReviewSchema, rejectedReviewSchema]);
export type ResourceReviewV1 = z.infer<typeof resourceReviewSchema>;

function normalizeReviewMaterial(material: z.infer<typeof resourceReviewMaterialSchema>): z.infer<typeof resourceReviewMaterialSchema> {
  const sourceUse = material.sourceUse.mode === "bound-source-authority"
    ? { ...material.sourceUse, sourceItemIds: sortStrings(material.sourceUse.sourceItemIds), claimIds: sortStrings(material.sourceUse.claimIds) }
    : { ...material.sourceUse, prohibitedClaimUses: sortStrings(material.sourceUse.prohibitedClaimUses) };
  const learningOperation = material.learningOperation.mode === "instructional"
    ? { ...material.learningOperation, activeCheckpointIds: sortStrings(material.learningOperation.activeCheckpointIds) }
    : material.learningOperation;
  return resourceReviewMaterialSchema.parse({
    ...material,
    capabilityRefs: [...material.capabilityRefs].sort((left, right) => resourceCodeUnitCompare(
      `${left.curriculumNodeId}@${left.capabilityId}@${left.capabilityVersion}`,
      `${right.curriculumNodeId}@${right.capabilityId}@${right.capabilityVersion}`,
    )),
    pedagogicalRoles: sortStrings(material.pedagogicalRoles),
    sourceUse,
    prerequisiteIds: sortStrings(material.prerequisiteIds),
    learningOperation,
    riskFlags: sortStrings(material.riskFlags),
    permittedDeliveryModes: sortStrings(material.permittedDeliveryModes),
    alternativeRoutes: [...material.alternativeRoutes]
      .map((alternative) => ({ ...alternative, satisfiesAccessTokens: sortStrings(alternative.satisfiesAccessTokens) }))
      .sort((left, right) => resourceCodeUnitCompare(left.id, right.id)),
  });
}

function reviewMaterialFromValue(value: unknown): z.infer<typeof resourceReviewMaterialSchema> {
  const full = resourceReviewSchema.safeParse(value);
  if (!full.success) return normalizeReviewMaterial(resourceReviewMaterialSchema.parse(value));
  const material: Record<string, unknown> = { ...full.data };
  for (const key of [
    "reviewState", "reviewInputDigest", "scopedDecisionRefs", "reviewRecordDigest", "publisherAuthorityRef", "reviewedAt", "expiresAt", "rejectedAt", "rejectionDecisionId",
  ]) delete material[key];
  return normalizeReviewMaterial(resourceReviewMaterialSchema.parse(material));
}

export function normalizeResourceReview(value: unknown): ResourceReviewV1 {
  const parsed = resourceReviewSchema.parse(value);
  const material = reviewMaterialFromValue(parsed);
  const scopedDecisionRefs = parsed.scopedDecisionRefs
    ? [...parsed.scopedDecisionRefs].sort((left, right) => resourceCodeUnitCompare(left.decisionId, right.decisionId))
    : undefined;
  return resourceReviewSchema.parse({ ...parsed, ...material, scopedDecisionRefs });
}

export function canonicalResourceReviewInputPayload(value: unknown): string {
  return canonicalJson(reviewMaterialFromValue(value));
}

export async function resourceReviewInputDigest(value: unknown): Promise<string> {
  return sha256Digest(canonicalResourceReviewInputPayload(value));
}

export function canonicalResourceReviewRecordPayload(value: unknown): string {
  const review = normalizeResourceReview(value);
  if (review.reviewState !== "reviewed") throw new Error("Only a reviewed record has a review-record digest.");
  const { reviewRecordDigest: _reviewRecordDigest, ...unsigned } = review;
  void _reviewRecordDigest;
  return canonicalJson(unsigned);
}

export async function resourceReviewRecordDigest(value: unknown): Promise<string> {
  return sha256Digest(canonicalResourceReviewRecordPayload(value));
}

/** Normalizes digest receipts only; it never approves, publishes, or assigns the review. */
export async function createResourceReview(value: unknown): Promise<Readonly<ResourceReviewV1>> {
  const review = normalizeResourceReview(value);
  const reviewInputDigest = await resourceReviewInputDigest(review);
  if (review.reviewState !== "reviewed") return deepFreeze(resourceReviewSchema.parse({ ...review, reviewInputDigest }));
  const recordWithoutDigest = { ...review, reviewInputDigest };
  return deepFreeze(resourceReviewSchema.parse({
    ...recordWithoutDigest,
    reviewRecordDigest: await resourceReviewRecordDigest(recordWithoutDigest),
  }));
}

const lifecycleBaseSchema = z.strictObject({
  schemaVersion: z.literal(RESOURCE_LIFECYCLE_SCHEMA_VERSION),
  eventId: lifecycleEventIdSchema,
  resourceId: resourceIdSchema,
  reviewRecordDigest: forgeEventDigestSchema,
  occurredAt: timestampSchema,
  /** Model actors are structurally excluded from lifecycle authority. */
  actorKind: z.enum(["accountable-human", "deterministic-code", "caller-asserted-fixture"]),
  actorIdentityRef: identityRefSchema,
});

export const resourceLifecycleEventSchema = z.discriminatedUnion("type", [
  lifecycleBaseSchema.extend({ type: z.literal("withdrawn"), withdrawalId: codeSchema, reasonCode: codeSchema }),
  lifecycleBaseSchema.extend({ type: z.literal("superseded"), successorReviewRecordDigest: forgeEventDigestSchema }),
  lifecycleBaseSchema.extend({ type: z.literal("incident-held"), holdId: codeSchema, reasonCode: codeSchema }),
  lifecycleBaseSchema.extend({ type: z.literal("incident-released"), holdId: codeSchema }),
  lifecycleBaseSchema.extend({ type: z.literal("review-revoked"), decisionId: reviewDecisionIdSchema, reasonCode: codeSchema }),
  lifecycleBaseSchema.extend({
    type: z.literal("observation-edited"),
    priorReviewSignalDigest: forgeEventDigestSchema,
    currentReviewSignalDigest: forgeEventDigestSchema,
  }).refine((event) => event.priorReviewSignalDigest !== event.currentReviewSignalDigest, "An edit must change the review signal."),
]);
export type ResourceLifecycleEventV1 = z.infer<typeof resourceLifecycleEventSchema>;

export const resourceCatalogSchema = z.strictObject({
  schemaVersion: z.literal(RESOURCE_CATALOG_SCHEMA_VERSION),
  /** This catalog contains no learner-query, private-note, analytics, or provider response field. */
  observations: uniqueBy(resourceObservationSchema, (value) => value.resourceId, 0, 128),
  reviews: uniqueBy(resourceReviewSchema, (value) => value.resourceId, 0, 128),
  lifecycleEvents: uniqueBy(resourceLifecycleEventSchema, (value) => value.eventId, 0, 512),
}).superRefine((catalog, context) => {
  const externalIdOwners = new Map<string, number>();
  const externalUrlOwners = new Map<string, number>();
  catalog.observations.forEach((observation, index) => {
    if (observation.authorityKind !== "external-provider-metadata") return;
    const idKey = canonicalJson([observation.provider, observation.externalId]);
    const urlKey = canonicalJson([observation.provider, new URL(observation.canonicalUrl).href]);
    const priorIdOwner = externalIdOwners.get(idKey);
    if (priorIdOwner !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["observations", index, "externalId"],
        message: `Provider locator duplicates observations.${priorIdOwner}.externalId.`,
      });
    } else {
      externalIdOwners.set(idKey, index);
    }
    const priorUrlOwner = externalUrlOwners.get(urlKey);
    if (priorUrlOwner !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["observations", index, "canonicalUrl"],
        message: `Provider locator duplicates observations.${priorUrlOwner}.canonicalUrl.`,
      });
    } else {
      externalUrlOwners.set(urlKey, index);
    }
  });
});
export type ResourceCatalogV1 = z.infer<typeof resourceCatalogSchema>;

export const resourceSelectionPolicySchema = z.strictObject({
  schemaVersion: z.literal(RESOURCE_SELECTION_POLICY_SCHEMA_VERSION),
  policyRef: resourceImmutableRefSchema,
  capabilityRef: capabilityIdSchema,
  pedagogicalRole: z.enum(RESOURCE_PEDAGOGICAL_ROLE_LITERALS),
  requiredAccessTokens: uniqueValues(resourceAccessTokenSchema, 0, RESOURCE_ACCESS_TOKEN_LITERALS.length),
  countryCode: countryCodeSchema,
  allowedDeliveryModes: uniqueValues(z.enum(["embed", "link-out"]), 1, 2),
  requiredReviewScopes: uniqueValues(z.enum(RESOURCE_REVIEW_SCOPE_LITERALS), RESOURCE_REVIEW_SCOPE_LITERALS.length, RESOURCE_REVIEW_SCOPE_LITERALS.length),
  independentReviewScopes: uniqueValues(z.enum(RESOURCE_REVIEW_SCOPE_LITERALS), RESOURCE_REVIEW_SCOPE_LITERALS.length, RESOURCE_REVIEW_SCOPE_LITERALS.length),
  disclosedRiskPolicy: z.strictObject({
    tracking: z.enum(RESOURCE_DISCLOSED_RISK_POLICY_LITERALS),
    advertising: z.enum(RESOURCE_DISCLOSED_RISK_POLICY_LITERALS),
    sponsorship: z.enum(RESOURCE_DISCLOSED_RISK_POLICY_LITERALS),
    sensitiveTopic: z.enum(RESOURCE_DISCLOSED_RISK_POLICY_LITERALS),
    physicalRisk: z.enum(RESOURCE_DISCLOSED_RISK_POLICY_LITERALS),
    activeContent: z.enum(RESOURCE_DISCLOSED_RISK_POLICY_LITERALS),
  }),
  requireConstructPreservingAlternative: z.boolean(),
  requiredClaimUse: z.enum(["none", "factual-claim"]),
  maximumItems: z.number().int().min(1).max(6),
  /** Fixed vocabulary: popularity, views, engagement, sponsorship, paid placement, and model preference cannot enter ordering. */
  orderedCriteria: z.tuple([
    z.literal("reviewed-fit-band"), z.literal("access-match"), z.literal("construct-preservation"),
    z.literal("provider-diversity"), z.literal("freshness"), z.literal("stable-resource-id"),
  ]),
}).superRefine((policy, context) => {
  if (!exactSet(policy.requiredReviewScopes, RESOURCE_REVIEW_SCOPE_LITERALS)) {
    context.addIssue({ code: "custom", path: ["requiredReviewScopes"], message: "All four review scopes are mandatory." });
  }
  if (!exactSet(policy.independentReviewScopes, RESOURCE_REVIEW_SCOPE_LITERALS)) {
    context.addIssue({ code: "custom", path: ["independentReviewScopes"], message: "All four review scopes require independence." });
  }
});
export type ResourceSelectionPolicyV1 = z.infer<typeof resourceSelectionPolicySchema>;

export function normalizeResourceSelectionPolicy(value: unknown): ResourceSelectionPolicyV1 {
  const policy = resourceSelectionPolicySchema.parse(value);
  return resourceSelectionPolicySchema.parse({
    ...policy,
    requiredAccessTokens: sortStrings(policy.requiredAccessTokens),
    allowedDeliveryModes: sortStrings(policy.allowedDeliveryModes),
    requiredReviewScopes: sortStrings(policy.requiredReviewScopes),
    independentReviewScopes: sortStrings(policy.independentReviewScopes),
    // orderedCriteria is an explicit precedence contract and stays order-sensitive.
    orderedCriteria: policy.orderedCriteria,
  });
}

/** Canonical policy identity excludes only its self-referential digest. */
export function canonicalResourceSelectionPolicyPayload(value: unknown): string {
  const policy = normalizeResourceSelectionPolicy(value);
  const { digest: _digest, ...policyIdentity } = policy.policyRef;
  void _digest;
  return canonicalJson({
    ...policy,
    policyRef: policyIdentity,
  });
}

export async function resourceSelectionPolicyDigest(value: unknown): Promise<string> {
  return sha256Digest(canonicalResourceSelectionPolicyPayload(value));
}

/** Rebuilds the content-addressed policy reference; it grants no publication or assignment authority. */
export async function createResourceSelectionPolicy(value: unknown): Promise<Readonly<ResourceSelectionPolicyV1>> {
  const policy = normalizeResourceSelectionPolicy(value);
  return deepFreeze(resourceSelectionPolicySchema.parse({
    ...policy,
    policyRef: {
      ...policy.policyRef,
      digest: await resourceSelectionPolicyDigest(policy),
    },
  }));
}

export const resourceAuthorityStatusSchema = z.strictObject({
  resourceId: resourceIdSchema,
  sourceAuthorityReplayDigest: forgeEventDigestSchema,
  current: z.boolean(),
});
export type ResourceAuthorityStatusV1 = z.infer<typeof resourceAuthorityStatusSchema>;

export interface ResourceCatalogIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export function resourceCodeUnitCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function orderedResourceIssues(issues: readonly ResourceCatalogIssue[]): readonly ResourceCatalogIssue[] {
  const unique = [...new Map(issues.map((issue) => [canonicalJson([issue.code, issue.path, issue.message]), issue])).values()];
  return deepFreeze(unique.sort((left, right) =>
    resourceCodeUnitCompare(left.code, right.code) || resourceCodeUnitCompare(left.path, right.path) || resourceCodeUnitCompare(left.message, right.message),
  ));
}
