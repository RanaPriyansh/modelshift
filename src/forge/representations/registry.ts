import { z } from "zod";

import { deepFreeze } from "../deep-freeze";
import {
  representationPackageSchema,
  representationPolicySchema,
  representationDependencySchema,
  representationReviewDecisionSchema,
  representationWithdrawalSchema,
  requiredRepresentationDependencies,
  type RepresentationPackageV1,
  type RepresentationPolicyV1,
  type RepresentationDependencyV1,
  type RepresentationReviewDecisionV1,
  type RepresentationWithdrawalV1,
} from "./contracts";
import {
  representationFixtureFrameSupport,
  validateRepresentationPackage,
  type RepresentationValidationIssue,
  type RepresentationValidationResult,
} from "./validation";

z.config({ jitless: true });

const timestampSchema = z.string().datetime({ offset: true });
const capabilityIdSchema = z.string().regex(/^capability\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const mapNodeIdSchema = z.string().regex(/^map-node\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const compare = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0;

const registryInputSchema = z.strictObject({
  policy: representationPolicySchema,
  representations: z.array(representationPackageSchema).max(256),
  decisions: z.array(representationReviewDecisionSchema).max(1_024),
  withdrawals: z.array(representationWithdrawalSchema).max(256),
  dependencies: z.array(representationDependencySchema).max(4_096),
  evaluationAt: timestampSchema,
});

const fixtureChoiceRequestSchema = z.strictObject({
  capabilityId: capabilityIdSchema,
  capabilityVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  mapNodeId: mapNodeIdSchema,
  learnerAction: z.enum(["predict", "manipulate", "compare", "measure", "annotate", "explain", "reconstruct"]),
  requiredConstructStatus: z.enum(["preserves", "changes"]).optional(),
});

export interface RepresentationRegistryEntry {
  readonly identity: string;
  readonly representation: RepresentationPackageV1;
  readonly validation: RepresentationValidationResult;
}

export interface RepresentationRegistrySnapshot {
  readonly policy: RepresentationPolicyV1 | null;
  readonly evaluatedAt: string | null;
  readonly entries: readonly RepresentationRegistryEntry[];
  readonly issues: readonly RepresentationValidationIssue[];
  readonly fixturePreviewOnly: true;
  readonly runtimeAssignmentAllowed: false;
  readonly authorityTrust: "caller-asserted-unverified";
}

export type FixtureRepresentationChoice =
  | {
    readonly outcome: "fixture-choice";
    readonly representation: RepresentationPackageV1;
    readonly reasonCodes: readonly [
      "exact-capability-binding",
      "exact-map-node-binding",
      "requested-learner-action",
      "current-complete-review",
      "stable-identity-order",
    ];
    readonly constructStatus: "preserves" | "changes";
    readonly runtimeAssignmentAllowed: false;
    readonly authorityTrust: "caller-asserted-unverified";
    readonly frameSupport: "supported" | "unsupported";
    readonly frameSupportReason: "authored-motion-fixture-v1" | "not-a-stateful-simulation" | "unrecognized-fixture-runtime";
  }
  | {
    readonly outcome: "unavailable";
    readonly representation: null;
    readonly reasonCodes: readonly string[];
    readonly constructStatus: null;
    readonly runtimeAssignmentAllowed: false;
    readonly authorityTrust: "caller-asserted-unverified";
    readonly frameSupport: "unavailable";
    readonly frameSupportReason: "choice-unavailable";
  };

function identity(representation: RepresentationPackageV1): string {
  return `${representation.packageId}@${representation.version}:${representation.representationId}@${representation.version}`;
}

function packageIdentity(representation: RepresentationPackageV1): string { return `${representation.packageId}@${representation.version}`; }
function representationIdentity(representation: RepresentationPackageV1): string { return `${representation.representationId}@${representation.version}`; }
function refIdentity(ref: { id: string; version: string; digest: string }): string { return `${ref.id}@${ref.version}@${ref.digest}`; }
function decisionIdentity(decision: RepresentationReviewDecisionV1): string { return `${decision.decisionId}@${decision.version}@${decision.decisionDigest}`; }
function withdrawalIdentity(withdrawal: RepresentationWithdrawalV1): string { return `${withdrawal.withdrawalId}@${withdrawal.version}@${withdrawal.withdrawalDigest}`; }
function dependencyIdentity(dependency: RepresentationDependencyV1): string { return `${dependency.kind}:${refIdentity(dependency.ref)}`; }

function issue(code: string, path: string, message: string): RepresentationValidationIssue {
  return deepFreeze({ code, path, message });
}

function stableIssues(values: readonly RepresentationValidationIssue[]): readonly RepresentationValidationIssue[] {
  return deepFreeze([...values].sort((left, right) =>
    compare(left.code, right.code) || compare(left.path, right.path) || compare(left.message, right.message)));
}

function decisionsFor(
  representation: RepresentationPackageV1,
  decisions: readonly RepresentationReviewDecisionV1[],
): readonly RepresentationReviewDecisionV1[] {
  const refs = new Set(representation.governance.reviewDecisionRefs.map(refIdentity));
  return decisions.filter((decision) => refs.has(decisionIdentity(decision)));
}

function withdrawalsFor(
  representation: RepresentationPackageV1,
  withdrawals: readonly RepresentationWithdrawalV1[],
): readonly RepresentationWithdrawalV1[] {
  if (representation.governance.reviewState !== "withdrawn") return [];
  const expected = refIdentity(representation.governance.withdrawalDecisionRef);
  return withdrawals.filter((withdrawal) => withdrawalIdentity(withdrawal) === expected);
}

function dependenciesFor(
  representation: RepresentationPackageV1,
  decisions: readonly RepresentationReviewDecisionV1[],
  withdrawals: readonly RepresentationWithdrawalV1[],
  dependencies: readonly RepresentationDependencyV1[],
): readonly RepresentationDependencyV1[] {
  const expected = new Set<string>();
  const collect = (kind: RepresentationDependencyV1["kind"], ref: RepresentationDependencyV1["ref"]) => expected.add(dependencyIdentity({ kind, ref }));
  for (const dependency of requiredRepresentationDependencies(representation)) expected.add(dependencyIdentity(dependency));
  for (const decision of decisions) {
    collect("reviewer", decision.reviewerRef);
    if (decision.reviewerOrganizationRef) collect("reviewer-organization", decision.reviewerOrganizationRef);
  }
  for (const withdrawal of withdrawals) collect("withdrawal-issuer", withdrawal.issuerRef);
  return dependencies.filter((dependency) => expected.has(dependencyIdentity(dependency)));
}

export async function evaluateRepresentationRegistry(input: unknown): Promise<Readonly<RepresentationRegistrySnapshot>> {
  const parsed = registryInputSchema.safeParse(input);
  if (!parsed.success) {
    return deepFreeze({
      policy: null,
      evaluatedAt: null,
      entries: [],
      issues: stableIssues(parsed.error.issues.map((entry) =>
        issue("registry.schema", entry.path.map(String).join("."), entry.message))),
      fixturePreviewOnly: true as const,
      runtimeAssignmentAllowed: false as const,
      authorityTrust: "caller-asserted-unverified" as const,
    });
  }

  const issues: RepresentationValidationIssue[] = [];
  const packagesByIdentity = new Map<string, RepresentationPackageV1[]>();
  const packageVersions = new Map<string, RepresentationPackageV1[]>();
  const representationVersions = new Map<string, RepresentationPackageV1[]>();
  for (const representation of parsed.data.representations) {
    const key = identity(representation);
    packagesByIdentity.set(key, [...(packagesByIdentity.get(key) ?? []), representation]);
    const packageKey = packageIdentity(representation);
    packageVersions.set(packageKey, [...(packageVersions.get(packageKey) ?? []), representation]);
    const representationKey = representationIdentity(representation);
    representationVersions.set(representationKey, [...(representationVersions.get(representationKey) ?? []), representation]);
  }
  const conflicting = new Set<string>();
  for (const [key, packages] of packagesByIdentity) {
    const digests = new Set(packages.map((entry) => entry.packageDigest));
    if (packages.length > 1) {
      conflicting.add(key);
      issues.push(issue(
        digests.size > 1 ? "registry.conflicting-identity" : "registry.duplicate-identity",
        `representations.${key}`,
        "A registry identity must have exactly one canonical package.",
      ));
    }
  }
  for (const [key, packages] of packageVersions) {
    if (packages.length > 1) {
      packages.forEach((entry) => conflicting.add(identity(entry)));
      issues.push(issue("registry.package-version-collision", `representations.${key}`, "A package ID and version may identify only one representation package."));
    }
  }
  for (const [key, packages] of representationVersions) {
    if (packages.length > 1) {
      packages.forEach((entry) => conflicting.add(identity(entry)));
      issues.push(issue("registry.representation-version-collision", `representations.${key}`, "A representation ID and version may identify only one governed package."));
    }
  }

  const entries: RepresentationRegistryEntry[] = [];
  for (const representation of parsed.data.representations) {
    const key = identity(representation);
    const scopedDecisions = decisionsFor(representation, parsed.data.decisions);
    const scopedWithdrawals = withdrawalsFor(representation, parsed.data.withdrawals);
    const scopedDependencies = dependenciesFor(representation, scopedDecisions, scopedWithdrawals, parsed.data.dependencies);
    const validation = await validateRepresentationPackage({
      representation,
      policy: parsed.data.policy,
      decisions: scopedDecisions,
      withdrawals: scopedWithdrawals,
      dependencies: scopedDependencies,
      evaluationAt: parsed.data.evaluationAt,
    });
    const conflictIssues = conflicting.has(key)
      ? [issue("registry.identity-ineligible", `representations.${key}`, "Duplicate or conflicting identities are ineligible.")]
      : [];
    const mergedValidation: RepresentationValidationResult = conflictIssues.length === 0
      ? validation
      : deepFreeze({
        ...validation,
        status: "invalid",
        fixturePreviewAllowed: false,
        issues: stableIssues([...validation.issues, ...conflictIssues]),
      });
    entries.push(deepFreeze({ identity: key, representation, validation: mergedValidation }));
  }
  entries.sort((left, right) =>
    compare(left.representation.representationId, right.representation.representationId) ||
    compare(left.representation.version, right.representation.version) ||
    compare(left.representation.packageDigest, right.representation.packageDigest));

  return deepFreeze({
    policy: parsed.data.policy,
    evaluatedAt: parsed.data.evaluationAt,
    entries,
    issues: stableIssues(issues),
    fixturePreviewOnly: true as const,
    runtimeAssignmentAllowed: false as const,
    authorityTrust: "caller-asserted-unverified" as const,
  });
}

/**
 * Revalidates source packages and review decisions on every request. It never
 * accepts a caller-supplied "eligible" projection and never grants assignment.
 */
export async function chooseFixtureRepresentation(
  input: unknown,
  request: unknown,
): Promise<Readonly<FixtureRepresentationChoice>> {
  const parsedRequest = fixtureChoiceRequestSchema.safeParse(request);
  if (!parsedRequest.success) {
    return deepFreeze({
      outcome: "unavailable" as const,
      representation: null,
      reasonCodes: ["invalid-request"],
      constructStatus: null,
      runtimeAssignmentAllowed: false as const,
      authorityTrust: "caller-asserted-unverified" as const,
      frameSupport: "unavailable" as const,
      frameSupportReason: "choice-unavailable" as const,
    });
  }
  const snapshot = await evaluateRepresentationRegistry(input);
  if (!snapshot.policy) {
    return deepFreeze({
      outcome: "unavailable" as const,
      representation: null,
      reasonCodes: ["invalid-registry-snapshot"],
      constructStatus: null,
      runtimeAssignmentAllowed: false as const,
      authorityTrust: "caller-asserted-unverified" as const,
      frameSupport: "unavailable" as const,
      frameSupportReason: "choice-unavailable" as const,
    });
  }

  const candidates = snapshot.entries.filter(({ representation, validation }) =>
    validation.fixturePreviewAllowed &&
    representation.capabilityBinding.capabilityId === parsedRequest.data.capabilityId &&
    representation.capabilityBinding.capabilityVersion === parsedRequest.data.capabilityVersion &&
    representation.capabilityBinding.mapNodeId === parsedRequest.data.mapNodeId &&
    representation.learnerAction.action === parsedRequest.data.learnerAction &&
    (
      parsedRequest.data.requiredConstructStatus === undefined ||
      representation.alternative.constructStatus === parsedRequest.data.requiredConstructStatus
    ));
  const chosen = candidates[0]?.representation;
  if (!chosen) {
    return deepFreeze({
      outcome: "unavailable" as const,
      representation: null,
      reasonCodes: ["no-current-exact-reviewed-representation"],
      constructStatus: null,
      runtimeAssignmentAllowed: false as const,
      authorityTrust: "caller-asserted-unverified" as const,
      frameSupport: "unavailable" as const,
      frameSupportReason: "choice-unavailable" as const,
    });
  }
  const frameSupport = representationFixtureFrameSupport(chosen);
  return deepFreeze({
    outcome: "fixture-choice" as const,
    representation: chosen,
    reasonCodes: [
      "exact-capability-binding",
      "exact-map-node-binding",
      "requested-learner-action",
      "current-complete-review",
      "stable-identity-order",
    ] as const,
    constructStatus: chosen.alternative.constructStatus,
    runtimeAssignmentAllowed: false as const,
    authorityTrust: "caller-asserted-unverified" as const,
    frameSupport: frameSupport.status,
    frameSupportReason: frameSupport.reasonCode,
  });
}
