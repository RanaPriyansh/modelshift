import { z } from "zod";

import { deepFreeze } from "../deep-freeze";
import { canonicalJson, sha256Digest } from "../events";
import {
  REPRESENTATION_REVIEW_SCOPES,
  canonicalRepresentationContent,
  canonicalRepresentationPackage,
  canonicalRepresentationReviewDecision,
  canonicalRepresentationWithdrawal,
  representationDependencyClosureDigest,
  representationDependencySchema,
  representationFrameSchema,
  representationPackageSchema,
  representationPolicyDigest,
  representationPolicySchema,
  representationReviewDecisionRef,
  representationReviewDecisionSchema,
  representationWithdrawalRef,
  representationWithdrawalSchema,
  requiredRepresentationDependencies,
  type RepresentationDependencyV1,
  type RepresentationFrameV1,
  type RepresentationImmutableRefV1,
  type RepresentationPackageV1,
  type RepresentationPolicyV1,
  type RepresentationReviewDecisionV1,
  type RepresentationWithdrawalV1,
} from "./contracts";

z.config({ jitless: true });

export interface RepresentationValidationIssue { readonly code: string; readonly path: string; readonly message: string; }
export interface RepresentationValidationResult {
  readonly representation: RepresentationPackageV1 | null;
  readonly status: "invalid" | "candidate" | "reviewed-current" | "not-yet-valid" | "expired" | "withdrawn";
  readonly issues: readonly RepresentationValidationIssue[];
  readonly fixturePreviewAllowed: boolean;
  readonly runtimeAssignmentAllowed: false;
  readonly constructEffect: "preserves" | "changes" | "unknown";
  readonly authorityTrust: "caller-asserted-unverified";
}
export interface RepresentationFrameValidationResult { readonly frame: RepresentationFrameV1 | null; readonly coherent: boolean; readonly issues: readonly RepresentationValidationIssue[]; readonly authorityTrust: "caller-asserted-unverified"; }
export type RepresentationFixtureFrameSupport =
  | { readonly status: "supported"; readonly reasonCode: "authored-motion-fixture-v1" }
  | { readonly status: "unsupported"; readonly reasonCode: "not-a-stateful-simulation" | "unrecognized-fixture-runtime" };
type MutableIssue = { code: string; path: string; message: string };
const compare = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0;
const refIdentity = (ref: RepresentationImmutableRefV1) => `${ref.id}@${ref.version}@${ref.digest}`;
const dependencyIdentity = (value: RepresentationDependencyV1) => `${value.kind}:${refIdentity(value.ref)}`;
const add = (issues: MutableIssue[], code: string, path: string, message: string) => issues.push({ code, path, message });
const stable = (issues: readonly MutableIssue[]): readonly RepresentationValidationIssue[] => deepFreeze([...issues].sort((left, right) => compare(left.code, right.code) || compare(left.path, right.path) || compare(left.message, right.message)));
function appendSchemaIssues(issues: MutableIssue[], prefix: string, error: z.ZodError) { for (const issue of error.issues) add(issues, `${prefix}.schema`, issue.path.map(String).join("."), issue.message); }

const validationInputSchema = z.strictObject({ representation: z.unknown(), policy: z.unknown(), decisions: z.array(z.unknown()).max(32), withdrawals: z.array(z.unknown()).max(32), dependencies: z.array(representationDependencySchema).max(128), evaluationAt: z.string().datetime({ offset: true }) });
const frameValidationInputSchema = z.strictObject({ frame: z.unknown(), representation: z.unknown(), policy: z.unknown(), decisions: z.array(z.unknown()).max(32), withdrawals: z.array(z.unknown()).max(32), dependencies: z.array(representationDependencySchema).max(128), evaluationAt: z.string().datetime({ offset: true }) });

type KindContract = { production: readonly RepresentationPackageV1["productionMethod"][]; epistemicRole: RepresentationPackageV1["epistemicRole"]; authorityKind: RepresentationPackageV1["authority"]["authorityKind"] };
const KIND_CONTRACTS: Readonly<Record<RepresentationPackageV1["kind"], KindContract>> = deepFreeze({
  observation: { production: ["captured-world"], epistemicRole: "empirical-observation", authorityKind: "observation-source" },
  measurement: { production: ["instrument-recorded"], epistemicRole: "derived-measurement", authorityKind: "measurement-source" },
  simulation: { production: ["deterministic-code"], epistemicRole: "validated-model-output", authorityKind: "deterministic-validator" },
  diagram: { production: ["human-authored", "model-generated"], epistemicRole: "explanatory-structure", authorityKind: "reviewed-explanation" },
  reconstruction: { production: ["human-authored", "model-generated"], epistemicRole: "source-bound-reconstruction", authorityKind: "source-bound-reconstruction" },
  analogy: { production: ["human-authored", "model-generated"], epistemicRole: "analogy-only", authorityKind: "bounded-analogy" },
});

async function policyIssues(policy: RepresentationPolicyV1, issues: MutableIssue[]) {
  if (policy.digest !== await representationPolicyDigest(policy)) add(issues, "policy.digest-mismatch", "policy.digest", "Representation policy digest does not match its canonical payload.");
  if (policy.requiredReviewScopes.length !== REPRESENTATION_REVIEW_SCOPES.length || policy.requiredReviewScopes.some((scope, index) => scope !== REPRESENTATION_REVIEW_SCOPES[index])) add(issues, "policy.scope-downgrade", "policy.requiredReviewScopes", "The complete fixed review scope set is mandatory.");
}
async function packageDigestIssues(representation: RepresentationPackageV1, issues: MutableIssue[]) {
  const expectedClosure = await representationDependencyClosureDigest(representation);
  if (representation.dependencyClosureDigest !== expectedClosure) add(issues, "representation.dependency-closure-digest-mismatch", "dependencyClosureDigest", "Dependency closure digest does not match the canonical direct dependency closure.");
  if (representation.contentDigest !== await sha256Digest(canonicalJson(canonicalRepresentationContent(representation)))) add(issues, "representation.content-digest-mismatch", "contentDigest", "Content digest does not match the canonical representation content.");
  if (representation.packageDigest !== await sha256Digest(canonicalJson(canonicalRepresentationPackage(representation)))) add(issues, "representation.package-digest-mismatch", "packageDigest", "Package digest does not match the canonical governed package.");
}
function epistemicIssues(representation: RepresentationPackageV1, policy: RepresentationPolicyV1, issues: MutableIssue[]) {
  const expected = KIND_CONTRACTS[representation.kind];
  if (!expected.production.includes(representation.productionMethod)) add(issues, "representation.production-kind-mismatch", "productionMethod", `Production method is not permitted for ${representation.kind}.`);
  if (representation.epistemicRole !== expected.epistemicRole) add(issues, "representation.epistemic-role-mismatch", "epistemicRole", `${representation.kind} must retain its bounded epistemic role.`);
  if (representation.authority.authorityKind !== expected.authorityKind) add(issues, "representation.authority-kind-mismatch", "authority.authorityKind", `${representation.kind} requires the matching source or validator authority.`);
  if (representation.productionMethod === "model-generated" && !policy.generatedMediaAllowedKinds.includes(representation.kind as "diagram" | "reconstruction" | "analogy")) add(issues, "representation.generated-empirical-prohibited", "productionMethod", "Generated media can never become observation, measurement, simulation state, or empirical evidence.");
  if ((representation.kind === "measurement" || representation.kind === "simulation") && representation.variables.length === 0) add(issues, "representation.variables-missing", "variables", "Measurement and simulation representations require named variables and units.");
  if (representation.controls.motionPresent) {
    if (!representation.controls.pauseAvailable || !representation.controls.stepAvailable || !representation.controls.resetAvailable) add(issues, "representation.motion-controls-incomplete", "controls", "Motion requires pause, step, and reset controls.");
    if (representation.controls.scrubAvailable && !policy.motionScrubPermitted) add(issues, "representation.motion-scrub-not-permitted", "controls.scrubAvailable", "Scrubbing is available only when the fixed policy explicitly permits it.");
    if (representation.alternative.synchronization !== "same-state-frame") add(issues, "representation.motion-alternative-unsynchronized", "alternative.synchronization", "Motion requires a same-state text/table alternative.");
  }
  if (!representation.learnerAction.occursBeforeExplanation) add(issues, "representation.learner-action-late", "learnerAction.occursBeforeExplanation", "The learner action must occur before the explanatory operation.");
}
function exactDependencySnapshot(expected: readonly RepresentationDependencyV1[], supplied: readonly RepresentationDependencyV1[], issues: MutableIssue[]) {
  const expectedKeys = new Set(expected.map(dependencyIdentity));
  const suppliedCounts = new Map<string, number>();
  supplied.forEach((value) => suppliedCounts.set(dependencyIdentity(value), (suppliedCounts.get(dependencyIdentity(value)) ?? 0) + 1));
  for (const [key, count] of suppliedCounts) {
    if (count !== 1) add(issues, "dependency.duplicate", `dependencies.${key}`, "Every dependency tuple must resolve exactly once.");
    if (!expectedKeys.has(key)) add(issues, "dependency.unexpected", `dependencies.${key}`, "A supplied dependency is not referenced by this immutable package or review record.");
  }
  for (const key of expectedKeys) if (suppliedCounts.get(key) !== 1) add(issues, "dependency.missing", `dependencies.${key}`, "Every referenced immutable dependency must resolve exactly once in the supplied snapshot.");
}
function timingStatus(representation: RepresentationPackageV1, evaluationAt: string, issues: MutableIssue[]): RepresentationValidationResult["status"] {
  const starts = Date.parse(representation.validFrom); const expires = Date.parse(representation.expiresAt); const evaluated = Date.parse(evaluationAt);
  if (expires <= starts) { add(issues, "representation.invalid-validity-window", "expiresAt", "Representation expiry must be later than its start."); return "invalid"; }
  if (expires - starts > 365 * 24 * 60 * 60 * 1_000) add(issues, "representation.validity-too-long", "expiresAt", "A reviewed representation must be revalidated within 365 days.");
  if (evaluated < starts) return "not-yet-valid";
  if (evaluated >= expires) return "expired";
  if (representation.governance.reviewState === "candidate") return "candidate";
  return "reviewed-current";
}
async function decisionIssues(representation: RepresentationPackageV1, decisions: readonly RepresentationReviewDecisionV1[], evaluationAt: string, issues: MutableIssue[]): Promise<readonly RepresentationDependencyV1[]> {
  const expectedRefs = representation.governance.reviewDecisionRefs;
  const byRef = new Map<string, RepresentationReviewDecisionV1>();
  for (const decision of decisions) {
    const exactRef = representationReviewDecisionRef(decision);
    if (decision.decisionDigest !== await sha256Digest(canonicalJson(canonicalRepresentationReviewDecision(decision)))) add(issues, "review.decision-digest-mismatch", `decisions.${decision.decisionId}.decisionDigest`, "Decision digest does not match the immutable decision payload.");
    if (byRef.has(refIdentity(exactRef))) add(issues, "review.duplicate-decision-ref", `decisions.${decision.decisionId}`, "A decision reference may occur only once.");
    byRef.set(refIdentity(exactRef), decision);
  }
  if (representation.governance.reviewState === "candidate") { if (decisions.length > 0) add(issues, "review.candidate-has-decisions", "decisions", "Candidate packages do not carry accepted review authority."); return []; }
  if (expectedRefs.length !== decisions.length || expectedRefs.some((ref) => !byRef.has(refIdentity(ref)))) add(issues, "review.decision-set-mismatch", "governance.reviewDecisionRefs", "Supplied review decisions must exactly match immutable package decision references.");
  const scopeCounts = new Map<string, number>(); const dependencies: RepresentationDependencyV1[] = [];
  for (const decision of decisions) {
    scopeCounts.set(decision.scope, (scopeCounts.get(decision.scope) ?? 0) + 1);
    if (decision.subjectContentDigest !== representation.contentDigest) add(issues, "review.subject-mismatch", `decisions.${decision.decisionId}.subjectContentDigest`, "A review decision must bind the exact content digest.");
    if (decision.subjectDependencyClosureDigest !== representation.dependencyClosureDigest) add(issues, "review.dependency-closure-mismatch", `decisions.${decision.decisionId}.subjectDependencyClosureDigest`, "A review decision must bind the exact dependency closure digest.");
    if (decision.outcome !== "accepted") add(issues, "review.not-accepted", `decisions.${decision.decisionId}.outcome`, "Every required review scope must be accepted.");
    if (Date.parse(decision.decidedAt) > Date.parse(evaluationAt)) add(issues, "review.future-decision", `decisions.${decision.decisionId}.decidedAt`, "A future review decision is not current authority.");
    if (Date.parse(decision.expiresAt) <= Date.parse(evaluationAt)) add(issues, "review.expired", `decisions.${decision.decisionId}.expiresAt`, "Every review decision must be current.");
    if (Date.parse(decision.expiresAt) < Date.parse(representation.expiresAt)) add(issues, "review.expires-before-package", `decisions.${decision.decisionId}.expiresAt`, "Review authority must cover the full package validity window.");
    dependencies.push({ kind: "reviewer", ref: decision.reviewerRef }); if (decision.reviewerOrganizationRef) dependencies.push({ kind: "reviewer-organization", ref: decision.reviewerOrganizationRef });
  }
  for (const scope of REPRESENTATION_REVIEW_SCOPES) if (scopeCounts.get(scope) !== 1) add(issues, "review.scope-incomplete", `decisions.${scope}`, `Exactly one ${scope} decision is required.`);
  const accessDecision = decisions.find((decision) => decision.scope === "access-equivalence");
  if (!accessDecision || refIdentity(representationReviewDecisionRef(accessDecision)) !== refIdentity(representation.alternative.reviewerDecisionRef)) add(issues, "review.alternative-unbound", "alternative.reviewerDecisionRef", "The synchronized alternative must bind the exact immutable access-equivalence decision.");
  return dependencies;
}
async function withdrawalIssues(representation: RepresentationPackageV1, withdrawals: readonly RepresentationWithdrawalV1[], evaluationAt: string, issues: MutableIssue[]): Promise<{ status: RepresentationValidationResult["status"] | null; dependencies: readonly RepresentationDependencyV1[] }> {
  if (representation.governance.reviewState !== "withdrawn") { if (withdrawals.length > 0) add(issues, "withdrawal.unexpected", "withdrawals", "Only a withdrawn package may carry an applicable withdrawal record."); return { status: null, dependencies: [] }; }
  const requestedRef = representation.governance.withdrawalDecisionRef;
  const record = withdrawals.find((value) => refIdentity(representationWithdrawalRef(value)) === refIdentity(requestedRef));
  if (!record || withdrawals.length !== 1) { add(issues, "withdrawal.record-missing", "governance.withdrawalDecisionRef", "The withdrawn package requires exactly one matching immutable withdrawal record."); return { status: "withdrawn", dependencies: [] }; }
  if (record.withdrawalDigest !== await sha256Digest(canonicalJson(canonicalRepresentationWithdrawal(record)))) add(issues, "withdrawal.digest-mismatch", "withdrawals.withdrawalDigest", "Withdrawal digest does not match the immutable record.");
  if (record.subjectContentRef.id !== representation.representationId || record.subjectContentRef.version !== representation.version || record.subjectContentRef.digest !== representation.contentDigest || record.subjectContentDigest !== representation.contentDigest || record.subjectDependencyClosureDigest !== representation.dependencyClosureDigest) add(issues, "withdrawal.subject-mismatch", "withdrawals.subjectContentRef", "Withdrawal must bind this exact content identity and dependency closure.");
  if (Date.parse(record.issuedAt) > Date.parse(evaluationAt)) add(issues, "withdrawal.future-issued", "withdrawals.issuedAt", "A withdrawal record cannot be used before issuance.");
  return { status: Date.parse(evaluationAt) >= Date.parse(record.effectiveAt) ? "withdrawn" : "reviewed-current", dependencies: [{ kind: "withdrawal-issuer", ref: record.issuerRef }] };
}
function result(representation: RepresentationPackageV1 | null, status: RepresentationValidationResult["status"], issues: MutableIssue[]): Readonly<RepresentationValidationResult> {
  const finalIssues = stable(issues); const temporalStatus = status === "expired" || status === "withdrawn" || status === "not-yet-valid";
  return deepFreeze({ representation, status: temporalStatus ? status : finalIssues.length > 0 ? "invalid" : status, issues: finalIssues, fixturePreviewAllowed: status === "reviewed-current" && finalIssues.length === 0, runtimeAssignmentAllowed: false as const, constructEffect: representation?.alternative.constructStatus ?? "unknown", authorityTrust: "caller-asserted-unverified" as const });
}
export async function validateRepresentationPackage(input: unknown): Promise<Readonly<RepresentationValidationResult>> {
  const inputResult = validationInputSchema.safeParse(input); const issues: MutableIssue[] = [];
  if (!inputResult.success) { appendSchemaIssues(issues, "input", inputResult.error); return result(null, "invalid", issues); }
  const representationResult = representationPackageSchema.safeParse(inputResult.data.representation); const policyResult = representationPolicySchema.safeParse(inputResult.data.policy); const decisionsResult = z.array(representationReviewDecisionSchema).max(32).safeParse(inputResult.data.decisions); const withdrawalsResult = z.array(representationWithdrawalSchema).max(32).safeParse(inputResult.data.withdrawals);
  if (!representationResult.success) appendSchemaIssues(issues, "representation", representationResult.error); if (!policyResult.success) appendSchemaIssues(issues, "policy", policyResult.error); if (!decisionsResult.success) appendSchemaIssues(issues, "decisions", decisionsResult.error); if (!withdrawalsResult.success) appendSchemaIssues(issues, "withdrawals", withdrawalsResult.error);
  if (!representationResult.success || !policyResult.success || !decisionsResult.success || !withdrawalsResult.success) return result(representationResult.success ? representationResult.data : null, "invalid", issues);
  const representation = representationResult.data; const policy = policyResult.data;
  await policyIssues(policy, issues); await packageDigestIssues(representation, issues);
  if (representation.policyRef.id !== policy.id || representation.policyRef.version !== policy.version || representation.policyRef.digest !== policy.digest) add(issues, "representation.policy-reference-mismatch", "policyRef", "The representation must bind the exact fixed policy.");
  epistemicIssues(representation, policy, issues);
  const reviewDependencies = await decisionIssues(representation, decisionsResult.data, inputResult.data.evaluationAt, issues);
  const withdrawal = await withdrawalIssues(representation, withdrawalsResult.data, inputResult.data.evaluationAt, issues);
  exactDependencySnapshot([...requiredRepresentationDependencies(representation), ...reviewDependencies, ...withdrawal.dependencies], inputResult.data.dependencies, issues);
  let status = timingStatus(representation, inputResult.data.evaluationAt, issues); if (withdrawal.status && status === "reviewed-current") status = withdrawal.status;
  if (status === "expired") add(issues, "representation.expired", "expiresAt", "Expired representations fail closed."); if (status === "not-yet-valid") add(issues, "representation.not-yet-valid", "validFrom", "A representation cannot be used before its validity window."); if (status === "withdrawn") add(issues, "representation.withdrawn", "governance.withdrawalDecisionRef", "Withdrawn representations fail closed.");
  return result(representation, status, issues);
}

type FixtureDerived = { state: object; numeric: Record<string, number>; graph: readonly { timeMs: number; velocityMps: number }[]; text: string; table: readonly { variable: string; value: string; unit: string }[] };
function isFixtureMotionAuthority(representation: RepresentationPackageV1): boolean {
  const authority = representation.authority;
  return representation.kind === "simulation" &&
    authority.authorityKind === "deterministic-validator" &&
    authority.validatorRef.id === "validator.motion" &&
    authority.validatorRef.version === "1.0.0" &&
    authority.validatorRef.digest === `sha256:${"b".repeat(64)}` &&
    authority.runtimeRef.id === "runtime.motion" &&
    authority.runtimeRef.version === "1.0.0" &&
    authority.runtimeRef.digest === `sha256:${"c".repeat(64)}` &&
    authority.deterministic === true &&
    authority.fixedTimestepMs === 20 &&
    authority.seedMode === "fixed" &&
    authority.fixedSeed === "authored-motion-v1" &&
    authority.coherenceMode === "same-state-frame";
}

export function representationFixtureFrameSupport(
  representation: RepresentationPackageV1,
): Readonly<RepresentationFixtureFrameSupport> {
  if (representation.kind !== "simulation" || representation.authority.authorityKind !== "deterministic-validator") {
    return deepFreeze({ status: "unsupported" as const, reasonCode: "not-a-stateful-simulation" as const });
  }
  return isFixtureMotionAuthority(representation)
    ? deepFreeze({ status: "supported" as const, reasonCode: "authored-motion-fixture-v1" as const })
    : deepFreeze({ status: "unsupported" as const, reasonCode: "unrecognized-fixture-runtime" as const });
}
function deriveFixtureMotion(representation: RepresentationPackageV1, timeMs: number): FixtureDerived | null {
  if (representation.kind !== "simulation" || representation.authority.authorityKind !== "deterministic-validator" || !isFixtureMotionAuthority(representation)) return null;
  const elapsedSeconds = Number((timeMs / 1_000).toFixed(3)); const velocityMps = Number((12 - elapsedSeconds * 0.5).toFixed(3)); const seed = representation.authority.seedMode === "fixed" ? representation.authority.fixedSeed : null;
  return deepFreeze({ state: { schemaVersion: "fixture-motion-state.v1", runtime: representation.authority.runtimeRef, validator: representation.authority.validatorRef, seed, timeMs, elapsedSeconds, velocityMps }, numeric: { elapsedSeconds, velocityMps }, graph: [{ timeMs: 0, velocityMps: 12 }, ...(timeMs === 0 ? [] : [{ timeMs, velocityMps }])], text: `At ${elapsedSeconds.toFixed(3)} s, velocity is ${velocityMps.toFixed(3)} m/s.`, table: [{ variable: "Elapsed time", value: elapsedSeconds.toFixed(3), unit: "s" }, { variable: "Velocity", value: velocityMps.toFixed(3), unit: "m/s" }] });
}
async function outputDigest(payload: unknown) { return sha256Digest(canonicalJson(payload)); }
export async function validateRepresentationFrame(input: unknown): Promise<Readonly<RepresentationFrameValidationResult>> {
  const inputResult = frameValidationInputSchema.safeParse(input); const issues: MutableIssue[] = [];
  if (!inputResult.success) { appendSchemaIssues(issues, "input", inputResult.error); return deepFreeze({ frame: null, coherent: false, issues: stable(issues), authorityTrust: "caller-asserted-unverified" as const }); }
  const frameResult = representationFrameSchema.safeParse(inputResult.data.frame); if (!frameResult.success) appendSchemaIssues(issues, "frame", frameResult.error);
  const packageResult = await validateRepresentationPackage({ representation: inputResult.data.representation, policy: inputResult.data.policy, decisions: inputResult.data.decisions, withdrawals: inputResult.data.withdrawals, dependencies: inputResult.data.dependencies, evaluationAt: inputResult.data.evaluationAt });
  if (!frameResult.success || !packageResult.representation) return deepFreeze({ frame: frameResult.success ? frameResult.data : null, coherent: false, issues: stable([...issues, ...packageResult.issues]), authorityTrust: "caller-asserted-unverified" as const });
  const frame = frameResult.data; const representation = packageResult.representation;
  if (packageResult.status !== "reviewed-current" || !packageResult.fixturePreviewAllowed) add(issues, "frame.package-ineligible", "representation", "Frames require a current, fully revalidated fixture package.");
  if (frame.representationRef.packageId !== representation.packageId || frame.representationRef.representationId !== representation.representationId || frame.representationRef.version !== representation.version || frame.representationRef.packageDigest !== representation.packageDigest) add(issues, "frame.representation-reference-mismatch", "representationRef", "A frame must bind the exact package and representation tuple.");
  const authority = representation.authority; if (authority.authorityKind !== "deterministic-validator" || !isFixtureMotionAuthority(representation)) add(issues, "frame.unknown-fixture-validator", "representation.authority", "Only the narrow authored deterministic fixture validator registry may validate frames.");
  if (authority.authorityKind === "deterministic-validator" && frame.timeMs % authority.fixedTimestepMs !== 0) add(issues, "frame.off-fixed-timestep", "timeMs", "Frame time must be an exact multiple of the fixed deterministic timestep.");
  const derived = deriveFixtureMotion(representation, frame.timeMs);
  if (!derived) add(issues, "frame.derivation-unavailable", "representation.authority", "No deterministic authored fixture runtime can derive this frame.");
  if (derived) {
    const expectedStateDigest = await sha256Digest(canonicalJson(derived.state)); if (frame.stateDigest !== expectedStateDigest) add(issues, "frame.state-digest-mismatch", "stateDigest", "Frame state must be derived by the fixed fixture runtime.");
    if (frame.frameId !== `frame.motion-${frame.timeMs}`) add(issues, "frame.id-mismatch", "frameId", "Fixture frame identity must be derived from its exact deterministic time.");
    for (const [key, value, expected] of [["numeric", frame.projections.numeric, derived.numeric], ["graph", frame.projections.graph, derived.graph], ["text", frame.projections.text, derived.text], ["table", frame.projections.table, derived.table]] as const) {
      if (value.derivedFromStateDigest !== frame.stateDigest) add(issues, "frame.state-disagreement", `projections.${key}.derivedFromStateDigest`, "State, numeric output, graph, text, and table must derive from the same deterministic frame.");
      if (canonicalJson(value.payload) !== canonicalJson(expected)) add(issues, "frame.projection-payload-mismatch", `projections.${key}.payload`, "Projection payload must match the deterministic fixture state.");
      if (value.outputDigest !== await outputDigest(expected)) add(issues, "frame.projection-digest-mismatch", `projections.${key}.outputDigest`, "Projection digest must match the deterministic fixture payload.");
    }
  }
  return deepFreeze({ frame, coherent: issues.length === 0, issues: stable([...issues, ...packageResult.issues]), authorityTrust: "caller-asserted-unverified" as const });
}
