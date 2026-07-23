import { z } from "zod";

import { deepFreeze } from "./deep-freeze";
import { canonicalJson, forgeEventDigestSchema, sha256Digest } from "./events";
import {
  callerAssertedReleasedWorldAuthoritySchema,
  sourceAuthorityEvaluationSchema,
  type CallerAssertedReleasedWorldAuthorityV1,
  type SourceAuthorityEvaluationV1,
} from "./curriculum";
import type { ForgePlanContract } from "../lib/forge-planner/schema";

z.config({ jitless: true });

export const CAPABILITY_MAP_SCHEMA_VERSION = "capability-map.v1" as const;
export const CAPABILITY_MAP_PATCH_SCHEMA_VERSION = "capability-map-patch.v1" as const;
export const CAPABILITY_MAP_PREREQUISITE_DIRECTION = "dependent-to-prerequisite" as const;

const timestampSchema = z.string().datetime({ offset: true });
const semverSchema = z.string().regex(/^\d+\.\d+\.\d+$/);
const codeSchema = z.string().trim().min(1).max(160).regex(/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/);
const mapIdSchema = z.string().trim().max(160).regex(/^capability-map\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const mapNodeIdSchema = z.string().trim().max(160).regex(/^map-node\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const mapEdgeIdSchema = z.string().trim().max(160).regex(/^map-edge\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const mapRouteIdSchema = z.string().trim().max(160).regex(/^map-route\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const projectBindingIdSchema = z.string().trim().max(160).regex(/^project-binding\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const proofBindingIdSchema = z.string().trim().max(160).regex(/^proof-binding\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const capabilityIdSchema = z.string().trim().max(160).regex(/^capability\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const curriculumNodeIdSchema = z.string().trim().max(160).regex(/^curriculum-node\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const curriculumGapIdSchema = z.string().trim().max(160).regex(/^curriculum-gap\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);

function uniqueBy<T extends z.ZodTypeAny>(item: T, key: (entry: z.infer<T>) => string, minimum = 0, maximum = 256) {
  return z.array(item).min(minimum).max(maximum).superRefine((entries, context) => {
    const seen = new Set<string>();
    entries.forEach((entry, index) => {
      const value = key(entry);
      if (seen.has(value)) context.addIssue({ code: "custom", path: [index], message: `Duplicate identity: ${value}` });
      seen.add(value);
    });
  });
}

function uniqueStrings(item: z.ZodString, minimum = 0, maximum = 256) {
  return z.array(item).min(minimum).max(maximum).superRefine((entries, context) => {
    const seen = new Set<string>();
    entries.forEach((entry, index) => {
      if (seen.has(entry)) context.addIssue({ code: "custom", path: [index], message: `Duplicate value: ${entry}` });
      seen.add(entry);
    });
  });
}

export const immutableRefSchema = z.strictObject({
  id: codeSchema,
  version: semverSchema,
  digest: forgeEventDigestSchema,
});

const curriculumNodeRefSchema = z.strictObject({
  id: curriculumNodeIdSchema,
  capabilityId: capabilityIdSchema,
  capabilityVersion: semverSchema,
});

export const capabilityMapTargetRefSchema = z.discriminatedUnion("derivedAvailability", [
  z.strictObject({
    curriculumNodeId: curriculumNodeIdSchema,
    capabilityId: capabilityIdSchema,
    capabilityVersion: semverSchema,
    derivedAvailability: z.literal("released"),
    releasedWorldAuthority: callerAssertedReleasedWorldAuthoritySchema,
  }),
  z.strictObject({
    curriculumNodeId: curriculumNodeIdSchema,
    capabilityId: capabilityIdSchema,
    capabilityVersion: semverSchema,
    derivedAvailability: z.literal("review-candidate"),
  }),
  z.strictObject({
    curriculumNodeId: curriculumNodeIdSchema,
    capabilityId: capabilityIdSchema,
    capabilityVersion: semverSchema,
    derivedAvailability: z.literal("identified-gap"),
  }),
]);
export type CapabilityMapTargetRefV1 = z.infer<typeof capabilityMapTargetRefSchema>;

export const plannerGatewayReceiptSchema = z.strictObject({
  gateway: z.literal("forge-planner"),
  /** SHA-256 of the deterministic, model-disabled planner contract. */
  policyDecisionDigest: forgeEventDigestSchema,
  routeKind: z.enum(["grounded_learning", "exploratory_source_plan"]),
});
export type PlannerGatewayReceiptV1 = z.infer<typeof plannerGatewayReceiptSchema>;

/**
 * Produces the only accepted planner receipt. The digest is derived here from
 * the complete deterministic contract; callers cannot supply an assertion.
 */
export async function plannerGatewayReceiptFromPlan(plan: ForgePlanContract): Promise<Readonly<PlannerGatewayReceiptV1>> {
  if (plan.contractKind === "refusal") {
    throw new Error("A refused planner route cannot compile a capability map.");
  }
  return deepFreeze(plannerGatewayReceiptSchema.parse({
    gateway: "forge-planner",
    policyDecisionDigest: await sha256Digest(canonicalJson(plan)),
    routeKind: plan.contractKind,
  }));
}

const reviewedNodeSchema = z.strictObject({
  id: mapNodeIdSchema,
  kind: z.literal("reviewed_capability"),
  curriculumNodeRef: curriculumNodeRefSchema,
  required: z.boolean(),
  learnerFacingPurpose: z.string().trim().min(1).max(1_200),
});
const candidateNodeSchema = z.strictObject({
  id: mapNodeIdSchema,
  kind: z.literal("candidate_capability"),
  curriculumNodeRef: curriculumNodeRefSchema,
  candidateRef: z.strictObject({ id: codeSchema, proposalDigest: forgeEventDigestSchema }),
  learnerFacingPurpose: z.string().trim().min(1).max(1_200),
  limitationCodes: uniqueStrings(codeSchema, 1, 64),
});
const conceptNodeSchema = z.strictObject({
  id: mapNodeIdSchema,
  kind: z.literal("concept"),
  conceptCode: codeSchema,
  learnerFacingPurpose: z.string().trim().min(1).max(1_200),
});
const representationNodeSchema = z.strictObject({
  id: mapNodeIdSchema,
  kind: z.literal("representation"),
  representationRef: immutableRefSchema,
  learnerFacingPurpose: z.string().trim().min(1).max(1_200),
});
const practiceNodeSchema = z.strictObject({
  id: mapNodeIdSchema,
  kind: z.literal("practice"),
  practiceRef: immutableRefSchema,
  learnerFacingPurpose: z.string().trim().min(1).max(1_200),
});
const projectNodeSchema = z.strictObject({
  id: mapNodeIdSchema,
  kind: z.literal("project"),
  projectBindingRef: projectBindingIdSchema,
  learnerFacingPurpose: z.string().trim().min(1).max(1_200),
});
const proofNodeSchema = z.strictObject({
  id: mapNodeIdSchema,
  kind: z.literal("proof"),
  proofBindingRef: proofBindingIdSchema,
  learnerFacingPurpose: z.string().trim().min(1).max(1_200),
});
const gapNodeSchema = z.strictObject({
  id: mapNodeIdSchema,
  kind: z.literal("gap"),
  curriculumNodeRef: curriculumNodeRefSchema,
  gapRef: z.strictObject({ id: curriculumGapIdSchema }),
  learnerFacingPurpose: z.string().trim().min(1).max(1_200),
  limitationCodes: uniqueStrings(codeSchema, 1, 64),
});

export const capabilityMapNodeSchema = z.discriminatedUnion("kind", [
  reviewedNodeSchema,
  candidateNodeSchema,
  conceptNodeSchema,
  representationNodeSchema,
  practiceNodeSchema,
  projectNodeSchema,
  proofNodeSchema,
  gapNodeSchema,
]);
export type CapabilityMapNodeV1 = z.infer<typeof capabilityMapNodeSchema>;

/** A prerequisite edge always points from the dependent node to its prerequisite. */
export const capabilityMapEdgeSchema = z.strictObject({
  id: mapEdgeIdSchema,
  kind: z.enum(["prerequisite", "sequence", "supports", "route-option"]),
  fromNodeId: mapNodeIdSchema,
  toNodeId: mapNodeIdSchema,
  required: z.boolean(),
  consequenceOfSkipping: z.string().trim().min(1).max(1_200).optional(),
}).superRefine((edge, context) => {
  if (edge.required && !edge.consequenceOfSkipping) {
    context.addIssue({ code: "custom", path: ["consequenceOfSkipping"], message: "Required dependencies must explain the consequence of skipping them." });
  }
  if (!edge.required && edge.consequenceOfSkipping) {
    context.addIssue({ code: "custom", path: ["consequenceOfSkipping"], message: "Only required dependencies may declare a skip consequence." });
  }
  if (edge.kind === "prerequisite" && !edge.required) {
    context.addIssue({ code: "custom", path: ["required"], message: "Graph prerequisites are always required dependencies." });
  }
});
export type CapabilityMapEdgeV1 = z.infer<typeof capabilityMapEdgeSchema>;

export const routeOptionSchema = z.strictObject({
  id: mapRouteIdSchema,
  label: z.string().trim().min(1).max(240),
  optionalNodeIds: uniqueStrings(mapNodeIdSchema, 1, 128),
  /** Deliberate learner presentation order; it is therefore digest-significant. */
  orderedOptionalNodeIds: uniqueStrings(mapNodeIdSchema, 1, 128),
  reviewed: z.literal(true),
}).superRefine((route, context) => {
  const optional = new Set(route.optionalNodeIds);
  if (route.orderedOptionalNodeIds.length !== optional.size || route.orderedOptionalNodeIds.some((nodeId) => !optional.has(nodeId))) {
    context.addIssue({ code: "custom", path: ["orderedOptionalNodeIds"], message: "Route order must contain every reviewed optional node exactly once." });
  }
});
export type RouteOptionV1 = z.infer<typeof routeOptionSchema>;

export const projectBindingSchema = z.strictObject({
  id: projectBindingIdSchema,
  projectPackageRef: immutableRefSchema,
  targetNodeIds: uniqueStrings(mapNodeIdSchema, 1, 64),
  practicalOutcome: z.string().trim().min(1).max(1_200),
  noCostAlternativeRef: immutableRefSchema,
  safetyClass: z.literal("reviewed-low-risk"),
});
export type ProjectBindingV1 = z.infer<typeof projectBindingSchema>;

const independentEvidenceBindingSchema = z.strictObject({
  id: codeSchema,
  taskFamilyId: codeSchema,
  taskVersion: semverSchema,
  representation: z.enum(["new-context", "new-representation"]),
});
const plausibleReadingSchema = z.strictObject({
  id: codeSchema,
  learnerVisibleDescription: z.string().trim().min(1).max(1_200),
  prediction: z.string().trim().min(1).max(1_200),
});

export const proofBindingSchema = z.strictObject({
  id: proofBindingIdSchema,
  targetNodeId: mapNodeIdSchema,
  protectedOperation: z.string().trim().min(1).max(1_200),
  assistanceMode: z.literal("closed"),
  separatingExperienceRef: immutableRefSchema,
  plausibleReadings: z.tuple([plausibleReadingSchema, plausibleReadingSchema]),
  /** Exactly two distinct independent checks are required before any bounded claim. */
  independentEvidenceBindings: z.tuple([independentEvidenceBindingSchema, independentEvidenceBindingSchema]),
  returnIntervalDays: z.number().int().min(1).max(365),
  limitationCodes: uniqueStrings(codeSchema, 1, 64),
}).superRefine((binding, context) => {
  const [leftReading, rightReading] = binding.plausibleReadings;
  if (leftReading.id === rightReading.id ||
    leftReading.learnerVisibleDescription === rightReading.learnerVisibleDescription ||
    leftReading.prediction === rightReading.prediction) {
    context.addIssue({ code: "custom", path: ["plausibleReadings"], message: "The two plausible readings must differ in identity, description, and prediction." });
  }
  if (binding.independentEvidenceBindings[0].id === binding.independentEvidenceBindings[1].id ||
    binding.independentEvidenceBindings[0].taskFamilyId === binding.independentEvidenceBindings[1].taskFamilyId ||
    binding.independentEvidenceBindings[0].representation === binding.independentEvidenceBindings[1].representation) {
    context.addIssue({ code: "custom", path: ["independentEvidenceBindings"], message: "Exactly two independent proof bindings require distinct IDs, task families, and transfer representations." });
  }
});
export type ProofBindingV1 = z.infer<typeof proofBindingSchema>;

export const mapScopedDecisionRefSchema = z.strictObject({
  decisionId: codeSchema,
  reviewerIdentityRef: codeSchema,
  reviewerGrantRef: codeSchema,
  /** Contract marker only; trusted grant verification is W6-0 work. */
  authorityOrigin: z.literal("server-verified"),
  scope: z.enum(["domain-capability", "learning-sequence", "access", "safety-rights"]),
  outcome: z.enum(["accepted", "rejected", "withdrawn"]),
  inputDigest: forgeEventDigestSchema,
  evidenceDigest: forgeEventDigestSchema,
  decidedAt: timestampSchema,
  expiresAt: timestampSchema,
  independence: z.enum(["independent", "declared-conflict"]),
  supersedesDecisionId: codeSchema.optional(),
}).superRefine((decision, context) => {
  if (Date.parse(decision.expiresAt) <= Date.parse(decision.decidedAt)) {
    context.addIssue({ code: "custom", path: ["expiresAt"], message: "Decision expiry must follow its decision instant." });
  }
});
export type MapScopedDecisionRefV1 = z.infer<typeof mapScopedDecisionRefSchema>;

export const mapReviewRecordRefSchema = z.strictObject({
  id: codeSchema,
  version: semverSchema,
  digest: forgeEventDigestSchema,
  scopedDecisionIds: z.tuple([codeSchema]).rest(codeSchema),
  reviewedAt: timestampSchema,
  expiresAt: timestampSchema,
}).superRefine((record, context) => {
  if (Date.parse(record.expiresAt) <= Date.parse(record.reviewedAt)) {
    context.addIssue({ code: "custom", path: ["expiresAt"], message: "Review expiry must follow its review instant." });
  }
});
export type MapReviewRecordRefV1 = z.infer<typeof mapReviewRecordRefSchema>;

const mapBaseSchema = z.strictObject({
  schemaVersion: z.literal(CAPABILITY_MAP_SCHEMA_VERSION),
  mapId: mapIdSchema,
  version: semverSchema,
  mapDigest: forgeEventDigestSchema,
  audience: z.literal("adult"),
  intentRef: z.strictObject({ intentId: z.string().trim().max(160).regex(/^learning-intent\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/), sanitizedIntentDigest: forgeEventDigestSchema }),
  /** This must exactly equal the separately parsed, sanitized intent summary. */
  intentSummary: z.string().trim().min(1).max(1_200),
  plannerGatewayReceipt: plannerGatewayReceiptSchema,
  targetCapabilityRefs: uniqueBy(capabilityMapTargetRefSchema, (entry) => entry.curriculumNodeId, 1, 64),
  nodes: uniqueBy(capabilityMapNodeSchema, (entry) => entry.id, 1, 256),
  edges: uniqueBy(capabilityMapEdgeSchema, (entry) => entry.id, 0, 512),
  routeOptions: uniqueBy(routeOptionSchema, (entry) => entry.id, 0, 64),
  projectBindings: uniqueBy(projectBindingSchema, (entry) => entry.id, 0, 64),
  proofBindings: uniqueBy(proofBindingSchema, (entry) => entry.id, 0, 64),
  explicitGaps: uniqueBy(z.strictObject({ id: curriculumGapIdSchema, reasonCode: codeSchema, learnerFacingText: z.string().trim().min(1).max(1_200) }), (entry) => entry.id, 0, 256),
  sourceAuthorityEvaluations: uniqueBy(sourceAuthorityEvaluationSchema, (entry) => `${entry.packageId}@${entry.packageVersion}@${entry.packageDigest}`, 0, 256),
  createdFrom: z.strictObject({
    curriculumGraphRef: z.strictObject({
      id: z.string().trim().max(160).regex(/^curriculum-graph\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/),
      version: semverSchema,
      digest: forgeEventDigestSchema,
      policyRef: immutableRefSchema,
      sourceAuthorityRefs: uniqueBy(z.strictObject({ packageId: z.string().trim().max(160).regex(/^source-package\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/), packageVersion: semverSchema, packageDigest: forgeEventDigestSchema, minimumEvaluatedAsOf: timestampSchema }), (entry) => `${entry.packageId}@${entry.packageVersion}@${entry.packageDigest}`, 0, 256),
    }),
    graphValidationReceiptDigest: forgeEventDigestSchema,
    modelProposal: z.strictObject({
      proposalDigest: forgeEventDigestSchema,
      sanitizationPolicyRef: immutableRefSchema,
      containsOnlySanitizedIntent: z.literal(true),
    }).optional(),
  }),
});

const candidateMapSchema = mapBaseSchema.extend({
  reviewState: z.literal("candidate"),
  publication: z.strictObject({ status: z.literal("unpublished") }),
});
const reviewedMapSchema = mapBaseSchema.extend({
  reviewState: z.literal("reviewed"),
  mapReviewRecordRef: mapReviewRecordRefSchema,
  scopedDecisionRefs: uniqueBy(mapScopedDecisionRefSchema, (entry) => entry.decisionId, 4, 4),
  publication: z.strictObject({ status: z.literal("unpublished") }),
});
const publishedMapSchema = mapBaseSchema.extend({
  reviewState: z.literal("reviewed"),
  mapReviewRecordRef: mapReviewRecordRefSchema,
  scopedDecisionRefs: uniqueBy(mapScopedDecisionRefSchema, (entry) => entry.decisionId, 4, 4),
  publication: z.strictObject({
    status: z.literal("published"),
    publicationEventRef: codeSchema,
    publisherAuthorityRef: codeSchema,
    publisherAuthorityOrigin: z.literal("server-verified"),
    publishedAt: timestampSchema,
    expiresAt: timestampSchema,
  }),
});
const rejectedMapSchema = mapBaseSchema.extend({
  reviewState: z.literal("rejected"),
  rejectionDecisionRef: mapScopedDecisionRefSchema,
  publication: z.strictObject({ status: z.literal("unpublished") }),
});
const withdrawnMapSchema = mapBaseSchema.extend({
  reviewState: z.literal("withdrawn"),
  withdrawalDecisionRef: mapScopedDecisionRefSchema,
  publication: z.strictObject({ status: z.literal("unpublished") }),
});

export const capabilityMapPackageSchema = z.union([candidateMapSchema, reviewedMapSchema, publishedMapSchema, rejectedMapSchema, withdrawnMapSchema]);
export type CapabilityMapPackageV1 = z.infer<typeof capabilityMapPackageSchema>;
export type CapabilityMapPackageInput = CapabilityMapPackageV1 extends infer Map
  ? Map extends unknown
    ? Omit<Map, "mapDigest">
    : never
  : never;

const patchOperationSchema = z.discriminatedUnion("op", [
  z.strictObject({ op: z.literal("set-route-preference"), routeId: mapRouteIdSchema, rank: z.number().int().min(0).max(63) }),
  z.strictObject({ op: z.literal("select-optional-node"), nodeId: mapNodeIdSchema, selected: z.boolean() }),
  z.strictObject({ op: z.literal("request-reviewed-alternative"), nodeId: mapNodeIdSchema, reasonToken: codeSchema }),
  z.strictObject({ op: z.literal("propose-target-change"), targetCapabilityRef: z.string().trim().max(320) }),
  z.strictObject({ op: z.literal("propose-prerequisite-change"), edgeId: mapEdgeIdSchema, action: z.enum(["add", "remove"]) }),
  z.strictObject({ op: z.literal("propose-project-change"), projectBindingRef: projectBindingIdSchema }),
  z.strictObject({ op: z.literal("propose-proof-change"), proofBindingRef: proofBindingIdSchema }),
]);

export const capabilityMapPatchSchema = z.strictObject({
  schemaVersion: z.literal(CAPABILITY_MAP_PATCH_SCHEMA_VERSION),
  patchId: codeSchema,
  baseMapRef: z.strictObject({ mapId: mapIdSchema, version: semverSchema, mapDigest: forgeEventDigestSchema }),
  operations: z.array(patchOperationSchema).min(1).max(64),
  learnerActionRef: codeSchema,
  createdAt: timestampSchema,
  revalidation: z.discriminatedUnion("outcome", [
    z.strictObject({ outcome: z.literal("same-reviewed-package-route"), receiptDigest: forgeEventDigestSchema }),
    z.strictObject({ outcome: z.literal("candidate-revision-required"), candidateMapRef: z.strictObject({ mapId: mapIdSchema, version: semverSchema, mapDigest: forgeEventDigestSchema }) }),
    z.strictObject({ outcome: z.literal("rejected"), orderedReasonCodes: uniqueStrings(codeSchema, 1, 64) }),
  ]),
});
export type CapabilityMapPatchV1 = z.infer<typeof capabilityMapPatchSchema>;

const compare = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0;
const sortedStrings = <T extends string>(entries: readonly T[]): T[] => [...entries].sort(compare);
const sortById = <T extends { id: string }>(entries: readonly T[]) => [...entries].sort((left, right) => compare(left.id, right.id));
const sortByNodeId = <T extends { nodeId: string }>(entries: readonly T[]) => [...entries].sort((left, right) => compare(left.nodeId, right.nodeId));
const sourceKey = (entry: { packageId: string; packageVersion: string; packageDigest: string; minimumEvaluatedAsOf?: string }) =>
  `${entry.packageId}@${entry.packageVersion}@${entry.packageDigest}@${entry.minimumEvaluatedAsOf ?? ""}`;

function canonicalWorldAuthority(authority: CallerAssertedReleasedWorldAuthorityV1): CallerAssertedReleasedWorldAuthorityV1 {
  return {
    ...authority,
    taskFamilyIds: sortedStrings(authority.taskFamilyIds),
    sourceIds: sortedStrings(authority.sourceIds),
    reviewedEntitlementAreas: sortedStrings(authority.reviewedEntitlementAreas),
    reviewedAgeModes: sortedStrings(authority.reviewedAgeModes),
    reviewedDepthModes: sortedStrings(authority.reviewedDepthModes),
  };
}

function canonicalSourceAuthority(evaluation: SourceAuthorityEvaluationV1): SourceAuthorityEvaluationV1 {
  return {
    ...evaluation,
    invalidatedNodeIds: sortedStrings(evaluation.invalidatedNodeIds),
    invalidationReasonsByNodeId: sortByNodeId(evaluation.invalidationReasonsByNodeId)
      .map((entry) => ({ ...entry, reasons: sortedStrings(entry.reasons) })),
    reviewedSourceBindings: [...evaluation.reviewedSourceBindings]
      .sort((left, right) => compare(left.sourceItemId, right.sourceItemId))
      .map((entry) => ({
        ...entry,
        claimIds: sortedStrings(entry.claimIds),
        permittedProductUses: sortedStrings(entry.permittedProductUses),
        acceptedReviewScopes: sortedStrings(entry.acceptedReviewScopes),
      })),
  };
}

/**
 * Canonicalizes every set-valued collection. `orderedOptionalNodeIds` is the
 * sole ordered collection: it is an explicit learner-visible route order.
 */
export function canonicalCapabilityMapPayload(input: CapabilityMapPackageInput): object {
  const parsed = capabilityMapPackageSchema.parse({ ...input, mapDigest: `sha256:${"0".repeat(64)}` });
  const { mapDigest: _digest, ...unsigned } = parsed;
  void _digest;
  /** Lifecycle attestations bind this content digest and cannot hash themselves. */
  const lifecycleFree = "scopedDecisionRefs" in unsigned
    ? (() => {
        const { reviewState: _state, publication: _publication, mapReviewRecordRef: _review, scopedDecisionRefs: _decisions, ...content } = unsigned;
        void _state; void _publication; void _review; void _decisions;
        return content;
      })()
    : "rejectionDecisionRef" in unsigned
      ? (() => {
          const { reviewState: _state, publication: _publication, rejectionDecisionRef: _decision, ...content } = unsigned;
          void _state; void _publication; void _decision;
          return content;
        })()
      : "withdrawalDecisionRef" in unsigned
        ? (() => {
            const { reviewState: _state, publication: _publication, withdrawalDecisionRef: _decision, ...content } = unsigned;
            void _state; void _publication; void _decision;
            return content;
          })()
        : (() => {
            const { reviewState: _state, publication: _publication, ...content } = unsigned;
            void _state; void _publication;
            return content;
          })();
  return {
    ...lifecycleFree,
    targetCapabilityRefs: [...lifecycleFree.targetCapabilityRefs]
      .sort((left, right) => compare(left.curriculumNodeId, right.curriculumNodeId))
      .map((target) => target.derivedAvailability === "released"
        ? { ...target, releasedWorldAuthority: canonicalWorldAuthority(target.releasedWorldAuthority) }
        : target),
    nodes: sortById(lifecycleFree.nodes).map((node) => "limitationCodes" in node ? { ...node, limitationCodes: sortedStrings(node.limitationCodes) } : node),
    edges: sortById(lifecycleFree.edges),
    routeOptions: sortById(lifecycleFree.routeOptions).map((route) => ({ ...route, optionalNodeIds: sortedStrings(route.optionalNodeIds) })),
    projectBindings: sortById(lifecycleFree.projectBindings).map((binding) => ({ ...binding, targetNodeIds: sortedStrings(binding.targetNodeIds) })),
    proofBindings: sortById(lifecycleFree.proofBindings).map((binding) => ({
      ...binding,
      plausibleReadings: [...binding.plausibleReadings].sort((left, right) => compare(left.id, right.id)),
      independentEvidenceBindings: [...binding.independentEvidenceBindings].sort((left, right) => compare(left.id, right.id)),
      limitationCodes: sortedStrings(binding.limitationCodes),
    })),
    explicitGaps: sortById(lifecycleFree.explicitGaps),
    sourceAuthorityEvaluations: [...lifecycleFree.sourceAuthorityEvaluations]
      .sort((left, right) => compare(sourceKey(left), sourceKey(right)))
      .map(canonicalSourceAuthority),
    createdFrom: {
      ...lifecycleFree.createdFrom,
      curriculumGraphRef: {
        ...lifecycleFree.createdFrom.curriculumGraphRef,
        sourceAuthorityRefs: [...lifecycleFree.createdFrom.curriculumGraphRef.sourceAuthorityRefs].sort((left, right) => compare(sourceKey(left), sourceKey(right))),
      },
    },
  };
}

export async function capabilityMapDigest(input: CapabilityMapPackageInput): Promise<string> {
  return sha256Digest(canonicalJson(canonicalCapabilityMapPayload(input)));
}

export async function createCapabilityMapPackage(input: CapabilityMapPackageInput): Promise<Readonly<CapabilityMapPackageV1>> {
  const parsed = capabilityMapPackageSchema.parse({ ...input, mapDigest: `sha256:${"0".repeat(64)}` });
  const { mapDigest: _digest, ...unsigned } = parsed;
  void _digest;
  return deepFreeze(capabilityMapPackageSchema.parse({ ...unsigned, mapDigest: await capabilityMapDigest(unsigned) }));
}

export function parseCapabilityMapPatch(value: unknown): Readonly<CapabilityMapPatchV1> {
  return deepFreeze(capabilityMapPatchSchema.parse(value));
}

/** Deterministic human and machine exports contain only the sanitized map package. */
export function exportCapabilityMapPackage(value: unknown): Readonly<{ humanReadable: string; machineReadable: string }> {
  const map = capabilityMapPackageSchema.parse(value);
  const { mapDigest: _digest, ...unsigned } = map;
  void _digest;
  const targetLines = [...map.targetCapabilityRefs]
    .sort((left, right) => compare(left.curriculumNodeId, right.curriculumNodeId))
    .map((target) => `- ${target.curriculumNodeId}: ${target.derivedAvailability}`);
  const nodeLines = sortById(map.nodes).map((node) => `- ${node.id} (${node.kind}): ${node.learnerFacingPurpose}`);
  const edgeLines = sortById(map.edges).map((edge) => `- ${edge.id}: ${edge.fromNodeId} -> ${edge.toNodeId} (${edge.kind})`);
  return deepFreeze({
    humanReadable: [
      `Capability map ${map.mapId} v${map.version}`,
      `Audience: ${map.audience}`,
      `Sanitized intent: ${map.intentSummary}`,
      "Targets:",
      ...targetLines,
      "Nodes:",
      ...nodeLines,
      "Edges:",
      ...edgeLines,
    ].join("\n"),
    machineReadable: canonicalJson({ mapDigest: map.mapDigest, content: canonicalCapabilityMapPayload(unsigned) }),
  });
}

export type { CallerAssertedReleasedWorldAuthorityV1 };
