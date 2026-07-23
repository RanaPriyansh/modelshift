import { z } from "zod";

import { deepFreeze } from "../deep-freeze";
import { canonicalJson, forgeEventDigestSchema, sha256Digest } from "../events";

z.config({ jitless: true });

export const REPRESENTATION_PACKAGE_SCHEMA_VERSION = "representation-package.v1" as const;
export const REPRESENTATION_POLICY_SCHEMA_VERSION = "representation-policy.v1" as const;
export const REPRESENTATION_FRAME_SCHEMA_VERSION = "representation-frame.v1" as const;
export const REPRESENTATION_WITHDRAWAL_SCHEMA_VERSION = "representation-withdrawal.v1" as const;

export const REPRESENTATION_REVIEW_SCOPES = [
  "domain-accuracy",
  "epistemic-status",
  "access-equivalence",
  "safety-rights",
] as const;

const semverSchema = z.string().regex(/^\d+\.\d+\.\d+$/);
const codeSchema = z.string().trim().min(1).max(180).regex(/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/);
const timestampSchema = z.string().datetime({ offset: true });
const representationIdSchema = z.string().regex(/^representation\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const packageIdSchema = z.string().regex(/^representation-package\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const capabilityIdSchema = z.string().regex(/^capability\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const mapNodeIdSchema = z.string().regex(/^map-node\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const compare = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0;

function uniqueStrings<T extends z.ZodTypeAny>(item: T, minimum = 0, maximum = 64) {
  return z.array(item).min(minimum).max(maximum).superRefine((values, context) => {
    const seen = new Set<string>();
    values.forEach((value, index) => {
      const identity = String(value);
      if (seen.has(identity)) context.addIssue({ code: "custom", path: [index], message: `Duplicate value: ${identity}` });
      seen.add(identity);
    });
  });
}

function uniqueBy<T extends z.ZodTypeAny>(item: T, identity: (value: z.infer<T>) => string, minimum = 0, maximum = 64) {
  return z.array(item).min(minimum).max(maximum).superRefine((values, context) => {
    const seen = new Set<string>();
    values.forEach((value, index) => {
      const key = identity(value);
      if (seen.has(key)) context.addIssue({ code: "custom", path: [index], message: `Duplicate identity: ${key}` });
      seen.add(key);
    });
  });
}

export const representationImmutableRefSchema = z.strictObject({
  id: codeSchema,
  version: semverSchema,
  digest: forgeEventDigestSchema,
});
export type RepresentationImmutableRefV1 = z.infer<typeof representationImmutableRefSchema>;

export const representationDependencyKindSchema = z.enum([
  "policy", "primary-artifact", "source", "capture-protocol", "measurement-protocol", "instrument", "calibration",
  "validator", "runtime", "reconstruction-method", "text-template", "table-schema", "reviewer", "reviewer-organization", "withdrawal-issuer",
]);
export type RepresentationDependencyKindV1 = z.infer<typeof representationDependencyKindSchema>;
export const representationDependencySchema = z.strictObject({ kind: representationDependencyKindSchema, ref: representationImmutableRefSchema });
export type RepresentationDependencyV1 = z.infer<typeof representationDependencySchema>;
const dependencyIdentity = (value: RepresentationDependencyV1) => `${value.kind}:${value.ref.id}@${value.ref.version}@${value.ref.digest}`;

export const representationKindSchema = z.enum(["observation", "measurement", "simulation", "diagram", "reconstruction", "analogy"]);
export type RepresentationKindV1 = z.infer<typeof representationKindSchema>;
export const representationProductionMethodSchema = z.enum(["captured-world", "instrument-recorded", "deterministic-code", "human-authored", "model-generated"]);
export type RepresentationProductionMethodV1 = z.infer<typeof representationProductionMethodSchema>;
export const epistemicRoleSchema = z.enum(["empirical-observation", "derived-measurement", "validated-model-output", "explanatory-structure", "source-bound-reconstruction", "analogy-only"]);
export type RepresentationEpistemicRoleV1 = z.infer<typeof epistemicRoleSchema>;

const observationAuthoritySchema = z.strictObject({ authorityKind: z.literal("observation-source"), sourceRecordRef: representationImmutableRefSchema, captureProtocolRef: representationImmutableRefSchema, capturedAt: timestampSchema, originalMediaDigest: forgeEventDigestSchema });
const measurementAuthoritySchema = z.strictObject({ authorityKind: z.literal("measurement-source"), sourceRecordRef: representationImmutableRefSchema, measurementProtocolRef: representationImmutableRefSchema, instrumentRef: representationImmutableRefSchema, calibrationRef: representationImmutableRefSchema });
const simulationAuthoritySchema = z.strictObject({ authorityKind: z.literal("deterministic-validator"), validatorRef: representationImmutableRefSchema, runtimeRef: representationImmutableRefSchema, deterministic: z.literal(true), fixedTimestepMs: z.number().int().positive().max(60_000), seedMode: z.enum(["none", "fixed"]), fixedSeed: z.string().min(1).max(128).optional(), coherenceMode: z.literal("same-state-frame") }).superRefine((value, context) => {
  if (value.seedMode === "fixed" && !value.fixedSeed) context.addIssue({ code: "custom", path: ["fixedSeed"], message: "A fixed simulation seed must be recorded." });
  if (value.seedMode === "none" && value.fixedSeed) context.addIssue({ code: "custom", path: ["fixedSeed"], message: "A seed is not permitted when seedMode is none." });
});
const explanatoryAuthoritySchema = z.strictObject({ authorityKind: z.literal("reviewed-explanation"), sourceRefs: uniqueBy(representationImmutableRefSchema, (value) => `${value.id}@${value.version}@${value.digest}`, 1, 32), claimCodes: uniqueStrings(codeSchema, 1, 64) });
const reconstructionAuthoritySchema = z.strictObject({ authorityKind: z.literal("source-bound-reconstruction"), sourceRefs: uniqueBy(representationImmutableRefSchema, (value) => `${value.id}@${value.version}@${value.digest}`, 1, 32), reconstructionMethodRef: representationImmutableRefSchema, uncertaintyStatement: z.string().trim().min(1).max(1_200) });
const analogyAuthoritySchema = z.strictObject({ authorityKind: z.literal("bounded-analogy"), sourceConceptRefs: uniqueBy(representationImmutableRefSchema, (value) => `${value.id}@${value.version}@${value.digest}`, 1, 16), similarityStatement: z.string().trim().min(1).max(1_200), breakPointStatement: z.string().trim().min(1).max(1_200) });
export const representationAuthoritySchema = z.discriminatedUnion("authorityKind", [observationAuthoritySchema, measurementAuthoritySchema, simulationAuthoritySchema, explanatoryAuthoritySchema, reconstructionAuthoritySchema, analogyAuthoritySchema]);
export type RepresentationAuthorityV1 = z.infer<typeof representationAuthoritySchema>;

export const representationVariableSchema = z.strictObject({ id: codeSchema, learnerLabel: z.string().trim().min(1).max(240), valueKind: z.enum(["scalar", "vector", "category", "text"]), unit: z.string().trim().min(1).max(80), unitMeaning: z.string().trim().min(1).max(400) });
export type RepresentationVariableV1 = z.infer<typeof representationVariableSchema>;
const boundedStatementSchema = z.strictObject({ id: codeSchema, statement: z.string().trim().min(1).max(1_200), learnerConsequence: z.string().trim().min(1).max(1_200) });
export const representationControlsSchema = z.strictObject({ motionPresent: z.boolean(), keyboardOperable: z.literal(true), pauseAvailable: z.boolean(), stepAvailable: z.boolean(), resetAvailable: z.boolean(), scrubAvailable: z.boolean(), reducedMotionEquivalent: z.literal(true), colorIndependentMeaning: z.literal(true), minimumViewportCssPx: z.literal(320), textualControlInstructions: z.string().trim().min(1).max(1_200) });
export type RepresentationControlsV1 = z.infer<typeof representationControlsSchema>;
export const representationAlternativeSchema = z.strictObject({ id: codeSchema, modalities: uniqueStrings(z.enum(["text", "table", "audio", "tactile"]), 2, 4), synchronization: z.enum(["static-exact", "same-state-frame"]), constructStatus: z.enum(["preserves", "changes"]), constructStatement: z.string().trim().min(1).max(1_200), textTemplateRef: representationImmutableRefSchema, tableSchemaRef: representationImmutableRefSchema, reviewerDecisionRef: representationImmutableRefSchema }).superRefine((alternative, context) => {
  if (!alternative.modalities.includes("text") || !alternative.modalities.includes("table")) context.addIssue({ code: "custom", path: ["modalities"], message: "Every representation requires both synchronized text and table alternatives." });
});
export type RepresentationAlternativeV1 = z.infer<typeof representationAlternativeSchema>;
export const representationLearnerActionSchema = z.strictObject({ action: z.enum(["predict", "manipulate", "compare", "measure", "annotate", "explain", "reconstruct"]), prompt: z.string().trim().min(1).max(1_200), responseKind: z.enum(["commitment", "selection", "numeric", "annotation", "explanation"]), occursBeforeExplanation: z.boolean() });
export type RepresentationLearnerActionV1 = z.infer<typeof representationLearnerActionSchema>;

export const representationReviewDecisionSchema = z.strictObject({
  schemaVersion: z.literal("representation-review-decision.v1"), decisionId: codeSchema, version: z.literal("1.0.0"), decisionDigest: forgeEventDigestSchema,
  scope: z.enum(REPRESENTATION_REVIEW_SCOPES), subjectContentDigest: forgeEventDigestSchema, subjectDependencyClosureDigest: forgeEventDigestSchema,
  reviewerRef: representationImmutableRefSchema, reviewerOrganizationRef: representationImmutableRefSchema.optional(), outcome: z.enum(["accepted", "rejected"]), decidedAt: timestampSchema, expiresAt: timestampSchema, independentFromAuthor: z.literal(true), notes: z.string().trim().min(1).max(2_000),
});
export type RepresentationReviewDecisionV1 = z.infer<typeof representationReviewDecisionSchema>;
export const representationWithdrawalSchema = z.strictObject({
  schemaVersion: z.literal(REPRESENTATION_WITHDRAWAL_SCHEMA_VERSION), withdrawalId: codeSchema, version: z.literal("1.0.0"), withdrawalDigest: forgeEventDigestSchema,
  subjectContentRef: representationImmutableRefSchema, subjectContentDigest: forgeEventDigestSchema, subjectDependencyClosureDigest: forgeEventDigestSchema,
  effectiveAt: timestampSchema, issuedAt: timestampSchema, issuerRef: representationImmutableRefSchema, reasonCode: codeSchema, notes: z.string().trim().min(1).max(2_000),
});
export type RepresentationWithdrawalV1 = z.infer<typeof representationWithdrawalSchema>;

const candidateGovernanceSchema = z.strictObject({ reviewState: z.literal("candidate"), reviewDecisionRefs: z.tuple([]), withdrawalDecisionRef: z.null() });
const reviewedGovernanceSchema = z.strictObject({ reviewState: z.literal("reviewed"), reviewDecisionRefs: uniqueBy(representationImmutableRefSchema, (value) => `${value.id}@${value.version}@${value.digest}`, REPRESENTATION_REVIEW_SCOPES.length, REPRESENTATION_REVIEW_SCOPES.length), withdrawalDecisionRef: z.null() });
const withdrawnGovernanceSchema = z.strictObject({ reviewState: z.literal("withdrawn"), reviewDecisionRefs: uniqueBy(representationImmutableRefSchema, (value) => `${value.id}@${value.version}@${value.digest}`, REPRESENTATION_REVIEW_SCOPES.length, REPRESENTATION_REVIEW_SCOPES.length), withdrawalDecisionRef: representationImmutableRefSchema });
export const representationGovernanceSchema = z.discriminatedUnion("reviewState", [candidateGovernanceSchema, reviewedGovernanceSchema, withdrawnGovernanceSchema]);

export const representationPolicySchema = z.strictObject({ schemaVersion: z.literal(REPRESENTATION_POLICY_SCHEMA_VERSION), id: z.literal("representation-policy.forge-v1"), version: z.literal("1.0.0"), digest: forgeEventDigestSchema, requiredReviewScopes: z.tuple([z.literal("domain-accuracy"), z.literal("epistemic-status"), z.literal("access-equivalence"), z.literal("safety-rights")]), generatedMediaAllowedKinds: z.tuple([z.literal("diagram"), z.literal("reconstruction"), z.literal("analogy")]), maximumValidityDays: z.literal(365), motionScrubPermitted: z.boolean(), assignmentAuthority: z.literal("disabled-fixture-only") });
export type RepresentationPolicyV1 = z.infer<typeof representationPolicySchema>;

export const representationPackageSchema = z.strictObject({
  schemaVersion: z.literal(REPRESENTATION_PACKAGE_SCHEMA_VERSION), packageId: packageIdSchema, representationId: representationIdSchema, version: semverSchema,
  primaryArtifactRef: representationImmutableRefSchema, dependencyClosureDigest: forgeEventDigestSchema, contentDigest: forgeEventDigestSchema, packageDigest: forgeEventDigestSchema, policyRef: representationImmutableRefSchema,
  capabilityBinding: z.strictObject({ capabilityId: capabilityIdSchema, capabilityVersion: semverSchema, mapNodeId: mapNodeIdSchema }), kind: representationKindSchema, productionMethod: representationProductionMethodSchema, epistemicRole: epistemicRoleSchema, authority: representationAuthoritySchema,
  assumptions: uniqueBy(boundedStatementSchema, (value) => value.id, 1, 32), omittedFactors: uniqueBy(boundedStatementSchema, (value) => value.id, 1, 32), variables: uniqueBy(representationVariableSchema, (value) => value.id, 0, 32), controls: representationControlsSchema, alternative: representationAlternativeSchema, learnerAction: representationLearnerActionSchema, governance: representationGovernanceSchema, validFrom: timestampSchema, expiresAt: timestampSchema, publicationStatus: z.literal("unpublished"), runtimeAssignmentAllowed: z.literal(false),
});
export type RepresentationPackageV1 = z.infer<typeof representationPackageSchema>;

export const representationFrameSchema = z.strictObject({
  schemaVersion: z.literal(REPRESENTATION_FRAME_SCHEMA_VERSION), representationRef: z.strictObject({ packageId: packageIdSchema, representationId: representationIdSchema, version: semverSchema, packageDigest: forgeEventDigestSchema }), frameId: codeSchema, timeMs: z.number().int().nonnegative(), stateDigest: forgeEventDigestSchema,
  projections: z.strictObject({
    numeric: z.strictObject({ derivedFromStateDigest: forgeEventDigestSchema, outputDigest: forgeEventDigestSchema, payload: z.record(z.string(), z.number()) }),
    graph: z.strictObject({ derivedFromStateDigest: forgeEventDigestSchema, outputDigest: forgeEventDigestSchema, payload: z.array(z.strictObject({ timeMs: z.number().int().nonnegative(), velocityMps: z.number() })).min(1).max(4_096) }),
    text: z.strictObject({ derivedFromStateDigest: forgeEventDigestSchema, outputDigest: forgeEventDigestSchema, payload: z.string().min(1).max(8_000) }),
    table: z.strictObject({ derivedFromStateDigest: forgeEventDigestSchema, outputDigest: forgeEventDigestSchema, payload: z.array(z.strictObject({ variable: z.string().min(1).max(200), value: z.string().min(1).max(200), unit: z.string().min(1).max(80) })).min(1).max(128) }),
  }),
});
export type RepresentationFrameV1 = z.infer<typeof representationFrameSchema>;

type RepresentationPolicyInput = Omit<RepresentationPolicyV1, "digest"> & { digest?: string };
type RepresentationPackageInput = Omit<RepresentationPackageV1, "dependencyClosureDigest" | "contentDigest" | "packageDigest"> & { dependencyClosureDigest?: string; contentDigest?: string; packageDigest?: string };
type RepresentationReviewDecisionInput = Omit<RepresentationReviewDecisionV1, "decisionDigest"> & { decisionDigest?: string };
type RepresentationWithdrawalInput = Omit<RepresentationWithdrawalV1, "withdrawalDigest"> & { withdrawalDigest?: string };
function canonicalRefSort<T extends RepresentationImmutableRefV1>(values: readonly T[]): T[] { return [...values].sort((left, right) => compare(left.id, right.id) || compare(left.version, right.version) || compare(left.digest, right.digest)); }
function canonicalAuthority(authority: RepresentationAuthorityV1): RepresentationAuthorityV1 {
  if (authority.authorityKind === "reviewed-explanation") return { ...authority, sourceRefs: canonicalRefSort(authority.sourceRefs), claimCodes: [...authority.claimCodes].sort(compare) };
  if (authority.authorityKind === "source-bound-reconstruction") return { ...authority, sourceRefs: canonicalRefSort(authority.sourceRefs) };
  if (authority.authorityKind === "bounded-analogy") return { ...authority, sourceConceptRefs: canonicalRefSort(authority.sourceConceptRefs) };
  return authority;
}

/** Direct package dependencies only: review and withdrawal identities bind this digest later, avoiding a circular signature. */
export function requiredRepresentationDependencies(input: RepresentationPackageInput | RepresentationPackageV1): readonly RepresentationDependencyV1[] {
  const values: RepresentationDependencyV1[] = [{ kind: "policy", ref: input.policyRef }, { kind: "primary-artifact", ref: input.primaryArtifactRef }, { kind: "text-template", ref: input.alternative.textTemplateRef }, { kind: "table-schema", ref: input.alternative.tableSchemaRef }];
  const authority = input.authority;
  if (authority.authorityKind === "observation-source") values.push({ kind: "source", ref: authority.sourceRecordRef }, { kind: "capture-protocol", ref: authority.captureProtocolRef });
  if (authority.authorityKind === "measurement-source") values.push({ kind: "source", ref: authority.sourceRecordRef }, { kind: "measurement-protocol", ref: authority.measurementProtocolRef }, { kind: "instrument", ref: authority.instrumentRef }, { kind: "calibration", ref: authority.calibrationRef });
  if (authority.authorityKind === "deterministic-validator") values.push({ kind: "validator", ref: authority.validatorRef }, { kind: "runtime", ref: authority.runtimeRef });
  if (authority.authorityKind === "reviewed-explanation") authority.sourceRefs.forEach((ref) => values.push({ kind: "source", ref }));
  if (authority.authorityKind === "source-bound-reconstruction") values.push(...authority.sourceRefs.map((ref) => ({ kind: "source" as const, ref })), { kind: "reconstruction-method", ref: authority.reconstructionMethodRef });
  if (authority.authorityKind === "bounded-analogy") authority.sourceConceptRefs.forEach((ref) => values.push({ kind: "source", ref }));
  return deepFreeze([...values].sort((left, right) => compare(dependencyIdentity(left), dependencyIdentity(right))));
}
export function canonicalRepresentationDependencyClosure(input: RepresentationPackageInput | RepresentationPackageV1): object { return { dependencies: requiredRepresentationDependencies(input) }; }
export async function representationDependencyClosureDigest(input: RepresentationPackageInput | RepresentationPackageV1): Promise<string> { return sha256Digest(canonicalJson(canonicalRepresentationDependencyClosure(input))); }

export function canonicalRepresentationContent(input: RepresentationPackageInput): object {
  const placeholder = `sha256:${"0".repeat(64)}`;
  const parsed = representationPackageSchema.parse({ ...input, dependencyClosureDigest: input.dependencyClosureDigest ?? placeholder, contentDigest: placeholder, packageDigest: placeholder });
  const { reviewerDecisionRef: _reviewerDecisionRef, ...alternativeContent } = parsed.alternative;
  void _reviewerDecisionRef;
  return { schemaVersion: parsed.schemaVersion, packageId: parsed.packageId, representationId: parsed.representationId, version: parsed.version, primaryArtifactRef: parsed.primaryArtifactRef, dependencyClosureDigest: parsed.dependencyClosureDigest, policyRef: parsed.policyRef, capabilityBinding: parsed.capabilityBinding, kind: parsed.kind, productionMethod: parsed.productionMethod, epistemicRole: parsed.epistemicRole, authority: canonicalAuthority(parsed.authority), assumptions: [...parsed.assumptions].sort((left, right) => compare(left.id, right.id)), omittedFactors: [...parsed.omittedFactors].sort((left, right) => compare(left.id, right.id)), variables: [...parsed.variables].sort((left, right) => compare(left.id, right.id)), controls: parsed.controls, alternative: { ...alternativeContent, modalities: [...parsed.alternative.modalities].sort(compare) }, learnerAction: parsed.learnerAction, validFrom: parsed.validFrom, expiresAt: parsed.expiresAt };
}
export async function representationContentDigest(input: RepresentationPackageInput): Promise<string> { return sha256Digest(canonicalJson(canonicalRepresentationContent(input))); }
export function canonicalRepresentationPackage(input: RepresentationPackageInput & { contentDigest: string; dependencyClosureDigest: string }): object {
  const placeholder = `sha256:${"0".repeat(64)}`;
  const parsed = representationPackageSchema.parse({ ...input, packageDigest: placeholder });
  return { ...canonicalRepresentationContent(parsed), contentDigest: parsed.contentDigest, reviewBindings: { alternativeReviewerDecisionRef: parsed.alternative.reviewerDecisionRef }, governance: { ...parsed.governance, reviewDecisionRefs: canonicalRefSort(parsed.governance.reviewDecisionRefs) }, publicationStatus: parsed.publicationStatus, runtimeAssignmentAllowed: parsed.runtimeAssignmentAllowed };
}
export async function representationPackageDigest(input: RepresentationPackageInput & { contentDigest: string; dependencyClosureDigest: string }): Promise<string> { return sha256Digest(canonicalJson(canonicalRepresentationPackage(input))); }
export async function compileRepresentationPackage(input: RepresentationPackageInput): Promise<Readonly<RepresentationPackageV1>> {
  const dependencyClosureDigest = await representationDependencyClosureDigest(input);
  const contentDigest = await representationContentDigest({ ...input, dependencyClosureDigest });
  const packageDigest = await representationPackageDigest({ ...input, dependencyClosureDigest, contentDigest });
  return deepFreeze(representationPackageSchema.parse({ ...input, dependencyClosureDigest, contentDigest, packageDigest, assumptions: [...input.assumptions].sort((left, right) => compare(left.id, right.id)), omittedFactors: [...input.omittedFactors].sort((left, right) => compare(left.id, right.id)), variables: [...input.variables].sort((left, right) => compare(left.id, right.id)), governance: { ...input.governance, reviewDecisionRefs: canonicalRefSort(input.governance.reviewDecisionRefs) }, alternative: { ...input.alternative, modalities: [...input.alternative.modalities].sort(compare) }, authority: canonicalAuthority(input.authority) }));
}
export function canonicalRepresentationReviewDecision(input: RepresentationReviewDecisionInput): object { const placeholder = `sha256:${"0".repeat(64)}`; const parsed = representationReviewDecisionSchema.parse({ ...input, decisionDigest: placeholder }); const { decisionDigest: _digest, ...unsigned } = parsed; void _digest; return unsigned; }
export async function representationReviewDecisionDigest(input: RepresentationReviewDecisionInput): Promise<string> { return sha256Digest(canonicalJson(canonicalRepresentationReviewDecision(input))); }
export async function compileRepresentationReviewDecision(input: RepresentationReviewDecisionInput): Promise<Readonly<RepresentationReviewDecisionV1>> { return deepFreeze(representationReviewDecisionSchema.parse({ ...input, decisionDigest: await representationReviewDecisionDigest(input) })); }
export function representationReviewDecisionRef(input: RepresentationReviewDecisionV1): RepresentationImmutableRefV1 { return deepFreeze({ id: input.decisionId, version: input.version, digest: input.decisionDigest }); }
export function canonicalRepresentationWithdrawal(input: RepresentationWithdrawalInput): object { const placeholder = `sha256:${"0".repeat(64)}`; const parsed = representationWithdrawalSchema.parse({ ...input, withdrawalDigest: placeholder }); const { withdrawalDigest: _digest, ...unsigned } = parsed; void _digest; return unsigned; }
export async function representationWithdrawalDigest(input: RepresentationWithdrawalInput): Promise<string> { return sha256Digest(canonicalJson(canonicalRepresentationWithdrawal(input))); }
export async function compileRepresentationWithdrawal(input: RepresentationWithdrawalInput): Promise<Readonly<RepresentationWithdrawalV1>> { return deepFreeze(representationWithdrawalSchema.parse({ ...input, withdrawalDigest: await representationWithdrawalDigest(input) })); }
export function representationWithdrawalRef(input: RepresentationWithdrawalV1): RepresentationImmutableRefV1 { return deepFreeze({ id: input.withdrawalId, version: input.version, digest: input.withdrawalDigest }); }
export async function representationPolicyDigest(input: RepresentationPolicyInput): Promise<string> { const placeholder = `sha256:${"0".repeat(64)}`; const parsed = representationPolicySchema.parse({ ...input, digest: placeholder }); const { digest: _digest, ...unsigned } = parsed; void _digest; return sha256Digest(canonicalJson(unsigned)); }
export async function compileRepresentationPolicy(): Promise<Readonly<RepresentationPolicyV1>> { const unsigned: Omit<RepresentationPolicyV1, "digest"> = { schemaVersion: REPRESENTATION_POLICY_SCHEMA_VERSION, id: "representation-policy.forge-v1", version: "1.0.0", requiredReviewScopes: [...REPRESENTATION_REVIEW_SCOPES], generatedMediaAllowedKinds: ["diagram", "reconstruction", "analogy"], maximumValidityDays: 365, motionScrubPermitted: true, assignmentAuthority: "disabled-fixture-only" }; return deepFreeze(representationPolicySchema.parse({ ...unsigned, digest: await representationPolicyDigest(unsigned) })); }
