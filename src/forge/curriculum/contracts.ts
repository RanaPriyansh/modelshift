import { z } from "zod";

import { EVIDENCE_TIERS, LEARNER_AGE_MODES, routeSchema } from "../contracts";
import { forgeEventDigestSchema } from "../events";
import { PATHWAY_ENTITLEMENT_AREAS, type PathwayEntitlementArea } from "../pathways/contracts";

z.config({ jitless: true });

export const CURRICULUM_GRAPH_SCHEMA_VERSION = "1.0" as const;
export const CURRICULUM_CAPABILITY_POSITIONS = [
  "foundation",
  "chosen-frontier",
  "project-application",
  "relationship",
  "return-proof",
] as const;
export const CURRICULUM_AVAILABILITY = ["released", "review-candidate", "identified-gap"] as const;
export const CURRICULUM_DEPTH_MODES = ["encounter", "working-model", "independent-transfer", "return-proof"] as const;
export const CURRICULUM_ACCESS_EFFECTS = ["construct-preserving", "construct-changing"] as const;
export const CURRICULUM_ACCESS_REPLACEMENTS = [
  "visual",
  "audio",
  "drag",
  "speech",
  "fine-motor",
  "timed",
  "network",
  "material",
] as const;
export const CURRICULUM_NON_CLAIMS = [
  "does-not-establish-curriculum-sufficiency",
  "does-not-establish-homeschool-readiness",
] as const;

export type CurriculumCapabilityPosition = (typeof CURRICULUM_CAPABILITY_POSITIONS)[number];
export type CurriculumAvailability = (typeof CURRICULUM_AVAILABILITY)[number];
export type CurriculumDepthMode = (typeof CURRICULUM_DEPTH_MODES)[number];
export type CurriculumSourceAuthorityStatus =
  | "legacy-incomplete"
  | "bound-review-candidate"
  | "bound-incomplete"
  | "bound-invalidated";

const semverSchema = z.string().regex(/^\d+\.\d+\.\d+$/, "Use semantic versioning such as 1.0.0.");
const timestampSchema = z.string().datetime({ offset: true });
const boundedTextSchema = z.string().trim().min(1).max(1_200);
const codeSchema = z.string().trim().min(1).max(160).regex(/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/);
const capabilityIdSchema = z.string().max(160).regex(/^capability\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const graphIdSchema = z.string().max(160).regex(/^curriculum-graph\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const nodeIdSchema = z.string().max(160).regex(/^curriculum-node\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const edgeIdSchema = z.string().max(160).regex(/^curriculum-edge\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const alternativeIdSchema = z.string().max(160).regex(/^curriculum-alternative\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const accessRouteIdSchema = z.string().max(160).regex(/^access-route\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const gapIdSchema = z.string().max(160).regex(/^curriculum-gap\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const policyIdSchema = z.string().max(160).regex(/^curriculum-policy\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const publicationPolicyIdSchema = z.string().max(160).regex(/^publication-policy\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const sourcePackageIdSchema = z.string().max(160).regex(/^source-package\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const sourceItemIdSchema = z.string().max(160).regex(/^source\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const sourceClaimIdSchema = z.string().max(160).regex(/^source-claim\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const sourceRightsIdSchema = z.string().max(160).regex(/^source-rights\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const sourceReviewScopeSchema = z.enum([
  "acquisition-authenticity",
  "rights",
  "factual-epistemic",
  "pedagogy",
  "accessibility",
  "age-safety",
  "proof-design",
]);

function uniqueArray<T extends z.ZodTypeAny>(item: T, minimum = 0, maximum = 64) {
  return z.array(item).min(minimum).max(maximum).superRefine((values, context) => {
    const seen = new Set<unknown>();
    values.forEach((value, index) => {
      if (seen.has(value)) context.addIssue({ code: "custom", path: [index], message: `Duplicate value: ${String(value)}` });
      seen.add(value);
    });
  });
}

function uniqueByKey<T extends z.ZodTypeAny>(item: T, keyFor: (value: z.infer<T>) => string, minimum = 0, maximum = 64) {
  return z.array(item).min(minimum).max(maximum).superRefine((values, context) => {
    const seen = new Set<string>();
    values.forEach((value, index) => {
      const key = keyFor(value);
      if (seen.has(key)) context.addIssue({ code: "custom", path: [index], message: `Duplicate identity: ${key}` });
      seen.add(key);
    });
  });
}

const immutableRefSchema = z.strictObject({
  id: codeSchema,
  version: semverSchema,
  digest: forgeEventDigestSchema,
});

export const curriculumGraphPolicySchema = z.strictObject({
  schemaVersion: z.literal(CURRICULUM_GRAPH_SCHEMA_VERSION),
  id: policyIdSchema,
  version: semverSchema,
  publicationPolicyRef: z.strictObject({ id: publicationPolicyIdSchema, version: semverSchema, digest: forgeEventDigestSchema }),
  requiredNonClaims: uniqueArray(z.enum(CURRICULUM_NON_CLAIMS), CURRICULUM_NON_CLAIMS.length, CURRICULUM_NON_CLAIMS.length),
  digest: forgeEventDigestSchema,
});

export type CurriculumGraphPolicyV1 = z.infer<typeof curriculumGraphPolicySchema>;
export type CurriculumGraphPolicyInput = Omit<CurriculumGraphPolicyV1, "digest">;

export const curriculumPolicyReferenceSchema = z.strictObject({
  id: policyIdSchema,
  version: semverSchema,
  digest: forgeEventDigestSchema,
});

export const curriculumSourceAuthorityReferenceSchema = z.strictObject({
  packageId: sourcePackageIdSchema,
  packageVersion: semverSchema,
  packageDigest: forgeEventDigestSchema,
  /** Later append-only source lifecycle facts are valid; earlier snapshots are not. */
  minimumEvaluatedAsOf: timestampSchema,
});

const constructSchema = z.strictObject({
  code: codeSchema,
  statement: boundedTextSchema,
  learnerFacingPurpose: boundedTextSchema,
  exclusions: uniqueArray(boundedTextSchema, 1, 64),
});

const prerequisiteEvidenceConditionSchema = z.strictObject({
  requiredClaimCode: codeSchema,
  acceptedEvidenceTier: z.enum(EVIDENCE_TIERS),
  acceptedTaskFamilies: uniqueArray(codeSchema, 1, 64),
  remainsUntestedCodes: uniqueArray(codeSchema, 1, 64),
});

export const prerequisiteEdgeSchema = z.strictObject({
  id: edgeIdSchema,
  capabilityId: capabilityIdSchema,
  capabilityVersion: semverSchema,
  rationaleCode: codeSchema,
  explanation: boundedTextSchema,
  evidenceCondition: prerequisiteEvidenceConditionSchema,
  alternativeBindingIds: uniqueArray(alternativeIdSchema, 0, 64),
});
export type PrerequisiteEdgeV1 = z.infer<typeof prerequisiteEdgeSchema>;

export const alternativeBindingSchema = z.strictObject({
  id: alternativeIdSchema,
  kind: z.enum(["prerequisite-equivalent", "construct-route"]),
  capabilityId: capabilityIdSchema,
  capabilityVersion: semverSchema,
  appliesToEdgeIds: uniqueArray(edgeIdSchema, 0, 64),
  equivalence: z.enum(["reviewed-equivalent", "different-construct"]),
  limitationCodes: uniqueArray(codeSchema, 1, 64),
  sourceClaimIds: uniqueArray(sourceClaimIdSchema, 1, 64),
});
export type AlternativeBindingV1 = z.infer<typeof alternativeBindingSchema>;

export const accessRouteSchema = z.strictObject({
  id: accessRouteIdSchema,
  effect: z.enum(CURRICULUM_ACCESS_EFFECTS),
  replaces: uniqueArray(z.enum(CURRICULUM_ACCESS_REPLACEMENTS), 1, CURRICULUM_ACCESS_REPLACEMENTS.length),
  representationCodes: uniqueArray(codeSchema, 1, 64),
  interactionCodes: uniqueArray(codeSchema, 1, 64),
  /** The reviewed age/depth combinations this route can support. */
  supportedAgeModes: uniqueArray(z.enum(LEARNER_AGE_MODES), 1, LEARNER_AGE_MODES.length),
  supportedDepthModes: uniqueArray(z.enum(CURRICULUM_DEPTH_MODES), 1, CURRICULUM_DEPTH_MODES.length),
  evidenceConditionCode: codeSchema,
  reviewClaimIds: uniqueArray(sourceClaimIdSchema, 1, 64),
  limitationCodes: uniqueArray(codeSchema, 1, 64),
});
export type AccessRouteV1 = z.infer<typeof accessRouteSchema>;

export const evidenceRequirementSchema = z.strictObject({
  capabilityId: capabilityIdSchema,
  capabilityVersion: semverSchema,
  claimCode: codeSchema,
  validatorRef: z.strictObject({ id: codeSchema, version: semverSchema }),
  taskFamilyIds: uniqueArray(codeSchema, 1, 64),
  acceptedEventTypes: uniqueArray(z.enum(["evidence.recorded", "evidence.return_recorded"]), 1, 2),
  minimumEvidenceTier: z.enum(EVIDENCE_TIERS),
  supportPolicyRef: z.strictObject({ id: codeSchema, version: semverSchema }),
  accessPolicyRef: z.strictObject({ id: codeSchema, version: semverSchema }),
  remainsUntestedCodes: uniqueArray(codeSchema, 1, 64),
});
export type EvidenceRequirementV1 = z.infer<typeof evidenceRequirementSchema>;

export const boundSourceRequirementSchema = z.strictObject({
  mode: z.literal("bound-source-authority"),
  sourcePackageRef: immutableRefSchema.extend({ id: sourcePackageIdSchema }),
  requiredItemIds: uniqueArray(sourceItemIdSchema, 1, 64),
  requiredClaimIds: uniqueArray(sourceClaimIdSchema, 1, 64),
  requiredRightsIds: uniqueArray(sourceRightsIdSchema, 1, 64),
  requiredProductUses: uniqueArray(z.enum(["internal-review", "curriculum-authoring", "bounded-learner-display", "bounded-excerpt"]), 1, 4),
  requiredReviewScopes: uniqueArray(sourceReviewScopeSchema, 1, 7),
});
export const legacySourceRequirementSchema = z.strictObject({
  mode: z.literal("legacy-metadata-only"),
  sourceItemIds: uniqueArray(sourceItemIdSchema, 1, 64),
  limitationCode: z.literal("source-authority.not-established"),
  permittedForNewPublication: z.literal(false),
});
export const sourceRequirementSchema = z.discriminatedUnion("mode", [boundSourceRequirementSchema, legacySourceRequirementSchema]);
export type SourceRequirementV1 = z.infer<typeof sourceRequirementSchema>;

export const worldBindingSchema = z.strictObject({
  worldId: codeSchema,
  contentVersion: semverSchema,
  packageIntegrityHash: forgeEventDigestSchema,
  runtimeBindingDigest: forgeEventDigestSchema,
  runtimeProtocolVersion: semverSchema,
  validatorRef: z.strictObject({ id: codeSchema, version: semverSchema }),
  capabilityId: capabilityIdSchema,
  taskFamilyIds: uniqueArray(codeSchema, 1, 64),
  sourceIds: uniqueArray(sourceItemIdSchema, 1, 64),
  sourceProvenanceStatus: z.enum(["bound", "legacy-metadata-only", "mixed"]),
  route: routeSchema,
});
export type WorldBindingV1 = z.infer<typeof worldBindingSchema>;

export const curriculumNodeSchema = z.strictObject({
  id: nodeIdSchema,
  capabilityId: capabilityIdSchema,
  capabilityVersion: semverSchema,
  title: boundedTextSchema,
  construct: constructSchema,
  entitlementAreas: uniqueArray(z.enum(PATHWAY_ENTITLEMENT_AREAS), 1, PATHWAY_ENTITLEMENT_AREAS.length),
  positions: uniqueArray(z.enum(CURRICULUM_CAPABILITY_POSITIONS), 1, CURRICULUM_CAPABILITY_POSITIONS.length),
  prerequisites: uniqueByKey(prerequisiteEdgeSchema, (entry) => entry.id, 0, 64),
  alternatives: uniqueByKey(alternativeBindingSchema, (entry) => entry.id, 0, 64),
  supportedAgeModes: uniqueArray(z.enum(LEARNER_AGE_MODES), 1, LEARNER_AGE_MODES.length),
  supportedDepthModes: uniqueArray(z.enum(CURRICULUM_DEPTH_MODES), 1, CURRICULUM_DEPTH_MODES.length),
  accessRoutes: uniqueByKey(accessRouteSchema, (entry) => entry.id, 1, 64),
  evidenceRequirement: evidenceRequirementSchema,
  sourceRequirement: sourceRequirementSchema,
  worldBinding: worldBindingSchema.nullable(),
  proposedAvailability: z.enum(["review-candidate", "identified-gap"]),
  limitationCodes: uniqueArray(codeSchema, 1, 64),
}).superRefine((node, context) => {
  if (node.evidenceRequirement.capabilityId !== node.capabilityId || node.evidenceRequirement.capabilityVersion !== node.capabilityVersion) {
    context.addIssue({ code: "custom", path: ["evidenceRequirement"], message: "Evidence must bind the node's exact capability identity and version." });
  }
  if (node.worldBinding && node.worldBinding.capabilityId !== node.capabilityId) {
    context.addIssue({ code: "custom", path: ["worldBinding", "capabilityId"], message: "World binding must name the node capability." });
  }
  if (node.proposedAvailability === "identified-gap" && node.worldBinding !== null) {
    context.addIssue({ code: "custom", path: ["worldBinding"], message: "An identified gap cannot contain a World binding." });
  }
  if (node.proposedAvailability === "review-candidate" && node.worldBinding === null) {
    context.addIssue({ code: "custom", path: ["worldBinding"], message: "A review candidate needs an exact proposed World binding." });
  }
});
export type CurriculumNodeV1 = z.infer<typeof curriculumNodeSchema>;

export const curriculumGapSchema = z.strictObject({
  id: gapIdSchema,
  entitlementArea: z.enum(PATHWAY_ENTITLEMENT_AREAS),
  constructNeeded: boundedTextSchema,
  reasonCode: codeSchema,
  learnerFacingText: boundedTextSchema,
  nextReviewGateCodes: uniqueArray(codeSchema, 1, 64),
  prohibitedClaims: uniqueArray(codeSchema, 1, 64),
});
export type CurriculumGapV1 = z.infer<typeof curriculumGapSchema>;

export const curriculumGraphPackageSchema = z.strictObject({
  schemaVersion: z.literal(CURRICULUM_GRAPH_SCHEMA_VERSION),
  id: graphIdSchema,
  version: semverSchema,
  digest: forgeEventDigestSchema,
  policyRef: curriculumPolicyReferenceSchema,
  sourceAuthorityRefs: uniqueByKey(
    curriculumSourceAuthorityReferenceSchema,
    (entry) => `${entry.packageId}@${entry.packageVersion}@${entry.packageDigest}`,
    0,
    256,
  ),
  nodes: uniqueByKey(curriculumNodeSchema, (entry) => entry.id, 1, 256),
  gaps: uniqueByKey(curriculumGapSchema, (entry) => entry.id, 0, 256),
});
export type CurriculumGraphPackageV1 = z.infer<typeof curriculumGraphPackageSchema>;
export type CurriculumGraphPackageInput = Omit<CurriculumGraphPackageV1, "digest">;

export const releasedWorldAuthoritySchema = worldBindingSchema.extend({
  /** Reviewed authority grant; graph authors cannot expand area coverage on their own. */
  reviewedEntitlementAreas: uniqueArray(z.enum(PATHWAY_ENTITLEMENT_AREAS), 1, PATHWAY_ENTITLEMENT_AREAS.length),
  reviewedAgeModes: uniqueArray(z.enum(LEARNER_AGE_MODES), 1, LEARNER_AGE_MODES.length),
  reviewedDepthModes: uniqueArray(z.enum(CURRICULUM_DEPTH_MODES), 1, CURRICULUM_DEPTH_MODES.length),
  releaseStatus: z.literal("released"),
  availabilityStatus: z.enum(["available", "unavailable"]),
  releaseEventRef: codeSchema,
  publicationPolicyRef: z.strictObject({ id: publicationPolicyIdSchema, version: semverSchema, digest: forgeEventDigestSchema }),
  /** Only retained registry releases may carry legacy source metadata. */
  lifecycle: z.enum(["existing-registry-release", "new-publication-candidate"]),
});
export type ReleasedWorldAuthorityV1 = z.infer<typeof releasedWorldAuthoritySchema>;
export const releasedWorldAuthoritiesSchema = uniqueByKey(releasedWorldAuthoritySchema, (entry) => entry.worldId, 0, 256);

export const sourceAuthorityEvaluationSchema = z.strictObject({
  packageId: sourcePackageIdSchema,
  packageVersion: semverSchema,
  packageDigest: forgeEventDigestSchema,
  evaluatedAsOf: timestampSchema,
  status: z.enum(["review-candidate-complete", "review-candidate-incomplete"]),
  publicationAuthority: z.literal("not-established"),
  invalidatedNodeIds: uniqueArray(nodeIdSchema, 0, 256),
  invalidationReasonsByNodeId: uniqueByKey(z.strictObject({
    nodeId: nodeIdSchema,
    reasons: uniqueArray(codeSchema, 1, 64),
  }), (entry) => entry.nodeId, 0, 256),
  /** Exact replay-derived facts; this pure graph does not produce or verify them. */
  reviewedSourceBindings: uniqueByKey(z.strictObject({
    sourceItemId: sourceItemIdSchema,
    claimIds: uniqueArray(sourceClaimIdSchema, 0, 64),
    rightsRecordId: sourceRightsIdSchema,
    permittedProductUses: uniqueArray(z.enum(["internal-review", "curriculum-authoring", "bounded-learner-display", "bounded-excerpt"]), 1, 4),
    acceptedReviewScopes: uniqueArray(sourceReviewScopeSchema, 1, 7),
  }), (entry) => entry.sourceItemId, 0, 64),
}).superRefine((evaluation, context) => {
  const compare = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0;
  const invalidated = [...evaluation.invalidatedNodeIds].sort(compare);
  const reasonNodeIds = evaluation.invalidationReasonsByNodeId.map((entry) => entry.nodeId).sort(compare);
  if (invalidated.length !== reasonNodeIds.length || invalidated.some((nodeId, index) => nodeId !== reasonNodeIds[index])) {
    context.addIssue({ code: "custom", path: ["invalidationReasonsByNodeId"], message: "Invalidated node IDs must exactly equal invalidation-reason node IDs." });
  }
});
export type SourceAuthorityEvaluationV1 = z.infer<typeof sourceAuthorityEvaluationSchema>;
export const sourceAuthorityEvaluationsSchema = uniqueByKey(
  sourceAuthorityEvaluationSchema,
  (entry) => `${entry.packageId}@${entry.packageVersion}@${entry.packageDigest}`,
  0,
  256,
);

export const curriculumValidationInputSchema = z.strictObject({
  graph: z.unknown(),
  policy: z.unknown(),
  sourceAuthorities: z.array(z.unknown()).max(256),
  releasedWorldAuthorities: z.array(z.unknown()).max(256),
});

export type { PathwayEntitlementArea };
