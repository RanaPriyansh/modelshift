import { z } from "zod";

import { deepFreeze } from "../deep-freeze";
import { canonicalJson, sha256Digest } from "../events";
import {
  RESOURCE_CATALOG_SCHEMA_VERSION,
  type ResourceCatalogIssue,
  type ResourceCatalogV1,
  type ResourceLifecycleEventV1,
  type ResourceObservationV1,
  type ResourceReviewV1,
  orderedResourceIssues,
  normalizeResourceObservation,
  normalizeResourceReview,
  resourceCatalogSchema,
  resourceCodeUnitCompare,
  resourceObservationRecordDigest,
  resourceReviewSignalDigest,
} from "./contracts";
import { validateResourceReviewRecord } from "./review";

export type ResourceLifecycleState =
  | "missing-review"
  | "candidate"
  | "rejected"
  | "reviewed"
  | "withdrawn"
  | "superseded"
  | "incident-held"
  | "review-revoked"
  | "observation-edited"
  | "expired"
  | "invalid";

export interface ResourceCatalogProjection {
  readonly resourceId: string;
  readonly observationRecordDigest: string | null;
  readonly reviewSignalDigest: string | null;
  readonly reviewInputDigest: string | null;
  readonly reviewRecordDigest: string | null;
  readonly reviewState: "missing" | ResourceReviewV1["reviewState"];
  readonly lifecycle: ResourceLifecycleState;
  /** Disclosure values stay visible without retaining provider response bodies or learner data. */
  readonly disclosures: {
    readonly provider: string | null;
    readonly thirdPartyDataFlow: "present" | "absent" | "unknown" | null;
    readonly adsMayAppear: "yes" | "no" | "unknown" | null;
    readonly paidPlacement: "present" | "absent" | "unknown" | null;
    readonly commercialInfluence: "present" | "absent" | "unknown" | null;
    readonly captions: "available" | "unavailable" | "unknown" | null;
    readonly transcriptUse: "authorized" | "metadata-only" | "not-available" | null;
    readonly embedStatus: "allowed" | "not-allowed" | "unknown" | null;
    readonly linkOutStatus: "reviewed-https" | "unavailable" | "not-reviewed" | null;
  };
  readonly issueCodes: readonly string[];
}

export interface ResourceCatalogEvaluation {
  readonly schemaVersion: "resource-catalog-evaluation.v1";
  readonly authority: "fixture-only-caller-asserted";
  readonly assignmentAllowed: false;
  readonly runtimeAssignmentAllowed: false;
  readonly asOf: string;
  readonly catalog: Readonly<ResourceCatalogV1> | null;
  readonly catalogDigest: string | null;
  readonly resources: readonly ResourceCatalogProjection[];
  readonly issues: readonly ResourceCatalogIssue[];
}

export interface ResourceCatalogAuditProjection {
  readonly schemaVersion: "resource-catalog-audit.v1";
  readonly authority: "fixture-only-caller-asserted";
  readonly assignmentAllowed: false;
  readonly runtimeAssignmentAllowed: false;
  readonly catalogDigest: string | null;
  readonly resources: readonly {
    readonly resourceId: string;
    readonly observationRecordDigest: string | null;
    readonly reviewRecordDigest: string | null;
    readonly lifecycle: ResourceLifecycleState;
    readonly issueCodes: readonly string[];
  }[];
}

function ordered<T extends { resourceId: string }>(entries: readonly T[]): T[] {
  return [...entries].sort((left, right) => resourceCodeUnitCompare(left.resourceId, right.resourceId));
}

function eventOrder(left: ResourceLifecycleEventV1, right: ResourceLifecycleEventV1): number {
  const leftTime = Date.parse(left.occurredAt);
  const rightTime = Date.parse(right.occurredAt);
  const chronology = leftTime < rightTime ? -1 : leftTime > rightTime ? 1 : 0;
  return chronology || resourceCodeUnitCompare(left.eventId, right.eventId);
}

function issuePathForObservation(observation: ResourceObservationV1): string {
  return `observations.${observation.resourceId}`;
}

function disclosureFor(observation: ResourceObservationV1 | undefined): ResourceCatalogProjection["disclosures"] {
  if (!observation) {
    return {
      provider: null, thirdPartyDataFlow: null, adsMayAppear: null, paidPlacement: null, commercialInfluence: null,
      captions: null, transcriptUse: null, embedStatus: null, linkOutStatus: null,
    };
  }
  return {
    provider: observation.provider,
    thirdPartyDataFlow: observation.trackingAndAds.thirdPartyDataFlow,
    adsMayAppear: observation.trackingAndAds.adsMayAppear,
    paidPlacement: observation.trackingAndAds.paidPlacement,
    commercialInfluence: observation.rightsSignals.commercialInfluence,
    captions: observation.captions.presence,
    transcriptUse: observation.transcriptUse,
    embedStatus: observation.embedStatus,
    linkOutStatus: observation.linkOut.status,
  };
}

function lifecycleFor(
  review: ResourceReviewV1 | undefined,
  observation: ResourceObservationV1 | undefined,
  events: readonly ResourceLifecycleEventV1[],
  asOf: Date,
  hasIssues: boolean,
): ResourceLifecycleState {
  if (!review) return "missing-review";
  if (hasIssues) return "invalid";
  if (review.reviewState === "candidate") return "candidate";
  if (review.reviewState === "rejected") return "rejected";
  if (!observation) return "invalid";

  const currentEvents = events.filter((event) => Date.parse(event.occurredAt) <= asOf.getTime()).sort(eventOrder);
  if (currentEvents.some((event) => event.type === "withdrawn")) return "withdrawn";
  if (currentEvents.some((event) => event.type === "superseded")) return "superseded";
  if (currentEvents.some((event) => event.type === "review-revoked")) return "review-revoked";
  if (currentEvents.some((event) => event.type === "observation-edited")) return "observation-edited";

  const openHolds = new Set<string>();
  for (const event of currentEvents) {
    if (event.type === "incident-held") openHolds.add(event.holdId);
    if (event.type === "incident-released") openHolds.delete(event.holdId);
  }
  if (openHolds.size > 0) return "incident-held";
  if (Date.parse(review.expiresAt) <= asOf.getTime()) return "expired";
  return "reviewed";
}

/** Returns a sorted, frozen catalog but does not award review/publication/runtime authority. */
export function createResourceCatalog(value: unknown): Readonly<ResourceCatalogV1> {
  const catalog = resourceCatalogSchema.parse(value);
  return deepFreeze(resourceCatalogSchema.parse({
    schemaVersion: RESOURCE_CATALOG_SCHEMA_VERSION,
    observations: ordered(catalog.observations.map(normalizeResourceObservation)),
    reviews: ordered(catalog.reviews.map(normalizeResourceReview)),
    lifecycleEvents: [...catalog.lifecycleEvents].sort(eventOrder),
  }));
}

/**
 * Replays only supplied, fixture-backed facts at a caller-supplied instant.
 * It has no network, storage, provider, publication, or assignment side effect.
 */
export async function evaluateResourceCatalog(value: unknown, asOf: string): Promise<Readonly<ResourceCatalogEvaluation>> {
  const asOfResult = z.string().datetime({ offset: true }).safeParse(asOf);
  if (!asOfResult.success) {
    return deepFreeze({
      schemaVersion: "resource-catalog-evaluation.v1" as const,
      authority: "fixture-only-caller-asserted" as const,
      assignmentAllowed: false as const,
      runtimeAssignmentAllowed: false as const,
      asOf,
      catalog: null,
      catalogDigest: null,
      resources: [],
      issues: orderedResourceIssues([{ code: "as-of.invalid", path: "asOf", message: "Use an offset ISO timestamp." }]),
    });
  }
  const parsed = resourceCatalogSchema.safeParse(value);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => ({
      code: "schema.invalid",
      path: issue.path.join("."),
      message: "Catalog input does not satisfy the strict fixture contract.",
    }));
    return deepFreeze({
      schemaVersion: "resource-catalog-evaluation.v1" as const,
      authority: "fixture-only-caller-asserted" as const,
      assignmentAllowed: false as const,
      runtimeAssignmentAllowed: false as const,
      asOf,
      catalog: null,
      catalogDigest: null,
      resources: [],
      issues: orderedResourceIssues(issues),
    });
  }

  const catalog = createResourceCatalog(parsed.data);
  const asOfDate = new Date(asOf);
  const issues: ResourceCatalogIssue[] = [];
  const issuesByResource = new Map<string, ResourceCatalogIssue[]>();
  const note = (resourceId: string, issue: ResourceCatalogIssue) => {
    issues.push(issue);
    const resourceIssues = issuesByResource.get(resourceId) ?? [];
    resourceIssues.push(issue);
    issuesByResource.set(resourceId, resourceIssues);
  };
  const observationById = new Map(catalog.observations.map((observation) => [observation.resourceId, observation]));
  const reviewById = new Map(catalog.reviews.map((review) => [review.resourceId, review]));
  const eventsByResource = new Map<string, ResourceLifecycleEventV1[]>();

  for (const observation of catalog.observations) {
    const root = issuePathForObservation(observation);
    if (observation.observationRecordDigest !== await resourceObservationRecordDigest(observation)) {
      note(observation.resourceId, { code: "observation.record-digest-mismatch", path: `${root}.observationRecordDigest`, message: "Observation record digest must cover the exact observation." });
    }
    if (observation.reviewSignalDigest !== await resourceReviewSignalDigest(observation)) {
      note(observation.resourceId, { code: "observation.review-signal-digest-mismatch", path: `${root}.reviewSignalDigest`, message: "Review signal digest must cover the exact review-relevant metadata." });
    }
    if (Date.parse(observation.observedAt) > asOfDate.getTime()) {
      note(observation.resourceId, { code: "observation.observed-after-as-of", path: `${root}.observedAt`, message: "An observation after replay time cannot be current." });
    }
    if (observation.authorityKind === "external-provider-metadata" && Date.parse(observation.refreshOrDeleteAt) <= asOfDate.getTime()) {
      note(observation.resourceId, { code: "observation.refresh-expired", path: `${root}.refreshOrDeleteAt`, message: "External metadata must be refreshed or deleted before eligibility." });
    }
  }

  for (const review of catalog.reviews) {
    const reviewIssues = await validateResourceReviewRecord(review, observationById.get(review.resourceId));
    reviewIssues.forEach((issue) => note(review.resourceId, issue));
    if (review.reviewState === "reviewed" && Date.parse(review.reviewedAt) > asOfDate.getTime()) {
      note(review.resourceId, {
        code: "review.reviewed-after-as-of",
        path: `reviews.${review.resourceId}.reviewedAt`,
        message: "A future reviewed record cannot appear in a historical projection.",
      });
    }
    if (review.reviewState === "rejected" && Date.parse(review.rejectedAt) > asOfDate.getTime()) {
      note(review.resourceId, {
        code: "review.rejected-after-as-of",
        path: `reviews.${review.resourceId}.rejectedAt`,
        message: "A future rejection cannot appear in a historical projection.",
      });
    }
  }

  for (const event of catalog.lifecycleEvents) {
    // Future lifecycle facts are outside this replay window and do not poison an earlier projection.
    if (Date.parse(event.occurredAt) > asOfDate.getTime()) continue;
    const eventPath = `lifecycleEvents.${event.eventId}`;
    const review = reviewById.get(event.resourceId);
    const observation = observationById.get(event.resourceId);
    const resourceEvents = eventsByResource.get(event.resourceId) ?? [];
    resourceEvents.push(event);
    eventsByResource.set(event.resourceId, resourceEvents);
    if (!review || review.reviewState !== "reviewed") {
      note(event.resourceId, { code: "lifecycle.review-missing", path: eventPath, message: "Lifecycle events require a reviewed record." });
      continue;
    }
    if (event.reviewRecordDigest !== review.reviewRecordDigest) {
      note(event.resourceId, { code: "lifecycle.review-binding-mismatch", path: `${eventPath}.reviewRecordDigest`, message: "Lifecycle events must bind the exact reviewed record." });
    }
    if (Date.parse(event.occurredAt) < Date.parse(review.reviewedAt)) {
      note(event.resourceId, { code: "lifecycle.occurred-before-review", path: `${eventPath}.occurredAt`, message: "A lifecycle transition cannot precede the reviewed record it governs." });
    }
    if (event.type === "incident-released") {
      const priorHold = resourceEvents.slice(0, -1).some((prior) => prior.type === "incident-held" && prior.holdId === event.holdId);
      if (!priorHold) note(event.resourceId, { code: "lifecycle.hold-missing", path: `${eventPath}.holdId`, message: "An incident release requires a prior matching hold." });
    }
    if (event.type === "review-revoked" && !review.scopedDecisionRefs.some((decision) => decision.decisionId === event.decisionId)) {
      note(event.resourceId, { code: "lifecycle.decision-missing", path: `${eventPath}.decisionId`, message: "A revoked decision must belong to the reviewed record." });
    }
    if (event.type === "observation-edited") {
      if (!observation || event.priorReviewSignalDigest !== review.observationRef.reviewSignalDigest || event.currentReviewSignalDigest !== observation.reviewSignalDigest) {
        note(event.resourceId, { code: "lifecycle.observation-edit-mismatch", path: eventPath, message: "An observation edit must bind the reviewed prior and current observation signals." });
      }
      if (observation && Date.parse(event.occurredAt) < Date.parse(observation.observedAt)) {
        note(event.resourceId, { code: "lifecycle.observation-edit-before-observation", path: `${eventPath}.occurredAt`, message: "An observation-edit transition cannot precede the current observation." });
      }
    }
  }

  const resourceIds = [...new Set([...observationById.keys(), ...reviewById.keys(), ...eventsByResource.keys()])].sort(resourceCodeUnitCompare);
  const projections: ResourceCatalogProjection[] = resourceIds.map((resourceId) => {
    const observation = observationById.get(resourceId);
    const review = reviewById.get(resourceId);
    const resourceIssues = orderedResourceIssues(issuesByResource.get(resourceId) ?? []);
    return {
      resourceId,
      observationRecordDigest: observation?.observationRecordDigest ?? null,
      reviewSignalDigest: observation?.reviewSignalDigest ?? null,
      reviewInputDigest: review?.reviewInputDigest ?? null,
      reviewRecordDigest: review?.reviewState === "reviewed" ? review.reviewRecordDigest : null,
      reviewState: review?.reviewState ?? "missing",
      lifecycle: lifecycleFor(review, observation, eventsByResource.get(resourceId) ?? [], asOfDate, resourceIssues.length > 0),
      disclosures: disclosureFor(observation),
      issueCodes: [...new Set(resourceIssues.map((issue) => issue.code))].sort(resourceCodeUnitCompare),
    };
  });
  const allIssues = orderedResourceIssues(issues);
  const catalogDigest = await sha256Digest(canonicalJson({
    schemaVersion: "resource-catalog-evaluation.v1",
    asOf,
    catalog,
    resources: projections,
    issueCodes: allIssues.map((issue) => issue.code),
  }));
  return deepFreeze({
    schemaVersion: "resource-catalog-evaluation.v1" as const,
    authority: "fixture-only-caller-asserted" as const,
    assignmentAllowed: false as const,
    runtimeAssignmentAllowed: false as const,
    asOf,
    catalog,
    catalogDigest,
    resources: projections,
    issues: allIssues,
  });
}

/** Export is deliberately digest/lifecycle-only: no raw learner text or provider response is retained. */
export function projectResourceCatalogAudit(evaluation: ResourceCatalogEvaluation): Readonly<ResourceCatalogAuditProjection> {
  return deepFreeze({
    schemaVersion: "resource-catalog-audit.v1" as const,
    authority: "fixture-only-caller-asserted" as const,
    assignmentAllowed: false as const,
    runtimeAssignmentAllowed: false as const,
    catalogDigest: evaluation.catalogDigest,
    resources: evaluation.resources.map((resource) => ({
      resourceId: resource.resourceId,
      observationRecordDigest: resource.observationRecordDigest,
      reviewRecordDigest: resource.reviewRecordDigest,
      lifecycle: resource.lifecycle,
      issueCodes: [...resource.issueCodes],
    })),
  });
}
