import { PATHWAY_ENTITLEMENT_AREAS, type PathwayEntitlementArea } from "../pathways/contracts";

import { CURRICULUM_NON_CLAIMS, type CurriculumAvailability, type CurriculumSourceAuthorityStatus } from "./contracts";
import { curriculumCodeUnitCompare } from "./canonical";
import type { ValidatedCurriculumGraph } from "./validate";

export interface NineAreaCoverageEntry {
  readonly area: PathwayEntitlementArea;
  readonly availability: Extract<CurriculumAvailability, "released" | "identified-gap">;
  readonly released: readonly { readonly capabilityId: string; readonly route: string }[];
  /** These are capability identities, never routes, learner selections, or rankings. */
  readonly reviewCandidateCapabilityIds: readonly string[];
  readonly gaps: readonly { readonly id: string; readonly nextReviewGateCodes: readonly string[] }[];
  readonly nonClaims: readonly (typeof CURRICULUM_NON_CLAIMS)[number][];
}

export interface CapabilityAvailabilityExplanation {
  readonly capabilityId: string;
  readonly capabilityVersion: string | null;
  readonly availability: CurriculumAvailability | null;
  readonly route: string | null;
  readonly sourceAuthorityStatus: CurriculumSourceAuthorityStatus | null;
  readonly sourceBinding: {
    readonly mode: "bound-source-authority" | "legacy-metadata-only";
    readonly status: CurriculumSourceAuthorityStatus;
    readonly reasonCodes: readonly string[];
  } | null;
  readonly worldBinding: {
    readonly worldId: string;
    readonly contentVersion: string;
    readonly packageIntegrityHash: string;
    readonly runtimeBindingDigest: string;
    readonly validatorId: string;
    /** Authored binding proposal only; the top-level route is null until release is derived. */
    readonly proposedRoute: string;
  } | null;
  readonly policyBinding: { readonly id: string; readonly version: string; readonly digest: string } | null;
  readonly releaseBinding: { readonly availability: CurriculumAvailability; readonly route: string | null } | null;
  readonly prerequisiteReasons: readonly { readonly id: string; readonly rationaleCode: string; readonly explanation: string }[];
  readonly alternatives: readonly { readonly id: string; readonly equivalence: string; readonly limitationCodes: readonly string[] }[];
  readonly accessEvidenceConditions: readonly { readonly routeId: string; readonly effect: string; readonly evidenceConditionCode: string }[];
  readonly authoredReasonCodes: readonly string[];
  readonly nonClaims: readonly (typeof CURRICULUM_NON_CLAIMS)[number][];
}

/** Returns the fixed Packet C order; a candidate never replaces or routes around a named gap. */
export function projectNineAreaCoverage(validated: ValidatedCurriculumGraph): readonly NineAreaCoverageEntry[] {
  const graph = validated.graph;
  return PATHWAY_ENTITLEMENT_AREAS.map((area) => {
    const authoredNodes = graph?.nodes.filter((node) => node.entitlementAreas.includes(area)) ?? [];
    const available = validated.nodes.filter((node) => authoredNodes.some((authored) => authored.id === node.nodeId));
    const released = available
      .filter((node) => node.availability === "released" && node.route !== null)
      .map((node) => ({ capabilityId: node.capabilityId, route: node.route! }))
      .sort((left, right) => curriculumCodeUnitCompare(left.capabilityId, right.capabilityId));
    const reviewCandidateCapabilityIds = available
      .filter((node) => node.availability === "review-candidate")
      .map((node) => node.capabilityId)
      .sort(curriculumCodeUnitCompare);
    const gaps = (graph?.gaps.filter((gap) => gap.entitlementArea === area) ?? [])
      .map((gap) => ({ id: gap.id, nextReviewGateCodes: [...gap.nextReviewGateCodes].sort(curriculumCodeUnitCompare) }))
      .sort((left, right) => curriculumCodeUnitCompare(left.id, right.id));
    return {
      area,
      availability: released.length > 0 ? "released" : "identified-gap",
      released,
      reviewCandidateCapabilityIds,
      gaps,
      nonClaims: CURRICULUM_NON_CLAIMS,
    };
  });
}

/** Explains only supplied graph and authority facts; it accepts no learner, ledger, rank, or selection input. */
export function explainCapabilityAvailability(validated: ValidatedCurriculumGraph, capabilityId: string): CapabilityAvailabilityExplanation {
  const node = validated.graph?.nodes.find((candidate) => candidate.capabilityId === capabilityId);
  const derived = validated.nodes.find((candidate) => candidate.capabilityId === capabilityId);
  if (!node || !derived) {
    return {
      capabilityId,
      capabilityVersion: null,
      availability: null,
      route: null,
      sourceAuthorityStatus: null,
      sourceBinding: null,
      worldBinding: null,
      policyBinding: null,
      releaseBinding: null,
      prerequisiteReasons: [],
      alternatives: [],
      accessEvidenceConditions: [],
      authoredReasonCodes: [],
      nonClaims: CURRICULUM_NON_CLAIMS,
    };
  }
  return {
    capabilityId: node.capabilityId,
    capabilityVersion: node.capabilityVersion,
    availability: derived.availability,
    route: derived.route,
    sourceAuthorityStatus: derived.sourceAuthorityStatus,
    sourceBinding: {
      mode: node.sourceRequirement.mode,
      status: derived.sourceAuthorityStatus,
      reasonCodes: derived.reasons.filter((reason) => reason.startsWith("source.")).sort(curriculumCodeUnitCompare),
    },
    worldBinding: node.worldBinding === null ? null : {
      worldId: node.worldBinding.worldId,
      contentVersion: node.worldBinding.contentVersion,
      packageIntegrityHash: node.worldBinding.packageIntegrityHash,
      runtimeBindingDigest: node.worldBinding.runtimeBindingDigest,
      validatorId: node.worldBinding.validatorRef.id,
      proposedRoute: node.worldBinding.route,
    },
    policyBinding: validated.graph?.policyRef ?? null,
    releaseBinding: { availability: derived.availability, route: derived.route },
    prerequisiteReasons: [...node.prerequisites]
      .sort((left, right) => curriculumCodeUnitCompare(left.id, right.id))
      .map((edge) => ({ id: edge.id, rationaleCode: edge.rationaleCode, explanation: edge.explanation })),
    alternatives: [...node.alternatives]
      .sort((left, right) => curriculumCodeUnitCompare(left.id, right.id))
      .map((alternative) => ({
        id: alternative.id,
        equivalence: alternative.equivalence,
        limitationCodes: [...alternative.limitationCodes].sort(curriculumCodeUnitCompare),
      })),
    accessEvidenceConditions: [...node.accessRoutes]
      .sort((left, right) => curriculumCodeUnitCompare(left.id, right.id))
      .map((route) => ({ routeId: route.id, effect: route.effect, evidenceConditionCode: route.evidenceConditionCode })),
    authoredReasonCodes: [...derived.reasons].sort(curriculumCodeUnitCompare),
    nonClaims: CURRICULUM_NON_CLAIMS,
  };
}
