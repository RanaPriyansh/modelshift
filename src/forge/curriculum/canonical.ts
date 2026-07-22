import { canonicalJson, sha256Digest } from "../events";

import {
  curriculumGraphPackageSchema,
  curriculumGraphPolicySchema,
  type CurriculumGraphPackageInput,
  type CurriculumGraphPolicyInput,
} from "./contracts";

/** Deterministic Unicode code-unit ordering. Locale collation must never enter an identity digest. */
export function curriculumCodeUnitCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function strings(values: readonly string[]): readonly string[] {
  return [...values].sort(curriculumCodeUnitCompare);
}

function ids<T extends { id: string }>(values: readonly T[]): readonly T[] {
  return [...values].sort((left, right) => curriculumCodeUnitCompare(left.id, right.id));
}

/**
 * All graph arrays are canonicalized unless their schema calls their ordering
 * semantic. This graph declares no semantic collection ordering: prerequisite
 * records remain explicit through their stable IDs.
 */
export function canonicalCurriculumGraphPayload(input: CurriculumGraphPackageInput): object {
  const parsed = curriculumGraphPackageSchema.omit({ digest: true }).parse(input);
  return {
    schemaVersion: parsed.schemaVersion,
    id: parsed.id,
    version: parsed.version,
    policyRef: parsed.policyRef,
    sourceAuthorityRefs: [...parsed.sourceAuthorityRefs].sort((left, right) =>
      curriculumCodeUnitCompare(
        `${left.packageId}@${left.packageVersion}@${left.packageDigest}@${left.minimumEvaluatedAsOf}`,
        `${right.packageId}@${right.packageVersion}@${right.packageDigest}@${right.minimumEvaluatedAsOf}`,
      )),
    nodes: ids(parsed.nodes).map((node) => ({
      ...node,
      construct: { ...node.construct, exclusions: strings(node.construct.exclusions) },
      entitlementAreas: strings(node.entitlementAreas),
      positions: strings(node.positions),
      prerequisites: ids(node.prerequisites).map((edge) => ({
        ...edge,
        alternativeBindingIds: strings(edge.alternativeBindingIds),
        evidenceCondition: {
          ...edge.evidenceCondition,
          acceptedTaskFamilies: strings(edge.evidenceCondition.acceptedTaskFamilies),
          remainsUntestedCodes: strings(edge.evidenceCondition.remainsUntestedCodes),
        },
      })),
      alternatives: ids(node.alternatives).map((alternative) => ({
        ...alternative,
        appliesToEdgeIds: strings(alternative.appliesToEdgeIds),
        limitationCodes: strings(alternative.limitationCodes),
        alternativeSourceRefs: [...alternative.alternativeSourceRefs]
          .sort((left, right) => curriculumCodeUnitCompare(
            `${left.sourcePackageRef.id}@${left.sourcePackageRef.version}@${left.sourcePackageRef.digest}@${left.sourceItemId}`,
            `${right.sourcePackageRef.id}@${right.sourcePackageRef.version}@${right.sourcePackageRef.digest}@${right.sourceItemId}`,
          ))
          .map((reference) => ({ ...reference, claimIds: strings(reference.claimIds) })),
      })),
      supportedAgeModes: strings(node.supportedAgeModes),
      supportedDepthModes: strings(node.supportedDepthModes),
      accessRoutes: ids(node.accessRoutes).map((route) => ({
        ...route,
        replaces: strings(route.replaces),
        representationCodes: strings(route.representationCodes),
        interactionCodes: strings(route.interactionCodes),
        supportedAgeModes: strings(route.supportedAgeModes),
        supportedDepthModes: strings(route.supportedDepthModes),
        reviewClaimIds: strings(route.reviewClaimIds),
        limitationCodes: strings(route.limitationCodes),
      })),
      evidenceRequirement: {
        ...node.evidenceRequirement,
        taskFamilyIds: strings(node.evidenceRequirement.taskFamilyIds),
        acceptedEventTypes: strings(node.evidenceRequirement.acceptedEventTypes),
        remainsUntestedCodes: strings(node.evidenceRequirement.remainsUntestedCodes),
      },
      sourceRequirement: node.sourceRequirement.mode === "bound-source-authority"
        ? {
            ...node.sourceRequirement,
            requiredItemIds: strings(node.sourceRequirement.requiredItemIds),
            requiredClaimIds: strings(node.sourceRequirement.requiredClaimIds),
            requiredRightsIds: strings(node.sourceRequirement.requiredRightsIds),
            requiredProductUses: strings(node.sourceRequirement.requiredProductUses),
            requiredReviewScopes: strings(node.sourceRequirement.requiredReviewScopes),
          }
        : { ...node.sourceRequirement, sourceItemIds: strings(node.sourceRequirement.sourceItemIds) },
      worldBinding: node.worldBinding === null
        ? null
        : { ...node.worldBinding, taskFamilyIds: strings(node.worldBinding.taskFamilyIds), sourceIds: strings(node.worldBinding.sourceIds) },
      limitationCodes: strings(node.limitationCodes),
    })),
    gaps: ids(parsed.gaps).map((gap) => ({
      ...gap,
      nextReviewGateCodes: strings(gap.nextReviewGateCodes),
      prohibitedClaims: strings(gap.prohibitedClaims),
    })),
  };
}

export async function curriculumGraphDigest(input: CurriculumGraphPackageInput): Promise<string> {
  return sha256Digest(canonicalJson(canonicalCurriculumGraphPayload(input)));
}

export async function createCurriculumGraphPackage(input: CurriculumGraphPackageInput) {
  const parsed = curriculumGraphPackageSchema.omit({ digest: true }).parse(input);
  return curriculumGraphPackageSchema.parse({ ...parsed, digest: await curriculumGraphDigest(parsed) });
}

export function canonicalCurriculumGraphPolicyPayload(input: CurriculumGraphPolicyInput): object {
  const parsed = curriculumGraphPolicySchema.omit({ digest: true }).parse(input);
  return {
    schemaVersion: parsed.schemaVersion,
    id: parsed.id,
    version: parsed.version,
    publicationPolicyRef: parsed.publicationPolicyRef,
    requiredNonClaims: strings(parsed.requiredNonClaims),
  };
}

export async function curriculumGraphPolicyDigest(input: CurriculumGraphPolicyInput): Promise<string> {
  return sha256Digest(canonicalJson(canonicalCurriculumGraphPolicyPayload(input)));
}

export async function createCurriculumGraphPolicy(input: CurriculumGraphPolicyInput) {
  const parsed = curriculumGraphPolicySchema.omit({ digest: true }).parse(input);
  return curriculumGraphPolicySchema.parse({ ...parsed, digest: await curriculumGraphPolicyDigest(parsed) });
}
