import { canonicalJson } from "../events";
import {
  type ResourceCatalogIssue,
  type ResourceDecisionV1,
  type ResourceObservationV1,
  type ResourceReviewV1,
  normalizeResourceObservation,
  normalizeResourceReview,
  normalizeResourceSelectionPolicy,
  orderedResourceIssues,
  resourceObservationReference,
  resourceObservationSchema,
  resourceCodeUnitCompare,
  resourceReviewInputDigest,
  resourceReviewRecordDigest,
  resourceReviewSchema,
  resourceSelectionPolicyDigest,
  resourceSelectionPolicySchema,
} from "./contracts";

const REQUIRED_RESOURCE_REVIEW_SCOPES = Object.freeze([
  "learning-fit", "accessibility", "age-safety", "rights-commercial",
] as const);

function add(issues: ResourceCatalogIssue[], code: string, path: string, message: string): void {
  issues.push({ code, path, message });
}

function occursAtOrBefore(value: string, asOf: Date): boolean {
  return Date.parse(value) <= asOf.getTime();
}

function sameJson(left: unknown, right: unknown): boolean {
  return canonicalJson(left) === canonicalJson(right);
}

function decisionsForScope(review: ResourceReviewV1, scope: ResourceDecisionV1["scope"]): readonly ResourceDecisionV1[] {
  return review.scopedDecisionRefs?.filter((decision) => decision.scope === scope) ?? [];
}

const OBSERVATION_DERIVED_RISK_FLAGS = [
  "tracking", "advertising", "sponsorship", "age-unknown", "rights-unknown", "region-unknown", "access-gap", "active-content",
] as const;

export function derivedResourceRiskFlags(observation: ResourceObservationV1): readonly string[] {
  const flags: string[] = [];
  if (observation.trackingAndAds.thirdPartyDataFlow !== "absent") flags.push("tracking");
  if (observation.trackingAndAds.adsMayAppear !== "no") flags.push("advertising");
  if (observation.trackingAndAds.paidPlacement !== "absent" || observation.rightsSignals.commercialInfluence !== "absent") flags.push("sponsorship");
  if (observation.rightsSignals.status === "unknown") flags.push("rights-unknown");
  if (observation.ageSignals.madeForKids === "unspecified" || observation.ageSignals.ageRestriction === "unknown" || observation.ageSignals.manualAudienceReview === "not-reviewed") flags.push("age-unknown");
  if (observation.regionSignals.mode === "unknown") flags.push("region-unknown");
  const mediaNeedsAlternative = observation.contentType === "video" || observation.contentType === "audio";
  if (mediaNeedsAlternative && (
    observation.captions.presence !== "available" ||
    observation.captions.accuracyReview !== "accepted" ||
    observation.captions.descriptiveTranscript !== "available" ||
    observation.transcriptUse !== "authorized"
  )) flags.push("access-gap");
  if (observation.contentType === "interactive") flags.push("active-content");
  return [...new Set(flags)].sort(resourceCodeUnitCompare);
}

function validateRiskConsistency(review: ResourceReviewV1, observation: ResourceObservationV1, issues: ResourceCatalogIssue[], root: string): void {
  const derived = new Set(derivedResourceRiskFlags(observation));
  const declared = new Set(review.riskFlags);
  for (const flag of OBSERVATION_DERIVED_RISK_FLAGS) {
    if (derived.has(flag) && !declared.has(flag)) {
      add(issues, `risk.flag-missing.${flag}`, `${root}.riskFlags`, `Observation facts require the ${flag} risk flag.`);
    }
    if (!derived.has(flag) && declared.has(flag)) {
      add(issues, `risk.flag-contradiction.${flag}`, `${root}.riskFlags`, `The ${flag} risk flag contradicts the current observation facts.`);
    }
  }
  const authoredRiskPresent = review.riskFlags.some((flag) => ["sensitive-topic", "physical-risk", "reported-incident"].includes(flag));
  const shouldBeNone = derived.size === 0 && !authoredRiskPresent;
  if (shouldBeNone !== declared.has("none-observed")) {
    add(issues, "risk.none-observed-contradiction", `${root}.riskFlags`, "none-observed must exactly reflect the absence of derived and authored risk facts.");
  }
}

/**
 * Checks immutable review material against one supplied observation. It does
 * not infer an observer, a reviewer, source authority, or lifecycle fact.
 */
export async function validateResourceReviewRecord(
  review: ResourceReviewV1,
  observation: ResourceObservationV1 | undefined,
): Promise<readonly ResourceCatalogIssue[]> {
  const issues: ResourceCatalogIssue[] = [];
  const root = `reviews.${review.resourceId}`;
  if (!observation) {
    add(issues, "observation.missing", `${root}.observationRef`, "A review requires a current observation for the same resource.");
    return orderedResourceIssues(issues);
  }
  if (observation.resourceId !== review.resourceId) {
    add(issues, "observation.resource-mismatch", `${root}.resourceId`, "Review and observation resource identities must match.");
  }
  if (!sameJson(review.observationRef, resourceObservationReference(observation))) {
    add(issues, "review.observation-binding-mismatch", `${root}.observationRef`, "Review must bind the exact current observation and review-signal digests.");
  }
  if (review.reviewInputDigest !== await resourceReviewInputDigest(review)) {
    add(issues, "review.input-digest-mismatch", `${root}.reviewInputDigest`, "Review material digest must match the exact reviewed material.");
  }
  if (review.reviewState === "reviewed" && review.reviewRecordDigest !== await resourceReviewRecordDigest(review)) {
    add(issues, "review.record-digest-mismatch", `${root}.reviewRecordDigest`, "Reviewed record digest must match the immutable review record.");
  }
  validateRiskConsistency(review, observation, issues, root);

  const decisions = review.scopedDecisionRefs ?? [];
  for (const decision of decisions) {
    const decisionPath = `${root}.scopedDecisionRefs.${decision.decisionId}`;
    if (decision.resourceId !== review.resourceId) {
      add(issues, "review.decision-resource-mismatch", decisionPath, "A decision must target its containing review resource.");
    }
    if (decision.inputDigests[0] !== review.reviewInputDigest || decision.inputDigests[1] !== observation.reviewSignalDigest) {
      add(issues, "review.decision-input-mismatch", `${decisionPath}.inputDigests`, "Decision inputs must bind the exact review material and observation review signal.");
    }
    if (decision.reviewerIdentityRef === observation.observerIdentityRef) {
      add(issues, "review.self-approved", `${decisionPath}.reviewerIdentityRef`, "An observer cannot approve the same resource review.");
    }
    const reviewTerminalAt = review.reviewState === "reviewed"
      ? review.reviewedAt
      : review.reviewState === "rejected"
        ? review.rejectedAt
        : null;
    if (reviewTerminalAt && Date.parse(decision.decidedAt) > Date.parse(reviewTerminalAt)) {
      add(issues, "review.decision-after-review", `${decisionPath}.decidedAt`, "A scoped decision must exist no later than the review record it authorizes.");
    }
  }

  if (review.reviewState === "rejected" && !decisions.some((decision) => decision.decisionId === review.rejectionDecisionId && decision.outcome === "rejected")) {
    add(issues, "review.rejection-decision-missing", `${root}.rejectionDecisionId`, "A rejected review must bind a rejected decision.");
  }
  if (review.reviewState === "reviewed" && observation.contentType === "video" && review.alternativeRoutes.length === 0) {
    add(issues, "review.video-alternative-missing", `${root}.alternativeRoutes`, "A reviewed video requires a reviewed alternative with a construct effect.");
  }
  if (review.reviewState === "reviewed") {
    for (const alternative of review.alternativeRoutes) {
      if (Date.parse(alternative.reviewedAt) > Date.parse(review.reviewedAt)) {
        add(
          issues,
          "review.alternative-after-review",
          `${root}.alternativeRoutes.${alternative.id}.reviewedAt`,
          "A reviewed alternative must exist no later than the resource review it supports.",
        );
      }
    }
  }
  return orderedResourceIssues(issues);
}

/**
 * Strict public authority check. It reparses unknown inputs, verifies canonical
 * record/policy digests, and never treats TypeScript types as an authority.
 */
export async function validateResourceReviewAuthority(
  reviewValue: unknown,
  observationValue: unknown,
  policyValue: unknown,
  asOfValue: unknown,
): Promise<readonly ResourceCatalogIssue[]> {
  const issues: ResourceCatalogIssue[] = [];
  const reviewResult = resourceReviewSchema.safeParse(reviewValue);
  const observationResult = resourceObservationSchema.safeParse(observationValue);
  const policyResult = resourceSelectionPolicySchema.safeParse(policyValue);
  const asOfMilliseconds = asOfValue instanceof Date ? asOfValue.getTime() : Number.NaN;
  const asOf = Number.isFinite(asOfMilliseconds) ? new Date(asOfMilliseconds) : null;
  if (!reviewResult.success) add(issues, "review.schema-invalid", "review", "Review input must satisfy the strict resource-review contract.");
  if (!observationResult.success) add(issues, "observation.schema-invalid", "observation", "Observation input must satisfy the strict resource-observation contract.");
  if (!policyResult.success) add(issues, "policy.schema-invalid", "policy", "Policy input must satisfy the strict resource-selection-policy contract.");
  if (!asOf) add(issues, "as-of.invalid", "asOf", "Authority evaluation requires a valid replay instant.");
  if (!reviewResult.success || !observationResult.success || !policyResult.success || !asOf) {
    return orderedResourceIssues(issues);
  }
  const review = normalizeResourceReview(reviewResult.data);
  const observation = normalizeResourceObservation(observationResult.data);
  const policy = normalizeResourceSelectionPolicy(policyResult.data);
  const root = `reviews.${review.resourceId}`;
  issues.push(...await validateResourceReviewRecord(review, observation));
  if (policy.policyRef.digest !== await resourceSelectionPolicyDigest(policy)) {
    add(issues, "policy.digest-mismatch", "policy.policyRef.digest", "Policy digest must bind the complete canonical selection policy.");
  }
  if (review.reviewState !== "reviewed") {
    add(issues, "review.not-reviewed", `${root}.reviewState`, "Only a reviewed record can be eligible.");
    return orderedResourceIssues(issues);
  }
  if (Date.parse(review.reviewedAt) > asOf.getTime()) {
    add(issues, "review.not-yet-reviewed", `${root}.reviewedAt`, "A future review cannot authorize a historical replay.");
  }
  if (occursAtOrBefore(review.expiresAt, asOf)) {
    add(issues, "review.expired", `${root}.expiresAt`, "The reviewed record has expired.");
  }

  for (const alternative of review.alternativeRoutes) {
    if (Date.parse(alternative.reviewedAt) > asOf.getTime()) {
      add(issues, "review.alternative-not-yet-reviewed", `${root}.alternativeRoutes.${alternative.id}.reviewedAt`, "A future alternative review is not current authority.");
    }
    if (occursAtOrBefore(alternative.expiresAt, asOf)) {
      add(issues, "review.alternative-expired", `${root}.alternativeRoutes.${alternative.id}.expiresAt`, "The reviewed alternative has expired.");
    }
  }

  for (const scope of REQUIRED_RESOURCE_REVIEW_SCOPES) {
    const scoped = decisionsForScope(review, scope);
    const accepted = scoped.filter((decision) => decision.outcome === "accepted");
    const rejected = scoped.filter((decision) => decision.outcome === "rejected");
    if (scoped.length === 0 || accepted.length === 0) {
      add(issues, "review.required-scope-missing", `${root}.scopedDecisionRefs`, `Required ${scope} review is missing.`);
      continue;
    }
    if (accepted.length !== 1 || rejected.length > 0) {
      add(issues, "review.scope-conflicted", `${root}.scopedDecisionRefs`, `Required ${scope} review is conflicted or duplicated.`);
    }
    const decision = accepted[0]!;
    if (Date.parse(decision.decidedAt) > asOf.getTime()) {
      add(issues, "review.decision-not-yet-effective", `${root}.scopedDecisionRefs.${decision.decisionId}.decidedAt`, `Future ${scope} decisions cannot authorize a historical replay.`);
    }
    if (occursAtOrBefore(decision.expiresAt, asOf)) {
      add(issues, "review.decision-expired", `${root}.scopedDecisionRefs.${decision.decisionId}.expiresAt`, `Required ${scope} decision has expired.`);
    }
    if (decision.independence !== "independent") {
      add(issues, "review.decision-not-independent", `${root}.scopedDecisionRefs.${decision.decisionId}.independence`, `Required ${scope} decision must be independent.`);
    }
    if (decision.reviewerIdentityRef === observation.observerIdentityRef) {
      add(issues, "review.observer-reviewer-not-distinct", `${root}.scopedDecisionRefs.${decision.decisionId}.reviewerIdentityRef`, `Required ${scope} reviewer must be distinct from the observer.`);
    }
  }

  if (review.learningOperation.mode === "instructional" && review.learningOperation.activeCheckpointIds.length === 0) {
    add(issues, "review.active-checkpoint-missing", `${root}.learningOperation.activeCheckpointIds`, "Instructional resources require an active checkpoint.");
  }
  if (review.alternativeRoutes.length === 0) {
    add(issues, "review.alternative-missing", `${root}.alternativeRoutes`, "A reviewed resource requires a reviewed accessible alternative.");
  }
  return orderedResourceIssues(issues);
}
