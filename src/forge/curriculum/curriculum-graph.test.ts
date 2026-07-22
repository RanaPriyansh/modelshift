import { describe, expect, it } from "vitest";

import { canonicalJson, sha256Digest } from "../events";
import { BUILT_IN_WORLD_PACKS } from "../worlds";
import {
  createCurriculumGraphPackage,
  createCurriculumGraphPolicy,
  createNineAreaCurriculumFixture,
  callerAssertedReleasedWorldAuthoritiesSchema,
  curriculumGraphPackageSchema,
  explainCapabilityAvailability,
  projectNineAreaCoverage,
  sourceAuthorityEvaluationsSchema,
  validateCurriculumGraph,
  type CurriculumGraphPackageV1,
  type CurriculumNodeV1,
  type CallerAssertedReleasedWorldAuthorityV1,
  type SourceAuthorityEvaluationV1,
} from "./index";

type Fixture = Awaited<ReturnType<typeof createNineAreaCurriculumFixture>>;

function clone<T>(value: T): T {
  return structuredClone(value);
}

async function repackage(graph: CurriculumGraphPackageV1, change: (input: Omit<CurriculumGraphPackageV1, "digest">) => void) {
  const { digest: _digest, ...input } = clone(graph);
  void _digest;
  change(input);
  return createCurriculumGraphPackage(input);
}

/** Test-only caller-asserted snapshot builder. Production graph code has no trusted registry/source adapter. */
function testOnlyCurrentAuthorities(fixture: Fixture): readonly CallerAssertedReleasedWorldAuthorityV1[] {
  return fixture.graph.nodes.map((node) => ({
    ...node.worldBinding!,
    reviewedEntitlementAreas: node.entitlementAreas,
    reviewedAgeModes: node.supportedAgeModes,
    reviewedDepthModes: node.supportedDepthModes,
    releaseStatus: "released" as const,
    availabilityStatus: "available" as const,
    releaseEventRef: `release-event.${node.worldBinding!.worldId.slice("world.".length)}`,
    publicationPolicyRef: fixture.policy.publicationPolicyRef,
    lifecycle: "existing-registry-release" as const,
  }));
}

async function validateFixture(
  fixture: Fixture,
  options: {
    readonly graph?: unknown;
    readonly policy?: unknown;
    readonly sourceAuthorities?: readonly unknown[];
    readonly authorities?: readonly unknown[];
  } = {},
) {
  return validateCurriculumGraph({
    graph: options.graph ?? fixture.graph,
    policy: options.policy ?? fixture.policy,
    sourceAuthorities: options.sourceAuthorities ?? [],
    callerAssertedReleasedWorldAuthorities: options.authorities ?? testOnlyCurrentAuthorities(fixture),
  });
}

function derivedNode(result: Awaited<ReturnType<typeof validateCurriculumGraph>>, capabilityId: string) {
  const node = result.nodes.find((candidate) => candidate.capabilityId === capabilityId);
  if (!node) throw new Error(`Missing derived node ${capabilityId}`);
  return node;
}

function edge(id: string, capabilityId: string): CurriculumNodeV1["prerequisites"][number] {
  return {
    id,
    capabilityId,
    capabilityVersion: "1.0.0",
    rationaleCode: "rationale.reviewed-construct-dependency",
    explanation: "This explicit authored construct dependency is not a learner sequence.",
    evidenceCondition: {
      requiredClaimCode: "claim.prerequisite-reviewed",
      acceptedEvidenceTier: "grounded",
      acceptedTaskFamilies: ["task-family.prerequisite-reviewed"],
      remainsUntestedCodes: ["evidence.prerequisite-not-evaluated"],
    },
    alternativeBindingIds: [],
  };
}

async function boundCandidateFixture(fixture: Fixture) {
  const graph = await repackage(fixture.graph, (input) => {
    const node = input.nodes[0]!;
    const sourcePackageRef = {
      id: "source-package.curriculum-bound",
      version: "1.0.0",
      digest: `sha256:${"2".repeat(64)}`,
    } as const;
    node.sourceRequirement = {
      mode: "bound-source-authority",
      sourcePackageRef,
      requiredItemIds: ["source.bound-item"],
      requiredClaimIds: ["source-claim.bound-item.support"],
      requiredRightsIds: ["source-rights.bound-item"],
      requiredProductUses: ["curriculum-authoring"],
      requiredReviewScopes: ["rights", "factual-epistemic"],
    };
    node.worldBinding = {
      ...node.worldBinding!,
      sourceIds: ["source.bound-item"],
      sourceProvenanceStatus: "bound",
    };
    node.evidenceRequirement.taskFamilyIds = [...node.worldBinding.taskFamilyIds];
    node.accessRoutes[0]!.reviewClaimIds = ["source-claim.bound-item.support"];
    input.sourceAuthorityRefs = [{
      packageId: sourcePackageRef.id,
      packageVersion: sourcePackageRef.version,
      packageDigest: sourcePackageRef.digest,
      minimumEvaluatedAsOf: "2026-07-23T00:00:00.000Z",
    }];
  });
  const node = graph.nodes[0]!;
  const authority = {
    ...node.worldBinding!,
    reviewedEntitlementAreas: node.entitlementAreas,
    reviewedAgeModes: node.supportedAgeModes,
    reviewedDepthModes: node.supportedDepthModes,
    releaseStatus: "released" as const,
    availabilityStatus: "available" as const,
    releaseEventRef: "release-event.bound-candidate",
    publicationPolicyRef: fixture.policy.publicationPolicyRef,
    lifecycle: "new-publication-candidate" as const,
  };
  const sourceAuthority: SourceAuthorityEvaluationV1 = {
    packageId: "source-package.curriculum-bound",
    packageVersion: "1.0.0",
    packageDigest: `sha256:${"2".repeat(64)}`,
    evaluatedAsOf: "2026-07-23T00:00:00.000Z",
    status: "review-candidate-complete",
    publicationAuthority: "not-established",
    invalidatedNodeIds: [],
    invalidationReasonsByNodeId: [],
    reviewedSourceBindings: [{
      sourceItemId: "source.bound-item",
      claimIds: ["source-claim.bound-item.support"],
      rightsRecordId: "source-rights.bound-item",
      permittedProductUses: ["curriculum-authoring"],
      acceptedReviewScopes: ["rights", "factual-epistemic"],
    }],
  };
  const authorities = testOnlyCurrentAuthorities(fixture).map((candidate, index) => index === 0 ? authority : candidate);
  return { graph, sourceAuthority, authorities, node };
}

describe("W5-D immutable curriculum graph", () => {
  it("1. canonicalizes semantic sets with code-unit ordering and rejects same-ID payload mutation", async () => {
    const fixture = await createNineAreaCurriculumFixture();
    const permuted = await repackage(fixture.graph, (input) => {
      input.nodes.reverse();
      input.gaps.reverse();
      for (const node of input.nodes) {
        node.entitlementAreas.reverse();
        node.positions.reverse();
        node.supportedAgeModes.reverse();
        node.supportedDepthModes.reverse();
        node.limitationCodes.reverse();
        node.accessRoutes.reverse();
      }
    });
    expect(permuted.digest).toBe(fixture.graph.digest);
    const mutated = clone(fixture.graph);
    mutated.nodes[0]!.title = "A different payload under the same identity";
    expect((await validateFixture(fixture, { graph: mutated })).issues.some((entry) => entry.code === "graph.digest-mismatch")).toBe(true);
  });

  it("2. makes policy content-addressed and rejects same-ID policy mutation", async () => {
    const fixture = await createNineAreaCurriculumFixture();
    const changedPolicy = clone(fixture.policy);
    changedPolicy.publicationPolicyRef.digest = `sha256:${"3".repeat(64)}`;
    const validated = await validateFixture(fixture, { policy: changedPolicy });
    expect(validated.issues.map((entry) => entry.code)).toContain("policy.digest-mismatch");
    const { digest: _digest, ...policyInput } = fixture.policy;
    void _digest;
    const rebuilt = await createCurriculumGraphPolicy({ ...policyInput, publicationPolicyRef: changedPolicy.publicationPolicyRef });
    expect(rebuilt.digest).not.toBe(fixture.policy.digest);
  });

  it("3. rejects duplicate cloned identities and forbidden raw learner/model/ranking fields", async () => {
    const fixture = await createNineAreaCurriculumFixture();
    const duplicate = clone(fixture.graph);
    duplicate.nodes.push(clone(duplicate.nodes[0]!));
    expect(curriculumGraphPackageSchema.safeParse(duplicate).success).toBe(false);
    const raw = clone(fixture.graph) as Record<string, unknown>;
    raw.learnerResponse = "private learner text";
    expect((await validateFixture(fixture, { graph: raw })).issues.some((entry) => entry.code === "graph.schema-invalid")).toBe(true);
    for (const forbidden of ["modelOutput", "score", "ranking", "gradeLevel", "seatTime", "hiddenWeight"]) {
      const candidate = clone(fixture.graph) as Record<string, unknown>;
      candidate[forbidden] = "forbidden";
      expect(curriculumGraphPackageSchema.safeParse(candidate).success).toBe(false);
    }
  });

  it("4. finds missing, self, two-node, long, disconnected, and alternative-equivalence cycles deterministically", async () => {
    const fixture = await createNineAreaCurriculumFixture();
    const graph = await repackage(fixture.graph, (input) => {
      input.nodes[0]!.prerequisites = [edge("curriculum-edge.long-a", input.nodes[1]!.capabilityId)];
      input.nodes[1]!.prerequisites = [edge("curriculum-edge.long-b", input.nodes[2]!.capabilityId)];
      input.nodes[2]!.prerequisites = [edge("curriculum-edge.long-c", input.nodes[0]!.capabilityId)];
      input.nodes[3]!.prerequisites = [edge("curriculum-edge.self", input.nodes[3]!.capabilityId), edge("curriculum-edge.missing", "capability.absent")];
      input.nodes[0]!.alternatives = [{
        id: "curriculum-alternative.to-science",
        kind: "prerequisite-equivalent",
        capabilityId: input.nodes[1]!.capabilityId,
        capabilityVersion: "1.0.0",
        appliesToEdgeIds: ["curriculum-edge.long-a"],
        equivalence: "reviewed-equivalent",
        limitationCodes: ["alternative.review-limited"],
        alternativeSourceRefs: [{
          sourcePackageRef: { id: "source-package.fixture.alternative", version: "1.0.0", digest: `sha256:${"5".repeat(64)}` },
          sourceItemId: "source.fixture.alternative",
          claimIds: ["source-claim.fixture.alternative"],
        }],
      }];
      input.nodes[1]!.alternatives = [{
        id: "curriculum-alternative.to-math",
        kind: "prerequisite-equivalent",
        capabilityId: input.nodes[0]!.capabilityId,
        capabilityVersion: "1.0.0",
        appliesToEdgeIds: ["curriculum-edge.long-b"],
        equivalence: "reviewed-equivalent",
        limitationCodes: ["alternative.review-limited"],
        alternativeSourceRefs: [{
          sourcePackageRef: { id: "source-package.fixture.alternative", version: "1.0.0", digest: `sha256:${"5".repeat(64)}` },
          sourceItemId: "source.fixture.alternative",
          claimIds: ["source-claim.fixture.alternative-two"],
        }],
      }];
    });
    const first = await validateFixture(fixture, { graph });
    const second = await validateFixture(fixture, { graph });
    expect(first.cyclePaths).toEqual(second.cyclePaths);
    expect(first.issues.map((entry) => entry.code)).toContain("graph.prerequisite-missing");
    expect(first.cyclePaths.some((path) => path.length === 4)).toBe(true);
    expect(first.cyclePaths.some((path) => path.length === 2 && path[0] === graph.nodes[3]!.id)).toBe(true);
  });

  it("5. projects four exact retained World matches only as caller-asserted and keeps legacy source truth", async () => {
    const fixture = await createNineAreaCurriculumFixture();
    const packs = new Map(BUILT_IN_WORLD_PACKS.map((pack) => [pack.manifest.id, pack]));
    for (const node of fixture.graph.nodes) {
      const pack = packs.get(node.worldBinding!.worldId)!;
      expect(await sha256Digest(canonicalJson(pack))).toBe(node.worldBinding!.packageIntegrityHash);
      expect(await sha256Digest(canonicalJson(pack.runtime))).toBe(node.worldBinding!.runtimeBindingDigest);
      expect(node.supportedAgeModes).toEqual(pack.manifest.ageModes);
      expect(node.supportedDepthModes).not.toContain("return-proof");
      expect(node.positions).not.toContain("return-proof");
      expect(pack.runtime?.returnProof.enabled).toBe(false);
    }
    const validated = await validateFixture(fixture);
    expect(validated.nodes.filter((node) => node.availability === "caller-asserted-release")).toHaveLength(4);
    expect(validated.nodes.every((node) => node.authorityTrust === "caller-asserted-unverified" && node.route === null)).toBe(true);
    expect(JSON.stringify(validated)).not.toContain('"availability":"released"');
    const projectedMatches = projectNineAreaCoverage(validated).flatMap((entry) => entry.callerAssertedReleaseMatches);
    expect(projectedMatches.every((entry) => entry.routableRoute === null)).toBe(true);
    expect(projectedMatches.every((entry) => entry.proposedRoute.trim().length > 0)).toBe(true);
    expect(validated.nodes.every((node) => node.sourceAuthorityStatus === "legacy-incomplete")).toBe(true);
    const stale = clone(testOnlyCurrentAuthorities(fixture));
    stale[0]!.runtimeBindingDigest = `sha256:${"a".repeat(64)}`;
    expect(derivedNode(await validateFixture(fixture, { authorities: stale }), "capability.proportional-reasoning.compare-and-scale").availability).toBe("review-candidate");
  });

  it("6. fails closed for exact World, validator, task-family, source, route, policy, unavailable-release, and entitlement changes", async () => {
    const fixture = await createNineAreaCurriculumFixture();
    const fields = [
      "worldId", "validator", "task", "source", "route", "packageIntegrityHash", "runtimeBindingDigest", "sourceProvenanceStatus",
    ] as const;
    for (const field of fields) {
      const authorities = clone(testOnlyCurrentAuthorities(fixture));
      const authority = authorities[0]! as Record<string, unknown>;
      if (field === "validator") authority.validatorRef = { id: "validator.changed", version: "1.0.0" };
      else if (field === "task") authority.taskFamilyIds = ["task-family.changed"];
      else if (field === "source") authority.sourceIds = ["source.changed"];
      else if (field === "route") authority.route = "/learn/changed";
      else if (field === "sourceProvenanceStatus") authority.sourceProvenanceStatus = "bound";
      else authority[field] = field === "worldId" ? "world.changed" : `sha256:${"b".repeat(64)}`;
      expect(derivedNode(await validateFixture(fixture, { authorities }), "capability.proportional-reasoning.compare-and-scale").availability).toBe("review-candidate");
    }
    const unavailable = clone(testOnlyCurrentAuthorities(fixture));
    unavailable[0]!.availabilityStatus = "unavailable";
    expect(derivedNode(await validateFixture(fixture, { authorities: unavailable }), "capability.proportional-reasoning.compare-and-scale").availability).toBe("review-candidate");
  });

  it("7. keeps candidate and gap visible, projects exactly nine canonical entries, and never routes a candidate", async () => {
    const fixture = await createNineAreaCurriculumFixture();
    const graph = await repackage(fixture.graph, (input) => {
      input.gaps.push({
        id: "curriculum-gap.mathematics.review-candidate",
        entitlementArea: "mathematics",
        constructNeeded: "A released exact binding is still required.",
        reasonCode: "curriculum.world-authority-missing",
        learnerFacingText: "This candidate is not a released route.",
        nextReviewGateCodes: ["review.release-authority-required"],
        prohibitedClaims: ["curriculum-sufficiency-not-established"],
      });
    });
    const authorities = testOnlyCurrentAuthorities(fixture).slice(1);
    const validated = await validateFixture(fixture, { graph, authorities });
    const coverage = projectNineAreaCoverage(validated);
    const mathematics = coverage.find((entry) => entry.area === "mathematics")!;
    expect(coverage.map((entry) => entry.area)).toEqual([
      "language-literacy", "mathematics", "science", "history-source-reasoning", "computing-ai", "arts-design", "practical-life", "civic-media", "health-movement",
    ]);
    expect(mathematics.reviewCandidateCapabilityIds).toEqual(["capability.proportional-reasoning.compare-and-scale"]);
    expect(mathematics.gaps).toHaveLength(1);
    expect(mathematics.callerAssertedReleaseMatches).toEqual([]);
    expect(coverage.find((entry) => entry.area === "civic-media")!.callerAssertedReleaseMatches).toEqual([]);
  });

  it("8. rejects missing age/depth access, exposes construct-changing conditions, and never interprets learner evidence", async () => {
    const fixture = await createNineAreaCurriculumFixture();
    const graph = await repackage(fixture.graph, (input) => {
      input.nodes[0]!.accessRoutes[0]!.supportedDepthModes = ["encounter"];
      input.nodes[1]!.accessRoutes[0]!.effect = "construct-changing";
      input.nodes[1]!.accessRoutes[0]!.evidenceConditionCode = "access-evidence.force-motion.changed";
    });
    const validated = await validateFixture(fixture, { graph });
    expect(derivedNode(validated, "capability.proportional-reasoning.compare-and-scale").availability).toBe("review-candidate");
    expect(explainCapabilityAvailability(validated, "capability.force-motion.zero-net-force").accessEvidenceConditions[0]!.effect).toBe("construct-changing");
  });

  it("9. returns authored deterministic explanations without recommendation, best, or score language", async () => {
    const fixture = await createNineAreaCurriculumFixture();
    const explanation = explainCapabilityAvailability(await validateFixture(fixture), "capability.proportional-reasoning.compare-and-scale");
    const rendered = JSON.stringify(explanation).toLowerCase();
    expect(rendered).not.toContain("recommend");
    expect(rendered).not.toContain("best");
    expect(rendered).not.toContain("score");
    expect(explanation.route).toBeNull();
    expect(explanation.worldBinding?.proposedRoute).toBe("/learn/proportional-reasoning");
    expect(explanation.authorityTrust).toBe("caller-asserted-unverified");
  });

  it("10. treats complete source review as non-publication until an exact release authority is supplied", async () => {
    const fixture = await createNineAreaCurriculumFixture();
    const bound = await boundCandidateFixture(fixture);
    const withoutAuthority = await validateFixture(fixture, {
      graph: bound.graph,
      sourceAuthorities: [bound.sourceAuthority],
      authorities: testOnlyCurrentAuthorities(fixture).slice(1),
    });
    expect(derivedNode(withoutAuthority, bound.node.capabilityId).availability).toBe("review-candidate");
    expect(derivedNode(withoutAuthority, bound.node.capabilityId).route).toBeNull();
    const released = await validateFixture(fixture, { graph: bound.graph, sourceAuthorities: [bound.sourceAuthority], authorities: bound.authorities });
    expect(derivedNode(released, bound.node.capabilityId).availability).toBe("caller-asserted-release");
    expect(derivedNode(released, bound.node.capabilityId).route).toBeNull();
    expect(derivedNode(released, bound.node.capabilityId).sourceAuthorityStatus).toBe("bound-review-candidate");
  });

  it("11. requires exact replay-derived source items, claims, rights, uses, scopes, and invalidates only its exact dependent candidate", async () => {
    const fixture = await createNineAreaCurriculumFixture();
    const bound = await boundCandidateFixture(fixture);
    for (const change of ["item", "claim", "rights", "use", "scope"] as const) {
      const authority = clone(bound.sourceAuthority);
      if (change === "item") authority.reviewedSourceBindings[0]!.sourceItemId = "source.other-item";
      if (change === "claim") authority.reviewedSourceBindings[0]!.claimIds = [];
      if (change === "rights") authority.reviewedSourceBindings[0]!.rightsRecordId = "source-rights.other-item";
      if (change === "use") authority.reviewedSourceBindings[0]!.permittedProductUses = ["internal-review"];
      if (change === "scope") authority.reviewedSourceBindings[0]!.acceptedReviewScopes = ["rights"];
      expect(derivedNode(await validateFixture(fixture, { graph: bound.graph, sourceAuthorities: [authority], authorities: bound.authorities }), bound.node.capabilityId).availability).toBe("review-candidate");
    }
    for (const reason of ["source-corrected", "rights-expired", "source-withdrawn"] as const) {
      const authority = clone(bound.sourceAuthority);
      authority.invalidatedNodeIds = [bound.node.id];
      authority.invalidationReasonsByNodeId = [{ nodeId: bound.node.id, reasons: [reason] }];
      const validated = await validateFixture(fixture, { graph: bound.graph, sourceAuthorities: [authority], authorities: bound.authorities });
      expect(derivedNode(validated, bound.node.capabilityId).availability).toBe("review-candidate");
      expect(derivedNode(validated, bound.node.capabilityId).sourceAuthorityStatus).toBe("bound-invalidated");
      expect(derivedNode(validated, "capability.force-motion.zero-net-force").availability).toBe("caller-asserted-release");
      const retainedRelease = clone(bound.authorities);
      retainedRelease[0]!.lifecycle = "existing-registry-release";
      const retained = await validateFixture(fixture, { graph: bound.graph, sourceAuthorities: [authority], authorities: retainedRelease });
      expect(derivedNode(retained, bound.node.capabilityId).availability).toBe("review-candidate");
      expect(derivedNode(retained, bound.node.capabilityId).route).toBeNull();
      expect(derivedNode(retained, bound.node.capabilityId).sourceAuthorityStatus).toBe("bound-invalidated");
      expect(retained.invalidatedNodeIds).toContain(bound.node.id);
    }
  });

  it("12. forbids malformed source invalidation and legacy metadata as a new publication gate while retaining non-claims", async () => {
    const fixture = await createNineAreaCurriculumFixture();
    const badEvaluation = {
      packageId: "source-package.unknown",
      packageVersion: "1.0.0",
      packageDigest: `sha256:${"4".repeat(64)}`,
      evaluatedAsOf: "2026-07-23T00:00:00.000Z",
      status: "review-candidate-complete",
      publicationAuthority: "not-established",
      invalidatedNodeIds: [fixture.graph.nodes[0]!.id],
      invalidationReasonsByNodeId: [],
      reviewedSourceBindings: [],
    };
    expect((await validateFixture(fixture, { sourceAuthorities: [badEvaluation] })).issues.some((entry) => entry.code === "source.schema-invalid")).toBe(true);
    const legacyAsNew = clone(testOnlyCurrentAuthorities(fixture));
    legacyAsNew[0]!.lifecycle = "new-publication-candidate";
    const validated = await validateFixture(fixture, { authorities: legacyAsNew });
    expect(derivedNode(validated, "capability.proportional-reasoning.compare-and-scale").availability).toBe("review-candidate");
    expect(validated.nonClaims).toEqual(["does-not-establish-curriculum-sufficiency", "does-not-establish-homeschool-readiness"]);
    expect(projectNineAreaCoverage(validated).every((entry) => entry.nonClaims.length === 2)).toBe(true);
  });

  it("13. rejects current-capability, cross-node record, gap, authority, and source-evaluation clone identities", async () => {
    const fixture = await createNineAreaCurriculumFixture();
    const currentCapability = await repackage(fixture.graph, (input) => {
      const copied = clone(input.nodes[0]!);
      copied.id = "curriculum-node.proportional-reasoning.second-current";
      input.nodes.push(copied);
    });
    expect((await validateFixture(fixture, { graph: currentCapability })).issues.some((entry) => entry.code === "graph.duplicate-current-capability")).toBe(true);
    const crossNode = await repackage(fixture.graph, (input) => {
      input.nodes[0]!.prerequisites = [edge("curriculum-edge.cross-node", input.nodes[1]!.capabilityId)];
      input.nodes[1]!.prerequisites = [edge("curriculum-edge.cross-node", input.nodes[2]!.capabilityId)];
      input.nodes[0]!.alternatives = [{
        id: "curriculum-alternative.cross-node",
        kind: "construct-route",
        capabilityId: input.nodes[1]!.capabilityId,
        capabilityVersion: "1.0.0",
        appliesToEdgeIds: ["curriculum-edge.cross-node"],
        equivalence: "different-construct",
        limitationCodes: ["alternative.review-limited"],
        alternativeSourceRefs: [{
          sourcePackageRef: { id: "source-package.fixture.cross", version: "1.0.0", digest: `sha256:${"6".repeat(64)}` },
          sourceItemId: "source.fixture.cross",
          claimIds: ["source-claim.fixture.cross-one"],
        }],
      }];
      input.nodes[1]!.alternatives = [{
        ...clone(input.nodes[0]!.alternatives[0]!),
        capabilityId: input.nodes[2]!.capabilityId,
        alternativeSourceRefs: [{
          sourcePackageRef: { id: "source-package.fixture.cross", version: "1.0.0", digest: `sha256:${"6".repeat(64)}` },
          sourceItemId: "source.fixture.cross",
          claimIds: ["source-claim.fixture.cross-two"],
        }],
      }];
      input.nodes[0]!.accessRoutes[0]!.id = "access-route.cross-node";
      input.nodes[1]!.accessRoutes[0]!.id = "access-route.cross-node";
    });
    const crossIssues = (await validateFixture(fixture, { graph: crossNode })).issues.map((entry) => entry.code);
    expect(crossIssues).toContain("graph.duplicate-edge-id");
    expect(crossIssues).toContain("graph.duplicate-alternative-id");
    expect(crossIssues).toContain("graph.duplicate-access-route-id");
    const duplicateGap = clone(fixture.graph);
    duplicateGap.gaps.push(clone(duplicateGap.gaps[0]!));
    expect(curriculumGraphPackageSchema.safeParse(duplicateGap).success).toBe(false);
    const authorities = testOnlyCurrentAuthorities(fixture);
    expect(callerAssertedReleasedWorldAuthoritiesSchema.safeParse([...authorities, clone(authorities[0]!)]).success).toBe(false);
    const bound = await boundCandidateFixture(fixture);
    expect(sourceAuthorityEvaluationsSchema.safeParse([bound.sourceAuthority, clone(bound.sourceAuthority)]).success).toBe(false);
  });

  it("14. cannot broaden reviewed entitlement, age, or depth grants through graph authorship", async () => {
    const fixture = await createNineAreaCurriculumFixture();
    const entitlement = await repackage(fixture.graph, (input) => input.nodes[0]!.entitlementAreas.push("civic-media"));
    const broadenedAge = await repackage(fixture.graph, (input) => {
      input.nodes[1]!.supportedAgeModes.unshift("under-13");
      input.nodes[1]!.accessRoutes[0]!.supportedAgeModes.unshift("under-13");
    });
    const broadenedDepth = await repackage(fixture.graph, (input) => {
      input.nodes[0]!.supportedDepthModes.push("return-proof");
      input.nodes[0]!.accessRoutes[0]!.supportedDepthModes.push("return-proof");
    });
    expect(derivedNode(await validateFixture(fixture, { graph: entitlement }), "capability.proportional-reasoning.compare-and-scale").availability).toBe("review-candidate");
    expect(derivedNode(await validateFixture(fixture, { graph: broadenedAge }), "capability.force-motion.zero-net-force").availability).toBe("review-candidate");
    expect(derivedNode(await validateFixture(fixture, { graph: broadenedDepth }), "capability.proportional-reasoning.compare-and-scale").availability).toBe("review-candidate");
  });

  it("15. keeps an identified gap and the exact Argument & Evidence candidate non-routable", async () => {
    const fixture = await createNineAreaCurriculumFixture();
    const graph = await repackage(fixture.graph, (input) => {
      const gapNode = clone(input.nodes[0]!);
      gapNode.id = "curriculum-node.argument-evidence.identified-gap";
      gapNode.capabilityId = "capability.argument-evidence.claim-boundary";
      gapNode.title = "Argument and Evidence";
      gapNode.construct.code = "construct.argument-evidence.claim-boundary";
      gapNode.entitlementAreas = ["language-literacy"];
      gapNode.evidenceRequirement.capabilityId = gapNode.capabilityId;
      gapNode.worldBinding = null;
      gapNode.proposedAvailability = "identified-gap";
      input.nodes.push(gapNode);
      const candidate = clone(input.nodes[0]!);
      candidate.id = "curriculum-node.argument-evidence.review-candidate";
      candidate.capabilityId = "capability.language-literacy.claim-evidence-relation";
      candidate.title = "Argument & Evidence review candidate";
      candidate.construct.code = "construct.language-literacy.claim-evidence-relation";
      candidate.entitlementAreas = ["language-literacy"];
      candidate.evidenceRequirement.capabilityId = candidate.capabilityId;
      candidate.evidenceRequirement.validatorRef = { id: "validator.argument-evidence-transfer.v1", version: "1.0.0" };
      candidate.evidenceRequirement.taskFamilyIds = ["task-family.argument-evidence.claim-relevance-transfer.v1"];
      candidate.accessRoutes[0]!.reviewClaimIds = ["source-claim.argument-evidence.authored-fixture.support"];
      candidate.sourceRequirement = {
        mode: "bound-source-authority",
        sourcePackageRef: { id: "source-package.argument-evidence.authored-fixture", version: "1.0.0", digest: `sha256:${"e".repeat(64)}` },
        requiredItemIds: ["source.argument-evidence.authored-fixture"],
        requiredClaimIds: ["source-claim.argument-evidence.authored-fixture.support"],
        requiredRightsIds: ["source-rights.argument-evidence.authored-fixture"],
        requiredProductUses: ["curriculum-authoring", "bounded-learner-display"],
        requiredReviewScopes: ["acquisition-authenticity", "rights", "factual-epistemic", "pedagogy", "accessibility", "age-safety", "proof-design"],
      };
      candidate.worldBinding = {
        ...candidate.worldBinding!,
        worldId: "world.argument-evidence",
        packageIntegrityHash: `sha256:${"c".repeat(64)}`,
        runtimeBindingDigest: `sha256:${"d".repeat(64)}`,
        validatorRef: candidate.evidenceRequirement.validatorRef,
        capabilityId: candidate.capabilityId,
        taskFamilyIds: candidate.evidenceRequirement.taskFamilyIds,
        sourceIds: ["source.argument-evidence.authored-fixture"],
        sourceProvenanceStatus: "bound",
        route: "/learn/argument-evidence",
      };
      input.nodes.push(candidate);
      input.sourceAuthorityRefs = [{
        packageId: "source-package.argument-evidence.authored-fixture",
        packageVersion: "1.0.0",
        packageDigest: `sha256:${"e".repeat(64)}`,
        minimumEvaluatedAsOf: "2026-07-23T00:00:00.000Z",
      }];
      input.gaps.push({
        id: "curriculum-gap.language-literacy.argument-evidence-second",
        entitlementArea: "language-literacy",
        constructNeeded: "A second named language construct remains unreviewed.",
        reasonCode: "curriculum.reviewed-world-missing",
        learnerFacingText: "No released route is asserted for this construct.",
        nextReviewGateCodes: ["review.exact-world-binding-required"],
        prohibitedClaims: ["curriculum-sufficiency-not-established"],
      });
    });
    const sourceAuthority: SourceAuthorityEvaluationV1 = {
      packageId: "source-package.argument-evidence.authored-fixture",
      packageVersion: "1.0.0",
      packageDigest: `sha256:${"e".repeat(64)}`,
      evaluatedAsOf: "2026-07-23T00:00:00.000Z",
      status: "review-candidate-complete",
      publicationAuthority: "not-established",
      invalidatedNodeIds: [],
      invalidationReasonsByNodeId: [],
      reviewedSourceBindings: [{
        sourceItemId: "source.argument-evidence.authored-fixture",
        claimIds: ["source-claim.argument-evidence.authored-fixture.support"],
        rightsRecordId: "source-rights.argument-evidence.authored-fixture",
        permittedProductUses: ["curriculum-authoring", "bounded-learner-display"],
        acceptedReviewScopes: ["acquisition-authenticity", "rights", "factual-epistemic", "pedagogy", "accessibility", "age-safety", "proof-design"],
      }],
    };
    const validated = await validateFixture(fixture, { graph, sourceAuthorities: [sourceAuthority] });
    expect(derivedNode(validated, "capability.argument-evidence.claim-boundary").route).toBeNull();
    expect(derivedNode(validated, "capability.language-literacy.claim-evidence-relation").availability).toBe("review-candidate");
    expect(derivedNode(validated, "capability.language-literacy.claim-evidence-relation").route).toBeNull();
    const candidateExplanation = explainCapabilityAvailability(validated, "capability.language-literacy.claim-evidence-relation");
    expect(candidateExplanation.route).toBeNull();
    expect(candidateExplanation.worldBinding?.proposedRoute).toBe("/learn/argument-evidence");
    const coverage = projectNineAreaCoverage(validated);
    expect(coverage).toHaveLength(9);
    expect(coverage.find((entry) => entry.area === "language-literacy")!.gaps).toHaveLength(2);
  });

  it("16. rejects construct-changing evidence reuse and unrelated source package authorization or invalidation", async () => {
    const fixture = await createNineAreaCurriculumFixture();
    const changing = await repackage(fixture.graph, (input) => {
      input.nodes[0]!.accessRoutes[0]!.effect = "construct-changing";
      input.nodes[0]!.accessRoutes[0]!.evidenceConditionCode = input.nodes[0]!.evidenceRequirement.claimCode;
    });
    expect(derivedNode(await validateFixture(fixture, { graph: changing }), "capability.proportional-reasoning.compare-and-scale").availability).toBe("review-candidate");
    const bound = await boundCandidateFixture(fixture);
    const unrelated = clone(bound.sourceAuthority);
    unrelated.packageId = "source-package.unrelated";
    const invalidation = clone(bound.sourceAuthority);
    invalidation.invalidatedNodeIds = [fixture.graph.nodes[1]!.id];
    invalidation.invalidationReasonsByNodeId = [{ nodeId: fixture.graph.nodes[1]!.id, reasons: ["source-corrected"] }];
    expect(derivedNode(await validateFixture(fixture, { graph: bound.graph, sourceAuthorities: [unrelated], authorities: bound.authorities }), bound.node.capabilityId).availability).toBe("review-candidate");
    expect((await validateFixture(fixture, { graph: bound.graph, sourceAuthorities: [invalidation], authorities: bound.authorities })).issues.some((entry) => entry.code === "source.invalidation-package-mismatch")).toBe(true);
  });

  it("17. accepts one later offset-equivalent source evaluation but rejects earlier authority without rewriting the graph", async () => {
    const fixture = await createNineAreaCurriculumFixture();
    const floorGraph = await repackage(fixture.graph, (input) => {
      input.nodes[0]!.sourceRequirement = {
        mode: "bound-source-authority",
        sourcePackageRef: { id: "source-package.curriculum-bound", version: "1.0.0", digest: `sha256:${"2".repeat(64)}` },
        requiredItemIds: ["source.bound-item"],
        requiredClaimIds: ["source-claim.bound-item.support"],
        requiredRightsIds: ["source-rights.bound-item"],
        requiredProductUses: ["curriculum-authoring"],
        requiredReviewScopes: ["rights", "factual-epistemic"],
      };
      input.nodes[0]!.worldBinding = { ...input.nodes[0]!.worldBinding!, sourceIds: ["source.bound-item"], sourceProvenanceStatus: "bound" };
      input.nodes[0]!.accessRoutes[0]!.reviewClaimIds = ["source-claim.bound-item.support"];
      input.sourceAuthorityRefs = [{
        packageId: "source-package.curriculum-bound",
        packageVersion: "1.0.0",
        packageDigest: `sha256:${"2".repeat(64)}`,
        minimumEvaluatedAsOf: "2026-07-23T05:30:00.000+05:30",
      }];
    });
    const bound = await boundCandidateFixture(fixture);
    const exactInstant = clone(bound.sourceAuthority);
    exactInstant.evaluatedAsOf = "2026-07-23T00:00:00.000Z";
    const currentAuthorities = testOnlyCurrentAuthorities(fixture).map((authority, index) => index === 0
      ? { ...authority, ...floorGraph.nodes[0]!.worldBinding!, reviewedEntitlementAreas: floorGraph.nodes[0]!.entitlementAreas, reviewedAgeModes: floorGraph.nodes[0]!.supportedAgeModes, reviewedDepthModes: floorGraph.nodes[0]!.supportedDepthModes, lifecycle: "new-publication-candidate" as const }
      : authority);
    const accepted = await validateFixture(fixture, { graph: floorGraph, sourceAuthorities: [exactInstant], authorities: currentAuthorities });
    expect(derivedNode(accepted, floorGraph.nodes[0]!.capabilityId).availability).toBe("caller-asserted-release");
    expect(derivedNode(accepted, floorGraph.nodes[0]!.capabilityId).route).toBeNull();
    const later = clone(exactInstant);
    later.evaluatedAsOf = "2026-07-24T00:00:00.000Z";
    later.invalidatedNodeIds = [floorGraph.nodes[0]!.id];
    later.invalidationReasonsByNodeId = [{ nodeId: floorGraph.nodes[0]!.id, reasons: ["source-corrected"] }];
    const invalidated = await validateFixture(fixture, { graph: floorGraph, sourceAuthorities: [later], authorities: currentAuthorities });
    expect(invalidated.graphDigest).toBe(floorGraph.digest);
    expect(derivedNode(invalidated, floorGraph.nodes[0]!.capabilityId).availability).toBe("review-candidate");
    expect(derivedNode(invalidated, "capability.force-motion.zero-net-force").availability).toBe("caller-asserted-release");
    const earlier = clone(exactInstant);
    earlier.evaluatedAsOf = "2026-07-22T23:59:59.999Z";
    expect((await validateFixture(fixture, { graph: floorGraph, sourceAuthorities: [earlier], authorities: currentAuthorities })).issues.some((entry) => entry.code === "source.evaluation-before-floor")).toBe(true);
  });

  it("18. binds access and alternative review claims to the exact accepted source evaluation", async () => {
    const fixture = await createNineAreaCurriculumFixture();
    const bound = await boundCandidateFixture(fixture);
    const validGraph = await repackage(bound.graph, (input) => {
      input.nodes[0]!.alternatives = [{
        id: "curriculum-alternative.bound-source-review",
        kind: "construct-route",
        capabilityId: input.nodes[1]!.capabilityId,
        capabilityVersion: input.nodes[1]!.capabilityVersion,
        appliesToEdgeIds: [],
        equivalence: "different-construct",
        limitationCodes: ["alternative.review-limited"],
        alternativeSourceRefs: [{
          sourcePackageRef: { id: "source-package.curriculum-bound", version: "1.0.0", digest: `sha256:${"2".repeat(64)}` },
          sourceItemId: "source.bound-item",
          claimIds: ["source-claim.bound-item.support"],
        }],
      }];
    });
    const valid = await validateFixture(fixture, { graph: validGraph, sourceAuthorities: [bound.sourceAuthority], authorities: bound.authorities });
    expect(derivedNode(valid, bound.node.capabilityId).availability).toBe("caller-asserted-release");

    const missingAccessClaim = await repackage(validGraph, (input) => {
      input.nodes[0]!.accessRoutes[0]!.reviewClaimIds = [];
    });
    const unknownAccessClaim = await repackage(validGraph, (input) => {
      input.nodes[0]!.accessRoutes[0]!.reviewClaimIds = ["source-claim.bound-item.synthetic-access"];
    });
    const unknownAlternativeClaim = await repackage(validGraph, (input) => {
      input.nodes[0]!.alternatives[0]!.alternativeSourceRefs[0]!.claimIds = ["source-claim.bound-item.synthetic-alternative"];
    });
    for (const graph of [missingAccessClaim, unknownAccessClaim, unknownAlternativeClaim]) {
      const validated = await validateFixture(fixture, { graph, sourceAuthorities: [bound.sourceAuthority], authorities: bound.authorities });
      expect(derivedNode(validated, bound.node.capabilityId).availability).toBe("review-candidate");
      expect(derivedNode(validated, bound.node.capabilityId).sourceAuthorityStatus).toBe("bound-incomplete");
      expect(derivedNode(validated, bound.node.capabilityId).route).toBeNull();
    }
  });
});
