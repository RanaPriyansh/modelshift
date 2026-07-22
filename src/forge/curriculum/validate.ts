import { PATHWAY_ENTITLEMENT_AREAS } from "../pathways/contracts";

import {
  CURRICULUM_NON_CLAIMS,
  callerAssertedReleasedWorldAuthoritiesSchema,
  curriculumGraphPackageSchema,
  curriculumGraphPolicySchema,
  curriculumValidationInputSchema,
  sourceAuthorityEvaluationsSchema,
  type CallerAssertedReleasedWorldAuthorityV1,
  type CurriculumAuthorityProjection,
  type CurriculumGraphPackageV1,
  type CurriculumGraphPolicyV1,
  type CurriculumNodeV1,
  type CurriculumSourceAuthorityStatus,
  type SourceAuthorityEvaluationV1,
} from "./contracts";
import { curriculumCodeUnitCompare, curriculumGraphDigest, curriculumGraphPolicyDigest } from "./canonical";

export interface CurriculumGraphIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export interface CurriculumNodeAvailability {
  readonly nodeId: string;
  readonly capabilityId: string;
  readonly capabilityVersion: string;
  readonly availability: CurriculumAuthorityProjection;
  readonly sourceAuthorityStatus: CurriculumSourceAuthorityStatus;
  readonly authorityTrust: "caller-asserted-unverified";
  readonly callerAssertedReleaseMatch: "exact-match" | "none";
  /** Always null in this pure module; a future trusted adapter owns routability. */
  readonly route: string | null;
  readonly reasons: readonly string[];
}

export interface ValidatedCurriculumGraph {
  readonly authorityTrust: "caller-asserted-unverified";
  readonly graph: CurriculumGraphPackageV1 | null;
  readonly graphDigest: string | null;
  readonly policy: CurriculumGraphPolicyV1 | null;
  readonly sourceAuthorities: readonly SourceAuthorityEvaluationV1[];
  readonly nodes: readonly CurriculumNodeAvailability[];
  readonly issues: readonly CurriculumGraphIssue[];
  readonly cyclePaths: readonly (readonly string[])[];
  readonly invalidatedNodeIds: readonly string[];
  readonly nonClaims: readonly (typeof CURRICULUM_NON_CLAIMS)[number][];
}

type MutableIssue = { code: string; path: string; message: string };

function issue(issues: MutableIssue[], code: string, path: string, message: string): void {
  issues.push({ code, path, message });
}

function stableIssues(issues: readonly MutableIssue[]): readonly CurriculumGraphIssue[] {
  return [...issues].sort((left, right) =>
    curriculumCodeUnitCompare(left.code, right.code) ||
    curriculumCodeUnitCompare(left.path, right.path) ||
    curriculumCodeUnitCompare(left.message, right.message));
}

function stringsEqual(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const leftSorted = [...left].sort(curriculumCodeUnitCompare);
  const rightSorted = [...right].sort(curriculumCodeUnitCompare);
  return leftSorted.every((value, index) => value === rightSorted[index]);
}

function refEqual(
  left: { readonly id: string; readonly version: string },
  right: { readonly id: string; readonly version: string },
): boolean {
  return left.id === right.id && left.version === right.version;
}

function boundReviewClaimReasons(node: CurriculumNodeV1, evaluation: SourceAuthorityEvaluationV1): readonly string[] {
  const source = node.sourceRequirement;
  if (source.mode !== "bound-source-authority") return [];
  const reasons: string[] = [];
  const bindingsByItemId = new Map(evaluation.reviewedSourceBindings.map((binding) => [binding.sourceItemId, binding]));
  for (const route of node.accessRoutes) {
    if (route.reviewClaimIds.length === 0) reasons.push("source.access-review-claims-missing");
    for (const claimId of route.reviewClaimIds) {
      const matchingBindings = evaluation.reviewedSourceBindings.filter((binding) => binding.claimIds.includes(claimId));
      if (!source.requiredClaimIds.includes(claimId)) reasons.push("source.access-review-claim-not-required");
      if (matchingBindings.length !== 1) reasons.push("source.access-review-claim-not-evaluated");
    }
  }
  for (const alternative of node.alternatives) {
    for (const reference of alternative.alternativeSourceRefs) {
      if (reference.sourcePackageRef.id !== source.sourcePackageRef.id ||
        reference.sourcePackageRef.version !== source.sourcePackageRef.version ||
        reference.sourcePackageRef.digest !== source.sourcePackageRef.digest) {
        reasons.push("source.alternative-package-mismatch");
        continue;
      }
      const binding = bindingsByItemId.get(reference.sourceItemId);
      if (!source.requiredItemIds.includes(reference.sourceItemId) || !binding) reasons.push("source.alternative-item-not-evaluated");
      for (const claimId of reference.claimIds) {
        if (!source.requiredClaimIds.includes(claimId)) reasons.push("source.alternative-claim-not-required");
        if (!binding?.claimIds.includes(claimId)) reasons.push("source.alternative-claim-not-evaluated");
      }
    }
  }
  return [...new Set(reasons)].sort(curriculumCodeUnitCompare);
}

function sourceStatus(node: CurriculumNodeV1, sourceAuthorities: readonly SourceAuthorityEvaluationV1[]): CurriculumSourceAuthorityStatus {
  const source = node.sourceRequirement;
  if (source.mode === "legacy-metadata-only") return "legacy-incomplete";
  const matches = sourceAuthorities.filter((authority) =>
    authority.packageId === source.sourcePackageRef.id &&
    authority.packageVersion === source.sourcePackageRef.version &&
    authority.packageDigest === source.sourcePackageRef.digest);
  if (matches.some((authority) => authority.invalidatedNodeIds.includes(node.id))) return "bound-invalidated";
  if (matches.length !== 1 || matches[0]!.status !== "review-candidate-complete" || !node.worldBinding ||
    !stringsEqual(source.requiredItemIds, node.worldBinding.sourceIds)) return "bound-incomplete";
  const bindingsByItemId = new Map(matches[0]!.reviewedSourceBindings.map((binding) => [binding.sourceItemId, binding]));
  if (!stringsEqual(source.requiredItemIds, [...bindingsByItemId.keys()])) return "bound-incomplete";
  const bindings = matches[0]!.reviewedSourceBindings;
  if (source.requiredClaimIds.some((claimId) => !bindings.some((binding) => binding.claimIds.includes(claimId))) ||
    source.requiredRightsIds.some((rightsId) => !bindings.some((binding) => binding.rightsRecordId === rightsId)) ||
    source.requiredProductUses.some((productUse) => !bindings.some((binding) => binding.permittedProductUses.includes(productUse))) ||
    source.requiredReviewScopes.some((scope) => !bindings.some((binding) => binding.acceptedReviewScopes.includes(scope))) ||
    boundReviewClaimReasons(node, matches[0]!).length > 0) return "bound-incomplete";
  return "bound-review-candidate";
}

function knownGraphNodeIds(value: unknown): readonly string[] {
  if (!value || typeof value !== "object" || !("nodes" in value) || !Array.isArray(value.nodes)) return [];
  return value.nodes
    .flatMap((node) => node && typeof node === "object" && "id" in node && typeof node.id === "string" ? [node.id] : [])
    .sort(curriculumCodeUnitCompare);
}

function addSchemaIssues(issues: MutableIssue[], code: string, path: string, result: { readonly error: { readonly issues: readonly { readonly path: readonly PropertyKey[]; readonly message: string }[] } }): void {
  for (const entry of result.error.issues) {
    issue(issues, code, [path, ...entry.path.map(String)].filter(Boolean).join("."), entry.message);
  }
}

function duplicates<T>(values: readonly T[], key: (value: T) => string): readonly string[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts.entries()].filter(([, count]) => count > 1).map(([value]) => value).sort(curriculumCodeUnitCompare);
}

function nodeForCapability(graph: CurriculumGraphPackageV1): ReadonlyMap<string, CurriculumNodeV1> {
  return new Map(graph.nodes.map((node) => [`${node.capabilityId}@${node.capabilityVersion}`, node]));
}

function cyclePaths(graph: CurriculumGraphPackageV1, issues: MutableIssue[], invalid: Set<string>): readonly (readonly string[])[] {
  const byCapability = nodeForCapability(graph);
  const adjacency = new Map<string, string[]>();
  for (const node of graph.nodes) {
    const targets: string[] = [];
    for (const edge of node.prerequisites) {
      const target = byCapability.get(`${edge.capabilityId}@${edge.capabilityVersion}`);
      if (!target) {
        issue(issues, "graph.prerequisite-missing", `nodes.${node.id}.prerequisites.${edge.id}`, "Prerequisite must reference an exact graph node version.");
        invalid.add(node.id);
      } else {
        targets.push(target.id);
        if (target.id === node.id) {
          issue(issues, "graph.prerequisite-self-cycle", `nodes.${node.id}.prerequisites.${edge.id}`, "A prerequisite cannot reference itself.");
          invalid.add(node.id);
        }
      }
    }
    for (const alternative of node.alternatives) {
      const target = byCapability.get(`${alternative.capabilityId}@${alternative.capabilityVersion}`);
      if (!target) {
        issue(issues, "graph.alternative-missing", `nodes.${node.id}.alternatives.${alternative.id}`, "Alternative must reference an exact graph node version.");
        invalid.add(node.id);
        continue;
      }
      if (target.id === node.id) {
        issue(issues, "graph.alternative-self-cycle", `nodes.${node.id}.alternatives.${alternative.id}`, "Alternative cannot reference its own node version.");
        invalid.add(node.id);
      }
      if (alternative.equivalence === "reviewed-equivalent") targets.push(target.id);
      const edgeIds = new Set(node.prerequisites.map((edge) => edge.id));
      for (const edgeId of alternative.appliesToEdgeIds) {
        if (!edgeIds.has(edgeId)) {
          issue(issues, "graph.alternative-edge-missing", `nodes.${node.id}.alternatives.${alternative.id}`, "Alternative must name an edge on its owning node.");
          invalid.add(node.id);
        }
      }
    }
    for (const edge of node.prerequisites) {
      const alternatives = new Set(node.alternatives.map((alternative) => alternative.id));
      for (const alternativeId of edge.alternativeBindingIds) {
        if (!alternatives.has(alternativeId)) {
          issue(issues, "graph.edge-alternative-missing", `nodes.${node.id}.prerequisites.${edge.id}`, "Prerequisite references an unknown alternative binding.");
          invalid.add(node.id);
        }
      }
    }
    adjacency.set(node.id, [...new Set(targets)].sort(curriculumCodeUnitCompare));
  }

  const state = new Map<string, "new" | "active" | "done">();
  const stack: string[] = [];
  const found: string[][] = [];
  const foundKeys = new Set<string>();
  const visit = (nodeId: string): void => {
    state.set(nodeId, "active");
    stack.push(nodeId);
    for (const target of adjacency.get(nodeId) ?? []) {
      if (state.get(target) === "active") {
        const start = stack.indexOf(target);
        const path = [...stack.slice(start), target];
        const key = path.join("->");
        if (!foundKeys.has(key)) {
          foundKeys.add(key);
          found.push(path);
          for (const participant of path.slice(0, -1)) invalid.add(participant);
        }
      } else if (state.get(target) !== "done") {
        visit(target);
      }
    }
    stack.pop();
    state.set(nodeId, "done");
  };
  for (const nodeId of [...adjacency.keys()].sort(curriculumCodeUnitCompare)) {
    if (!state.has(nodeId)) visit(nodeId);
  }
  for (const path of found) issue(issues, "graph.cycle", path.join("->"), "Curriculum dependencies must be acyclic.");
  return found.sort((left, right) => curriculumCodeUnitCompare(left.join("->"), right.join("->")));
}

function validateGraphRelations(graph: CurriculumGraphPackageV1, issues: MutableIssue[], invalid: Set<string>): readonly (readonly string[])[] {
  const duplicateNodeIds = duplicates(graph.nodes, (node) => node.id);
  const duplicateCapabilities = duplicates(graph.nodes, (node) => node.capabilityId);
  const duplicateCapabilityVersions = duplicates(graph.nodes, (node) => `${node.capabilityId}@${node.capabilityVersion}`);
  for (const nodeId of duplicateNodeIds) {
    issue(issues, "graph.duplicate-node-id", `nodes.${nodeId}`, "Node IDs must be unique.");
    graph.nodes.filter((node) => node.id === nodeId).forEach((node) => invalid.add(node.id));
  }
  for (const capabilityId of duplicateCapabilities) {
    issue(issues, "graph.duplicate-current-capability", `capabilities.${capabilityId}`, "A graph can contain only one current version of a capability.");
    graph.nodes.filter((node) => node.capabilityId === capabilityId).forEach((node) => invalid.add(node.id));
  }
  for (const key of duplicateCapabilityVersions) {
    issue(issues, "graph.duplicate-capability-version", `capabilities.${key}`, "Capability/version pairs must be unique.");
  }
  for (const [kind, values] of [
    ["edge", graph.nodes.flatMap((node) => node.prerequisites.map((entry) => ({ id: entry.id, nodeId: node.id })))] as const,
    ["alternative", graph.nodes.flatMap((node) => node.alternatives.map((entry) => ({ id: entry.id, nodeId: node.id })))] as const,
    ["access-route", graph.nodes.flatMap((node) => node.accessRoutes.map((entry) => ({ id: entry.id, nodeId: node.id })))] as const,
    ["gap", graph.gaps.map((entry) => ({ id: entry.id, nodeId: "" }))] as const,
  ]) {
    for (const id of duplicates(values, (value) => value.id)) {
      issue(issues, `graph.duplicate-${kind}-id`, `${kind}s.${id}`, "Stable record IDs must be unique.");
      values.filter((value) => value.id === id && value.nodeId).forEach((value) => invalid.add(value.nodeId));
    }
  }

  for (const node of graph.nodes) {
    for (const ageMode of node.supportedAgeModes) {
      for (const depthMode of node.supportedDepthModes) {
        if (!node.accessRoutes.some((route) => route.supportedAgeModes.includes(ageMode) && route.supportedDepthModes.includes(depthMode))) {
          issue(issues, "access.coverage-missing", `nodes.${node.id}.accessRoutes`, `No reviewed access route supports ${ageMode}/${depthMode}.`);
          invalid.add(node.id);
        }
      }
    }
    for (const route of node.accessRoutes) {
      if (route.effect === "construct-changing" && route.evidenceConditionCode === node.evidenceRequirement.claimCode) {
        issue(issues, "access.construct-changing-evidence-not-distinct", `nodes.${node.id}.accessRoutes.${route.id}`, "Construct-changing access requires a distinct evidence condition.");
        invalid.add(node.id);
      }
    }
    if (node.worldBinding && (!refEqual(node.evidenceRequirement.validatorRef, node.worldBinding.validatorRef) ||
      !stringsEqual(node.evidenceRequirement.taskFamilyIds, node.worldBinding.taskFamilyIds))) {
      issue(issues, "evidence.world-binding-mismatch", `nodes.${node.id}.evidenceRequirement`, "Evidence validator and task families must equal the retained World binding.");
      invalid.add(node.id);
    }
  }
  return cyclePaths(graph, issues, invalid);
}

function bindingIssues(
  node: CurriculumNodeV1,
  authority: CallerAssertedReleasedWorldAuthorityV1,
  policy: CurriculumGraphPolicyV1,
): readonly string[] {
  const binding = node.worldBinding;
  if (!binding) return ["world.binding-missing"];
  const reasons: string[] = [];
  const scalarFields: (keyof typeof binding)[] = [
    "worldId",
    "contentVersion",
    "packageIntegrityHash",
    "runtimeBindingDigest",
    "runtimeProtocolVersion",
    "capabilityId",
    "sourceProvenanceStatus",
    "route",
  ];
  for (const field of scalarFields) if (binding[field] !== authority[field]) reasons.push(`world.binding-mismatch.${field}`);
  if (!refEqual(binding.validatorRef, authority.validatorRef)) reasons.push("world.binding-mismatch.validator");
  if (!stringsEqual(binding.taskFamilyIds, authority.taskFamilyIds)) reasons.push("world.binding-mismatch.task-families");
  if (!stringsEqual(binding.sourceIds, authority.sourceIds)) reasons.push("world.binding-mismatch.source-ids");
  if (!stringsEqual(node.entitlementAreas, authority.reviewedEntitlementAreas)) reasons.push("world.reviewed-entitlement-areas-mismatch");
  if (!stringsEqual(node.supportedAgeModes, authority.reviewedAgeModes)) reasons.push("world.reviewed-age-modes-mismatch");
  if (!stringsEqual(node.supportedDepthModes, authority.reviewedDepthModes)) reasons.push("world.reviewed-depth-modes-mismatch");
  if (authority.publicationPolicyRef.id !== policy.publicationPolicyRef.id ||
    authority.publicationPolicyRef.version !== policy.publicationPolicyRef.version ||
    authority.publicationPolicyRef.digest !== policy.publicationPolicyRef.digest) reasons.push("world.publication-policy-mismatch");
  if (authority.availabilityStatus !== "available") reasons.push("world.release-unavailable");
  return reasons;
}

function authorityForNode(node: CurriculumNodeV1, authorities: readonly CallerAssertedReleasedWorldAuthorityV1[]): CallerAssertedReleasedWorldAuthorityV1 | null {
  if (!node.worldBinding) return null;
  return authorities.find((authority) => authority.worldId === node.worldBinding!.worldId) ?? null;
}

function sourceReasons(
  node: CurriculumNodeV1,
  sourceAuthorities: readonly SourceAuthorityEvaluationV1[],
  authority: CallerAssertedReleasedWorldAuthorityV1 | null,
): readonly string[] {
  if (node.sourceRequirement.mode === "legacy-metadata-only") {
    const reasons: string[] = [];
    if (!node.worldBinding || !stringsEqual(node.sourceRequirement.sourceItemIds, node.worldBinding.sourceIds)) reasons.push("source.legacy-source-ids-mismatch");
    if (node.worldBinding?.sourceProvenanceStatus !== "legacy-metadata-only") reasons.push("source.legacy-provenance-mismatch");
    if (authority?.lifecycle !== "existing-registry-release") reasons.push("source.legacy-not-permitted-for-new-publication");
    if (node.accessRoutes.some((route) => route.reviewClaimIds.length > 0) || node.alternatives.some((alternative) => alternative.alternativeSourceRefs.length > 0)) {
      reasons.push("source.legacy-review-claims-not-established");
    }
    return reasons;
  }
  const reasons: string[] = [];
  const source = node.sourceRequirement;
  const matchingAuthorities = sourceAuthorities.filter((candidate) => candidate.packageId === source.sourcePackageRef.id &&
    candidate.packageVersion === source.sourcePackageRef.version && candidate.packageDigest === source.sourcePackageRef.digest);
  if (matchingAuthorities.length !== 1) reasons.push(matchingAuthorities.length === 0 ? "source.package-binding-mismatch" : "source.evaluation-ambiguous");
  const sourceAuthority = matchingAuthorities.length === 1 ? matchingAuthorities[0] : null;
  if (!node.worldBinding || !stringsEqual(source.requiredItemIds, node.worldBinding.sourceIds)) reasons.push("source.bound-source-ids-mismatch");
  if (node.worldBinding?.sourceProvenanceStatus !== "bound") reasons.push("source.bound-provenance-mismatch");
  if (sourceAuthority?.status !== "review-candidate-complete") reasons.push("source.review-candidate-incomplete");
  if (sourceAuthority) {
    const bindingsByItemId = new Map(sourceAuthority.reviewedSourceBindings.map((binding) => [binding.sourceItemId, binding]));
    if (!stringsEqual(source.requiredItemIds, [...bindingsByItemId.keys()])) reasons.push("source.required-items-mismatch");
    const boundClaimIds = sourceAuthority.reviewedSourceBindings.flatMap((binding) => binding.claimIds);
    const boundRightsIds = sourceAuthority.reviewedSourceBindings.map((binding) => binding.rightsRecordId);
    const boundProductUses = sourceAuthority.reviewedSourceBindings.flatMap((binding) => binding.permittedProductUses);
    const boundReviewScopes = sourceAuthority.reviewedSourceBindings.flatMap((binding) => binding.acceptedReviewScopes);
    if (source.requiredClaimIds.some((claimId) => !boundClaimIds.includes(claimId))) reasons.push("source.required-claims-mismatch");
    if (source.requiredRightsIds.some((rightsId) => !boundRightsIds.includes(rightsId))) reasons.push("source.required-rights-mismatch");
    if (source.requiredProductUses.some((use) => !boundProductUses.includes(use))) reasons.push("source.required-product-uses-mismatch");
    if (source.requiredReviewScopes.some((scope) => !boundReviewScopes.includes(scope))) reasons.push("source.required-review-scopes-mismatch");
    reasons.push(...boundReviewClaimReasons(node, sourceAuthority));
  }
  if (sourceAuthority?.invalidatedNodeIds.includes(node.id)) {
    const reasonsForNode = sourceAuthority.invalidationReasonsByNodeId.find((entry) => entry.nodeId === node.id)?.reasons ?? ["source-authority-invalid"];
    reasonsForNode.forEach((reason) => reasons.push(`source.invalidated.${reason}`));
  }
  return reasons;
}

/**
 * Validates a supplied immutable graph and explicit authority-port snapshots.
 * It is intentionally unable to consult a registry, learner record, provider,
 * route, or publication service.
 */
export async function validateCurriculumGraph(input: unknown): Promise<ValidatedCurriculumGraph> {
  const issues: MutableIssue[] = [];
  const outer = curriculumValidationInputSchema.safeParse(input);
  if (!outer.success) {
    addSchemaIssues(issues, "input.schema-invalid", "input", outer);
    return {
      authorityTrust: "caller-asserted-unverified",
      graph: null,
      graphDigest: null,
      policy: null,
      sourceAuthorities: [],
      nodes: [],
      issues: stableIssues(issues),
      cyclePaths: [],
      invalidatedNodeIds: [],
      nonClaims: CURRICULUM_NON_CLAIMS,
    };
  }

  const graphResult = curriculumGraphPackageSchema.safeParse(outer.data.graph);
  const policyResult = curriculumGraphPolicySchema.safeParse(outer.data.policy);
  const sourceAuthoritiesResult = sourceAuthorityEvaluationsSchema.safeParse(outer.data.sourceAuthorities);
  const authoritiesResult = callerAssertedReleasedWorldAuthoritiesSchema.safeParse(outer.data.callerAssertedReleasedWorldAuthorities);

  if (!graphResult.success) addSchemaIssues(issues, "graph.schema-invalid", "graph", graphResult);
  if (!policyResult.success) addSchemaIssues(issues, "policy.schema-invalid", "policy", policyResult);
  if (!sourceAuthoritiesResult.success) addSchemaIssues(issues, "source.schema-invalid", "sourceAuthorities", sourceAuthoritiesResult);
  if (!authoritiesResult.success) addSchemaIssues(issues, "world.authority-schema-invalid", "callerAssertedReleasedWorldAuthorities", authoritiesResult);
  const graph = graphResult.success ? graphResult.data : null;
  const policy = policyResult.success ? policyResult.data : null;
  const sourceAuthorities = sourceAuthoritiesResult.success ? sourceAuthoritiesResult.data : [];
  const parsedAuthorities = authoritiesResult.success ? authoritiesResult.data : [];
  const invalid = new Set<string>();
  const knownNodeIds = graph ? graph.nodes.map((node) => node.id) : knownGraphNodeIds(outer.data.graph);
  let rootInvalid = !graph || !policy || !sourceAuthoritiesResult.success;
  let computedGraphDigest: string | null = null;

  if (graph) {
    const { digest, ...unsigned } = graph;
    computedGraphDigest = await curriculumGraphDigest(unsigned);
    if (digest !== computedGraphDigest) {
      issue(issues, "graph.digest-mismatch", "graph.digest", "Graph digest must match its canonical package payload.");
      rootInvalid = true;
    }
  }
  if (policy) {
    const { digest, ...unsigned } = policy;
    const computedPolicyDigest = await curriculumGraphPolicyDigest(unsigned);
    if (digest !== computedPolicyDigest) {
      issue(issues, "policy.digest-mismatch", "policy.digest", "Policy digest must match its canonical policy payload.");
      rootInvalid = true;
    }
  }
  if (graph && policy && (graph.policyRef.id !== policy.id || graph.policyRef.version !== policy.version || graph.policyRef.digest !== policy.digest)) {
    issue(issues, "policy.reference-mismatch", "graph.policyRef", "Graph policy reference must equal the supplied content-addressed policy.");
    rootInvalid = true;
  }
  if (graph && sourceAuthoritiesResult.success) {
    const refKey = (reference: { packageId: string; packageVersion: string; packageDigest: string }) =>
      `${reference.packageId}@${reference.packageVersion}@${reference.packageDigest}`;
    const suppliedByPackage = new Map(sourceAuthorities.map((authority) => [refKey(authority), authority]));
    if (graph.sourceAuthorityRefs.length !== sourceAuthorities.length ||
      graph.sourceAuthorityRefs.some((reference) => !suppliedByPackage.has(refKey(reference)))) {
      issue(issues, "source.reference-mismatch", "graph.sourceAuthorityRefs", "Graph source authority references must have one exact supplied package evaluation each.");
      rootInvalid = true;
    }
    for (const reference of graph.sourceAuthorityRefs) {
      const supplied = suppliedByPackage.get(refKey(reference));
      if (supplied && Date.parse(supplied.evaluatedAsOf) < Date.parse(reference.minimumEvaluatedAsOf)) {
        issue(issues, "source.evaluation-before-floor", "graph.sourceAuthorityRefs", "Source evaluation must be at or after the graph's minimum evaluation instant.");
        rootInvalid = true;
      }
    }
  }
  if (graph && !sourceAuthoritiesResult.success) {
    issue(issues, "source.reference-mismatch", "graph.sourceAuthorityRefs", "Invalid source authority inputs cannot authorize graph bindings.");
    rootInvalid = true;
  }
  if (graph && sourceAuthoritiesResult.success) {
    for (const evaluation of sourceAuthorities) {
      for (const nodeId of evaluation.invalidatedNodeIds) {
        const node = graph.nodes.find((candidate) => candidate.id === nodeId);
        if (!node) {
          issue(issues, "source.invalidation-unknown-node", `sourceAuthorities.${evaluation.packageId}.invalidatedNodeIds`, "Source authority cannot invalidate an unknown graph node.");
          rootInvalid = true;
          continue;
        }
        const requirement = node.sourceRequirement;
        if (requirement.mode !== "bound-source-authority" || requirement.sourcePackageRef.id !== evaluation.packageId ||
          requirement.sourcePackageRef.version !== evaluation.packageVersion || requirement.sourcePackageRef.digest !== evaluation.packageDigest) {
          issue(issues, "source.invalidation-package-mismatch", `sourceAuthorities.${evaluation.packageId}.invalidatedNodeIds`, "A source evaluation can invalidate only nodes bound to its exact source package.");
          rootInvalid = true;
        }
      }
    }
  }
  if (rootInvalid) knownNodeIds.forEach((nodeId) => invalid.add(nodeId));

  const cycles = graph ? validateGraphRelations(graph, issues, invalid) : [];
  if (graph && policy && sourceAuthoritiesResult.success) {
    for (const node of graph.nodes) {
      const nodeSource = node.sourceRequirement;
      if (nodeSource.mode === "bound-source-authority" &&
        !graph.sourceAuthorityRefs.some((reference) => reference.packageId === nodeSource.sourcePackageRef.id &&
          reference.packageVersion === nodeSource.sourcePackageRef.version &&
          reference.packageDigest === nodeSource.sourcePackageRef.digest)) {
        issue(issues, "source.node-reference-mismatch", `nodes.${node.id}.sourceRequirement`, "Bound source requirements must equal the graph source authority package.");
        invalid.add(node.id);
      }
      if (node.proposedAvailability !== "review-candidate") continue;
      const authority = authorityForNode(node, parsedAuthorities);
      if (!authority) {
        issue(issues, "world.authority-missing", `nodes.${node.id}.worldBinding`, "No exact caller-asserted World authority was supplied for this binding.");
        invalid.add(node.id);
      } else {
        for (const reason of bindingIssues(node, authority, policy)) {
          issue(issues, reason, `nodes.${node.id}.worldBinding`, "Caller-asserted World authority does not exactly match the authored binding.");
          invalid.add(node.id);
        }
      }
      for (const reason of sourceReasons(node, sourceAuthorities, authority)) {
        issue(issues, reason, `nodes.${node.id}.sourceRequirement`, "Source authority does not establish this release binding.");
        invalid.add(node.id);
      }
    }
  }

  const nodes: CurriculumNodeAvailability[] = graph ? [...graph.nodes]
    .sort((left, right) => curriculumCodeUnitCompare(left.id, right.id))
    .map((node) => {
      const nodePath = `nodes.${node.id}`;
      const nodeIssues = issues
        .filter((entry) => entry.path === nodePath || entry.path.startsWith(`${nodePath}.`))
        .map((entry) => entry.code);
      if (cycles.some((path) => path.slice(0, -1).includes(node.id))) nodeIssues.push("graph.cycle");
      if (rootInvalid) nodeIssues.push("graph.root-invalid");
      if (invalid.has(node.id) && nodeIssues.length === 0) nodeIssues.push("graph.node-invalidated");
      const availability: CurriculumAuthorityProjection = !rootInvalid && !invalid.has(node.id) && node.proposedAvailability === "review-candidate"
        ? "caller-asserted-release"
        : node.proposedAvailability;
      return {
        nodeId: node.id,
        capabilityId: node.capabilityId,
        capabilityVersion: node.capabilityVersion,
        availability,
        sourceAuthorityStatus: sourceStatus(node, sourceAuthorities),
        authorityTrust: "caller-asserted-unverified",
        callerAssertedReleaseMatch: availability === "caller-asserted-release" ? "exact-match" : "none",
        route: null,
        reasons: [...new Set(nodeIssues)].sort(curriculumCodeUnitCompare),
      };
    }) : [];

  if (graph) {
    for (const area of PATHWAY_ENTITLEMENT_AREAS) {
      const hasCallerAssertedRelease = nodes.some((node) => node.availability === "caller-asserted-release" && graph.nodes.find((candidate) => candidate.id === node.nodeId)?.entitlementAreas.includes(area));
      const hasGap = graph.gaps.some((gap) => gap.entitlementArea === area);
      if (!hasCallerAssertedRelease && !hasGap) issue(issues, "coverage.gap-missing", `areas.${area}`, "Areas without a caller-asserted release match require an explicit gap.");
    }
  }
  return {
    authorityTrust: "caller-asserted-unverified",
    graph,
    graphDigest: computedGraphDigest,
    policy,
    sourceAuthorities,
    nodes,
    issues: stableIssues(issues),
    cyclePaths: cycles,
    invalidatedNodeIds: [...invalid].sort(curriculumCodeUnitCompare),
    nonClaims: CURRICULUM_NON_CLAIMS,
  };
}
