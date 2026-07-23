import { z } from "zod";

import { deepFreeze } from "../deep-freeze";
import { canonicalJson, forgeEventDigestSchema, sha256Digest } from "../events";
import {
  RESOURCE_SELECTION_POLICY_SCHEMA_VERSION,
  RESOURCE_PROVIDERS,
  type ResourceAccessToken,
  type ResourceAlternativeAuthorityReceiptV1,
  type ResourceAuthorityStatusV1,
  type ResourceCatalogIssue,
  type ResourceObservationV1,
  type ResourceReviewV1,
  type ResourceSelectionPolicyV1,
  orderedResourceIssues,
  normalizeResourceSelectionPolicy,
  resourceAlternativeAuthorityReceiptSchema,
  resourceAlternativeAuthorityRecordDigest,
  resourceAuthorityStatusSchema,
  resourceCatalogSchema,
  resourceCodeUnitCompare,
  resourceIdSchema,
  resourceProviderSchema,
  resourceSelectionPolicyDigest,
  resourceSelectionPolicySchema,
} from "./contracts";
import { type ResourceCatalogEvaluation, evaluateResourceCatalog } from "./catalog";
import { validateResourceReviewAuthority } from "./review";

export type ResourceAccessMatch = "direct" | "alternative-preserving" | "alternative-changing" | "unmet";

export interface ResourceEligibilityEntry {
  readonly resourceId: string;
  readonly eligible: boolean;
  readonly deliveryMode: "embed" | "link-out" | null;
  readonly reasonCodes: readonly string[];
  /** Selection factors are reviewed/catalog facts, never popularity or personal inference. */
  readonly reviewedFitBand: "exact" | "supporting" | null;
  readonly accessMatch: ResourceAccessMatch;
  readonly alternativeEffect: "construct-preserving" | "construct-changing" | null;
  readonly provider: string | null;
  readonly observedAt: string | null;
  readonly disclosures: ResourceCatalogEvaluation["resources"][number]["disclosures"];
}

export interface ResourceEligibilityResult {
  readonly schemaVersion: "resource-eligibility.v1";
  readonly authority: "fixture-only-caller-asserted";
  readonly assignmentAllowed: false;
  readonly runtimeAssignmentAllowed: false;
  readonly asOf: string;
  readonly policyRef: ResourceSelectionPolicyV1["policyRef"] | null;
  readonly maximumItems: number | null;
  readonly eligibleSnapshotDigest: string | null;
  readonly resources: readonly ResourceEligibilityEntry[];
  readonly issues: readonly ResourceCatalogIssue[];
}

export interface ResourceRouteChoiceV1 {
  readonly schemaVersion: "resource-route-choice.v1";
  readonly authority: "fixture-only-caller-asserted";
  readonly assignmentAllowed: false;
  readonly runtimeAssignmentAllowed: false;
  readonly eligibleSnapshotDigest: string;
  readonly policyRef: ResourceSelectionPolicyV1["policyRef"];
  readonly orderedResourceIds: readonly string[];
  readonly reasonCodesByResource: Readonly<Record<string, readonly string[]>>;
  readonly learnerSelectedResourceId: string | null;
  /** At most maximumItems additional reviewed routes; no discovery widening is possible. */
  readonly fallbackResourceIds: readonly string[];
  readonly selectionReasonCodes: readonly string[];
}

export const resourceEligibilityRequestSchema = z.strictObject({
  catalog: resourceCatalogSchema,
  policy: resourceSelectionPolicySchema,
  asOf: z.string().datetime({ offset: true }),
  sourceAuthorityStatuses: z.array(resourceAuthorityStatusSchema).max(128).superRefine((statuses, context) => {
    const seen = new Set<string>();
    statuses.forEach((status, index) => {
      if (seen.has(status.resourceId)) context.addIssue({ code: "custom", path: [index], message: "Source authority status must be unique per resource." });
      seen.add(status.resourceId);
    });
  }),
  alternativeAuthorityReceipts: z.array(resourceAlternativeAuthorityReceiptSchema).max(128).superRefine((receipts, context) => {
    const seen = new Set<string>();
    receipts.forEach((receipt, index) => {
      const key = `${receipt.alternativeRef.id}@${receipt.alternativeRef.version}@${receipt.alternativeRef.digest}`;
      if (seen.has(key)) context.addIssue({ code: "custom", path: [index], message: "Alternative authority receipts must have unique exact references." });
      seen.add(key);
    });
  }),
});

export const resourceRouteSelectionRequestSchema = z.strictObject({
  catalog: resourceCatalogSchema,
  policy: resourceSelectionPolicySchema,
  asOf: z.string().datetime({ offset: true }),
  sourceAuthorityStatuses: z.array(resourceAuthorityStatusSchema).max(128),
  alternativeAuthorityReceipts: z.array(resourceAlternativeAuthorityReceiptSchema).max(128),
  unavailableProviders: z.array(resourceProviderSchema).max(RESOURCE_PROVIDERS.length).superRefine((providers, context) => {
    if (new Set(providers).size !== providers.length) context.addIssue({ code: "custom", message: "Unavailable providers must be unique." });
  }),
  learnerSelectedResourceId: resourceIdSchema.optional(),
});

function codes(entries: readonly string[]): readonly string[] {
  return [...new Set(entries)].sort(resourceCodeUnitCompare);
}

function directAccessTokens(observation: ResourceObservationV1): ReadonlySet<ResourceAccessToken> {
  const tokens = new Set<ResourceAccessToken>();
  if (observation.captions.presence === "available" && observation.captions.accuracyReview === "accepted") tokens.add("captions");
  if (observation.captions.descriptiveTranscript === "available" && observation.transcriptUse === "authorized") tokens.add("transcript");
  return tokens;
}

type ResourceAlternativeRoute = ResourceReviewV1["alternativeRoutes"][number];

interface AlternativeResolution {
  readonly currentRoutes: readonly ResourceAlternativeRoute[];
  readonly reasonCodes: readonly string[];
}

function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value) => right.includes(value));
}

function sameImmutableRef(
  left: ResourceAlternativeRoute["reviewedAlternativeRef"],
  right: ResourceAlternativeAuthorityReceiptV1["alternativeRef"],
): boolean {
  return left.id === right.id && left.version === right.version && left.digest === right.digest;
}

async function resolveAlternativeAuthorities(
  review: ResourceReviewV1,
  receipts: readonly ResourceAlternativeAuthorityReceiptV1[],
  asOf: Date,
  capabilityId: string,
): Promise<AlternativeResolution> {
  const currentRoutes: ResourceAlternativeRoute[] = [];
  const reasonCodes: string[] = [];
  for (const route of review.alternativeRoutes) {
    const receipt = receipts.find((candidate) => sameImmutableRef(route.reviewedAlternativeRef, candidate.alternativeRef));
    if (!receipt) {
      reasonCodes.push("alternative.authority-missing");
      continue;
    }
    if (receipt.authorityRecordDigest !== await resourceAlternativeAuthorityRecordDigest(receipt)) {
      reasonCodes.push("alternative.authority-record-digest-mismatch");
      continue;
    }
    if (Date.parse(receipt.reviewedAt) > asOf.getTime() || Date.parse(route.reviewedAt) > asOf.getTime()) {
      reasonCodes.push("alternative.authority-not-yet-effective");
      continue;
    }
    if (!receipt.current || receipt.alternativeReviewRecordDigest !== route.alternativeReviewRecordDigest || Date.parse(receipt.expiresAt) <= asOf.getTime()) {
      reasonCodes.push("alternative.authority-stale");
      continue;
    }
    if (receipt.reviewedCapabilityRef !== route.reviewedCapabilityRef || route.reviewedCapabilityRef !== capabilityId) {
      reasonCodes.push("alternative.capability-mismatch");
      continue;
    }
    if (receipt.accessEffect !== route.accessEffect) {
      reasonCodes.push("alternative.construct-mismatch");
      continue;
    }
    if (!sameStringSet(receipt.satisfiesAccessTokens, route.satisfiesAccessTokens)) {
      reasonCodes.push("alternative.access-binding-mismatch");
      continue;
    }
    if (receipt.reviewedAt !== route.reviewedAt || receipt.expiresAt !== route.expiresAt) {
      reasonCodes.push("alternative.review-window-mismatch");
      continue;
    }
    currentRoutes.push(route);
    reasonCodes.push("alternative.authority-current");
  }
  return { currentRoutes, reasonCodes: codes(reasonCodes) };
}

function accessMatch(alternatives: readonly ResourceAlternativeRoute[], observation: ResourceObservationV1, required: readonly ResourceAccessToken[]): {
  match: ResourceAccessMatch;
  alternativeEffect: "construct-preserving" | "construct-changing" | null;
} {
  const direct = directAccessTokens(observation);
  if (required.every((token) => direct.has(token))) return { match: "direct", alternativeEffect: null };
  const suitable = alternatives
    .filter((alternative) => required.every((token) => alternative.satisfiesAccessTokens.includes(token)))
    .sort((left, right) => {
      const effect = (left.accessEffect === "construct-preserving" ? 0 : 1) - (right.accessEffect === "construct-preserving" ? 0 : 1);
      return effect || resourceCodeUnitCompare(left.id, right.id);
    })[0];
  if (!suitable) return { match: "unmet", alternativeEffect: null };
  return {
    match: suitable.accessEffect === "construct-preserving" ? "alternative-preserving" : "alternative-changing",
    alternativeEffect: suitable.accessEffect,
  };
}

function regionAllows(observation: ResourceObservationV1, countryCode: string): boolean {
  switch (observation.regionSignals.mode) {
    case "allowed-list": return observation.regionSignals.countryCodes.includes(countryCode);
    case "blocked-list": return !observation.regionSignals.countryCodes.includes(countryCode);
    case "unrestricted-observed": return true;
    case "unknown": return false;
  }
}

function deliveryFor(review: ResourceReviewV1, observation: ResourceObservationV1, policy: ResourceSelectionPolicyV1): "embed" | "link-out" | null {
  const modes = review.permittedDeliveryModes.filter((mode) => policy.allowedDeliveryModes.includes(mode));
  if (modes.includes("embed") && observation.embedStatus === "allowed") return "embed";
  if (modes.includes("link-out") && observation.linkOut.status === "reviewed-https") return "link-out";
  return null;
}

function sourceAuthorityCurrent(review: ResourceReviewV1, statuses: readonly ResourceAuthorityStatusV1[]): boolean {
  const sourceUse = review.sourceUse;
  if (sourceUse.mode !== "bound-source-authority") return false;
  return statuses.some((status) =>
    status.resourceId === review.resourceId &&
    status.sourceAuthorityReplayDigest === sourceUse.sourceAuthorityReplayDigest &&
    status.current,
  );
}

function emptyResult(asOf: string, issues: readonly ResourceCatalogIssue[]): Readonly<ResourceEligibilityResult> {
  return deepFreeze({
    schemaVersion: "resource-eligibility.v1" as const,
    authority: "fixture-only-caller-asserted" as const,
    assignmentAllowed: false as const,
    runtimeAssignmentAllowed: false as const,
    asOf,
    policyRef: null,
    maximumItems: null,
    eligibleSnapshotDigest: null,
    resources: [],
    issues: orderedResourceIssues(issues),
  });
}

/**
 * Purely derives an eligibility projection. Caller-supplied source replay
 * statuses are checked but never upgraded into a source/publication authority.
 */
export async function deriveResourceEligibility(value: unknown): Promise<Readonly<ResourceEligibilityResult>> {
  const parsed = resourceEligibilityRequestSchema.safeParse(value);
  if (!parsed.success) {
    const possibleAsOf = typeof value === "object" && value !== null ? (value as Record<string, unknown>).asOf : undefined;
    return emptyResult(typeof possibleAsOf === "string" ? possibleAsOf : "invalid", [
      { code: "schema.invalid", path: "request", message: "Eligibility input does not satisfy the strict fixture contract." },
    ]);
  }
  const { catalog, asOf, sourceAuthorityStatuses, alternativeAuthorityReceipts } = parsed.data;
  const policy = normalizeResourceSelectionPolicy(parsed.data.policy);
  if (policy.policyRef.digest !== await resourceSelectionPolicyDigest(policy)) {
    return emptyResult(asOf, [{
      code: "policy.digest-mismatch",
      path: "policy.policyRef.digest",
      message: "Policy digest must bind the complete canonical selection policy.",
    }]);
  }
  const catalogEvaluation = await evaluateResourceCatalog(catalog, asOf);
  if (!catalogEvaluation.catalog) return emptyResult(asOf, catalogEvaluation.issues);

  const observationById = new Map(catalogEvaluation.catalog.observations.map((observation) => [observation.resourceId, observation]));
  const reviewById = new Map(catalogEvaluation.catalog.reviews.map((review) => [review.resourceId, review]));
  const asOfDate = new Date(asOf);
  const allIssues: ResourceCatalogIssue[] = [...catalogEvaluation.issues];
  const entries: ResourceEligibilityEntry[] = await Promise.all(catalogEvaluation.resources.map(async (projection) => {
    const observation = observationById.get(projection.resourceId);
    const review = reviewById.get(projection.resourceId);
    const reasons: string[] = [...projection.issueCodes];
    let blocked = projection.issueCodes.length > 0;
    const allow = (code: string) => reasons.push(code);
    const block = (code: string) => { reasons.push(code); blocked = true; };
    let deliveryMode: "embed" | "link-out" | null = null;
    let reviewedFitBand: "exact" | "supporting" | null = null;
    let match: ResourceAccessMatch = "unmet";
    let alternativeEffect: "construct-preserving" | "construct-changing" | null = null;

    if (!observation) block("observation.missing");
    if (!review) block("review.missing");
    if (projection.lifecycle !== "reviewed") block(`lifecycle.${projection.lifecycle}`);
    if (observation && review && projection.lifecycle === "reviewed") {
      reviewedFitBand = review.reviewedFitBand;
      (await validateResourceReviewAuthority(review, observation, policy, asOfDate)).forEach((issue) => {
        block(issue.code);
        allIssues.push(issue);
      });
      if (!review.capabilityRefs.some((reference) => reference.capabilityId === policy.capabilityRef)) block("capability.not-reviewed");
      else allow("capability.reviewed-match");
      if (!review.pedagogicalRoles.includes(policy.pedagogicalRole)) block("pedagogical-role.not-reviewed");
      else allow("pedagogical-role.reviewed-match");
      if (review.audience !== "adult" || observation.ageSignals.ageRestriction !== "none-observed" || observation.ageSignals.manualAudienceReview !== "accepted") {
        block("age.ineligible");
      } else allow("age.reviewed-adult");
      if (observation.ageSignals.madeForKids === "unspecified") block("risk.age-signal-unknown");
      if (observation.rightsSignals.status !== "known") block("risk.rights-unknown");
      if (!regionAllows(observation, policy.countryCode)) block("region.ineligible");
      else allow("region.reviewed-match");

      const alternativeResolution = await resolveAlternativeAuthorities(review, alternativeAuthorityReceipts, asOfDate, policy.capabilityRef);
      alternativeResolution.reasonCodes.forEach((code) => code === "alternative.authority-current" ? allow(code) : block(code));
      if (alternativeResolution.currentRoutes.length === 0) block("alternative.current-reviewed-missing");

      const reviewedAccess = accessMatch(alternativeResolution.currentRoutes, observation, policy.requiredAccessTokens);
      match = reviewedAccess.match;
      alternativeEffect = match === "direct" ? alternativeResolution.currentRoutes.find((alternative) => alternative.accessEffect === "construct-preserving")?.accessEffect ?? null :
        reviewedAccess.alternativeEffect;
      if (match === "unmet") block("access.ineligible");
      else allow(`access.${match}`);
      if (policy.requireConstructPreservingAlternative && !alternativeResolution.currentRoutes.some((alternative) => alternative.accessEffect === "construct-preserving")) {
        block("access.construct-preserving-alternative-missing");
      }
      deliveryMode = deliveryFor(review, observation, policy);
      if (!deliveryMode) block("delivery.ineligible");
      else allow(`delivery.${deliveryMode}`);

      const tracking = observation.trackingAndAds.thirdPartyDataFlow;
      allow(`disclosure.tracking-${tracking}`);
      if (tracking === "unknown") block("risk.tracking-unknown");
      if (tracking === "present" && policy.disclosedRiskPolicy.tracking === "reject-present") block("risk.tracking-policy-rejected");
      const ads = observation.trackingAndAds.adsMayAppear;
      allow(`disclosure.ads-${ads}`);
      if (ads === "unknown") block("risk.advertising-unknown");
      if (ads === "yes" && policy.disclosedRiskPolicy.advertising === "reject-present") block("risk.advertising-policy-rejected");
      const paidPlacement = observation.trackingAndAds.paidPlacement;
      allow(`disclosure.paid-placement-${paidPlacement}`);
      if (paidPlacement === "unknown") block("risk.paid-placement-unknown");
      const commercialInfluence = observation.rightsSignals.commercialInfluence;
      allow(`disclosure.commercial-influence-${commercialInfluence}`);
      if (commercialInfluence === "unknown") block("risk.commercial-influence-unknown");
      const sponsorshipPresent = paidPlacement === "present" || commercialInfluence === "present";
      if (sponsorshipPresent && policy.disclosedRiskPolicy.sponsorship === "reject-present") block("risk.sponsorship-policy-rejected");
      if (review.riskFlags.includes("reported-incident")) block("risk.reported-incident");
      if (review.riskFlags.includes("sensitive-topic") && policy.disclosedRiskPolicy.sensitiveTopic === "reject-present") block("risk.sensitive-topic-policy-rejected");
      if (review.riskFlags.includes("physical-risk") && policy.disclosedRiskPolicy.physicalRisk === "reject-present") block("risk.physical-risk-policy-rejected");
      if (review.riskFlags.includes("active-content") && policy.disclosedRiskPolicy.activeContent === "reject-present") block("risk.active-content-policy-rejected");

      if (policy.requiredClaimUse === "factual-claim") {
        if (review.sourceUse.mode !== "bound-source-authority") block("source.claim-authority-prohibited");
        else if (!sourceAuthorityCurrent(review, sourceAuthorityStatuses)) block("source.authority-not-current");
        else allow("source.authority-current");
      }
    }

    return {
      resourceId: projection.resourceId,
      eligible: !blocked && projection.lifecycle === "reviewed" && deliveryMode !== null,
      deliveryMode: !blocked ? deliveryMode : null,
      reasonCodes: codes(reasons),
      reviewedFitBand,
      accessMatch: match,
      alternativeEffect,
      provider: observation?.provider ?? null,
      observedAt: observation?.observedAt ?? null,
      disclosures: projection.disclosures,
    };
  }));
  entries.sort((left, right) => resourceCodeUnitCompare(left.resourceId, right.resourceId));

  const eligibleSnapshotDigest = await sha256Digest(canonicalJson({
    schemaVersion: "resource-eligibility.v1",
    asOf,
    policyRef: policy.policyRef,
    maximumItems: policy.maximumItems,
    catalogDigest: catalogEvaluation.catalogDigest,
    policy,
    resources: entries,
  }));
  return deepFreeze({
    schemaVersion: "resource-eligibility.v1" as const,
    authority: "fixture-only-caller-asserted" as const,
    assignmentAllowed: false as const,
    runtimeAssignmentAllowed: false as const,
    asOf,
    policyRef: policy.policyRef,
    maximumItems: policy.maximumItems,
    eligibleSnapshotDigest,
    resources: entries,
    issues: orderedResourceIssues(allIssues),
  });
}

function accessRank(match: ResourceAccessMatch): number {
  return match === "direct" ? 0 : match === "alternative-preserving" ? 1 : match === "alternative-changing" ? 2 : 3;
}

function constructRank(effect: ResourceEligibilityEntry["alternativeEffect"]): number {
  return effect === null || effect === "construct-preserving" ? 0 : 1;
}

function selectionPriorityCompare(left: ResourceEligibilityEntry, right: ResourceEligibilityEntry): number {
  const fit = (left.reviewedFitBand === "exact" ? 0 : 1) - (right.reviewedFitBand === "exact" ? 0 : 1);
  if (fit !== 0) return fit;
  const access = accessRank(left.accessMatch) - accessRank(right.accessMatch);
  if (access !== 0) return access;
  const construct = constructRank(left.alternativeEffect) - constructRank(right.alternativeEffect);
  return construct;
}

function staticSelectionCompare(left: ResourceEligibilityEntry, right: ResourceEligibilityEntry): number {
  const priority = selectionPriorityCompare(left, right);
  if (priority !== 0) return priority;
  const leftObservedAt = left.observedAt === null ? Number.NEGATIVE_INFINITY : Date.parse(left.observedAt);
  const rightObservedAt = right.observedAt === null ? Number.NEGATIVE_INFINITY : Date.parse(right.observedAt);
  const freshness = rightObservedAt < leftObservedAt ? -1 : rightObservedAt > leftObservedAt ? 1 : 0;
  return freshness || resourceCodeUnitCompare(left.resourceId, right.resourceId);
}

/**
 * Bounded deterministic choice over an already-derived eligible snapshot.
 * No search, rank, engagement, sponsorship, paid placement, or model input is
 * accepted here; a provider failure only exposes pre-reviewed fallbacks.
 */
export async function selectResourceRoute(value: unknown): Promise<Readonly<ResourceRouteChoiceV1>> {
  const input = resourceRouteSelectionRequestSchema.parse(value);
  const eligibilityRequest = resourceEligibilityRequestSchema.parse({
    catalog: input.catalog,
    policy: input.policy,
    asOf: input.asOf,
    sourceAuthorityStatuses: input.sourceAuthorityStatuses,
    alternativeAuthorityReceipts: input.alternativeAuthorityReceipts,
  });
  const eligibility = await deriveResourceEligibility(eligibilityRequest);
  if (!eligibility.eligibleSnapshotDigest || !eligibility.policyRef || eligibility.maximumItems === null) {
    throw new Error("A valid eligibility snapshot and policy reference are required for selection.");
  }
  const unavailable = new Set<string>(input.unavailableProviders);
  const available = eligibility.resources.filter((resource) => resource.eligible && resource.provider !== null && !unavailable.has(resource.provider));
  const selected: ResourceEligibilityEntry[] = [];
  const remaining = [...available];
  const usedProviders = new Set<string>();
  while (selected.length < eligibility.maximumItems && remaining.length > 0) {
    remaining.sort((left, right) => {
      const core = selectionPriorityCompare(left, right);
      if (core !== 0) return core;
      const diversity = Number(usedProviders.has(left.provider!)) - Number(usedProviders.has(right.provider!));
      return diversity || staticSelectionCompare(left, right);
    });
    const next = remaining.shift()!;
    selected.push(next);
    usedProviders.add(next.provider!);
  }
  const orderedEntries = selected;
  const orderedResourceIds = orderedEntries.map((resource) => resource.resourceId);
  const fallbackResourceIds = available
    .filter((resource) => !orderedResourceIds.includes(resource.resourceId))
    .sort(staticSelectionCompare)
    .slice(0, eligibility.maximumItems)
    .map((resource) => resource.resourceId);
  const learnerSelectedResourceId = input.learnerSelectedResourceId && orderedResourceIds.includes(input.learnerSelectedResourceId)
    ? input.learnerSelectedResourceId
    : null;
  const reasonCodesByResource: Record<string, readonly string[]> = {};
  for (const resource of [...orderedEntries, ...available.filter((entry) => fallbackResourceIds.includes(entry.resourceId))]) {
    reasonCodesByResource[resource.resourceId] = codes([
      ...resource.reasonCodes,
      "selection.deterministic-reviewed-order",
      usedProviders.size > 1 ? "selection.provider-diversity" : "selection.provider-diversity-not-applicable",
      unavailable.size > 0 ? "selection.pre-reviewed-fallback-only" : "selection.pre-reviewed-catalog",
    ]);
  }
  return deepFreeze({
    schemaVersion: "resource-route-choice.v1" as const,
    authority: "fixture-only-caller-asserted" as const,
    assignmentAllowed: false as const,
    runtimeAssignmentAllowed: false as const,
    eligibleSnapshotDigest: eligibility.eligibleSnapshotDigest,
    policyRef: eligibility.policyRef,
    orderedResourceIds,
    reasonCodesByResource,
    learnerSelectedResourceId,
    fallbackResourceIds,
    selectionReasonCodes: codes([
      "selection.bounded-reviewed-choice",
      unavailable.size > 0 ? "provider.failure-pre-reviewed-fallback-only" : "provider.available",
      learnerSelectedResourceId ? "learner.choice-retained" : input.learnerSelectedResourceId ? "learner.choice-not-in-bounded-set" : "learner.choice-not-provided",
    ]),
  });
}

/** Compile-time marker used by contract tests to prove the fixed W6-B policy vocabulary. */
export const RESOURCE_SELECTION_POLICY_VERSION = RESOURCE_SELECTION_POLICY_SCHEMA_VERSION;
export const RESOURCE_ELIGIBILITY_DIGEST_SCHEMA = forgeEventDigestSchema;
