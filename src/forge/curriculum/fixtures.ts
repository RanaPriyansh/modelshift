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
      reviewClaimIds: [],
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
      packageIntegrityHash: "sha256:f55197c4985ae4a2964f40411a2ded4c8519779ea8dab046ccc211a64e8fb0e4",
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
      packageIntegrityHash: "sha256:0b4ee9c6329d038e42903e009c74b18005c60a65fe32c2770130fdbd4f72e36e",
      runtimeBindingDigest: "sha256:318d3d0e0e6b98f7cbfbcce003e13b621346c5b6e0bf60bf72c904dd4ca8e597",
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
      packageIntegrityHash: "sha256:71e60e96a1a6cb9fbd117fc6516c2f0355744e546b315482e1d17604f13a3e6f",
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
      packageIntegrityHash: "sha256:4002e3f6868709f4dca81ce5909140d9bffa96470487ca052f3dd529f6b8a013",
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
