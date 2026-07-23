import { describe, expect, it } from "vitest";

import {
  capabilityMapPackageSchema,
  createCapabilityMapPackage,
  exportCapabilityMapPackage,
  plannerGatewayReceiptFromPlan,
  type CapabilityMapPackageInput,
  type CapabilityMapPackageV1,
} from "./capability-map";
import { validateCapabilityMap, validateCapabilityMapPatch } from "./capability-map-validation";
import { createCurriculumGraphPackage, createNineAreaCurriculumFixture, type CallerAssertedReleasedWorldAuthorityV1, type CurriculumGraphPackageV1 } from "./curriculum";
import { learningIntentSchema, localLearningIntentCaptureSchema, parseLearningIntent } from "./learning-intent";
import { planForgeLearning } from "../lib/forge-planner/planner";
import type { ForgePlanRequest } from "../lib/forge-planner/schema";

const DIGEST = (character: string) => `sha256:${character.repeat(64)}`;
const EVALUATION_AT = "2026-07-23T12:00:00.000Z";

function clone<T>(value: T): T {
  return structuredClone(value);
}

function unsigned(map: CapabilityMapPackageV1): CapabilityMapPackageInput {
  const { mapDigest: _digest, ...input } = clone(map);
  void _digest;
  return input;
}

async function currentAuthorities(graph: CurriculumGraphPackageV1, policy: Awaited<ReturnType<typeof createNineAreaCurriculumFixture>>["policy"]): Promise<readonly CallerAssertedReleasedWorldAuthorityV1[]> {
  return graph.nodes.map((node) => ({
    ...node.worldBinding!,
    reviewedEntitlementAreas: node.entitlementAreas,
    reviewedAgeModes: node.supportedAgeModes,
    reviewedDepthModes: node.supportedDepthModes,
    releaseStatus: "released" as const,
    availabilityStatus: "available" as const,
    releaseEventRef: `release-event.${node.worldBinding!.worldId.slice("world.".length)}`,
    publicationPolicyRef: policy.publicationPolicyRef,
    lifecycle: "existing-registry-release" as const,
  }));
}

function decision(scope: "domain-capability" | "learning-sequence" | "access" | "safety-rights", inputDigest: string, suffix: string) {
  return {
    decisionId: `decision.fixture.${suffix}`,
    reviewerIdentityRef: `reviewer.fixture.${suffix}`,
    reviewerGrantRef: `grant.fixture.${suffix}`,
    authorityOrigin: "server-verified" as const,
    scope,
    outcome: "accepted" as const,
    inputDigest,
    evidenceDigest: DIGEST("a"),
    decidedAt: "2026-07-20T00:00:00.000Z",
    expiresAt: "2026-08-23T00:00:00.000Z",
    independence: "independent" as const,
  };
}

async function reviewedMap(candidate: CapabilityMapPackageV1): Promise<CapabilityMapPackageV1> {
  const decisions = [
    decision("domain-capability", candidate.mapDigest, "domain"),
    decision("learning-sequence", candidate.mapDigest, "sequence"),
    decision("access", candidate.mapDigest, "access"),
    decision("safety-rights", candidate.mapDigest, "safety"),
  ];
  return createCapabilityMapPackage({
    ...unsigned(candidate),
    reviewState: "reviewed",
    mapReviewRecordRef: {
      id: "review-record.fixture.accepted",
      version: "1.0.0",
      digest: DIGEST("a"),
      scopedDecisionIds: [decisions[0]!.decisionId, ...decisions.slice(1).map((entry) => entry.decisionId)],
      reviewedAt: "2026-07-21T00:00:00.000Z",
      expiresAt: "2026-08-23T00:00:00.000Z",
    },
    scopedDecisionRefs: decisions,
    publication: { status: "unpublished" },
  });
}

async function fixture() {
  const seed = await createNineAreaCurriculumFixture();
  const { digest: _digest, ...graphInput } = clone(seed.graph);
  void _digest;
  const targetInput = graphInput.nodes[0]!;
  targetInput.worldBinding = {
    ...targetInput.worldBinding!,
    taskFamilyIds: ["task-family.fixture.independent-a", "task-family.fixture.independent-b"],
  };
  targetInput.evidenceRequirement.taskFamilyIds = [...targetInput.worldBinding.taskFamilyIds];
  const graph = await createCurriculumGraphPackage(graphInput);
  const authorities = await currentAuthorities(graph, seed.policy);
  const target = graph.nodes[0]!;
  const optional = graph.nodes[1]!;
  const targetAuthority = authorities.find((authority) => authority.worldId === target.worldBinding!.worldId)!;
  const plannerRequest: ForgePlanRequest = {
    question: "How do ratios work?",
    ageMode: "adult",
    depth: "standard",
    startingPoint: "I can compare quantities but I do not yet know how to scale a ratio.",
    successShape: "I can solve a new ratio problem without help.",
    guardianManaged: false,
    sourceMode: "curated",
  };
  const plan = await planForgeLearning(plannerRequest, { apiKey: "" });
  if (plan.contractKind !== "grounded_learning") throw new Error("Fixture needs a grounded deterministic planner route.");
  const plannerGatewayReceipt = await plannerGatewayReceiptFromPlan(plan);
  const intent = parseLearningIntent({
    schemaVersion: "learning-intent.v1",
    intentId: "learning-intent.fixture.adult-goal",
    sanitizedIntentDigest: DIGEST("a"),
    intentSummary: "Learn to compare and scale ratios through a practical, reviewable investigation.",
    sanitizationPolicyRef: { id: "policy.intent.redaction", version: "1.0.0", digest: DIGEST("b") },
    learnerPreviewReceipt: { receiptId: "intent-receipt.fixture.accepted", acceptedDigest: DIGEST("a"), acceptedUses: ["internal-map", "model-proposal"], acceptedAt: "2026-07-23T00:00:00.000Z" },
    desiredAction: "Explain and apply a bounded proportional relationship.",
    depth: "working",
    routePreferences: ["demonstration", "practice"],
    constraints: { audience: "adult", language: "en" },
    createdAt: "2026-07-23T00:00:00.000Z",
  });
  const map = await createCapabilityMapPackage({
    schemaVersion: "capability-map.v1",
    mapId: "capability-map.fixture.practical-map",
    version: "1.0.0",
    audience: "adult",
    intentRef: { intentId: intent.intentId, sanitizedIntentDigest: intent.sanitizedIntentDigest },
    intentSummary: intent.intentSummary,
    plannerGatewayReceipt,
    targetCapabilityRefs: [{
      curriculumNodeId: target.id,
      capabilityId: target.capabilityId,
      capabilityVersion: target.capabilityVersion,
      derivedAvailability: "released",
      releasedWorldAuthority: targetAuthority,
    }],
    nodes: [
      {
        id: "map-node.target.ratio",
        kind: "reviewed_capability",
        curriculumNodeRef: { id: target.id, capabilityId: target.capabilityId, capabilityVersion: target.capabilityVersion },
        required: true,
        learnerFacingPurpose: "Use a reviewed proportional-reasoning World to test a starting model.",
      },
      {
        id: "map-node.optional.force-motion",
        kind: "reviewed_capability",
        curriculumNodeRef: { id: optional.id, capabilityId: optional.capabilityId, capabilityVersion: optional.capabilityVersion },
        required: false,
        learnerFacingPurpose: "Compare a reviewed optional route before the separating experience.",
      },
      {
        id: "map-node.project.ratio",
        kind: "project",
        projectBindingRef: "project-binding.ratio.household-demo",
        learnerFacingPurpose: "Make a low-risk comparison record and explain its limits.",
      },
      {
        id: "map-node.proof.ratio",
        kind: "proof",
        proofBindingRef: "proof-binding.ratio.independent",
        learnerFacingPurpose: "Complete two independent closed-mode checks and return later.",
      },
    ],
    edges: [
      { id: "map-edge.target-to-optional", kind: "route-option", fromNodeId: "map-node.target.ratio", toNodeId: "map-node.optional.force-motion", required: false },
      { id: "map-edge.target-to-project", kind: "supports", fromNodeId: "map-node.target.ratio", toNodeId: "map-node.project.ratio", required: false },
      { id: "map-edge.target-to-proof", kind: "sequence", fromNodeId: "map-node.target.ratio", toNodeId: "map-node.proof.ratio", required: false },
    ],
    routeOptions: [{
      id: "map-route.force-motion-contrast",
      label: "Compare an optional reviewed contrast",
      optionalNodeIds: ["map-node.optional.force-motion"],
      orderedOptionalNodeIds: ["map-node.optional.force-motion"],
      reviewed: true,
    }],
    projectBindings: [{
      id: "project-binding.ratio.household-demo",
      projectPackageRef: { id: "project-package.ratio.household-demo", version: "1.0.0", digest: DIGEST("c") },
      targetNodeIds: ["map-node.target.ratio"],
      practicalOutcome: "Record a controlled comparison with no-cost materials and state uncertainty.",
      noCostAlternativeRef: { id: "project-alternative.ratio.table", version: "1.0.0", digest: DIGEST("d") },
      safetyClass: "reviewed-low-risk",
    }],
    proofBindings: [{
      id: "proof-binding.ratio.independent",
      targetNodeId: "map-node.target.ratio",
      protectedOperation: "Predict and explain a proportional relationship without cognitive assistance.",
      assistanceMode: "closed",
      separatingExperienceRef: { id: "experience.ratio.compare", version: "1.0.0", digest: DIGEST("e") },
      plausibleReadings: [
        { id: "reading.ratio.additive", learnerVisibleDescription: "The same amount should be added each time.", prediction: "Adding two always keeps the relationship proportional." },
        { id: "reading.ratio.multiplicative", learnerVisibleDescription: "The same scale factor should be used.", prediction: "Multiplying both quantities by the same factor preserves the ratio." },
      ],
      independentEvidenceBindings: [
        { id: "proof-task.ratio.new-context", taskFamilyId: "task-family.fixture.independent-a", taskVersion: "1.0.0", representation: "new-context" },
        { id: "proof-task.ratio.new-representation", taskFamilyId: "task-family.fixture.independent-b", taskVersion: "1.0.0", representation: "new-representation" },
      ],
      returnIntervalDays: 7,
      limitationCodes: ["evidence.delayed-retention-not-yet-established"],
    }],
    explicitGaps: [],
    sourceAuthorityEvaluations: [],
    createdFrom: {
      curriculumGraphRef: {
        id: graph.id,
        version: graph.version,
        digest: graph.digest,
        policyRef: graph.policyRef,
        sourceAuthorityRefs: graph.sourceAuthorityRefs,
      },
      graphValidationReceiptDigest: DIGEST("f"),
    },
    reviewState: "candidate",
    publication: { status: "unpublished" },
  });
  return { graph, policy: seed.policy, authorities, intent, plannerRequest, map };
}

function validationInput(setup: Awaited<ReturnType<typeof fixture>>, map = setup.map, overrides: Partial<Record<"learningIntent" | "plannerRequest" | "evaluationAt", unknown>> = {}) {
  return {
    map,
    graph: setup.graph,
    policy: setup.policy,
    sourceAuthorities: [],
    callerAssertedReleasedWorldAuthorities: setup.authorities,
    learningIntent: overrides.learningIntent ?? setup.intent,
    plannerRequest: overrides.plannerRequest ?? setup.plannerRequest,
    evaluationAt: overrides.evaluationAt ?? EVALUATION_AT,
  };
}

describe("W6-A capability-map contracts", () => {
  it("keeps raw capture separate, binds the exact sanitized intent, and exports no raw/private fields", async () => {
    const raw = {
      schemaVersion: "local-learning-intent-capture.v1",
      intentId: "learning-intent.fixture.raw",
      learnerWords: "My private question must not enter the capability map.",
      optionalPrivateNotes: "Nor may these notes.",
      storage: { mode: "ephemeral-session" },
      createdAt: "2026-07-23T00:00:00.000Z",
    };
    expect(localLearningIntentCaptureSchema.safeParse(raw).success).toBe(true);
    expect(learningIntentSchema.safeParse({ ...raw, schemaVersion: "learning-intent.v1" }).success).toBe(false);
    const setup = await fixture();
    expect(capabilityMapPackageSchema.safeParse({ ...setup.map, learnerWords: raw.learnerWords }).success).toBe(false);
    const mismatched = await createCapabilityMapPackage({ ...unsigned(setup.map), intentSummary: raw.learnerWords });
    const result = await validateCapabilityMap(validationInput(setup, mismatched));
    expect(result.issues.map((entry) => entry.code)).toContain("map.sanitized-intent-mismatch");
    const exportPackage = exportCapabilityMapPackage(setup.map);
    expect(exportPackage.humanReadable).not.toContain(raw.learnerWords);
    expect(exportPackage.machineReadable).not.toContain("learnerWords");
    expect(exportPackage.machineReadable).not.toContain("optionalPrivateNotes");
  });

  it("validates a deterministic, deeply immutable, fixture-only map through a rerun planner", async () => {
    const setup = await fixture();
    const one = await validateCapabilityMap(validationInput(setup));
    const two = await validateCapabilityMap(validationInput(setup));
    expect(one.issues).toEqual([]);
    expect(one.issues).toEqual(two.issues);
    expect(one.assignmentAllowed).toBe(false);
    expect(one.runtimeEligibility).toBe("fixture-only");
    expect(Object.isFrozen(one)).toBe(true);
    expect(Object.isFrozen(one.map?.nodes[0])).toBe(true);
  });

  it("rejects forged, unknown, and exploratory planner paths", async () => {
    const setup = await fixture();
    const forged = await createCapabilityMapPackage({
      ...unsigned(setup.map),
      plannerGatewayReceipt: { gateway: "forge-planner", policyDecisionDigest: DIGEST("f"), routeKind: "grounded_learning" },
    });
    const forgedResult = await validateCapabilityMap(validationInput(setup, forged));
    expect(forgedResult.issues.map((entry) => entry.code)).toContain("map.planner-receipt-mismatch");
    const exploratoryResult = await validateCapabilityMap(validationInput(setup, await reviewedMap(setup.map), {
      plannerRequest: { ...setup.plannerRequest, question: "How should I restore an unknown antique clock mechanism?" },
    }));
    expect(exploratoryResult.issues.map((entry) => entry.code)).toContain("map.exploratory-route-not-candidate");
  });

  it("rejects candidate and gap states masquerading as reviewed content", async () => {
    const setup = await fixture();
    const target = setup.map.targetCapabilityRefs[0]!;
    if (target.derivedAvailability !== "released") throw new Error("Fixture target must be released.");
    const candidate = await createCapabilityMapPackage({
      ...unsigned(setup.map),
      targetCapabilityRefs: [{
        curriculumNodeId: target.curriculumNodeId,
        capabilityId: target.capabilityId,
        capabilityVersion: target.capabilityVersion,
        derivedAvailability: "review-candidate",
      }],
      nodes: setup.map.nodes.map((node) => node.id !== "map-node.target.ratio" ? node : {
        id: node.id,
        kind: "candidate_capability" as const,
        curriculumNodeRef: node.kind === "reviewed_capability" ? node.curriculumNodeRef : { id: target.curriculumNodeId, capabilityId: target.capabilityId, capabilityVersion: target.capabilityVersion },
        candidateRef: { id: "candidate.fixture.ratio", proposalDigest: DIGEST("c") },
        learnerFacingPurpose: "Candidate content remains visibly unreviewed.",
        limitationCodes: ["candidate.not-reviewed"],
      }),
    });
    const reviewedCandidate = await reviewedMap(candidate);
    const candidateResult = await validateCapabilityMap(validationInput(setup, reviewedCandidate));
    expect(candidateResult.issues.map((entry) => entry.code)).toEqual(expect.arrayContaining(["map.target-availability-mismatch", "map.unresolved-content-reviewed"]));

    const gap = await createCapabilityMapPackage({
      ...unsigned(setup.map),
      targetCapabilityRefs: [{
        curriculumNodeId: target.curriculumNodeId,
        capabilityId: target.capabilityId,
        capabilityVersion: target.capabilityVersion,
        derivedAvailability: "identified-gap",
      }],
      explicitGaps: [{ id: setup.graph.gaps[0]!.id, reasonCode: "gap.fixture", learnerFacingText: "This remains an explicit gap." }],
      nodes: setup.map.nodes.map((node) => node.id !== "map-node.target.ratio" ? node : {
        id: node.id,
        kind: "gap" as const,
        curriculumNodeRef: node.kind === "reviewed_capability" ? node.curriculumNodeRef : { id: target.curriculumNodeId, capabilityId: target.capabilityId, capabilityVersion: target.capabilityVersion },
        gapRef: { id: setup.graph.gaps[0]!.id },
        learnerFacingPurpose: "This is an unresolved curriculum gap.",
        limitationCodes: ["gap.not-reviewed"],
      }),
    });
    const gapResult = await validateCapabilityMap(validationInput(setup, await reviewedMap(gap)));
    expect(gapResult.issues.map((entry) => entry.code)).toContain("map.unresolved-content-reviewed");
  });

  it("requires adult intent and planner presentation", async () => {
    const setup = await fixture();
    const result = await validateCapabilityMap(validationInput(setup, setup.map, {
      plannerRequest: { ...setup.plannerRequest, ageMode: "teen" },
    }));
    expect(result.issues.map((entry) => entry.code)).toContain("map.adult-intent-or-planner-required");
  });

  it("requires current, independent, complete review and a separate current publisher", async () => {
    const setup = await fixture();
    const reviewed = await reviewedMap(setup.map);
    expect((await validateCapabilityMap(validationInput(setup, reviewed))).issues).toEqual([]);
    if (reviewed.reviewState !== "reviewed") throw new Error("Reviewed fixture required.");
    const missingScopes = await createCapabilityMapPackage({
      ...unsigned(reviewed),
      reviewState: "reviewed",
      mapReviewRecordRef: reviewed.mapReviewRecordRef,
      scopedDecisionRefs: reviewed.scopedDecisionRefs.map((entry) => ({ ...entry, scope: "domain-capability" as const })),
      publication: { status: "unpublished" },
    });
    expect((await validateCapabilityMap(validationInput(setup, missingScopes))).issues.map((entry) => entry.code)).toContain("map.review-scope-coverage-missing");
    const expired = await createCapabilityMapPackage({
      ...unsigned(reviewed),
      reviewState: "reviewed",
      mapReviewRecordRef: { ...reviewed.mapReviewRecordRef, expiresAt: "2026-07-22T00:00:00.000Z" },
      scopedDecisionRefs: reviewed.scopedDecisionRefs.map((entry) => ({ ...entry, expiresAt: "2026-07-22T00:00:00.000Z" })),
      publication: { status: "unpublished" },
    });
    expect((await validateCapabilityMap(validationInput(setup, expired))).issues.map((entry) => entry.code)).toContain("map.review-decision-not-current");
    const selfPublished = await createCapabilityMapPackage({
      ...unsigned(reviewed),
      reviewState: "reviewed",
      mapReviewRecordRef: reviewed.mapReviewRecordRef,
      scopedDecisionRefs: reviewed.scopedDecisionRefs,
      publication: {
        status: "published",
        publicationEventRef: "publication-event.fixture.self-approved",
        publisherAuthorityRef: reviewed.scopedDecisionRefs[0]!.reviewerIdentityRef,
        publisherAuthorityOrigin: "server-verified",
        publishedAt: "2026-07-22T00:00:00.000Z",
        expiresAt: "2026-08-23T00:00:00.000Z",
      },
    });
    expect((await validateCapabilityMap(validationInput(setup, selfPublished))).issues.map((entry) => entry.code)).toContain("map.publisher-not-separated-or-current");
  });

  it("does not let dangling project or proof records satisfy a released target", async () => {
    const setup = await fixture();
    const dangling = await createCapabilityMapPackage({
      ...unsigned(setup.map),
      nodes: setup.map.nodes.map((node) => {
        if (node.kind === "project") return { id: node.id, kind: "concept" as const, conceptCode: "concept.project-omitted", learnerFacingPurpose: "The project node was improperly omitted." };
        if (node.kind === "proof") return { id: node.id, kind: "concept" as const, conceptCode: "concept.proof-omitted", learnerFacingPurpose: "The proof node was improperly omitted." };
        return node;
      }),
    });
    const codes = (await validateCapabilityMap(validationInput(setup, dangling))).issues.map((entry) => entry.code);
    expect(codes).toEqual(expect.arrayContaining(["map.target-project-missing", "map.target-proof-missing", "map.project-binding-node-cardinality", "map.proof-binding-node-cardinality"]));
  });

  it("enforces dependent-to-prerequisite graph edges transitively and rejects reversed edges", async () => {
    const setup = await fixture();
    const { digest: _digest, ...graphInput } = clone(setup.graph);
    void _digest;
    const [target, direct, transitive] = graphInput.nodes;
    if (!target || !direct || !transitive) throw new Error("Fixture needs three graph nodes.");
    target.prerequisites = [{
      id: "curriculum-edge.ratio-needs-force",
      capabilityId: direct.capabilityId,
      capabilityVersion: direct.capabilityVersion,
      rationaleCode: "prerequisite.fixture.direct",
      explanation: "A direct prerequisite is required for this adversarial fixture.",
      evidenceCondition: { requiredClaimCode: "claim.fixture.direct", acceptedEvidenceTier: "grounded", acceptedTaskFamilies: [direct.worldBinding!.taskFamilyIds[0]!], remainsUntestedCodes: ["evidence.fixture.direct"] },
      alternativeBindingIds: [],
    }];
    direct.prerequisites = [{
      id: "curriculum-edge.force-needs-history",
      capabilityId: transitive.capabilityId,
      capabilityVersion: transitive.capabilityVersion,
      rationaleCode: "prerequisite.fixture.transitive",
      explanation: "A transitive prerequisite is required for this adversarial fixture.",
      evidenceCondition: { requiredClaimCode: "claim.fixture.transitive", acceptedEvidenceTier: "grounded", acceptedTaskFamilies: [transitive.worldBinding!.taskFamilyIds[0]!], remainsUntestedCodes: ["evidence.fixture.transitive"] },
      alternativeBindingIds: [],
    }];
    const graph = await createCurriculumGraphPackage(graphInput);
    const authorities = await currentAuthorities(graph, setup.policy);
    const targetAuthority = authorities.find((authority) => authority.worldId === graph.nodes[0]!.worldBinding!.worldId)!;
    const transitiveMap = await createCapabilityMapPackage({
      ...unsigned(setup.map),
      targetCapabilityRefs: [{
        curriculumNodeId: setup.map.targetCapabilityRefs[0]!.curriculumNodeId,
        capabilityId: setup.map.targetCapabilityRefs[0]!.capabilityId,
        capabilityVersion: setup.map.targetCapabilityRefs[0]!.capabilityVersion,
        derivedAvailability: "released",
        releasedWorldAuthority: targetAuthority,
      }],
      createdFrom: { ...setup.map.createdFrom, curriculumGraphRef: { id: graph.id, version: graph.version, digest: graph.digest, policyRef: graph.policyRef, sourceAuthorityRefs: graph.sourceAuthorityRefs } },
      edges: setup.map.edges.map((edge) => edge.id !== "map-edge.target-to-optional" ? edge : {
        ...edge,
        kind: "prerequisite" as const,
        required: true,
        consequenceOfSkipping: "The target cannot be attempted without this prerequisite.",
      }),
    });
    const input = { ...validationInput(setup, transitiveMap), graph, callerAssertedReleasedWorldAuthorities: authorities };
    const missing = await validateCapabilityMap(input);
    expect(missing.issues.map((entry) => entry.code)).toContain("map.required-prerequisite-skipped");
    const reversed = await createCapabilityMapPackage({
      ...unsigned(transitiveMap),
      edges: [...transitiveMap.edges, {
        id: "map-edge.reversed",
        kind: "prerequisite",
        fromNodeId: "map-node.optional.force-motion",
        toNodeId: "map-node.target.ratio",
        required: true,
        consequenceOfSkipping: "This deliberately reverses the documented edge direction.",
      }],
    });
    expect((await validateCapabilityMap({ ...input, map: reversed })).issues.map((entry) => entry.code)).toContain("map.prerequisite-edge-reversed-or-arbitrary");
  });

  it("matches source-authority floors exactly", async () => {
    const setup = await fixture();
    const sourceAuthority = {
      packageId: "source-package.fixture.floor",
      packageVersion: "1.0.0",
      packageDigest: DIGEST("a"),
      evaluatedAsOf: "2026-07-22T00:00:00.000Z",
      status: "review-candidate-incomplete" as const,
      publicationAuthority: "not-established" as const,
      invalidatedNodeIds: [],
      invalidationReasonsByNodeId: [],
      reviewedSourceBindings: [],
    };
    const { digest: _digest, ...graphInput } = clone(setup.graph);
    void _digest;
    graphInput.sourceAuthorityRefs = [{ packageId: sourceAuthority.packageId, packageVersion: sourceAuthority.packageVersion, packageDigest: sourceAuthority.packageDigest, minimumEvaluatedAsOf: "2026-07-21T00:00:00.000Z" }];
    const graph = await createCurriculumGraphPackage(graphInput);
    const floorMap = await createCapabilityMapPackage({
      ...unsigned(setup.map),
      createdFrom: { ...setup.map.createdFrom, curriculumGraphRef: { id: graph.id, version: graph.version, digest: graph.digest, policyRef: graph.policyRef, sourceAuthorityRefs: graph.sourceAuthorityRefs } },
      sourceAuthorityEvaluations: [sourceAuthority],
    });
    const input = { ...validationInput(setup, floorMap), graph, sourceAuthorities: [sourceAuthority] };
    expect((await validateCapabilityMap(input)).issues).toEqual([]);
    const alteredFloor = await createCapabilityMapPackage({
      ...unsigned(floorMap),
      createdFrom: {
        ...floorMap.createdFrom,
        curriculumGraphRef: { ...floorMap.createdFrom.curriculumGraphRef, sourceAuthorityRefs: [{ ...graph.sourceAuthorityRefs[0]!, minimumEvaluatedAsOf: "2026-07-20T00:00:00.000Z" }] },
      },
    });
    expect((await validateCapabilityMap({ ...input, map: alteredFloor })).issues.map((entry) => entry.code)).toContain("map.source-authority-reference-mismatch");
  });

  it("revalidates a patch base, requires a new candidate identity, and canonicalizes nested authority sets", async () => {
    const setup = await fixture();
    const reviewed = await reviewedMap(setup.map);
    const materialPatch = {
      schemaVersion: "capability-map-patch.v1",
      patchId: "patch.fixture.material",
      baseMapRef: { mapId: reviewed.mapId, version: reviewed.version, mapDigest: reviewed.mapDigest },
      operations: [{ op: "propose-proof-change", proofBindingRef: "proof-binding.ratio.independent" }],
      learnerActionRef: "learner-action.fixture.material",
      createdAt: "2026-07-23T00:00:00.000Z",
      revalidation: { outcome: "candidate-revision-required", candidateMapRef: { mapId: reviewed.mapId, version: "1.0.1", mapDigest: DIGEST("b") } },
    };
    expect((await validateCapabilityMapPatch(materialPatch, validationInput(setup, reviewed))).outcome).toBe("candidate-revision-required");
    const tampered = { ...reviewed, intentSummary: "Tampered content while retaining an old digest." };
    const tamperedPatch = await validateCapabilityMapPatch(materialPatch, validationInput(setup, tampered));
    expect(tamperedPatch.outcome).toBe("invalid");
    expect(tamperedPatch.issues.map((entry) => entry.code)).toContain("patch.base-map-invalid");

    const target = setup.map.targetCapabilityRefs[0]!;
    if (target.derivedAvailability !== "released") throw new Error("Fixture target must be released.");
    const reordered = await createCapabilityMapPackage({
      ...unsigned(setup.map),
      targetCapabilityRefs: [{
        ...target,
        releasedWorldAuthority: {
          ...target.releasedWorldAuthority,
          taskFamilyIds: [...target.releasedWorldAuthority.taskFamilyIds].reverse(),
          sourceIds: [...target.releasedWorldAuthority.sourceIds].reverse(),
          reviewedEntitlementAreas: [...target.releasedWorldAuthority.reviewedEntitlementAreas].reverse(),
          reviewedAgeModes: [...target.releasedWorldAuthority.reviewedAgeModes].reverse(),
          reviewedDepthModes: [...target.releasedWorldAuthority.reviewedDepthModes].reverse(),
        },
      }],
    });
    expect(reordered.mapDigest).toBe(setup.map.mapDigest);
  });
});
