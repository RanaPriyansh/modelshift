import { describe, expect, it } from "vitest";

import {
  RESOURCE_REVIEW_SCOPES,
  createResourceAlternativeAuthorityReceipt,
  createResourceObservation,
  createResourceReview,
  createResourceSelectionPolicy,
  deriveResourceEligibility,
  evaluateResourceCatalog,
  projectResourceCatalogAudit,
  resourceCatalogSchema,
  resourceObservationRecordDigest,
  resourceReviewInputDigest,
  resourceReviewSignalDigest,
  resourceReviewSchema,
  resourceSelectionPolicyDigest,
  resourceSelectionPolicySchema,
  selectResourceRoute,
  validateResourceReviewAuthority,
  type ResourceObservationV1,
  type ResourceReviewV1,
} from "./index";

const AS_OF = "2026-07-23T12:00:00.000Z";
const REVIEW_EXPIRES = "2026-08-23T12:00:00.000Z";
const DIGEST = (character: string) => `sha256:${character.repeat(64)}`;

function observationInput(resourceId: string, provider: "fixture-external" | "forge" = "fixture-external") {
  const resourceSuffix = resourceId.slice("resource.".length);
  const shared = {
    schemaVersion: "resource-observation.v1" as const,
    observationId: `resource-observation.${resourceId.slice("resource.".length)}`,
    resourceId,
    observerIdentityRef: "identity.observer.fixture",
    observedAt: "2026-07-22T12:00:00.000Z",
    creator: "Reviewed fixture creator",
    title: provider === "forge" ? "Reviewed internal fallback" : "Reviewed video fixture",
    language: "en",
    contentType: "video" as const,
    durationSeconds: 180,
    captions: { presence: "available" as const, languages: ["en"], source: "human" as const, accuracyReview: "accepted" as const, descriptiveTranscript: "available" as const },
    transcriptUse: "authorized" as const,
    rightsSignals: { status: "known" as const, useBasis: "reviewed-educational-use", attributionRequired: "yes" as const, commercialInfluence: "absent" as const, rightsReviewRef: "rights-review.fixture" },
    ageSignals: { madeForKids: "false" as const, ageRestriction: "none-observed" as const, manualAudienceReview: "accepted" as const },
    trackingAndAds: { thirdPartyDataFlow: provider === "forge" ? "absent" as const : "present" as const, adsMayAppear: provider === "forge" ? "no" as const : "yes" as const, paidPlacement: "absent" as const },
    regionSignals: { mode: "unrestricted-observed" as const, countryCodes: [] },
    embedStatus: provider === "forge" ? "allowed" as const : "allowed" as const,
    linkOut: { status: "reviewed-https" as const, href: "https://fixtures.example/resource" },
  };
  return provider === "forge"
    ? { ...shared, authorityKind: "internal-package" as const, provider, packageRef: { id: "package.resource.fixture", version: "1.0.0", digest: DIGEST("a") }, contentDigest: DIGEST("b"), retentionClass: "immutable-package" as const }
    : { ...shared, authorityKind: "external-provider-metadata" as const, provider, externalId: `fixture-video-${resourceSuffix}`, canonicalUrl: `https://fixtures.example/video/${resourceSuffix}`, providerMetadataVersion: "fixture-1", retentionClass: "provider-metadata-ttl" as const, refreshOrDeleteAt: "2026-09-01T12:00:00.000Z" };
}

function reviewMaterial(observation: ResourceObservationV1) {
  const observationRef = observation.authorityKind === "internal-package"
    ? { authorityKind: "internal-package" as const, packageRef: observation.packageRef, contentDigest: observation.contentDigest, observationRecordDigest: observation.observationRecordDigest, reviewSignalDigest: observation.reviewSignalDigest }
    : { authorityKind: "external-provider-metadata" as const, resourceId: observation.resourceId, provider: observation.provider, externalId: observation.externalId, canonicalUrl: observation.canonicalUrl, reviewSignalDigest: observation.reviewSignalDigest };
  const riskFlags: string[] = [];
  if (observation.trackingAndAds.thirdPartyDataFlow !== "absent") riskFlags.push("tracking");
  if (observation.trackingAndAds.adsMayAppear !== "no") riskFlags.push("advertising");
  if (observation.trackingAndAds.paidPlacement !== "absent" || observation.rightsSignals.commercialInfluence !== "absent") riskFlags.push("sponsorship");
  if (observation.rightsSignals.status === "unknown") riskFlags.push("rights-unknown");
  if (observation.ageSignals.madeForKids === "unspecified" || observation.ageSignals.ageRestriction === "unknown" || observation.ageSignals.manualAudienceReview === "not-reviewed") riskFlags.push("age-unknown");
  if (observation.regionSignals.mode === "unknown") riskFlags.push("region-unknown");
  if (observation.contentType === "interactive") riskFlags.push("active-content");
  if ((observation.contentType === "video" || observation.contentType === "audio") && (observation.captions.presence !== "available" || observation.captions.accuracyReview !== "accepted" || observation.captions.descriptiveTranscript !== "available" || observation.transcriptUse !== "authorized")) riskFlags.push("access-gap");
  return {
    schemaVersion: "resource-review.v1" as const,
    resourceId: observation.resourceId,
    observationRef,
    capabilityRefs: [{ curriculumNodeId: "curriculum-node.fixture.video", capabilityId: "capability.fixture.video", capabilityVersion: "1.0.0" }],
    pedagogicalRoles: ["demonstrate" as const],
    reviewedFitBand: "exact" as const,
    sourceUse: { mode: "not-source-authority" as const, prohibitedClaimUses: ["factual-claim" as const, "claim-evidence" as const, "curriculum-authority" as const] },
    prerequisiteIds: [],
    learningOperation: { mode: "instructional" as const, activeCheckpointIds: ["checkpoint.fixture.active"] },
    audience: "adult" as const,
    riskFlags: riskFlags.length > 0 ? riskFlags : ["none-observed"],
    permittedDeliveryModes: ["embed" as const, "link-out" as const],
    alternativeRoutes: [{
      id: "resource-alternative.fixture.text",
      reviewedAlternativeRef: { id: "alternative.fixture.text", version: "1.0.0", digest: DIGEST("c") },
      alternativeReviewRecordDigest: DIGEST("0"),
      reviewedCapabilityRef: "capability.fixture.video",
      accessEffect: "construct-preserving" as const,
      satisfiesAccessTokens: ["captions" as const, "transcript" as const, "screen-reader" as const, "keyboard-only" as const],
      reviewedAt: "2026-07-21T12:00:00.000Z",
      expiresAt: "2026-08-25T12:00:00.000Z",
    }],
  };
}

async function alternativeReceipt(review: ResourceReviewV1, overrides: Record<string, unknown> = {}) {
  const alternative = review.alternativeRoutes[0];
  if (!alternative) throw new Error("fixture alternative missing");
  return createResourceAlternativeAuthorityReceipt({
    schemaVersion: "resource-alternative-authority.v1",
    authorityOrigin: "caller-asserted-fixture",
    alternativeRef: alternative.reviewedAlternativeRef,
    alternativeReviewRecordDigest: alternative.alternativeReviewRecordDigest,
    reviewedCapabilityRef: alternative.reviewedCapabilityRef,
    accessEffect: alternative.accessEffect,
    satisfiesAccessTokens: alternative.satisfiesAccessTokens,
    reviewedAt: alternative.reviewedAt,
    expiresAt: alternative.expiresAt,
    current: true,
    ...overrides,
  });
}

async function reviewedReview(
  observation: ResourceObservationV1,
  times: { reviewedAt?: string; decidedAt?: string; alternativeReviewedAt?: string } = {},
) {
  const baseMaterial = reviewMaterial(observation);
  const material = times.alternativeReviewedAt
    ? {
        ...baseMaterial,
        alternativeRoutes: baseMaterial.alternativeRoutes.map((alternative) => ({
          ...alternative,
          reviewedAt: times.alternativeReviewedAt!,
        })),
      }
    : baseMaterial;
  const inputDigest = await resourceReviewInputDigest(material);
  const scopes = ["learning-fit", "accessibility", "age-safety", "rights-commercial"] as const;
  return createResourceReview({
    ...material,
    reviewState: "reviewed",
    reviewInputDigest: inputDigest,
    scopedDecisionRefs: scopes.map((scope, index) => ({
      schemaVersion: "resource-decision.v1" as const,
      decisionId: `resource-decision.fixture.${scope}`,
      resourceId: observation.resourceId,
      reviewerKind: "accountable-human" as const,
      reviewerIdentityRef: `identity.reviewer.${index}`,
      reviewerGrantRef: `grant.reviewer.${index}`,
      scope,
      outcome: "accepted" as const,
      inputDigests: [inputDigest, observation.reviewSignalDigest] as const,
      evidenceDigest: DIGEST(String(index + 1)),
      decidedAt: times.decidedAt ?? "2026-07-21T12:00:00.000Z",
      expiresAt: "2026-08-24T12:00:00.000Z",
      independence: "independent" as const,
    })),
    reviewRecordDigest: DIGEST("d"),
    publisherAuthorityRef: "identity.publisher.fixture",
    reviewedAt: times.reviewedAt ?? "2026-07-21T12:00:00.000Z",
    expiresAt: REVIEW_EXPIRES,
  });
}

async function rejectedReview(observation: ResourceObservationV1) {
  const material = reviewMaterial(observation);
  const inputDigest = await resourceReviewInputDigest(material);
  return createResourceReview({
    ...material,
    reviewState: "rejected",
    reviewInputDigest: inputDigest,
    scopedDecisionRefs: [{
      schemaVersion: "resource-decision.v1" as const,
      decisionId: "resource-decision.fixture.rejected",
      resourceId: observation.resourceId,
      reviewerKind: "accountable-human" as const,
      reviewerIdentityRef: "identity.reviewer.rejected",
      reviewerGrantRef: "grant.reviewer.rejected",
      scope: "learning-fit" as const,
      outcome: "rejected" as const,
      inputDigests: [inputDigest, observation.reviewSignalDigest] as const,
      evidenceDigest: DIGEST("e"),
      decidedAt: "2026-07-21T12:00:00.000Z",
      expiresAt: "2026-08-24T12:00:00.000Z",
      independence: "independent" as const,
    }],
    rejectedAt: "2026-07-21T12:00:00.000Z",
    rejectionDecisionId: "resource-decision.fixture.rejected",
  });
}

function policyInput(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: "resource-selection-policy.v1" as const,
    policyRef: { id: "policy.resource.fixture", version: "1.0.0", digest: DIGEST("f") },
    capabilityRef: "capability.fixture.video",
    pedagogicalRole: "demonstrate" as const,
    requiredAccessTokens: ["captions" as const, "transcript" as const],
    countryCode: "IN",
    allowedDeliveryModes: ["embed" as const, "link-out" as const],
    requiredReviewScopes: ["learning-fit" as const, "accessibility" as const, "age-safety" as const, "rights-commercial" as const],
    independentReviewScopes: ["learning-fit" as const, "accessibility" as const, "age-safety" as const, "rights-commercial" as const],
    disclosedRiskPolicy: {
      tracking: "allow-disclosed-reviewed" as const,
      advertising: "allow-disclosed-reviewed" as const,
      sponsorship: "allow-disclosed-reviewed" as const,
      sensitiveTopic: "allow-disclosed-reviewed" as const,
      physicalRisk: "allow-disclosed-reviewed" as const,
      activeContent: "allow-disclosed-reviewed" as const,
    },
    requireConstructPreservingAlternative: true,
    requiredClaimUse: "none" as const,
    maximumItems: 2,
    orderedCriteria: ["reviewed-fit-band" as const, "access-match" as const, "construct-preservation" as const, "provider-diversity" as const, "freshness" as const, "stable-resource-id" as const],
    ...overrides,
  };
}

async function policy(overrides: Record<string, unknown> = {}) {
  return createResourceSelectionPolicy(policyInput(overrides));
}

function catalog(observations: readonly ResourceObservationV1[], reviews: readonly unknown[], lifecycleEvents: readonly unknown[] = []) {
  return { schemaVersion: "resource-catalog.v1" as const, observations, reviews, lifecycleEvents };
}

async function eligibilityRequest(
  observations: readonly ResourceObservationV1[],
  reviews: readonly ResourceReviewV1[],
  options: { lifecycleEvents?: readonly unknown[]; policyValue?: unknown; receipts?: readonly unknown[]; sourceAuthorityStatuses?: readonly unknown[]; asOf?: string } = {},
) {
  const generatedReceipts = await Promise.all(reviews
    .filter((review) => review.reviewState === "reviewed")
    .map((review) => alternativeReceipt(review)));
  const receipts = options.receipts ?? [...new Map(generatedReceipts.map((receipt) => [
    `${receipt.alternativeRef.id}@${receipt.alternativeRef.version}@${receipt.alternativeRef.digest}`,
    receipt,
  ])).values()];
  return {
    catalog: catalog(observations, reviews, options.lifecycleEvents),
    policy: options.policyValue ?? await policy(),
    asOf: options.asOf ?? AS_OF,
    sourceAuthorityStatuses: options.sourceAuthorityStatuses ?? [],
    alternativeAuthorityReceipts: receipts,
  };
}

describe("W6-B resource catalog and lifecycle authority", () => {
  it("keeps a reviewed video fixture eligible, digest-bound, disclosed, frozen, and fixture-only", async () => {
    const observation = await createResourceObservation(observationInput("resource.fixture.video"));
    const review = await reviewedReview(observation);
    const result = await deriveResourceEligibility(await eligibilityRequest([observation], [review]));
    expect(result.assignmentAllowed).toBe(false);
    expect(result.runtimeAssignmentAllowed).toBe(false);
    expect(result.resources[0]).toMatchObject({ resourceId: "resource.fixture.video", eligible: true, deliveryMode: "embed" });
    expect(result.resources[0]!.disclosures).toMatchObject({ thirdPartyDataFlow: "present", adsMayAppear: "yes", paidPlacement: "absent" });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.resources)).toBe(true);
    expect(result.resources[0]!.reasonCodes).toContain("access.direct");
    const audit = projectResourceCatalogAudit(await evaluateResourceCatalog(catalog([observation], [review]), AS_OF));
    expect(JSON.stringify(audit)).not.toContain("title");
    expect(JSON.stringify(audit)).not.toContain("query");
  });

  it("rejects candidate and rejected records, a video without an alternative, and policy fields outside the fixed vocabulary", async () => {
    const observation = await createResourceObservation(observationInput("resource.fixture.candidate"));
    const material = reviewMaterial(observation);
    const candidate = await createResourceReview({ ...material, reviewState: "candidate", reviewInputDigest: await resourceReviewInputDigest(material) });
    const rejected = await rejectedReview(observation);
    const candidateResult = await deriveResourceEligibility(await eligibilityRequest([observation], [candidate]));
    const rejectedResult = await deriveResourceEligibility(await eligibilityRequest([observation], [rejected]));
    expect(candidateResult.resources[0]).toMatchObject({ eligible: false });
    expect(candidateResult.resources[0]!.reasonCodes).toContain("lifecycle.candidate");
    expect(rejectedResult.resources[0]).toMatchObject({ eligible: false });
    expect(rejectedResult.resources[0]!.reasonCodes).toContain("lifecycle.rejected");
    expect(resourceReviewSchema.safeParse({
      ...material, reviewState: "reviewed", reviewInputDigest: await resourceReviewInputDigest(material), scopedDecisionRefs: [], reviewRecordDigest: DIGEST("1"), publisherAuthorityRef: "identity.publisher.fixture", reviewedAt: "2026-07-21T12:00:00.000Z", expiresAt: REVIEW_EXPIRES, alternativeRoutes: [],
    }).success).toBe(false);
    expect(resourceSelectionPolicySchema.safeParse({ ...policyInput(), popularity: 999 }).success).toBe(false);
  });

  it("fails closed for a changed observation, expiry, incident hold, self approval, and a source-ineligible factual claim", async () => {
    const observation = await createResourceObservation(observationInput("resource.fixture.adversarial"));
    const review = await reviewedReview(observation);
    const changedObservation = await createResourceObservation({ ...observation, title: "Edited remote metadata must invalidate review" });
    const changed = await deriveResourceEligibility(await eligibilityRequest([changedObservation], [review]));
    expect(changed.resources[0]!.eligible).toBe(false);
    expect(changed.issues.map((issue) => issue.code)).toContain("review.observation-binding-mismatch");

    const expired = await deriveResourceEligibility(await eligibilityRequest([observation], [review], { asOf: "2026-08-24T12:00:00.000Z" }));
    expect(expired.resources[0]!.reasonCodes).toContain("lifecycle.expired");

    if (review.reviewState !== "reviewed") throw new Error("fixture must be reviewed");
    const held = await deriveResourceEligibility(await eligibilityRequest([observation], [review], { lifecycleEvents: [{ schemaVersion: "resource-lifecycle.v1", eventId: "resource-lifecycle.fixture.hold", resourceId: observation.resourceId, reviewRecordDigest: review.reviewRecordDigest, occurredAt: "2026-07-22T14:00:00.000Z", actorKind: "accountable-human", actorIdentityRef: "identity.incident.fixture", type: "incident-held", holdId: "hold.fixture", reasonCode: "reported-incident" }] }));
    expect(held.resources[0]!.reasonCodes).toContain("lifecycle.incident-held");

    const selfApproved = structuredClone(review);
    selfApproved.scopedDecisionRefs[0]!.reviewerIdentityRef = observation.observerIdentityRef;
    const selfApprovedResult = await deriveResourceEligibility(await eligibilityRequest([observation], [selfApproved]));
    expect(selfApprovedResult.issues.map((issue) => issue.code)).toContain("review.self-approved");

    const factual = await deriveResourceEligibility(await eligibilityRequest([observation], [review], { policyValue: await policy({ requiredClaimUse: "factual-claim" }) }));
    expect(factual.resources[0]!.reasonCodes).toContain("source.claim-authority-prohibited");
  });

  it("uses stable provider-diverse reviewed choices and only pre-reviewed fallback after a provider failure", async () => {
    const external = await createResourceObservation(observationInput("resource.fixture.external"));
    const internal = await createResourceObservation(observationInput("resource.fixture.internal", "forge"));
    const externalReview = await reviewedReview(external);
    const internalReview = await reviewedReview(internal);
    const selectionBase = await eligibilityRequest([external, internal], [externalReview, internalReview]);
    const first = await selectResourceRoute({ ...selectionBase, unavailableProviders: [], learnerSelectedResourceId: "resource.fixture.internal" });
    const second = await selectResourceRoute({ ...selectionBase, unavailableProviders: [], learnerSelectedResourceId: "resource.fixture.internal" });
    expect(first).toEqual(second);
    expect(first.orderedResourceIds).toEqual(["resource.fixture.external", "resource.fixture.internal"]);
    expect(first.learnerSelectedResourceId).toBe("resource.fixture.internal");
    expect(first.reasonCodesByResource["resource.fixture.external"]).toContain("selection.provider-diversity");
    const fallback = await selectResourceRoute({ ...selectionBase, unavailableProviders: ["fixture-external"] });
    expect(fallback.orderedResourceIds).toEqual(["resource.fixture.internal"]);
    expect(fallback.selectionReasonCodes).toContain("provider.failure-pre-reviewed-fallback-only");
  });

  it("covers required-scope, review-input, region, delivery, revocation, and raw-query stop ships", async () => {
    const observation = await createResourceObservation(observationInput("resource.fixture.stop-ships"));
    const review = await reviewedReview(observation);
    if (review.reviewState !== "reviewed") throw new Error("fixture must be reviewed");

    const missingScope = { ...review, scopedDecisionRefs: review.scopedDecisionRefs.filter((decision) => decision.scope !== "rights-commercial") };
    const missingScopeReview = await createResourceReview(missingScope);
    const missingScopeResult = await deriveResourceEligibility(await eligibilityRequest([observation], [missingScopeReview]));
    expect(missingScopeResult.resources[0]!.reasonCodes).toContain("review.required-scope-missing");

    const conflicted = {
      ...review,
      scopedDecisionRefs: [...review.scopedDecisionRefs, { ...review.scopedDecisionRefs[0]!, decisionId: "resource-decision.fixture.learning-fit-rejected", outcome: "rejected" as const }],
    };
    const conflictedReview = await createResourceReview(conflicted);
    const conflictedResult = await deriveResourceEligibility(await eligibilityRequest([observation], [conflictedReview]));
    expect(conflictedResult.resources[0]!.reasonCodes).toContain("review.scope-conflicted");

    const wrongInput = {
      ...review,
      scopedDecisionRefs: review.scopedDecisionRefs.map((decision, index) => index === 0
        ? { ...decision, inputDigests: [DIGEST("9"), decision.inputDigests[1]] as [string, string] }
        : decision),
    };
    const wrongInputResult = await deriveResourceEligibility(await eligibilityRequest([observation], [wrongInput]));
    expect(wrongInputResult.issues.map((issue) => issue.code)).toContain("review.decision-input-mismatch");

    const linkOutObservation = await createResourceObservation({ ...observation, embedStatus: "not-allowed" });
    const linkOutReview = await reviewedReview(linkOutObservation);
    const linkOutResult = await deriveResourceEligibility(await eligibilityRequest([linkOutObservation], [linkOutReview]));
    expect(linkOutResult.resources[0]).toMatchObject({ eligible: true, deliveryMode: "link-out" });

    const regionUnknown = await createResourceObservation({ ...observation, regionSignals: { mode: "unknown", countryCodes: [] } });
    const regionReview = await reviewedReview(regionUnknown);
    const regionResult = await deriveResourceEligibility(await eligibilityRequest([regionUnknown], [regionReview]));
    expect(regionResult.resources[0]!.reasonCodes).toContain("region.ineligible");

    const revoked = await deriveResourceEligibility(await eligibilityRequest([observation], [review], { lifecycleEvents: [{ schemaVersion: "resource-lifecycle.v1", eventId: "resource-lifecycle.fixture.revoke", resourceId: observation.resourceId, reviewRecordDigest: review.reviewRecordDigest, occurredAt: "2026-07-22T14:00:00.000Z", actorKind: "accountable-human", actorIdentityRef: "identity.reviewer.revoke", type: "review-revoked", decisionId: review.scopedDecisionRefs[0]!.decisionId, reasonCode: "withdrawn-review" }] }));
    expect(revoked.resources[0]!.reasonCodes).toContain("lifecycle.review-revoked");
    expect(revoked.resources[0]!.eligible).toBe(false);
    expect((await deriveResourceEligibility({ ...await eligibilityRequest([observation], [review]), rawLearnerQuery: "private learner words" })).issues.map((issue) => issue.code)).toEqual(["schema.invalid"]);
  });

  it("canonicalizes semantic sets across every observation, review, catalog, and eligibility digest", async () => {
    const observationA = await createResourceObservation({
      ...observationInput("resource.fixture.permutation-a"),
      captions: { ...observationInput("resource.fixture.permutation-a").captions, languages: ["fr", "en"] },
      regionSignals: { mode: "allowed-list", countryCodes: ["US", "IN"] },
    });
    const observationB = await createResourceObservation({
      ...observationInput("resource.fixture.permutation-a"),
      captions: { ...observationInput("resource.fixture.permutation-a").captions, languages: ["en", "fr"] },
      regionSignals: { mode: "allowed-list", countryCodes: ["IN", "US"] },
    });
    expect(observationA.observationRecordDigest).toBe(observationB.observationRecordDigest);
    expect(observationA.reviewSignalDigest).toBe(observationB.reviewSignalDigest);
    expect(await resourceObservationRecordDigest(observationA)).toBe(await resourceObservationRecordDigest(observationB));
    expect(await resourceReviewSignalDigest(observationA)).toBe(await resourceReviewSignalDigest(observationB));

    const materialA = reviewMaterial(observationA);
    const secondAlternative = {
      ...materialA.alternativeRoutes[0]!,
      id: "resource-alternative.fixture.audio",
      reviewedAlternativeRef: { id: "alternative.fixture.audio", version: "1.0.0", digest: DIGEST("8") },
      alternativeReviewRecordDigest: DIGEST("7"),
    };
    const expandedA = {
      ...materialA,
      capabilityRefs: [...materialA.capabilityRefs, { curriculumNodeId: "curriculum-node.fixture.aux", capabilityId: "capability.fixture.aux", capabilityVersion: "1.0.0" }],
      pedagogicalRoles: ["source" as const, ...materialA.pedagogicalRoles],
      prerequisiteIds: ["prerequisite.z", "prerequisite.a"],
      riskFlags: [...materialA.riskFlags].reverse(),
      permittedDeliveryModes: [...materialA.permittedDeliveryModes].reverse(),
      alternativeRoutes: [secondAlternative, { ...materialA.alternativeRoutes[0]!, satisfiesAccessTokens: [...materialA.alternativeRoutes[0]!.satisfiesAccessTokens].reverse() }],
      sourceUse: { mode: "bound-source-authority" as const, sourceAuthorityRef: { id: "source-package.fixture", version: "1.0.0", digest: DIGEST("6") }, sourceItemIds: ["source.fixture.z", "source.fixture.a"], claimIds: ["source-claim.fixture.z", "source-claim.fixture.a"], sourceAuthorityReplayDigest: DIGEST("5") },
    };
    const expandedB = {
      ...expandedA,
      capabilityRefs: [...expandedA.capabilityRefs].reverse(),
      pedagogicalRoles: [...expandedA.pedagogicalRoles].reverse(),
      prerequisiteIds: [...expandedA.prerequisiteIds].reverse(),
      riskFlags: [...expandedA.riskFlags].reverse(),
      permittedDeliveryModes: [...expandedA.permittedDeliveryModes].reverse(),
      alternativeRoutes: [...expandedA.alternativeRoutes].reverse(),
      sourceUse: { ...expandedA.sourceUse, sourceItemIds: [...expandedA.sourceUse.sourceItemIds].reverse(), claimIds: [...expandedA.sourceUse.claimIds].reverse() },
    };
    expect(await resourceReviewInputDigest(expandedA)).toBe(await resourceReviewInputDigest(expandedB));

    const reviewA = await reviewedReview(observationA);
    if (reviewA.reviewState !== "reviewed") throw new Error("fixture must be reviewed");
    const reviewB = await createResourceReview({
      ...reviewA,
      riskFlags: [...reviewA.riskFlags].reverse(),
      permittedDeliveryModes: [...reviewA.permittedDeliveryModes].reverse(),
      alternativeRoutes: reviewA.alternativeRoutes.map((alternative) => ({ ...alternative, satisfiesAccessTokens: [...alternative.satisfiesAccessTokens].reverse() })).reverse(),
      scopedDecisionRefs: [...reviewA.scopedDecisionRefs].reverse(),
    });
    if (reviewB.reviewState !== "reviewed") throw new Error("fixture must be reviewed");
    expect(reviewA.reviewInputDigest).toBe(reviewB.reviewInputDigest);
    expect(reviewA.reviewRecordDigest).toBe(reviewB.reviewRecordDigest);

    const internal = await createResourceObservation(observationInput("resource.fixture.permutation-b", "forge"));
    const internalReview = await reviewedReview(internal);
    if (internalReview.reviewState !== "reviewed") throw new Error("fixture must be reviewed");
    const receipts = [await alternativeReceipt(reviewA)];
    const permutationEvents = [
      { schemaVersion: "resource-lifecycle.v1", eventId: "resource-lifecycle.fixture.permutation-hold", resourceId: observationA.resourceId, reviewRecordDigest: reviewA.reviewRecordDigest, occurredAt: "2026-07-22T10:00:00.000Z", actorKind: "caller-asserted-fixture", actorIdentityRef: "identity.lifecycle.fixture", type: "incident-held", holdId: "hold.permutation", reasonCode: "fixture" },
      { schemaVersion: "resource-lifecycle.v1", eventId: "resource-lifecycle.fixture.permutation-release", resourceId: observationA.resourceId, reviewRecordDigest: reviewA.reviewRecordDigest, occurredAt: "2026-07-22T11:00:00.000Z", actorKind: "caller-asserted-fixture", actorIdentityRef: "identity.lifecycle.fixture", type: "incident-released", holdId: "hold.permutation" },
    ];
    const forwardCatalog = catalog([observationA, internal], [reviewA, internalReview], permutationEvents);
    const reverseCatalog = catalog([internal, observationB], [internalReview, reviewB], [...permutationEvents].reverse());
    expect((await evaluateResourceCatalog(forwardCatalog, AS_OF)).catalogDigest).toBe((await evaluateResourceCatalog(reverseCatalog, AS_OF)).catalogDigest);
    const forwardEligibility = await deriveResourceEligibility({ ...await eligibilityRequest([observationA, internal], [reviewA, internalReview], { receipts }), policy: await policy() });
    const basePolicy = await policy();
    const reverseEligibility = await deriveResourceEligibility({
      ...await eligibilityRequest([internal, observationB], [internalReview, reviewB], { receipts: [...receipts].reverse() }),
      policy: await policy({ requiredAccessTokens: ["transcript", "captions"], allowedDeliveryModes: ["link-out", "embed"], requiredReviewScopes: [...basePolicy.requiredReviewScopes].reverse(), independentReviewScopes: [...basePolicy.independentReviewScopes].reverse() }),
    });
    expect(forwardEligibility.eligibleSnapshotDigest).not.toBeNull();
    expect(forwardEligibility.resources.every((resource) => resource.eligible)).toBe(true);
    expect(forwardEligibility.eligibleSnapshotDigest).toBe(reverseEligibility.eligibleSnapshotDigest);
  });

  it("preserves external review across TTL-only refresh and invalidates every material review-signal drift", async () => {
    const observation = await createResourceObservation(observationInput("resource.fixture.ttl"));
    const review = await reviewedReview(observation);
    const receipt = await alternativeReceipt(review);
    const refreshed = await createResourceObservation({
      ...observation,
      observationId: "resource-observation.fixture.ttl-refresh",
      observerIdentityRef: "identity.observer.refresh",
      observedAt: "2026-07-23T10:00:00.000Z",
      refreshOrDeleteAt: "2026-09-15T12:00:00.000Z",
    });
    expect(refreshed.observationRecordDigest).not.toBe(observation.observationRecordDigest);
    expect(refreshed.reviewSignalDigest).toBe(observation.reviewSignalDigest);
    const refreshedResult = await deriveResourceEligibility(await eligibilityRequest([refreshed], [review], { receipts: [receipt] }));
    expect(refreshedResult.resources[0]).toMatchObject({ eligible: true });
    expect((await evaluateResourceCatalog(catalog([refreshed], [review]), AS_OF)).resources[0]!.observationRecordDigest).toBe(refreshed.observationRecordDigest);

    const drifts = [
      { title: "Materially edited title" },
      { creator: "Different creator" },
      { provider: "oer" },
      { canonicalUrl: "https://fixtures.example/changed-video" },
      { providerMetadataVersion: "fixture-2" },
      { trackingAndAds: { ...observation.trackingAndAds, adsMayAppear: "no" } },
    ];
    for (const drift of drifts) {
      const changed = await createResourceObservation({ ...observation, ...drift });
      expect(changed.reviewSignalDigest).not.toBe(observation.reviewSignalDigest);
      const result = await deriveResourceEligibility(await eligibilityRequest([changed], [review], { receipts: [receipt] }));
      expect(result.resources[0]!.eligible).toBe(false);
      expect(result.issues.map((issue) => issue.code)).toContain("review.observation-binding-mismatch");
    }
  });

  it("derives risk consistency, keeps disclosed reviewed ads visible, and obeys fixed risk policy", async () => {
    const observation = await createResourceObservation(observationInput("resource.fixture.risk"));
    const review = await reviewedReview(observation);
    if (review.reviewState !== "reviewed") throw new Error("fixture must be reviewed");
    const allowed = await deriveResourceEligibility(await eligibilityRequest([observation], [review]));
    expect(allowed.resources[0]).toMatchObject({ eligible: true });
    expect(allowed.resources[0]!.reasonCodes).toContain("disclosure.ads-yes");
    expect(allowed.resources[0]!.reasonCodes).toContain("disclosure.tracking-present");

    const basePolicy = await policy();
    const rejectedByPolicy = await deriveResourceEligibility(await eligibilityRequest([observation], [review], { policyValue: await policy({ disclosedRiskPolicy: { ...basePolicy.disclosedRiskPolicy, advertising: "reject-present" } }) }));
    expect(rejectedByPolicy.resources[0]!.reasonCodes).toContain("risk.advertising-policy-rejected");
    expect(rejectedByPolicy.resources[0]!.eligible).toBe(false);

    const contradictory = await createResourceReview({ ...review, riskFlags: ["none-observed"] });
    const contradictoryResult = await deriveResourceEligibility(await eligibilityRequest([observation], [contradictory]));
    expect(contradictoryResult.issues.map((issue) => issue.code)).toContain("risk.flag-missing.tracking");

    const ambiguousObservation = await createResourceObservation({ ...observation, trackingAndAds: { ...observation.trackingAndAds, thirdPartyDataFlow: "unknown" } });
    const ambiguousReview = await reviewedReview(ambiguousObservation);
    const ambiguous = await deriveResourceEligibility(await eligibilityRequest([ambiguousObservation], [ambiguousReview]));
    expect(ambiguous.resources[0]!.reasonCodes).toContain("risk.tracking-unknown");

    const incidentDraft = { ...review, riskFlags: [...review.riskFlags, "reported-incident"] };
    const incidentInputDigest = await resourceReviewInputDigest(incidentDraft);
    const incidentReview = await createResourceReview({
      ...incidentDraft,
      reviewInputDigest: incidentInputDigest,
      scopedDecisionRefs: review.scopedDecisionRefs.map((decision) => ({ ...decision, inputDigests: [incidentInputDigest, observation.reviewSignalDigest] })),
    });
    const incident = await deriveResourceEligibility(await eligibilityRequest([observation], [incidentReview]));
    expect(incident.resources[0]!.reasonCodes).toContain("risk.reported-incident");
  });

  it("pins all four independent review scopes and requires exact current alternative authority", async () => {
    const basePolicy = await policy();
    expect(resourceSelectionPolicySchema.safeParse(policyInput({ requiredReviewScopes: ["learning-fit"] })).success).toBe(false);
    expect(resourceSelectionPolicySchema.safeParse(policyInput({ independentReviewScopes: ["learning-fit"] })).success).toBe(false);
    expect(resourceSelectionPolicySchema.safeParse(policyInput({ requiredReviewScopes: [...basePolicy.requiredReviewScopes].reverse(), independentReviewScopes: [...basePolicy.independentReviewScopes].reverse() })).success).toBe(true);

    const observation = await createResourceObservation(observationInput("resource.fixture.alternative-authority"));
    const review = await reviewedReview(observation);
    const missing = await deriveResourceEligibility(await eligibilityRequest([observation], [review], { receipts: [] }));
    expect(missing.resources[0]!.reasonCodes).toContain("alternative.authority-missing");
    const stale = await deriveResourceEligibility(await eligibilityRequest([observation], [review], { receipts: [await alternativeReceipt(review, { current: false })] }));
    expect(stale.resources[0]!.reasonCodes).toContain("alternative.authority-stale");
    const wrongCapability = await deriveResourceEligibility(await eligibilityRequest([observation], [review], { receipts: [await alternativeReceipt(review, { reviewedCapabilityRef: "capability.fixture.wrong" })] }));
    expect(wrongCapability.resources[0]!.reasonCodes).toContain("alternative.capability-mismatch");
    const wrongConstruct = await deriveResourceEligibility(await eligibilityRequest([observation], [review], { receipts: [await alternativeReceipt(review, { accessEffect: "construct-changing" })] }));
    expect(wrongConstruct.resources[0]!.reasonCodes).toContain("alternative.construct-mismatch");
    const wrongReviewRecord = await deriveResourceEligibility(await eligibilityRequest([observation], [review], { receipts: [await alternativeReceipt(review, { alternativeReviewRecordDigest: DIGEST("9") })] }));
    expect(wrongReviewRecord.resources[0]!.reasonCodes).toContain("alternative.authority-stale");
    const wrongAccessBinding = await deriveResourceEligibility(await eligibilityRequest([observation], [review], { receipts: [await alternativeReceipt(review, { satisfiesAccessTokens: ["captions"] })] }));
    expect(wrongAccessBinding.resources[0]!.reasonCodes).toContain("alternative.access-binding-mismatch");
    const wrongWindow = await deriveResourceEligibility(await eligibilityRequest([observation], [review], { receipts: [await alternativeReceipt(review, { reviewedAt: "2026-07-20T12:00:00.000Z" })] }));
    expect(wrongWindow.resources[0]!.reasonCodes).toContain("alternative.review-window-mismatch");
    const forgedReceipt = {
      ...await alternativeReceipt(review),
      authorityRecordDigest: DIGEST("8"),
    };
    const forgedDigest = await deriveResourceEligibility(await eligibilityRequest([observation], [review], { receipts: [forgedReceipt] }));
    expect(forgedDigest.resources[0]!.reasonCodes).toContain("alternative.authority-record-digest-mismatch");
  });

  it("recomputes strict selection from raw authority inputs and ignores future lifecycle facts", async () => {
    const observation = await createResourceObservation(observationInput("resource.fixture.recomputed-selection"));
    const review = await reviewedReview(observation);
    if (review.reviewState !== "reviewed") throw new Error("fixture must be reviewed");
    const request = await eligibilityRequest([observation], [review]);
    const eligibility = await deriveResourceEligibility(request);
    await expect(selectResourceRoute({ eligibility, unavailableProviders: [] })).rejects.toThrow();

    const futureHold = { schemaVersion: "resource-lifecycle.v1", eventId: "resource-lifecycle.fixture.future-hold", resourceId: observation.resourceId, reviewRecordDigest: review.reviewRecordDigest, occurredAt: "2026-08-01T00:00:00.000Z", actorKind: "accountable-human", actorIdentityRef: "identity.incident.future", type: "incident-held", holdId: "hold.future", reasonCode: "future-incident" };
    const futureRequest = await eligibilityRequest([observation], [review], { lifecycleEvents: [futureHold] });
    const futureEvaluation = await evaluateResourceCatalog(futureRequest.catalog, AS_OF);
    expect(futureEvaluation.resources[0]!.lifecycle).toBe("reviewed");
    expect(futureEvaluation.issues.map((issue) => issue.code)).not.toContain("lifecycle.occurred-after-as-of");
    const selected = await selectResourceRoute({ ...futureRequest, unavailableProviders: [], learnerSelectedResourceId: "resource.unknown" });
    expect(selected.orderedResourceIds).toEqual([observation.resourceId]);
    expect(selected.learnerSelectedResourceId).toBeNull();

    const edited = await createResourceObservation({ ...observation, title: "Changed after review" });
    const editedRequest = await eligibilityRequest([edited], [review], { receipts: request.alternativeAuthorityReceipts });
    const rejected = await selectResourceRoute({ ...editedRequest, unavailableProviders: [] });
    expect(rejected.orderedResourceIds).toEqual([]);
    const expiredRequest = await eligibilityRequest([observation], [review], { receipts: request.alternativeAuthorityReceipts, asOf: "2026-08-24T12:00:00.000Z" });
    const expired = await selectResourceRoute({ ...expiredRequest, unavailableProviders: [] });
    expect(expired.orderedResourceIds).toEqual([]);
  });

  it("rejects review, decision, alternative, and receipt authority that does not yet exist at replay time", async () => {
    const observation = await createResourceObservation(observationInput("resource.fixture.future-authority"));
    const currentPolicy = await policy();
    const future = "2026-07-24T12:00:00.000Z";
    const futureReview = await reviewedReview(observation, { reviewedAt: future });
    const futureDecision = await reviewedReview(observation, { decidedAt: future });
    const futureAlternative = await reviewedReview(observation, { alternativeReviewedAt: future });

    const reviewAuthority = await validateResourceReviewAuthority(futureReview, observation, currentPolicy, new Date(AS_OF));
    expect(reviewAuthority.map((issue) => issue.code)).toContain("review.not-yet-reviewed");
    const decisionAuthority = await validateResourceReviewAuthority(futureDecision, observation, currentPolicy, new Date(AS_OF));
    expect(decisionAuthority.map((issue) => issue.code)).toContain("review.decision-not-yet-effective");
    const alternativeAuthority = await validateResourceReviewAuthority(futureAlternative, observation, currentPolicy, new Date(AS_OF));
    expect(alternativeAuthority.map((issue) => issue.code)).toContain("review.alternative-not-yet-reviewed");

    for (const review of [futureReview, futureDecision, futureAlternative]) {
      const result = await deriveResourceEligibility(await eligibilityRequest([observation], [review], { policyValue: currentPolicy }));
      expect(result.resources[0]!.eligible).toBe(false);
    }

    const currentReview = await reviewedReview(observation);
    const futureReceipt = await alternativeReceipt(currentReview, {
      reviewedAt: future,
      expiresAt: "2026-08-26T12:00:00.000Z",
    });
    const receiptResult = await deriveResourceEligibility(await eligibilityRequest([observation], [currentReview], {
      policyValue: currentPolicy,
      receipts: [futureReceipt],
    }));
    expect(receiptResult.resources[0]!.reasonCodes).toContain("alternative.authority-not-yet-effective");
    expect(receiptResult.resources[0]!.eligible).toBe(false);
  });

  it("orders offset timestamps by instant for lifecycle replay and freshness", async () => {
    const observation = await createResourceObservation(observationInput("resource.fixture.offset-lifecycle"));
    const review = await reviewedReview(observation);
    if (review.reviewState !== "reviewed") throw new Error("fixture must be reviewed");
    const replay = await evaluateResourceCatalog(catalog([observation], [review], [
      {
        schemaVersion: "resource-lifecycle.v1",
        eventId: "resource-lifecycle.fixture.offset-release",
        resourceId: observation.resourceId,
        reviewRecordDigest: review.reviewRecordDigest,
        occurredAt: "2026-07-23T08:00:00Z",
        actorKind: "accountable-human",
        actorIdentityRef: "identity.lifecycle.offset",
        type: "incident-released",
        holdId: "hold.offset",
      },
      {
        schemaVersion: "resource-lifecycle.v1",
        eventId: "resource-lifecycle.fixture.offset-hold",
        resourceId: observation.resourceId,
        reviewRecordDigest: review.reviewRecordDigest,
        occurredAt: "2026-07-23T12:00:00+05:30",
        actorKind: "accountable-human",
        actorIdentityRef: "identity.lifecycle.offset",
        type: "incident-held",
        holdId: "hold.offset",
        reasonCode: "fixture",
      },
    ]), "2026-07-23T09:00:00Z");
    expect(replay.resources[0]!.lifecycle).toBe("reviewed");
    expect(replay.issues.map((issue) => issue.code)).not.toContain("lifecycle.hold-missing");

    const beforeReview = await evaluateResourceCatalog(catalog([observation], [review], [{
      schemaVersion: "resource-lifecycle.v1",
      eventId: "resource-lifecycle.fixture.before-review",
      resourceId: observation.resourceId,
      reviewRecordDigest: review.reviewRecordDigest,
      occurredAt: "2026-07-20T12:00:00Z",
      actorKind: "accountable-human",
      actorIdentityRef: "identity.lifecycle.offset",
      type: "withdrawn",
      withdrawalId: "withdrawal.offset",
      reasonCode: "fixture",
    }]), AS_OF);
    expect(beforeReview.issues.map((issue) => issue.code)).toContain("lifecycle.occurred-before-review");

    const older = await createResourceObservation({
      ...observationInput("resource.fixture.offset-older"),
      observedAt: "2026-07-23T12:00:00+05:30",
    });
    const newer = await createResourceObservation({
      ...observationInput("resource.fixture.offset-newer"),
      observedAt: "2026-07-23T08:00:00Z",
    });
    const olderReview = await reviewedReview(older);
    const newerReview = await reviewedReview(newer);
    const freshnessRequest = await eligibilityRequest([older, newer], [olderReview, newerReview], {
      asOf: "2026-07-23T09:00:00Z",
      policyValue: await policy({ maximumItems: 1 }),
    });
    const choice = await selectResourceRoute({ ...freshnessRequest, unavailableProviders: [] });
    expect(choice.orderedResourceIds).toEqual([newer.resourceId]);
    expect(choice.fallbackResourceIds).toEqual([older.resourceId]);
  });

  it("content-addresses the complete selection policy and binds it into the eligibility snapshot", async () => {
    const observation = await createResourceObservation(observationInput("resource.fixture.policy-binding"));
    const review = await reviewedReview(observation);
    const basePolicy = await policy();
    expect(basePolicy.policyRef.digest).toBe(await resourceSelectionPolicyDigest(basePolicy));
    const request = await eligibilityRequest([observation], [review], { policyValue: basePolicy });
    const base = await deriveResourceEligibility(request);

    const tampered = structuredClone(basePolicy);
    tampered.disclosedRiskPolicy.sensitiveTopic = "reject-present";
    const rejected = await deriveResourceEligibility({ ...request, policy: tampered });
    expect(rejected.eligibleSnapshotDigest).toBeNull();
    expect(rejected.issues.map((issue) => issue.code)).toEqual(["policy.digest-mismatch"]);
    await expect(selectResourceRoute({ ...request, policy: tampered, unavailableProviders: [] })).rejects.toThrow();

    const changedPolicy = await policy({
      disclosedRiskPolicy: { ...basePolicy.disclosedRiskPolicy, sensitiveTopic: "reject-present" },
    });
    const changed = await deriveResourceEligibility({ ...request, policy: changedPolicy });
    expect(base.resources[0]!.eligible).toBe(true);
    expect(changed.resources[0]!.eligible).toBe(true);
    expect(changedPolicy.policyRef.digest).not.toBe(basePolicy.policyRef.digest);
    expect(changed.eligibleSnapshotDigest).not.toBe(base.eligibleSnapshotDigest);
  });

  it("keeps fixed review scopes immutable and strict-parses the public authority helper", async () => {
    expect(Object.isFrozen(RESOURCE_REVIEW_SCOPES)).toBe(true);
    expect(Reflect.set(RESOURCE_REVIEW_SCOPES as unknown as object, "0", "learning-fit-mutated")).toBe(false);
    expect(RESOURCE_REVIEW_SCOPES).toEqual(["learning-fit", "accessibility", "age-safety", "rights-commercial"]);

    const observation = await createResourceObservation(observationInput("resource.fixture.strict-authority"));
    const review = await reviewedReview(observation);
    if (review.reviewState !== "reviewed") throw new Error("fixture must be reviewed");
    const conflicted = await createResourceReview({
      ...review,
      scopedDecisionRefs: review.scopedDecisionRefs.map((decision) => ({
        ...decision,
        independence: "declared-conflict" as const,
      })),
    });
    const invalidPolicy = {
      ...await policy(),
      independentReviewScopes: [],
    };
    const invalidPolicyIssues = await validateResourceReviewAuthority(conflicted, observation, invalidPolicy, new Date(AS_OF));
    expect(invalidPolicyIssues.map((issue) => issue.code)).toEqual(["policy.schema-invalid"]);

    const oneScope = await createResourceReview({
      ...review,
      scopedDecisionRefs: [review.scopedDecisionRefs[0]!],
    });
    const oneScopeIssues = await validateResourceReviewAuthority(oneScope, observation, await policy(), new Date(AS_OF));
    expect(oneScopeIssues.map((issue) => issue.code)).toContain("review.required-scope-missing");
  });

  it("rejects duplicate external provider locators across resource identities", async () => {
    const first = await createResourceObservation(observationInput("resource.fixture.locator-first"));
    if (first.authorityKind !== "external-provider-metadata") throw new Error("fixture must be external");
    const duplicateExternalId = await createResourceObservation({
      ...observationInput("resource.fixture.locator-second"),
      externalId: first.externalId,
    });
    const duplicateIdResult = resourceCatalogSchema.safeParse(catalog([first, duplicateExternalId], []));
    expect(duplicateIdResult.success).toBe(false);
    if (!duplicateIdResult.success) {
      expect(duplicateIdResult.error.issues.map((issue) => issue.path.join("."))).toContain("observations.1.externalId");
    }

    const duplicateCanonicalUrl = await createResourceObservation({
      ...observationInput("resource.fixture.locator-third"),
      canonicalUrl: first.canonicalUrl,
    });
    const duplicateUrlResult = resourceCatalogSchema.safeParse(catalog([first, duplicateCanonicalUrl], []));
    expect(duplicateUrlResult.success).toBe(false);
    if (!duplicateUrlResult.success) {
      expect(duplicateUrlResult.error.issues.map((issue) => issue.path.join("."))).toContain("observations.1.canonicalUrl");
    }
  });

  it("bounds both the primary choice and the additional fallback set by maximumItems", async () => {
    const observations = await Promise.all([
      createResourceObservation(observationInput("resource.fixture.bound-a")),
      createResourceObservation(observationInput("resource.fixture.bound-b")),
      createResourceObservation(observationInput("resource.fixture.bound-c")),
      createResourceObservation(observationInput("resource.fixture.bound-d")),
    ]);
    const reviews = await Promise.all(observations.map((observation) => reviewedReview(observation)));
    const request = await eligibilityRequest(observations, reviews, {
      policyValue: await policy({ maximumItems: 1 }),
    });
    const choice = await selectResourceRoute({ ...request, unavailableProviders: [] });
    expect(choice.orderedResourceIds).toHaveLength(1);
    expect(choice.fallbackResourceIds).toHaveLength(1);
    expect(Object.keys(choice.reasonCodesByResource)).toHaveLength(2);
  });

  it("cannot label unknown tracking, advertising, or commercial influence as none-observed", async () => {
    const observation = await createResourceObservation({
      ...observationInput("resource.fixture.unknown-commercial"),
      trackingAndAds: {
        thirdPartyDataFlow: "unknown",
        adsMayAppear: "unknown",
        paidPlacement: "unknown",
      },
      rightsSignals: {
        status: "known",
        useBasis: "reviewed-educational-use",
        attributionRequired: "yes",
        commercialInfluence: "unknown",
        rightsReviewRef: "rights-review.fixture",
      },
    });
    const review = await reviewedReview(observation);
    expect(review.riskFlags).toEqual(["advertising", "sponsorship", "tracking"]);
    const result = await deriveResourceEligibility(await eligibilityRequest([observation], [review]));
    expect(result.resources[0]!.eligible).toBe(false);
    expect(result.resources[0]!.reasonCodes).toEqual(expect.arrayContaining([
      "risk.tracking-unknown",
      "risk.advertising-unknown",
      "risk.paid-placement-unknown",
      "risk.commercial-influence-unknown",
    ]));

    if (review.reviewState !== "reviewed") throw new Error("fixture must be reviewed");
    const contradictoryDraft = { ...review, riskFlags: ["none-observed" as const] };
    const contradictoryInputDigest = await resourceReviewInputDigest(contradictoryDraft);
    const contradictory = await createResourceReview({
      ...contradictoryDraft,
      reviewInputDigest: contradictoryInputDigest,
      scopedDecisionRefs: review.scopedDecisionRefs.map((decision) => ({
        ...decision,
        inputDigests: [contradictoryInputDigest, observation.reviewSignalDigest] as const,
      })),
    });
    const contradictoryResult = await deriveResourceEligibility(await eligibilityRequest([observation], [contradictory]));
    expect(contradictoryResult.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      "risk.flag-missing.tracking",
      "risk.flag-missing.advertising",
      "risk.flag-missing.sponsorship",
      "risk.none-observed-contradiction",
    ]));
  });
});
