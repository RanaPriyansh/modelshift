import { describe, expect, it } from "vitest";

import {
  createCapabilityMapPackage,
  type CapabilityMapPackageInput,
  type CapabilityMapPackageV1,
} from "../capability-map";
import type { CallerAssertedReleasedWorldAuthorityV1 } from "../curriculum";
import {
  FIRST_PILOT_PRACTICE_TEMPLATE,
  createPracticePackage,
  practiceContentDigest,
  type PracticePackageInput,
} from "../practice/contracts";
import {
  compilePracticalProject,
  createPrerequisiteGapEvent,
} from "./compiler";
import {
  FIRST_PILOT_PROJECT_TEMPLATE,
  PRACTICAL_PROJECT_MODES,
  createPracticalProjectAttempt,
  createPracticalProjectPackage,
  createProjectCompletionEvent,
  delayedReturnPolicyContentDigest,
  practicalProjectContentDigest,
  type PracticalProjectAttemptInput,
  type PracticalProjectPackageInput,
} from "./contracts";
import {
  compileDelayedReturnSchedule,
  evaluatePracticalProjectAttempt,
  projectDelayedReturnState,
  validatePracticalProjectPackage,
} from "./validation";
import {
  testOnlyMintProjectFixtureGrant,
  type ProjectFixtureGrant,
} from "./fixture-authority";

const DIGEST = (character: string) => `sha256:${character.repeat(64)}`;
const EVALUATION_AT = "2026-07-23T12:00:00.000Z";
const REVIEWED_AT = "2026-07-22T12:00:00.000Z";
const EXPIRES_AT = "2026-08-23T12:00:00.000Z";
const TARGET = {
  curriculumNodeId: "curriculum-node.fixture.explanation",
  capabilityId: "capability.fixture.explanation",
  capabilityVersion: "1.0.0",
} as const;
const PREREQUISITE = {
  curriculumNodeId: "curriculum-node.fixture.foundation",
  capabilityId: "capability.fixture.foundation",
  capabilityVersion: "1.0.0",
} as const;
const REPRESENTATION = {
  id: "representation.fixture.explanation",
  version: "1.0.0",
  digest: DIGEST("8"),
} as const;

function clone<T>(value: T): T {
  return structuredClone(value);
}

async function practiceFixture() {
  const draft: PracticePackageInput = {
    schemaVersion: "practice-package.v1",
    practiceId: FIRST_PILOT_PRACTICE_TEMPLATE.practiceId,
    version: FIRST_PILOT_PRACTICE_TEMPLATE.version,
    authoredTemplateRef: {
      id: FIRST_PILOT_PRACTICE_TEMPLATE.id,
      version: FIRST_PILOT_PRACTICE_TEMPLATE.version,
      digest: FIRST_PILOT_PRACTICE_TEMPLATE.digest,
    },
    audience: "adult",
    targetCapabilityRefs: [PREREQUISITE],
    content: clone(FIRST_PILOT_PRACTICE_TEMPLATE.content),
    review: {
      reviewedContentDigest: DIGEST("0"),
      reviewerIdentityRef: "identity.fixture.practice-reviewer",
      reviewerGrantMarker: "fixture-grant.practice.current",
      authorityMode: "process-local-fixture-only",
      reviewedAt: REVIEWED_AT,
      expiresAt: EXPIRES_AT,
      scope: "targeted-practice-content-access",
    },
  };
  draft.review.reviewedContentDigest = await practiceContentDigest(draft);
  const practice = await createPracticePackage(draft);
  const grant = testOnlyMintProjectFixtureGrant({
    grantMarker: draft.review.reviewerGrantMarker,
    scope: "practice-package-review",
    subjectRef: draft.review.reviewedContentDigest,
    actorRef: draft.review.reviewerIdentityRef,
    issuedAt: REVIEWED_AT,
    expiresAt: EXPIRES_AT,
    allowedContributionIds: [],
    allowedOperationIds: [],
  });
  return { practice, grant };
}

async function projectFixture() {
  const practiceSetup = await practiceFixture();
  const draft: PracticalProjectPackageInput = {
    schemaVersion: "practical-project.v1",
    projectId: FIRST_PILOT_PROJECT_TEMPLATE.projectId,
    version: FIRST_PILOT_PROJECT_TEMPLATE.version,
    authoredTemplateRef: {
      id: FIRST_PILOT_PROJECT_TEMPLATE.id,
      version: FIRST_PILOT_PROJECT_TEMPLATE.version,
      digest: FIRST_PILOT_PROJECT_TEMPLATE.digest,
    },
    templateContent: clone(FIRST_PILOT_PROJECT_TEMPLATE.content) as unknown as PracticalProjectPackageInput["templateContent"],
    audience: "adult",
    mapAssociation: {
      capabilityMapId: "capability-map.fixture.project",
      capabilityMapVersion: "1.0.0",
      projectBindingId: "project-binding.fixture.explanation",
      proofBindingId: "proof-binding.fixture.explanation",
      requiredRepresentationRefs: [REPRESENTATION],
    },
    targetCapabilityRefs: [TARGET],
    prerequisiteCapabilityRefs: [PREREQUISITE],
    prerequisiteRepairRoutes: [{
      schemaVersion: "targeted-repair-route.v1",
      repairRouteId: "practice-repair.fixture.foundation",
      prerequisiteCapabilityRef: PREREQUISITE,
      practicePackageRef: {
        id: practiceSetup.practice.practiceId,
        version: practiceSetup.practice.version,
        digest: practiceSetup.practice.practiceDigest,
      },
    }],
    proof: {
      targetCapabilityRef: TARGET,
      protectedOperationText: FIRST_PILOT_PROJECT_TEMPLATE.content.mapBindingSemantics.protectedOperationText,
      separatingExperienceRef: { id: "experience.fixture.explanation", version: "1.0.0", digest: DIGEST("e") },
      independentEvidenceBindings: [
        { id: "proof-task.fixture.context", taskFamilyId: "task-family.fixture.context", taskVersion: "1.0.0", representation: "new-context" },
        { id: "proof-task.fixture.representation", taskFamilyId: "task-family.fixture.representation", taskVersion: "1.0.0", representation: "new-representation" },
      ],
      individualDefenceOperationId: "operation.authored.defence",
      unfamiliarTransferOperationId: "operation.authored.transfer",
    },
    delayedReturn: {
      policyRef: { id: "return-policy.fixture.project", version: "1.0.0", digest: DIGEST("7") },
      delayDays: 14,
      completionWindowDays: 7,
      required: true,
      review: {
        reviewedContentDigest: DIGEST("0"),
        reviewerIdentityRef: "identity.fixture.return-reviewer",
        reviewerGrantMarker: "fixture-grant.return.current",
        authorityMode: "process-local-fixture-only",
        reviewedAt: REVIEWED_AT,
        expiresAt: EXPIRES_AT,
        scope: "delayed-return-policy",
      },
    },
    safetyReview: {
      reviewedContentDigest: DIGEST("0"),
      reviewerIdentityRef: "identity.fixture.safety-reviewer",
      reviewerGrantMarker: "fixture-grant.safety.current",
      authorityMode: "process-local-fixture-only",
      reviewedAt: REVIEWED_AT,
      expiresAt: EXPIRES_AT,
      scope: "exact-project-content-low-risk",
    },
    compilerBoundary: {
      autonomousScore: false,
      autonomousMasteryClaim: false,
      runtimeAssignmentAuthority: false,
      proofAuthority: false,
    },
  };
  draft.delayedReturn.review.reviewedContentDigest = await delayedReturnPolicyContentDigest(draft);
  draft.safetyReview.reviewedContentDigest = await practicalProjectContentDigest(draft);
  const project = await createPracticalProjectPackage(draft);
  const safetyGrant = testOnlyMintProjectFixtureGrant({
    grantMarker: draft.safetyReview.reviewerGrantMarker,
    scope: "project-safety-review",
    subjectRef: draft.safetyReview.reviewedContentDigest,
    actorRef: draft.safetyReview.reviewerIdentityRef,
    issuedAt: REVIEWED_AT,
    expiresAt: EXPIRES_AT,
    allowedContributionIds: [],
    allowedOperationIds: [],
  });
  const returnGrant = testOnlyMintProjectFixtureGrant({
    grantMarker: draft.delayedReturn.review.reviewerGrantMarker,
    scope: "return-policy-review",
    subjectRef: draft.delayedReturn.review.reviewedContentDigest,
    actorRef: draft.delayedReturn.review.reviewerIdentityRef,
    issuedAt: REVIEWED_AT,
    expiresAt: EXPIRES_AT,
    allowedContributionIds: [],
    allowedOperationIds: [],
  });
  return {
    project,
    practice: practiceSetup.practice,
    safetyGrant,
    returnGrant,
    practiceGrant: practiceSetup.grant,
  };
}

const WORLD_AUTHORITY: CallerAssertedReleasedWorldAuthorityV1 = {
  worldId: "world.fixture.explanation",
  contentVersion: "1.0.0",
  packageIntegrityHash: DIGEST("1"),
  runtimeBindingDigest: DIGEST("2"),
  runtimeProtocolVersion: "1.0.0",
  validatorRef: { id: "validator.fixture.explanation", version: "1.0.0" },
  capabilityId: TARGET.capabilityId,
  taskFamilyIds: ["task-family.fixture.context", "task-family.fixture.representation"],
  sourceIds: ["source.fixture.explanation"],
  sourceProvenanceStatus: "bound",
  route: "/learn/fixture-explanation",
  reviewedEntitlementAreas: ["language-literacy"],
  reviewedAgeModes: ["18-plus"],
  reviewedDepthModes: ["working-model", "independent-transfer"],
  releaseStatus: "released",
  availabilityStatus: "available",
  releaseEventRef: "release-event.fixture.explanation",
  publicationPolicyRef: { id: "publication-policy.fixture", version: "1.0.0", digest: DIGEST("3") },
  lifecycle: "existing-registry-release",
};

function unsignedMap(map: CapabilityMapPackageV1): CapabilityMapPackageInput {
  const { mapDigest: _digest, ...unsigned } = clone(map);
  void _digest;
  return unsigned;
}

function reviewDecision(scope: "domain-capability" | "learning-sequence" | "access" | "safety-rights", mapDigest: string, suffix: string) {
  return {
    decisionId: `decision.fixture.project-${suffix}`,
    reviewerIdentityRef: `reviewer.fixture.project-${suffix}`,
    reviewerGrantRef: `grant.fixture.project-${suffix}`,
    authorityOrigin: "server-verified" as const,
    scope,
    outcome: "accepted" as const,
    inputDigest: mapDigest,
    evidenceDigest: DIGEST("4"),
    decidedAt: REVIEWED_AT,
    expiresAt: EXPIRES_AT,
    independence: "independent" as const,
  };
}

async function mapFixture(project: Awaited<ReturnType<typeof projectFixture>>["project"]) {
  const candidate = await createCapabilityMapPackage({
    schemaVersion: "capability-map.v1",
    mapId: project.mapAssociation.capabilityMapId,
    version: project.mapAssociation.capabilityMapVersion,
    audience: "adult",
    intentRef: { intentId: "learning-intent.fixture.project", sanitizedIntentDigest: DIGEST("5") },
    intentSummary: "Build and defend one bounded explanation.",
    plannerGatewayReceipt: { gateway: "forge-planner", policyDecisionDigest: DIGEST("6"), routeKind: "grounded_learning" },
    targetCapabilityRefs: [{
      ...TARGET,
      derivedAvailability: "released",
      releasedWorldAuthority: WORLD_AUTHORITY,
    }],
    nodes: [
      {
        id: "map-node.fixture.target",
        kind: "reviewed_capability",
        curriculumNodeRef: { id: TARGET.curriculumNodeId, capabilityId: TARGET.capabilityId, capabilityVersion: TARGET.capabilityVersion },
        required: true,
        learnerFacingPurpose: "Use the exact target capability.",
      },
      {
        id: "map-node.fixture.prerequisite",
        kind: "reviewed_capability",
        curriculumNodeRef: { id: PREREQUISITE.curriculumNodeId, capabilityId: PREREQUISITE.capabilityId, capabilityVersion: PREREQUISITE.capabilityVersion },
        required: true,
        learnerFacingPurpose: "Use the exact prerequisite capability.",
      },
      {
        id: "map-node.fixture.representation",
        kind: "representation",
        representationRef: REPRESENTATION,
        learnerFacingPurpose: "Use the exact reviewed representation.",
      },
      {
        id: "map-node.fixture.project",
        kind: "project",
        projectBindingRef: project.mapAssociation.projectBindingId,
        learnerFacingPurpose: "Complete the exact authored project.",
      },
      {
        id: "map-node.fixture.proof",
        kind: "proof",
        proofBindingRef: project.mapAssociation.proofBindingId,
        learnerFacingPurpose: "Complete the exact protected proof.",
      },
    ],
    edges: [
      {
        id: "map-edge.fixture.prerequisite",
        kind: "prerequisite",
        fromNodeId: "map-node.fixture.target",
        toNodeId: "map-node.fixture.prerequisite",
        required: true,
        consequenceOfSkipping: "The project must route a revealed gap to exact targeted practice.",
      },
      { id: "map-edge.fixture.project", kind: "sequence", fromNodeId: "map-node.fixture.target", toNodeId: "map-node.fixture.project", required: false },
      { id: "map-edge.fixture.proof", kind: "sequence", fromNodeId: "map-node.fixture.project", toNodeId: "map-node.fixture.proof", required: false },
    ],
    routeOptions: [],
    projectBindings: [{
      id: project.mapAssociation.projectBindingId,
      projectPackageRef: { id: project.projectId, version: project.version, digest: project.projectDigest },
      targetNodeIds: ["map-node.fixture.target"],
      practicalOutcome: project.templateContent.mapBindingSemantics.practicalOutcome,
      noCostAlternativeRef: project.templateContent.noCostMaterialAlternative.alternativeRef,
      safetyClass: "reviewed-low-risk",
    }],
    proofBindings: [{
      id: project.mapAssociation.proofBindingId,
      targetNodeId: "map-node.fixture.target",
      protectedOperation: project.proof.protectedOperationText,
      assistanceMode: "closed",
      separatingExperienceRef: project.proof.separatingExperienceRef,
      plausibleReadings: [
        { id: "reading.fixture.one", learnerVisibleDescription: "The first plausible reading.", prediction: "The first outcome follows." },
        { id: "reading.fixture.two", learnerVisibleDescription: "The second plausible reading.", prediction: "The second outcome follows." },
      ],
      independentEvidenceBindings: [
        project.proof.independentEvidenceBindings[0]!,
        project.proof.independentEvidenceBindings[1]!,
      ],
      returnIntervalDays: project.delayedReturn.delayDays,
      limitationCodes: ["evidence.delayed-return-not-yet-tested"],
    }],
    explicitGaps: [],
    sourceAuthorityEvaluations: [],
    createdFrom: {
      curriculumGraphRef: {
        id: "curriculum-graph.fixture.project",
        version: "1.0.0",
        digest: DIGEST("a"),
        policyRef: { id: "curriculum-policy.fixture.project", version: "1.0.0", digest: DIGEST("b") },
        sourceAuthorityRefs: [],
      },
      graphValidationReceiptDigest: DIGEST("c"),
    },
    reviewState: "candidate",
    publication: { status: "unpublished" },
  });
  const decisions = [
    reviewDecision("domain-capability", candidate.mapDigest, "domain"),
    reviewDecision("learning-sequence", candidate.mapDigest, "sequence"),
    reviewDecision("access", candidate.mapDigest, "access"),
    reviewDecision("safety-rights", candidate.mapDigest, "safety"),
  ];
  return createCapabilityMapPackage({
    ...unsignedMap(candidate),
    reviewState: "reviewed",
    mapReviewRecordRef: {
      id: "review-record.fixture.project",
      version: "1.0.0",
      digest: DIGEST("d"),
      scopedDecisionIds: [decisions[0]!.decisionId, ...decisions.slice(1).map((entry) => entry.decisionId)],
      reviewedAt: REVIEWED_AT,
      expiresAt: EXPIRES_AT,
    },
    scopedDecisionRefs: decisions,
    publication: { status: "unpublished" },
  });
}

async function fullFixture() {
  const base = await projectFixture();
  const map = await mapFixture(base.project);
  const compilerContext = {
    evaluationAt: EVALUATION_AT,
    safetyReviewGrant: base.safetyGrant,
    returnPolicyReviewGrant: base.returnGrant,
    practiceReviewGrants: [base.practiceGrant],
  };
  return { ...base, map, compilerContext };
}

async function attemptFixture(project: Awaited<ReturnType<typeof projectFixture>>["project"]) {
  const actorRef = "learner.fixture";
  const contributions = [
    {
      contributionId: "contribution.fixture.draft",
      kind: "learner" as const,
      actorRef,
      actorGrantMarker: "fixture-grant.learner.draft",
      operationIds: ["operation.authored.draft"],
      artifactIds: ["artifact.authored.draft"],
      declaration: "I created the draft.",
    },
    {
      contributionId: "contribution.fixture.revision",
      kind: "learner" as const,
      actorRef,
      actorGrantMarker: "fixture-grant.learner.revision",
      operationIds: ["operation.authored.revise"],
      artifactIds: ["artifact.authored.revision"],
      declaration: "I revised the artifact.",
    },
    {
      contributionId: "contribution.fixture.defence",
      kind: "learner" as const,
      actorRef,
      actorGrantMarker: "fixture-grant.learner.defence",
      operationIds: ["operation.authored.defence"],
      artifactIds: [],
      declaration: "I completed the defence.",
    },
    {
      contributionId: "contribution.fixture.transfer",
      kind: "learner" as const,
      actorRef,
      actorGrantMarker: "fixture-grant.learner.transfer",
      operationIds: ["operation.authored.transfer"],
      artifactIds: [],
      declaration: "I completed the unfamiliar transfer.",
    },
  ];
  const draft: PracticalProjectAttemptInput = {
    schemaVersion: "practical-project-attempt.v1",
    projectDigest: project.projectDigest,
    artifactSubmissions: [
      {
        submissionId: "submission.fixture.draft",
        artifactId: "artifact.authored.draft",
        completed: true,
        format: "text",
        contentDigest: DIGEST("1"),
        provenance: {
          creatorActorRef: actorRef,
          createdAt: EVALUATION_AT,
          contributionIds: ["contribution.fixture.draft"],
          sourceRefs: [],
          revisionRecordIds: [],
        },
      },
      {
        submissionId: "submission.fixture.revision",
        artifactId: "artifact.authored.revision",
        completed: true,
        format: "text",
        contentDigest: DIGEST("2"),
        provenance: {
          creatorActorRef: actorRef,
          createdAt: EVALUATION_AT,
          contributionIds: ["contribution.fixture.revision"],
          sourceRefs: [],
          revisionRecordIds: ["revision-record.fixture.respond"],
        },
      },
    ],
    contributions,
    milestoneRecords: [
      {
        milestoneId: "milestone.authored.draft",
        completedAt: EVALUATION_AT,
        contributionIds: ["contribution.fixture.draft"],
        artifactSubmissionIds: ["submission.fixture.draft"],
      },
      {
        milestoneId: "milestone.authored.revise",
        completedAt: EVALUATION_AT,
        contributionIds: ["contribution.fixture.revision"],
        artifactSubmissionIds: ["submission.fixture.revision"],
      },
    ],
    critiqueRecords: [{
      roleId: "critique-role.authored.self",
      completedAt: EVALUATION_AT,
      responseDigest: DIGEST("3"),
      contributionIds: ["contribution.fixture.revision"],
    }],
    revisionRecords: [{
      revisionRecordId: "revision-record.fixture.respond",
      ruleId: "revision-rule.authored.respond",
      completedAt: EVALUATION_AT,
      artifactSubmissionId: "submission.fixture.revision",
      contributionIds: ["contribution.fixture.revision"],
      beforeContentDigest: DIGEST("1"),
      afterContentDigest: DIGEST("2"),
    }],
    individualDefence: {
      completedAt: EVALUATION_AT,
      responseDigest: DIGEST("4"),
      contributionIds: ["contribution.fixture.defence"],
    },
    unfamiliarTransfer: {
      completedAt: EVALUATION_AT,
      responseDigest: DIGEST("5"),
      contributionIds: ["contribution.fixture.transfer"],
    },
  };
  const attempt = await createPracticalProjectAttempt(draft);
  const grants = contributions.map((contribution) => testOnlyMintProjectFixtureGrant({
    grantMarker: contribution.actorGrantMarker,
    scope: "learner-contribution-provenance",
    subjectRef: contribution.actorRef,
    actorRef: contribution.actorRef,
    issuedAt: REVIEWED_AT,
    expiresAt: EXPIRES_AT,
    allowedContributionIds: [contribution.contributionId],
    allowedOperationIds: contribution.operationIds,
  }));
  return { attempt, grants };
}

function compilationRequest(setup: Awaited<ReturnType<typeof fullFixture>>, overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: "practical-project-compilation.v1",
    project: setup.project,
    capabilityMap: setup.map,
    practicePackages: [setup.practice],
    prerequisiteGapEvents: [],
    evaluatedAt: EVALUATION_AT,
    ...overrides,
  };
}

describe("W6-E one-way sealed practical project compiler", () => {
  it("compiles an exact raw map association without a map/project digest cycle", async () => {
    const setup = await fullFixture();
    expect(PRACTICAL_PROJECT_MODES).toEqual(["build", "investigate", "repair", "design", "explain", "perform", "contribute"]);
    expect("capabilityMapDigest" in setup.project.mapAssociation).toBe(false);
    expect(setup.map.projectBindings[0]?.projectPackageRef.digest).toBe(setup.project.projectDigest);
    const result = await compilePracticalProject(compilationRequest(setup), setup.compilerContext);
    expect(result.outcome).toBe("workflow-ready");
    expect(result.workflow).toHaveLength(2);
    expect(result.runtimeAssignmentAllowed).toBe(false);
    expect(result.proofAuthority).toBe(false);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("revalidates the raw map digest and exact project, target, proof, representation, and return bindings", async () => {
    const setup = await fullFixture();
    const retainedOldDigest = { ...setup.map, intentSummary: "Tampered while retaining an old digest." };
    expect((await compilePracticalProject(compilationRequest(setup, { capabilityMap: retainedOldDigest }), setup.compilerContext)).outcome).toBe("invalid");

    const changedProof = await createCapabilityMapPackage({
      ...unsignedMap(setup.map),
      proofBindings: setup.map.proofBindings.map((entry) => ({ ...entry, returnIntervalDays: entry.returnIntervalDays + 1 })),
    });
    const changedProofResult = await compilePracticalProject(compilationRequest(setup, { capabilityMap: changedProof }), setup.compilerContext);
    expect(changedProofResult.issues.map((issue) => issue.code)).toContain("compiler.proof-binding-content-mismatch");

    const missingRepresentation = await createCapabilityMapPackage({
      ...unsignedMap(setup.map),
      nodes: setup.map.nodes.filter((node) => node.kind !== "representation"),
    });
    const representationResult = await compilePracticalProject(compilationRequest(setup, { capabilityMap: missingRepresentation }), setup.compilerContext);
    expect(representationResult.issues.map((issue) => issue.code)).toContain("compiler.representation-binding-missing");

    const wrongProjectSeal = await createCapabilityMapPackage({
      ...unsignedMap(setup.map),
      projectBindings: setup.map.projectBindings.map((entry) => ({
        ...entry,
        projectPackageRef: { ...entry.projectPackageRef, digest: DIGEST("f") },
      })),
    });
    expect((await compilePracticalProject(
      compilationRequest(setup, { capabilityMap: wrongProjectSeal }),
      setup.compilerContext,
    )).issues.map((issue) => issue.code)).toContain("compiler.project-seal-mismatch");

    const wrongTarget = await createCapabilityMapPackage({
      ...unsignedMap(setup.map),
      projectBindings: setup.map.projectBindings.map((entry) => ({
        ...entry,
        targetNodeIds: ["map-node.fixture.prerequisite"],
      })),
    });
    expect((await compilePracticalProject(
      compilationRequest(setup, { capabilityMap: wrongTarget }),
      setup.compilerContext,
    )).issues.map((issue) => issue.code)).toContain("compiler.project-target-capability-mismatch");
  });

  it("rejects altered semantic instructions and a review/grant not bound to exact current content", async () => {
    const setup = await fullFixture();
    const altered = clone(setup.project);
    altered.templateContent.milestones[0]!.learnerAction = "An attacker changed the authored operation.";
    const alteredResult = await compilePracticalProject(compilationRequest(setup, { project: altered }), setup.compilerContext);
    expect(alteredResult.outcome).toBe("invalid");

    const clonedGrant = structuredClone(setup.safetyGrant) as ProjectFixtureGrant;
    const grantResult = await compilePracticalProject(compilationRequest(setup), { ...setup.compilerContext, safetyReviewGrant: clonedGrant });
    expect(grantResult.issues.map((issue) => issue.code)).toContain("project.safety-review-invalid");

    const expiredContext = { ...setup.compilerContext, evaluationAt: "2026-09-01T12:00:00.000Z" };
    const expiredResult = await compilePracticalProject(
      compilationRequest(setup, { evaluatedAt: expiredContext.evaluationAt }),
      expiredContext,
    );
    expect(expiredResult.outcome).toBe("invalid");

    const unsafe = clone(setup.project);
    unsafe.templateContent.materials[0]!.materialClass = "electrical";
    unsafe.templateContent.materials[0]!.hazardCodes = ["electrical"];
    const { projectDigest: _unsafeDigest, ...unsafeInput } = unsafe;
    void _unsafeDigest;
    unsafeInput.safetyReview.reviewedContentDigest = await practicalProjectContentDigest(unsafeInput);
    const resealedUnsafe = await createPracticalProjectPackage(unsafeInput);
    const unsafeGrant = testOnlyMintProjectFixtureGrant({
      grantMarker: unsafeInput.safetyReview.reviewerGrantMarker,
      scope: "project-safety-review",
      subjectRef: unsafeInput.safetyReview.reviewedContentDigest,
      actorRef: unsafeInput.safetyReview.reviewerIdentityRef,
      issuedAt: REVIEWED_AT,
      expiresAt: EXPIRES_AT,
      allowedContributionIds: [],
      allowedOperationIds: [],
    });
    const unsafeValidation = await validatePracticalProjectPackage(resealedUnsafe, {
      evaluationAt: EVALUATION_AT,
      safetyReviewGrant: unsafeGrant,
      returnPolicyReviewGrant: setup.returnGrant,
    });
    expect(unsafeValidation.issues.map((issue) => issue.code)).toContain("project.authored-template-mismatch");
  });

  it("routes only a digest-bound raw-map prerequisite gap through an exact reviewed practice package", async () => {
    const setup = await fullFixture();
    const gap = await createPrerequisiteGapEvent({
      schemaVersion: "prerequisite-gap-event.v1",
      gapEventId: "prerequisite-gap.fixture.foundation",
      mapDigest: setup.map.mapDigest,
      prerequisiteNodeId: "map-node.fixture.prerequisite",
      observedAt: EVALUATION_AT,
    });
    const result = await compilePracticalProject(compilationRequest(setup, { prerequisiteGapEvents: [gap] }), setup.compilerContext);
    expect(result.outcome).toBe("repair-required");
    expect(result.repairWorkflow[0]?.practicePackageRef.digest).toBe(setup.practice.practiceDigest);

    const missing = await compilePracticalProject(compilationRequest(setup, { prerequisiteGapEvents: [gap], practicePackages: [] }), setup.compilerContext);
    expect(missing.outcome).toBe("unavailable-gap");

    const tamperedPractice = {
      ...setup.practice,
      targetCapabilityRefs: [TARGET],
    };
    const tampered = await compilePracticalProject(
      compilationRequest(setup, { prerequisiteGapEvents: [gap], practicePackages: [tamperedPractice] }),
      setup.compilerContext,
    );
    expect(tampered.outcome).toBe("unavailable-gap");

    const alteredAccess = clone(setup.practice);
    alteredAccess.content.accessAlternativeRef.digest = DIGEST("f");
    const accessResult = await compilePracticalProject(
      compilationRequest(setup, { prerequisiteGapEvents: [gap], practicePackages: [alteredAccess] }),
      setup.compilerContext,
    );
    expect(accessResult.outcome).toBe("unavailable-gap");

    const clonedPracticeGrant = structuredClone(setup.practiceGrant) as ProjectFixtureGrant;
    const grantResult = await compilePracticalProject(
      compilationRequest(setup, { prerequisiteGapEvents: [gap] }),
      { ...setup.compilerContext, practiceReviewGrants: [clonedPracticeGrant] },
    );
    expect(grantResult.outcome).toBe("unavailable-gap");
  });

  it("requires milestone, critique, revision, artifact-format, bidirectional provenance, and protected response records", async () => {
    const setup = await fullFixture();
    const attemptSetup = await attemptFixture(setup.project);
    const context = { ...setup.compilerContext, learnerProvenanceGrants: attemptSetup.grants };

    const cases: PracticalProjectAttemptInput[] = [];
    const missingMilestone = clone(attemptSetup.attempt);
    missingMilestone.milestoneRecords.pop();
    cases.push(missingMilestone);
    const wrongCritique = clone(attemptSetup.attempt);
    wrongCritique.critiqueRecords[0]!.roleId = "critique-role.fixture.wrong";
    cases.push(wrongCritique);
    const missingRevision = clone(attemptSetup.attempt);
    missingRevision.revisionRecords[0]!.ruleId = "revision-rule.fixture.wrong";
    cases.push(missingRevision);
    const wrongFormat = clone(attemptSetup.attempt);
    wrongFormat.artifactSubmissions[0]!.format = "video";
    cases.push(wrongFormat);
    const unchanged = clone(attemptSetup.attempt);
    unchanged.revisionRecords[0]!.beforeContentDigest = unchanged.revisionRecords[0]!.afterContentDigest;
    cases.push(unchanged);
    const oneWay = clone(attemptSetup.attempt);
    oneWay.contributions[0]!.artifactIds = [];
    cases.push(oneWay);

    for (const value of cases) {
      const { attemptDigest: _digest, ...unsigned } = value;
      void _digest;
      const resealed = await createPracticalProjectAttempt(unsigned);
      const result = await evaluatePracticalProjectAttempt(setup.project, resealed, context);
      expect(result.protectedProofStatus).not.toBe("complete-self-declared-unverified");
      expect(result.capabilityClaimIssued).toBe(false);
    }

    const missingResponse = clone(attemptSetup.attempt) as unknown as Record<string, unknown>;
    delete (missingResponse.individualDefence as Record<string, unknown>).responseDigest;
    const responseResult = await evaluatePracticalProjectAttempt(setup.project, missingResponse, context);
    expect(responseResult.protectedProofStatus).toBe("invalid");
  });

  it("never infers learner provenance from an enum/string and never emits external-validator readiness", async () => {
    const setup = await fullFixture();
    const attemptSetup = await attemptFixture(setup.project);
    const valid = await evaluatePracticalProjectAttempt(setup.project, attemptSetup.attempt, {
      ...setup.compilerContext,
      learnerProvenanceGrants: attemptSetup.grants,
    });
    expect(valid.protectedProofStatus).toBe("complete-self-declared-unverified");
    expect(valid.proofAuthority).toBe(false);

    const clonedGrants = attemptSetup.grants.map((grant) => structuredClone(grant) as ProjectFixtureGrant);
    const forged = await evaluatePracticalProjectAttempt(setup.project, attemptSetup.attempt, {
      ...setup.compilerContext,
      learnerProvenanceGrants: clonedGrants,
    });
    expect(forged.protectedProofStatus).toBe("incomplete");
    expect(forged.issues.map((issue) => issue.code)).toContain("attempt.learner-provenance-unverified");

    const groupOnly = clone(attemptSetup.attempt);
    groupOnly.individualDefence.contributionIds = ["contribution.fixture.draft"];
    groupOnly.unfamiliarTransfer.contributionIds = ["contribution.fixture.draft"];
    const { attemptDigest: _groupDigest, ...groupInput } = groupOnly;
    void _groupDigest;
    const resealedGroup = await createPracticalProjectAttempt(groupInput);
    const groupResult = await evaluatePracticalProjectAttempt(setup.project, resealedGroup, {
      ...setup.compilerContext,
      learnerProvenanceGrants: attemptSetup.grants,
    });
    expect(groupResult.protectedProofStatus).toBe("incomplete");
    expect(groupResult.capabilityClaimIssued).toBe(false);
  });

  it.each(["ai", "collaborator", "reused"] as const)("marks %s in a protected operation contaminated", async (kind) => {
    const setup = await fullFixture();
    const attemptSetup = await attemptFixture(setup.project);
    const tampered = clone(attemptSetup.attempt);
    tampered.contributions.push({
      contributionId: `contribution.fixture.${kind}`,
      kind,
      actorRef: `${kind}.fixture`,
      operationIds: ["operation.authored.defence"],
      artifactIds: [],
      declaration: "This non-learner contribution touched protected work.",
    });
    const { attemptDigest: _digest, ...unsigned } = tampered;
    void _digest;
    const resealed = await createPracticalProjectAttempt(unsigned);
    const result = await evaluatePracticalProjectAttempt(setup.project, resealed, {
      ...setup.compilerContext,
      learnerProvenanceGrants: attemptSetup.grants,
    });
    expect(result.protectedProofStatus).toBe("contaminated");
    expect(result.capabilityClaimIssued).toBe(false);
  });

  it("rejects duplicate submission IDs, forged attempt digests, and non-strict timestamps", async () => {
    const setup = await fullFixture();
    const attemptSetup = await attemptFixture(setup.project);
    const context = { ...setup.compilerContext, learnerProvenanceGrants: attemptSetup.grants };
    const duplicate = clone(attemptSetup.attempt);
    duplicate.artifactSubmissions[1]!.submissionId = duplicate.artifactSubmissions[0]!.submissionId;
    expect((await evaluatePracticalProjectAttempt(setup.project, duplicate, context)).protectedProofStatus).toBe("invalid");

    const forged = { ...attemptSetup.attempt, attemptDigest: DIGEST("f") };
    expect((await evaluatePracticalProjectAttempt(setup.project, forged, context)).issues.map((issue) => issue.code)).toContain("attempt.digest-mismatch");

    const offset = clone(attemptSetup.attempt) as unknown as Record<string, unknown>;
    (offset.individualDefence as Record<string, unknown>).completedAt = "2026-07-23T17:30:00.000+05:30";
    expect((await evaluatePracticalProjectAttempt(setup.project, offset, context)).protectedProofStatus).toBe("invalid");
  });

  it("derives delayed return only from exact policy, completion event, timestamps, and terminal events", async () => {
    const setup = await fullFixture();
    const attemptSetup = await attemptFixture(setup.project);
    const completionEvent = await createProjectCompletionEvent({
      schemaVersion: "project-completion-event.v1",
      completionEventId: "project-completion.fixture.one",
      projectDigest: setup.project.projectDigest,
      attemptDigest: attemptSetup.attempt.attemptDigest,
      completedAt: "2026-07-01T12:00:00.000Z",
    });
    const compiled = await compileDelayedReturnSchedule(setup.project, completionEvent, setup.compilerContext);
    expect(compiled.schedule?.scheduledFor).toBe("2026-07-15T12:00:00.000Z");
    const forgedCompletion = await compileDelayedReturnSchedule(
      setup.project,
      { ...completionEvent, completedAt: "2026-07-02T12:00:00.000Z" },
      setup.compilerContext,
    );
    expect(forgedCompletion.schedule).toBeNull();
    expect(forgedCompletion.issues.map((issue) => issue.code)).toContain("return.completion-event-digest-mismatch");
    const schedule = compiled.schedule!;

    expect((await projectDelayedReturnState(schedule, [], "2026-07-14T12:00:00.000Z")).state).toBe("scheduled");
    expect((await projectDelayedReturnState(schedule, [], "2026-07-16T12:00:00.000Z")).state).toBe("due");
    expect((await projectDelayedReturnState(schedule, [], "2026-07-23T12:00:00.000Z")).state).toBe("untested");
    const completed = {
      schemaVersion: "delayed-return-event.v1",
      eventId: "return-event.fixture.completed",
      scheduleDigest: schedule.scheduleDigest,
      kind: "completed",
      occurredAt: "2026-07-16T12:00:00.000Z",
      responseDigest: DIGEST("a"),
    };
    expect((await projectDelayedReturnState(schedule, [completed], "2026-07-17T12:00:00.000Z")).state).toBe("completed");
    expect((await projectDelayedReturnState(schedule, [{ ...completed, occurredAt: "2026-07-14T12:00:00.000Z" }], "2026-07-17T12:00:00.000Z")).state).toBe("invalid");
    expect((await projectDelayedReturnState(schedule, [{ ...completed, occurredAt: "2026-07-23T12:00:00.001Z" }], "2026-07-24T12:00:00.000Z")).state).toBe("invalid");
  });

  it("bounds compiler input before schema work and preserves deterministic ordering", async () => {
    const setup = await fullFixture();
    const tooLarge = compilationRequest(setup, { padding: "x".repeat(1_100_000) });
    const result = await compilePracticalProject(tooLarge, setup.compilerContext);
    expect(result.outcome).toBe("invalid");
    expect(result.issues[0]?.code).toBe("compiler.input-too-large-or-non-json");

    const reorderedProject = clone(setup.project);
    reorderedProject.targetCapabilityRefs.reverse();
    reorderedProject.mapAssociation.requiredRepresentationRefs.reverse();
    const reorderedResult = await compilePracticalProject(
      compilationRequest(setup, { project: reorderedProject }),
      setup.compilerContext,
    );
    expect(reorderedResult.outcome).toBe("workflow-ready");
  });
});
