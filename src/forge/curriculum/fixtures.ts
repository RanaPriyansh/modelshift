import { createCurriculumGraphPackage, createCurriculumGraphPolicy } from "./canonical";
import type { CurriculumGraphPackageInput, CurriculumGraphPolicyInput, CurriculumNodeV1 } from "./contracts";

const PUBLICATION_POLICY_REF = {
  id: "publication-policy.forge.current-worlds",
  version: "1.0.0",
  digest: `sha256:${"1".repeat(64)}`,
} as const;

export const NINE_AREA_GRAPH_POLICY_INPUT: CurriculumGraphPolicyInput = {
  schemaVersion: "1.0",
  id: "curriculum-policy.forge.nine-area.v1",
  version: "1.0.0",
  publicationPolicyRef: PUBLICATION_POLICY_REF,
  requiredNonClaims: ["does-not-establish-curriculum-sufficiency", "does-not-establish-homeschool-readiness"],
};

type LegacyBinding = NonNullable<CurriculumNodeV1["worldBinding"]>;

function legacyNode(input: {
  readonly id: string;
  readonly capabilityId: string;
  readonly title: string;
  readonly area: CurriculumNodeV1["entitlementAreas"][number];
  readonly ageModes: CurriculumNodeV1["supportedAgeModes"];
  readonly world: LegacyBinding;
}): CurriculumNodeV1 {
  return {
    id: input.id,
    capabilityId: input.capabilityId,
    capabilityVersion: "1.0.0",
    title: input.title,
    construct: {
      code: `construct.${input.id.slice("curriculum-node.".length)}`,
      statement: "A reviewed construct boundary is retained as authored text rather than inferred from a learner record.",
      learnerFacingPurpose: "Use the reviewed World to examine this construct and keep uncertainty visible.",
      exclusions: ["Does not establish broad area coverage or learner completion."],
    },
    entitlementAreas: [input.area],
    positions: ["foundation"],
    prerequisites: [],
    alternatives: [],
    supportedAgeModes: input.ageModes,
    supportedDepthModes: ["encounter", "working-model", "independent-transfer"],
    accessRoutes: [{
      id: `access-route.${input.id.slice("curriculum-node.".length)}.preserving`,
      effect: "construct-preserving",
      replaces: ["visual"],
      representationCodes: ["representation.text-description"],
      interactionCodes: ["interaction.keyboard"],
      supportedAgeModes: input.ageModes,
      supportedDepthModes: ["encounter", "working-model", "independent-transfer"],
      evidenceConditionCode: `access-evidence.${input.id.slice("curriculum-node.".length)}.preserving`,
      reviewClaimIds: [`source-claim.${input.id.slice("curriculum-node.".length)}.access`],
      limitationCodes: ["access.assistive-technology-session-not-established"],
    }],
    evidenceRequirement: {
      capabilityId: input.capabilityId,
      capabilityVersion: "1.0.0",
      claimCode: `claim.${input.id.slice("curriculum-node.".length)}.independent-transfer`,
      validatorRef: input.world.validatorRef,
      taskFamilyIds: input.world.taskFamilyIds,
      acceptedEventTypes: ["evidence.recorded"],
      minimumEvidenceTier: "grounded",
      supportPolicyRef: { id: "policy.forge.authored-support", version: "1.0.0" },
      accessPolicyRef: { id: "policy.forge.access", version: "1.0.0" },
      remainsUntestedCodes: ["evidence.delayed-transfer-not-established"],
    },
    sourceRequirement: {
      mode: "legacy-metadata-only",
      sourceItemIds: input.world.sourceIds,
      limitationCode: "source-authority.not-established",
      permittedForNewPublication: false,
    },
    worldBinding: input.world,
    proposedAvailability: "review-candidate",
    limitationCodes: ["curriculum.area-sufficiency-not-established"],
  };
}

const LEGACY_NODES: CurriculumNodeV1[] = [
  legacyNode({
    id: "curriculum-node.proportional-reasoning.compare-and-scale",
    capabilityId: "capability.proportional-reasoning.compare-and-scale",
    title: "Compare and scale proportional relationships",
    area: "mathematics",
    ageModes: ["under-13", "13-17", "18-plus"],
    world: {
      worldId: "world.proportional-reasoning",
      contentVersion: "1.0.0",
      packageIntegrityHash: "sha256:b8430668c5b061415aa5ec24bb8e62ae4a4e4c95a808c7a65b04e3ff78a8a353",
      runtimeBindingDigest: "sha256:b2f134f91ee9cd71750e19c8b440751bcf93415aec10a254e1b0ac491e8840c1",
      runtimeProtocolVersion: "1.1.0",
      validatorRef: { id: "validator.proportional-reasoning-transfer.v1", version: "1.0.0" },
      capabilityId: "capability.proportional-reasoning.compare-and-scale",
      taskFamilyIds: ["task-family.proportional-reasoning.map-scale-transfer.v1"],
      sourceIds: ["source.openstax.ratios-and-rate"],
      sourceProvenanceStatus: "legacy-metadata-only",
      route: "/learn/proportional-reasoning",
    },
  }),
  legacyNode({
    id: "curriculum-node.force-motion.zero-net-force",
    capabilityId: "capability.force-motion.zero-net-force",
    title: "Distinguish net force from velocity",
    area: "science",
    ageModes: ["13-17", "18-plus"],
    world: {
      worldId: "world.force-and-motion",
      contentVersion: "1.0.0",
      packageIntegrityHash: "sha256:975d00b8f7b7b25f2323a0ba2fe7712bcf6d5221212c86e67f0520021e76b783",
      runtimeBindingDigest: "sha256:9ac8b15244c5839abc4e0644564699a8b0b5fff9d7fc8603d6181fd739d85c54",
      runtimeProtocolVersion: "1.1.0",
      validatorRef: { id: "validator.force-motion-transfer.v1", version: "1.0.0" },
      capabilityId: "capability.force-motion.zero-net-force",
      taskFamilyIds: ["task-family.force-motion.cargo-pod-cold-transfer.v1"],
      sourceIds: ["source.openstax.newtons-first-law"],
      sourceProvenanceStatus: "legacy-metadata-only",
      route: "/learn/force-and-motion",
    },
  }),
  legacyNode({
    id: "curriculum-node.historical-literacy.observation-inference",
    capabilityId: "capability.historical-literacy.observation-inference",
    title: "Keep historical claims inside their evidence boundary",
    area: "history-source-reasoning",
    ageModes: ["under-13", "13-17", "18-plus"],
    world: {
      worldId: "world.primary-source-reasoning",
      contentVersion: "1.0.1",
      packageIntegrityHash: "sha256:f8c42959595156cf84ff300cfd523bc37824aceec38165bf875bab19e4b17419",
      runtimeBindingDigest: "sha256:b3401c71f330d82fdd31958af836683742c9e37f2f3d8cd6cf8f2a887f782029",
      runtimeProtocolVersion: "1.1.0",
      validatorRef: { id: "validator.primary-source-reasoning-transfer.v1", version: "1.0.0" },
      capabilityId: "capability.historical-literacy.observation-inference",
      taskFamilyIds: ["task-family.primary-source-reasoning.cold-transfer.v1"],
      sourceIds: ["source.loc.primary-source-analysis", "source.loc.picture.90706156", "source.loc.picture.2017716911"],
      sourceProvenanceStatus: "legacy-metadata-only",
      route: "/learn/primary-source-reasoning",
    },
  }),
  legacyNode({
    id: "curriculum-node.ai-literacy.source-corroboration",
    capabilityId: "capability.ai-literacy.source-corroboration",
    title: "Corroborate a model-generated factual claim",
    area: "computing-ai",
    ageModes: ["13-17", "18-plus"],
    world: {
      worldId: "world.source-corroboration",
      contentVersion: "1.0.0",
      packageIntegrityHash: "sha256:2f7900a0c3e7cfe5c993ec27b8071cc14d84dc605eef28cca041dc60b870f690",
      runtimeBindingDigest: "sha256:a172f067f6135bdcec13c66053ef250ef92692db734b60ddf8e396fb8b0dc4b5",
      runtimeProtocolVersion: "1.1.0",
      validatorRef: { id: "validator.source-corroboration-transfer.v1", version: "1.0.0" },
      capabilityId: "capability.ai-literacy.source-corroboration",
      taskFamilyIds: ["task-family.source-corroboration.cold-transfer.v1"],
      sourceIds: ["source.bastani-pnas.genai-learning-2025", "source.tutor-copilot.arxiv-2024"],
      sourceProvenanceStatus: "legacy-metadata-only",
      route: "/learn/ai-and-learning",
    },
  }),
];

const GAP_AREAS = ["language-literacy", "arts-design", "practical-life", "civic-media", "health-movement"] as const;

/** The acceptance oracle contains only the four retained release bindings and five visible area gaps. */
export async function createNineAreaCurriculumFixture() {
  const policy = await createCurriculumGraphPolicy(NINE_AREA_GRAPH_POLICY_INPUT);
  const graphInput: CurriculumGraphPackageInput = {
    schemaVersion: "1.0",
    id: "curriculum-graph.forge.nine-area-oracle",
    version: "1.0.0",
    policyRef: { id: policy.id, version: policy.version, digest: policy.digest },
    sourceAuthorityRefs: [],
    nodes: LEGACY_NODES,
    gaps: GAP_AREAS.map((entitlementArea) => ({
      id: `curriculum-gap.${entitlementArea}`,
      entitlementArea,
      constructNeeded: "A separately reviewed construct and exact World binding are still required.",
      reasonCode: "curriculum.reviewed-world-missing",
      learnerFacingText: "FORGE does not currently show a released reviewed World for this area.",
      nextReviewGateCodes: ["review.exact-world-binding-required"],
      prohibitedClaims: ["curriculum-sufficiency-not-established"],
    })),
  };
  return { policy, graph: await createCurriculumGraphPackage(graphInput) };
}

export { PUBLICATION_POLICY_REF };
