import { describe, expect, it } from "vitest";

import { canonicalJson, sha256Digest } from "../events";
import {
  REPRESENTATION_REVIEW_SCOPES,
  compileRepresentationPackage,
  compileRepresentationPolicy,
  compileRepresentationReviewDecision,
  compileRepresentationWithdrawal,
  representationReviewDecisionRef,
  representationWithdrawalRef,
  requiredRepresentationDependencies,
  type RepresentationDependencyV1,
  type RepresentationPolicyV1,
  type RepresentationReviewDecisionV1,
} from "./contracts";
import { chooseFixtureRepresentation, evaluateRepresentationRegistry } from "./registry";
import { validateRepresentationFrame, validateRepresentationPackage } from "./validation";

const DIGEST = (character: string) => `sha256:${character.repeat(64)}`;
const EVALUATED_AT = "2026-06-01T00:00:00.000Z";
type PackageInput = Parameters<typeof compileRepresentationPackage>[0];
const ref = (id: string, character = "a") => ({ id, version: "1.0.0", digest: DIGEST(character) });

function simulationInput(policy: RepresentationPolicyV1, overrides: Partial<PackageInput> = {}): PackageInput {
  return {
    schemaVersion: "representation-package.v1", packageId: "representation-package.motion-comparison", representationId: "representation.motion-comparison", version: "1.0.0", primaryArtifactRef: ref("artifact.motion", "f"), policyRef: { id: policy.id, version: policy.version, digest: policy.digest },
    capabilityBinding: { capabilityId: "capability.motion-reasoning", capabilityVersion: "1.0.0", mapNodeId: "map-node.motion-reasoning" }, kind: "simulation", productionMethod: "deterministic-code", epistemicRole: "validated-model-output",
    authority: { authorityKind: "deterministic-validator", validatorRef: ref("validator.motion", "b"), runtimeRef: ref("runtime.motion", "c"), deterministic: true, fixedTimestepMs: 20, seedMode: "fixed", fixedSeed: "authored-motion-v1", coherenceMode: "same-state-frame" },
    assumptions: [{ id: "assumption.closed-system", statement: "The fixture models only named bodies and forces.", learnerConsequence: "Conclusions are bounded to the displayed system." }], omittedFactors: [{ id: "omission.air", statement: "Small turbulent effects are omitted.", learnerConsequence: "This is not a high-fidelity fluid model." }], variables: [{ id: "variable.velocity", learnerLabel: "Velocity", valueKind: "vector", unit: "m/s", unitMeaning: "metres per second with direction" }],
    controls: { motionPresent: true, keyboardOperable: true, pauseAvailable: true, stepAvailable: true, resetAvailable: true, scrubAvailable: true, reducedMotionEquivalent: true, colorIndependentMeaning: true, minimumViewportCssPx: 320, textualControlInstructions: "Use Space to pause and arrows to step shared time." },
    alternative: { id: "alternative.motion-table", modalities: ["text", "table"], synchronization: "same-state-frame", constructStatus: "preserves", constructStatement: "Text and table expose the same state.", textTemplateRef: ref("template.motion-text", "d"), tableSchemaRef: ref("table.motion-state", "e"), reviewerDecisionRef: ref("review.access-equivalence", "0") },
    learnerAction: { action: "predict", prompt: "Commit what changes before running the comparison.", responseKind: "commitment", occursBeforeExplanation: true }, governance: { reviewState: "candidate", reviewDecisionRefs: [], withdrawalDecisionRef: null }, validFrom: "2026-01-01T00:00:00.000Z", expiresAt: "2026-12-31T00:00:00.000Z", publicationStatus: "unpublished", runtimeAssignmentAllowed: false, ...overrides,
  };
}

async function decisions(contentDigest: string, closureDigest: string, namespace = "review"): Promise<RepresentationReviewDecisionV1[]> {
  return Promise.all(REPRESENTATION_REVIEW_SCOPES.map((scope, index) => compileRepresentationReviewDecision({ schemaVersion: "representation-review-decision.v1", decisionId: `${namespace}.${scope}`, version: "1.0.0", scope, subjectContentDigest: contentDigest, subjectDependencyClosureDigest: closureDigest, reviewerRef: ref(`reviewer.${namespace}.${scope}`, String(index + 1)), outcome: "accepted", decidedAt: "2026-01-02T00:00:00.000Z", expiresAt: "2026-12-31T00:00:00.000Z", independentFromAuthor: true, notes: `Accepted ${scope} for this exact content and dependency closure.` })));
}
function dependencies(representation: Awaited<ReturnType<typeof compileRepresentationPackage>>, reviewDecisions: readonly RepresentationReviewDecisionV1[] = [], issuer?: ReturnType<typeof ref>): RepresentationDependencyV1[] {
  return [...requiredRepresentationDependencies(representation), ...reviewDecisions.flatMap((decision) => [{ kind: "reviewer" as const, ref: decision.reviewerRef }, ...(decision.reviewerOrganizationRef ? [{ kind: "reviewer-organization" as const, ref: decision.reviewerOrganizationRef }] : [])]), ...(issuer ? [{ kind: "withdrawal-issuer" as const, ref: issuer }] : [])];
}
async function reviewedSimulation(policy: RepresentationPolicyV1, overrides: Partial<PackageInput> = {}, namespace = "review") {
  const candidateInput = simulationInput(policy, overrides);
  const candidate = await compileRepresentationPackage(candidateInput); const reviewDecisions = await decisions(candidate.contentDigest, candidate.dependencyClosureDigest, namespace);
  const reviewed = await compileRepresentationPackage(simulationInput(policy, { ...overrides, governance: { reviewState: "reviewed", reviewDecisionRefs: reviewDecisions.map(representationReviewDecisionRef), withdrawalDecisionRef: null }, alternative: { ...candidateInput.alternative, reviewerDecisionRef: representationReviewDecisionRef(reviewDecisions.find((value) => value.scope === "access-equivalence")!) } }));
  return { candidate, reviewed, reviewDecisions };
}

function uniqueDependencies(...groups: readonly RepresentationDependencyV1[][]): RepresentationDependencyV1[] {
  const seen = new Set<string>();
  return groups.flat().filter((dependency) => {
    const key = `${dependency.kind}:${dependency.ref.id}@${dependency.ref.version}@${dependency.ref.digest}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

describe("W6-D representation registry", () => {
  it("canonically binds primary artifact and direct dependency closure without assignment authority", async () => {
    const policy = await compileRepresentationPolicy(); const one = await compileRepresentationPackage(simulationInput(policy)); const reordered = await compileRepresentationPackage(simulationInput(policy, { alternative: { ...simulationInput(policy).alternative, modalities: ["table", "text"] } }));
    const valid = await validateRepresentationPackage({ representation: one, policy, decisions: [], withdrawals: [], dependencies: dependencies(one), evaluationAt: EVALUATED_AT });
    const missing = await validateRepresentationPackage({ representation: one, policy, decisions: [], withdrawals: [], dependencies: dependencies(one).filter((value) => value.kind !== "runtime"), evaluationAt: EVALUATED_AT });
    expect(one.contentDigest).toBe(reordered.contentDigest); expect(one.dependencyClosureDigest).toBe(reordered.dependencyClosureDigest); expect(valid).toMatchObject({ status: "candidate", fixturePreviewAllowed: false, runtimeAssignmentAllowed: false, authorityTrust: "caller-asserted-unverified", issues: [] }); expect(missing.issues.map((value) => value.code)).toContain("dependency.missing"); expect(Object.isFrozen(one)).toBe(true);
  });

  it("makes review decisions exact immutable references and does not permit decision swapping", async () => {
    const policy = await compileRepresentationPolicy(); const { reviewed, reviewDecisions } = await reviewedSimulation(policy); const input = { policy, representations: [reviewed], decisions: reviewDecisions, withdrawals: [], dependencies: dependencies(reviewed, reviewDecisions), evaluationAt: EVALUATED_AT };
    const valid = await validateRepresentationPackage({ representation: reviewed, policy, decisions: reviewDecisions, withdrawals: [], dependencies: dependencies(reviewed, reviewDecisions), evaluationAt: EVALUATED_AT });
    const swapped = await compileRepresentationReviewDecision({ ...reviewDecisions[0]!, decisionDigest: undefined, notes: "A different immutable decision with the same string ID." });
    const invalid = await validateRepresentationPackage({ representation: reviewed, policy, decisions: [swapped, ...reviewDecisions.slice(1)], withdrawals: [], dependencies: dependencies(reviewed, [swapped, ...reviewDecisions.slice(1)]), evaluationAt: EVALUATED_AT });
    const choice = await chooseFixtureRepresentation(input, { ...reviewed.capabilityBinding, learnerAction: "predict", requiredConstructStatus: "preserves" });
    expect(valid).toMatchObject({ status: "reviewed-current", fixturePreviewAllowed: true, issues: [] }); expect(invalid.issues.map((value) => value.code)).toContain("review.decision-set-mismatch"); expect(choice).toMatchObject({ outcome: "fixture-choice", runtimeAssignmentAllowed: false, authorityTrust: "caller-asserted-unverified" });
  });

  it("revalidates a typed deterministic frame against the fixture runtime rather than labels", async () => {
    const policy = await compileRepresentationPolicy(); const { reviewed, reviewDecisions } = await reviewedSimulation(policy); const timeMs = 1_000; const elapsedSeconds = 1; const velocityMps = 11.5;
    const state = { schemaVersion: "fixture-motion-state.v1", runtime: reviewed.authority.authorityKind === "deterministic-validator" ? reviewed.authority.runtimeRef : null, validator: reviewed.authority.authorityKind === "deterministic-validator" ? reviewed.authority.validatorRef : null, seed: "authored-motion-v1", timeMs, elapsedSeconds, velocityMps };
    const numeric = { elapsedSeconds, velocityMps }; const graph = [{ timeMs: 0, velocityMps: 12 }, { timeMs, velocityMps }]; const text = "At 1.000 s, velocity is 11.500 m/s."; const table = [{ variable: "Elapsed time", value: "1.000", unit: "s" }, { variable: "Velocity", value: "11.500", unit: "m/s" }];
    const frame = { schemaVersion: "representation-frame.v1", representationRef: { packageId: reviewed.packageId, representationId: reviewed.representationId, version: reviewed.version, packageDigest: reviewed.packageDigest }, frameId: "frame.motion-1000", timeMs, stateDigest: await sha256Digest(canonicalJson(state)), projections: { numeric: { derivedFromStateDigest: await sha256Digest(canonicalJson(state)), outputDigest: await sha256Digest(canonicalJson(numeric)), payload: numeric }, graph: { derivedFromStateDigest: await sha256Digest(canonicalJson(state)), outputDigest: await sha256Digest(canonicalJson(graph)), payload: graph }, text: { derivedFromStateDigest: await sha256Digest(canonicalJson(state)), outputDigest: await sha256Digest(canonicalJson(text)), payload: text }, table: { derivedFromStateDigest: await sha256Digest(canonicalJson(state)), outputDigest: await sha256Digest(canonicalJson(table)), payload: table } } };
    const input = { frame, representation: reviewed, policy, decisions: reviewDecisions, withdrawals: [], dependencies: dependencies(reviewed, reviewDecisions), evaluationAt: EVALUATED_AT };
    const valid = await validateRepresentationFrame(input); const forged = await validateRepresentationFrame({ ...input, frame: { ...frame, timeMs: 1_001, projections: { ...frame.projections, text: { ...frame.projections.text, payload: "A label cannot stand in for derived state." } } } });
    expect(valid).toMatchObject({ coherent: true, authorityTrust: "caller-asserted-unverified", issues: [] }); expect(forged.issues.map((value) => value.code)).toEqual(expect.arrayContaining(["frame.off-fixed-timestep", "frame.projection-payload-mismatch"]));
  });

  it("replays withdrawal as-of its effective instant while preserving derived lifecycle status", async () => {
    const policy = await compileRepresentationPolicy(); const { reviewed, reviewDecisions } = await reviewedSimulation(policy); const issuer = ref("reviewer.withdrawal", "9");
    const record = await compileRepresentationWithdrawal({ schemaVersion: "representation-withdrawal.v1", withdrawalId: "withdrawal.motion-rights", version: "1.0.0", subjectContentRef: { id: reviewed.representationId, version: reviewed.version, digest: reviewed.contentDigest }, subjectContentDigest: reviewed.contentDigest, subjectDependencyClosureDigest: reviewed.dependencyClosureDigest, effectiveAt: "2026-07-01T00:00:00.000Z", issuedAt: "2026-06-02T00:00:00.000Z", issuerRef: issuer, reasonCode: "rights", notes: "Fixture withdrawal records a rights change." });
    const withdrawn = await compileRepresentationPackage(simulationInput(policy, { governance: { reviewState: "withdrawn", reviewDecisionRefs: reviewDecisions.map(representationReviewDecisionRef), withdrawalDecisionRef: representationWithdrawalRef(record) }, alternative: { ...simulationInput(policy).alternative, reviewerDecisionRef: representationReviewDecisionRef(reviewDecisions.find((value) => value.scope === "access-equivalence")!) } }));
    const before = await validateRepresentationPackage({ representation: withdrawn, policy, decisions: reviewDecisions, withdrawals: [record], dependencies: dependencies(withdrawn, reviewDecisions, issuer), evaluationAt: "2026-06-15T00:00:00.000Z" }); const after = await validateRepresentationPackage({ representation: withdrawn, policy, decisions: reviewDecisions, withdrawals: [record], dependencies: dependencies(withdrawn, reviewDecisions, issuer), evaluationAt: "2026-07-15T00:00:00.000Z" });
    expect(before).toMatchObject({ status: "reviewed-current", fixturePreviewAllowed: true }); expect(after).toMatchObject({ status: "withdrawn", fixturePreviewAllowed: false }); expect(after.issues.map((value) => value.code)).toContain("representation.withdrawn");
  });

  it("isolates exact package record views from foreign decisions, withdrawals, and dependencies", async () => {
    const policy = await compileRepresentationPolicy();
    const first = await reviewedSimulation(policy, {}, "review.first");
    const second = await reviewedSimulation(policy, {
      packageId: "representation-package.motion-secondary",
      representationId: "representation.motion-secondary",
      primaryArtifactRef: ref("artifact.motion-secondary", "8"),
      capabilityBinding: { capabilityId: "capability.motion-secondary", capabilityVersion: "1.0.0", mapNodeId: "map-node.motion-secondary" },
    }, "review.second");
    const foreignFutureDecision = await compileRepresentationReviewDecision({ ...first.reviewDecisions[0]!, decisionId: "review.foreign-future", decisionDigest: undefined, decidedAt: "2027-01-01T00:00:00.000Z", reviewerRef: ref("reviewer.foreign-future", "7") });
    const foreignIssuer = ref("reviewer.foreign-withdrawal", "6");
    const foreignWithdrawal = await compileRepresentationWithdrawal({ schemaVersion: "representation-withdrawal.v1", withdrawalId: "withdrawal.foreign-future", version: "1.0.0", subjectContentRef: { id: second.reviewed.representationId, version: second.reviewed.version, digest: second.reviewed.contentDigest }, subjectContentDigest: second.reviewed.contentDigest, subjectDependencyClosureDigest: second.reviewed.dependencyClosureDigest, effectiveAt: "2027-02-01T00:00:00.000Z", issuedAt: "2027-01-01T00:00:00.000Z", issuerRef: foreignIssuer, reasonCode: "foreign-record", notes: "This unrelated future record is not referenced by either reviewed package." });
    const registry = await evaluateRepresentationRegistry({
      policy,
      representations: [first.reviewed, second.reviewed],
      decisions: [...first.reviewDecisions, ...second.reviewDecisions, foreignFutureDecision],
      withdrawals: [foreignWithdrawal],
      dependencies: uniqueDependencies(
        dependencies(first.reviewed, first.reviewDecisions),
        dependencies(second.reviewed, second.reviewDecisions),
        [{ kind: "reviewer", ref: foreignFutureDecision.reviewerRef }, { kind: "withdrawal-issuer", ref: foreignIssuer }],
      ),
      evaluationAt: EVALUATED_AT,
    });
    expect(registry.issues).toEqual([]);
    expect(registry.entries).toHaveLength(2);
    expect(registry.entries.every((entry) => entry.validation.fixturePreviewAllowed && entry.validation.issues.length === 0)).toBe(true);

    const missingSecondArtifact = await evaluateRepresentationRegistry({
      policy,
      representations: [first.reviewed, second.reviewed],
      decisions: [...first.reviewDecisions, ...second.reviewDecisions],
      withdrawals: [],
      dependencies: uniqueDependencies(dependencies(first.reviewed, first.reviewDecisions), dependencies(second.reviewed, second.reviewDecisions)).filter((dependency) => dependency.ref.id !== "artifact.motion-secondary"),
      evaluationAt: EVALUATED_AT,
    });
    expect(missingSecondArtifact.entries.find((entry) => entry.representation.representationId === first.reviewed.representationId)?.validation.fixturePreviewAllowed).toBe(true);
    expect(missingSecondArtifact.entries.find((entry) => entry.representation.representationId === second.reviewed.representationId)?.validation.issues.map((issue) => issue.code)).toContain("dependency.missing");

    const duplicateRelevantDecision = await evaluateRepresentationRegistry({
      policy,
      representations: [first.reviewed, second.reviewed],
      decisions: [...first.reviewDecisions, first.reviewDecisions[0]!, ...second.reviewDecisions],
      withdrawals: [],
      dependencies: uniqueDependencies(dependencies(first.reviewed, first.reviewDecisions), dependencies(second.reviewed, second.reviewDecisions)),
      evaluationAt: EVALUATED_AT,
    });
    expect(duplicateRelevantDecision.entries.find((entry) => entry.representation.representationId === first.reviewed.representationId)?.validation.fixturePreviewAllowed).toBe(false);
    expect(duplicateRelevantDecision.entries.find((entry) => entry.representation.representationId === second.reviewed.representationId)?.validation.fixturePreviewAllowed).toBe(true);
  });

  it("reports frame support without implying an unrecognized runtime can derive frames", async () => {
    const policy = await compileRepresentationPolicy();
    const changedAuthority = { ...simulationInput(policy).authority, fixedTimestepMs: 40 } as PackageInput["authority"];
    const fixture = await reviewedSimulation(policy, { authority: changedAuthority }, "review.unrecognized-runtime");
    const choice = await chooseFixtureRepresentation({ policy, representations: [fixture.reviewed], decisions: fixture.reviewDecisions, withdrawals: [], dependencies: dependencies(fixture.reviewed, fixture.reviewDecisions), evaluationAt: EVALUATED_AT }, { ...fixture.reviewed.capabilityBinding, learnerAction: "predict" });
    expect(choice).toMatchObject({ outcome: "fixture-choice", frameSupport: "unsupported", frameSupportReason: "unrecognized-fixture-runtime", runtimeAssignmentAllowed: false });
  });

  it("rejects collisions for both package and representation versions and incomplete motion controls", async () => {
    const policy = await compileRepresentationPolicy(); const first = await reviewedSimulation(policy, {}, "review.collision-first"); const second = await reviewedSimulation(policy, { representationId: "representation.motion-duplicate", primaryArtifactRef: ref("artifact.motion-duplicate", "7") }, "review.collision-second"); const collision = await evaluateRepresentationRegistry({ policy, representations: [first.reviewed, second.reviewed], decisions: [...first.reviewDecisions, ...second.reviewDecisions], withdrawals: [], dependencies: uniqueDependencies(dependencies(first.reviewed, first.reviewDecisions), dependencies(second.reviewed, second.reviewDecisions)), evaluationAt: EVALUATED_AT });
    const incomplete = await compileRepresentationPackage(simulationInput(policy, { controls: { ...simulationInput(policy).controls, pauseAvailable: false, stepAvailable: false, resetAvailable: false } })); const invalid = await validateRepresentationPackage({ representation: incomplete, policy, decisions: [], withdrawals: [], dependencies: dependencies(incomplete), evaluationAt: EVALUATED_AT });
    expect(collision.issues.map((value) => value.code)).toContain("registry.package-version-collision"); expect(collision.entries).toHaveLength(2); expect(collision.entries.every((entry) => !entry.validation.fixturePreviewAllowed && entry.validation.issues.some((issue) => issue.code === "registry.identity-ineligible"))).toBe(true); expect(invalid.issues.map((value) => value.code)).toContain("representation.motion-controls-incomplete");
  });
});
