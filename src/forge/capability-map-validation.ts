import { z } from "zod";

import { deepFreeze } from "./deep-freeze";
import {
  capabilityMapDigest,
  capabilityMapPackageSchema,
  capabilityMapPatchSchema,
  plannerGatewayReceiptFromPlan,
  type CapabilityMapPackageV1,
  type CapabilityMapPatchV1,
  type CapabilityMapTargetRefV1,
} from "./capability-map";
import {
  callerAssertedReleasedWorldAuthoritiesSchema,
  curriculumGraphPackageSchema,
  curriculumGraphPolicySchema,
  sourceAuthorityEvaluationsSchema,
  validateCurriculumGraph,
  type CallerAssertedReleasedWorldAuthorityV1,
  type CurriculumGraphPackageV1,
  type CurriculumGraphPolicyV1,
  type SourceAuthorityEvaluationV1,
} from "./curriculum";
import { learningIntentSchema, type LearningIntentV1 } from "./learning-intent";
import { planForgeLearning } from "../lib/forge-planner/planner";
import { forgePlanRequestSchema, type ForgePlanRequest } from "../lib/forge-planner/schema";

z.config({ jitless: true });

export interface CapabilityMapIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export interface CapabilityMapValidation {
  readonly map: CapabilityMapPackageV1 | null;
  readonly issues: readonly CapabilityMapIssue[];
  readonly runtimeEligibility: "fixture-only";
  readonly assignmentAllowed: false;
  readonly authorityTrust: "caller-asserted-unverified";
}

export interface CapabilityMapPatchValidation {
  readonly patch: CapabilityMapPatchV1 | null;
  readonly issues: readonly CapabilityMapIssue[];
  readonly outcome: "same-reviewed-package-route" | "candidate-revision-required" | "rejected" | "invalid";
}

type MutableIssue = { code: string; path: string; message: string };
type CapabilityNode = Extract<CapabilityMapPackageV1["nodes"][number], { curriculumNodeRef: unknown }>;
const ALL_REVIEW_SCOPES = ["domain-capability", "learning-sequence", "access", "safety-rights"] as const;
const compare = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0;
const timestampSchema = z.string().datetime({ offset: true });

function add(issues: MutableIssue[], code: string, path: string, message: string) {
  issues.push({ code, path, message });
}

function stable(issues: readonly MutableIssue[]): readonly CapabilityMapIssue[] {
  return deepFreeze([...issues].sort((left, right) => compare(left.code, right.code) || compare(left.path, right.path) || compare(left.message, right.message)));
}

function schemaIssues(issues: MutableIssue[], code: string, path: string, result: { error: { issues: readonly { path: readonly PropertyKey[]; message: string }[] } }) {
  for (const issue of result.error.issues) add(issues, code, [path, ...issue.path.map(String)].filter(Boolean).join("."), issue.message);
}

const validationInputSchema = z.strictObject({
  map: z.unknown(),
  graph: z.unknown(),
  policy: z.unknown(),
  sourceAuthorities: z.array(z.unknown()).max(256),
  callerAssertedReleasedWorldAuthorities: z.array(z.unknown()).max(256),
  learningIntent: z.unknown(),
  plannerRequest: z.unknown(),
  evaluationAt: z.unknown(),
});

function sameSet(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && [...left].sort(compare).every((value, index) => value === [...right].sort(compare)[index]);
}

function authorityMatches(
  expected: CallerAssertedReleasedWorldAuthorityV1,
  actual: CallerAssertedReleasedWorldAuthorityV1,
): boolean {
  return JSON.stringify(expected) === JSON.stringify(actual);
}

const sourceIdentity = (entry: { packageId: string; packageVersion: string; packageDigest: string }) =>
  `${entry.packageId}@${entry.packageVersion}@${entry.packageDigest}`;
const sourceReferenceIdentity = (entry: { packageId: string; packageVersion: string; packageDigest: string; minimumEvaluatedAsOf: string }) =>
  `${sourceIdentity(entry)}@${entry.minimumEvaluatedAsOf}`;
const capabilityIdentity = (entry: { capabilityId: string; capabilityVersion: string }) => `${entry.capabilityId}@${entry.capabilityVersion}`;
const sameCapabilityRef = (node: CapabilityNode, target: CapabilityMapTargetRefV1) =>
  node.curriculumNodeRef.id === target.curriculumNodeId &&
  node.curriculumNodeRef.capabilityId === target.capabilityId &&
  node.curriculumNodeRef.capabilityVersion === target.capabilityVersion;

function cycleIssues(map: CapabilityMapPackageV1, issues: MutableIssue[]) {
  const nodeIds = new Set(map.nodes.map((node) => node.id));
  const adjacency = new Map<string, string[]>();
  for (const node of map.nodes) adjacency.set(node.id, []);
  for (const edge of map.edges) {
    if (!nodeIds.has(edge.fromNodeId)) add(issues, "map.edge-from-unknown", `edges.${edge.id}.fromNodeId`, "Map edge starts at an unknown node.");
    if (!nodeIds.has(edge.toNodeId)) add(issues, "map.edge-to-unknown", `edges.${edge.id}.toNodeId`, "Map edge ends at an unknown node.");
    if (edge.fromNodeId === edge.toNodeId) add(issues, "map.edge-self-cycle", `edges.${edge.id}`, "A map dependency cannot reference itself.");
    if (nodeIds.has(edge.fromNodeId) && nodeIds.has(edge.toNodeId)) adjacency.get(edge.fromNodeId)!.push(edge.toNodeId);
  }
  for (const values of adjacency.values()) values.sort(compare);
  const state = new Map<string, "new" | "active" | "done">();
  const stack: string[] = [];
  const reported = new Set<string>();
  const visit = (nodeId: string): void => {
    state.set(nodeId, "active");
    stack.push(nodeId);
    for (const next of adjacency.get(nodeId) ?? []) {
      if (state.get(next) === "active") {
        const path = [...stack.slice(stack.indexOf(next)), next];
        const key = path.join("->");
        if (!reported.has(key)) {
          reported.add(key);
          add(issues, "map.cycle", path.join("->"), "Capability-map dependencies must be acyclic.");
        }
      } else if (state.get(next) !== "done") visit(next);
    }
    stack.pop();
    state.set(nodeId, "done");
  };
  for (const id of [...adjacency.keys()].sort(compare)) if (!state.has(id)) visit(id);
}

function mapStructuralIssues(
  map: CapabilityMapPackageV1,
  graph: CurriculumGraphPackageV1,
  policy: CurriculumGraphPolicyV1,
  sourceAuthorities: readonly SourceAuthorityEvaluationV1[],
  authorities: readonly CallerAssertedReleasedWorldAuthorityV1[],
  graphAvailability: ReadonlyMap<string, string>,
  issues: MutableIssue[],
) {
  if (map.createdFrom.curriculumGraphRef.id !== graph.id || map.createdFrom.curriculumGraphRef.version !== graph.version || map.createdFrom.curriculumGraphRef.digest !== graph.digest) {
    add(issues, "map.graph-reference-mismatch", "createdFrom.curriculumGraphRef", "Map must bind the exact immutable curriculum graph.");
  }
  const policyRef = map.createdFrom.curriculumGraphRef.policyRef;
  if (policyRef.id !== policy.id || policyRef.version !== policy.version || policyRef.digest !== policy.digest) {
    add(issues, "map.policy-reference-mismatch", "createdFrom.curriculumGraphRef.policyRef", "Map must bind the exact immutable graph policy.");
  }
  const graphRefs = graph.sourceAuthorityRefs.map(sourceReferenceIdentity);
  const mapRefs = map.createdFrom.curriculumGraphRef.sourceAuthorityRefs.map(sourceReferenceIdentity);
  const graphSourceIdentities = graph.sourceAuthorityRefs.map(sourceIdentity);
  const mapEvaluations = map.sourceAuthorityEvaluations.map(sourceIdentity);
  const inputEvaluations = sourceAuthorities.map(sourceIdentity);
  if (!sameSet(graphRefs, mapRefs) || !sameSet(graphSourceIdentities, mapEvaluations) || !sameSet(graphSourceIdentities, inputEvaluations)) {
    add(issues, "map.source-authority-reference-mismatch", "sourceAuthorityEvaluations", "Map source replay inputs must exactly match graph identities, source floors, and supplied snapshots.");
  }
  const inputEvaluationsByKey = new Map(sourceAuthorities.map((evaluation) => [sourceIdentity(evaluation), JSON.stringify(evaluation)]));
  for (const evaluation of map.sourceAuthorityEvaluations) {
    if (inputEvaluationsByKey.get(sourceIdentity(evaluation)) !== JSON.stringify(evaluation)) {
      add(issues, "map.source-authority-snapshot-mismatch", `sourceAuthorityEvaluations.${sourceIdentity(evaluation)}`, "Map must carry the exact replayed source-authority snapshot, not a lookalike with the same package identity.");
    }
  }

  const graphNodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const mapCapabilityNodes = map.nodes.filter((node): node is CapabilityNode => "curriculumNodeRef" in node);
  const mapNodesByIdentity = new Map<string, CapabilityNode[]>();
  for (const node of mapCapabilityNodes) {
    const key = `${node.curriculumNodeRef.id}:${capabilityIdentity(node.curriculumNodeRef)}`;
    mapNodesByIdentity.set(key, [...(mapNodesByIdentity.get(key) ?? []), node]);
  }
  for (const [identity, nodes] of mapNodesByIdentity) {
    if (nodes.length > 1) add(issues, "map.capability-node-duplicate", `nodes.${identity}`, "A curriculum capability may appear only once in a map revision.");
  }

  const releasedTargetNodeIds = new Set<string>();
  const explicitGapIds = new Set(map.explicitGaps.map((gap) => gap.id));
  for (const target of map.targetCapabilityRefs) {
    const path = `targetCapabilityRefs.${target.curriculumNodeId}`;
    const graphNode = graphNodes.get(target.curriculumNodeId);
    if (!graphNode || graphNode.capabilityId !== target.capabilityId || graphNode.capabilityVersion !== target.capabilityVersion) {
      add(issues, "map.target-unknown-graph-node", path, "Target must name an exact graph capability identity.");
      continue;
    }
    const expectedAvailability = target.derivedAvailability === "released" ? "caller-asserted-release" : target.derivedAvailability;
    if (graphAvailability.get(graphNode.id) !== expectedAvailability) {
      add(issues, "map.target-availability-mismatch", path, "Target state must equal the current graph-validation availability.");
    }
    if (!graphNode.supportedAgeModes.includes("18-plus") || !graphNode.accessRoutes.some((route) => route.supportedAgeModes.includes("18-plus"))) {
      add(issues, "map.target-adult-access-missing", path, "Every adult target requires a graph-reviewed adult access route.");
    }
    const expectedNodeKind = target.derivedAvailability === "released"
      ? "reviewed_capability"
      : target.derivedAvailability === "review-candidate" ? "candidate_capability" : "gap";
    const targetNodes = mapCapabilityNodes.filter((node) => node.kind === expectedNodeKind && sameCapabilityRef(node, target));
    if (targetNodes.length !== 1) {
      add(issues, "map.target-state-node-missing", path, `Target state ${target.derivedAvailability} requires exactly one ${expectedNodeKind} node.`);
      continue;
    }
    const targetNode = targetNodes[0]!;
    if (target.derivedAvailability === "released") {
      releasedTargetNodeIds.add(targetNode.id);
      if (targetNode.kind !== "reviewed_capability" || !targetNode.required) {
        add(issues, "map.released-target-not-required", path, "A released target must be represented by a required reviewed capability node.");
      }
      const supplied = authorities.find((authority) => authority.worldId === target.releasedWorldAuthority.worldId);
      if (!graphNode.worldBinding || !supplied || !authorityMatches(supplied, target.releasedWorldAuthority) ||
        target.releasedWorldAuthority.worldId !== graphNode.worldBinding.worldId || target.releasedWorldAuthority.capabilityId !== graphNode.capabilityId ||
        !target.releasedWorldAuthority.reviewedAgeModes.includes("18-plus") ||
        target.releasedWorldAuthority.availabilityStatus !== "available" ||
        target.releasedWorldAuthority.publicationPolicyRef.id !== policy.publicationPolicyRef.id ||
        target.releasedWorldAuthority.publicationPolicyRef.version !== policy.publicationPolicyRef.version ||
        target.releasedWorldAuthority.publicationPolicyRef.digest !== policy.publicationPolicyRef.digest) {
        add(issues, "map.released-target-authority-mismatch", path, "Released targets require an exact available adult World, policy, and authority snapshot.");
      }
    }
    if (target.derivedAvailability === "identified-gap") {
      if (targetNode.kind !== "gap" || !graph.gaps.some((gap) => gap.id === targetNode.gapRef.id) || !explicitGapIds.has(targetNode.gapRef.id)) {
        add(issues, "map.gap-target-unbound", path, "An identified gap target requires the exact graph gap and matching explicit map gap.");
      }
    }
  }

  for (const node of map.nodes) {
    if (node.kind === "reviewed_capability") {
      const graphNode = graphNodes.get(node.curriculumNodeRef.id);
      if (!graphNode || graphNode.capabilityId !== node.curriculumNodeRef.capabilityId || graphNode.capabilityVersion !== node.curriculumNodeRef.capabilityVersion || graphAvailability.get(graphNode.id) !== "caller-asserted-release") {
        add(issues, "map.reviewed-node-unreleased", `nodes.${node.id}`, "A reviewed capability node must match an exact caller-asserted released graph capability.");
      }
    }
    if (node.kind === "candidate_capability") {
      const graphNode = graphNodes.get(node.curriculumNodeRef.id);
      if (!graphNode || graphNode.capabilityId !== node.curriculumNodeRef.capabilityId || graphNode.capabilityVersion !== node.curriculumNodeRef.capabilityVersion || graphAvailability.get(graphNode.id) !== "review-candidate") {
        add(issues, "map.candidate-node-state-mismatch", `nodes.${node.id}`, "A candidate node must match an exact review-candidate graph capability.");
      }
    }
    if (node.kind === "gap") {
      const graphNode = graphNodes.get(node.curriculumNodeRef.id);
      if (!graphNode || graphNode.capabilityId !== node.curriculumNodeRef.capabilityId || graphNode.capabilityVersion !== node.curriculumNodeRef.capabilityVersion ||
        graphAvailability.get(graphNode.id) !== "identified-gap" || !graph.gaps.some((gap) => gap.id === node.gapRef.id) || !explicitGapIds.has(node.gapRef.id)) {
        add(issues, "map.gap-node-state-mismatch", `nodes.${node.id}`, "A gap node must bind the exact identified-gap capability and explicit graph gap.");
      }
    }
  }

  const unresolvedContent = map.targetCapabilityRefs.some((target) => target.derivedAvailability !== "released") ||
    map.nodes.some((node) => node.kind === "candidate_capability" || node.kind === "gap");
  if (unresolvedContent && map.reviewState !== "candidate") {
    add(issues, "map.unresolved-content-reviewed", "reviewState", "Candidate or gap content cannot enter reviewed or published map states.");
  }

  const nodeIds = new Set(map.nodes.map((node) => node.id));
  for (const route of map.routeOptions) {
    for (const nodeId of route.optionalNodeIds) {
      const node = map.nodes.find((entry) => entry.id === nodeId);
      if (!nodeIds.has(nodeId) || !node || node.kind !== "reviewed_capability" || node.required) {
        add(issues, "map.route-option-not-reviewed-optional", `routeOptions.${route.id}`, "Route options can order only existing reviewed optional capability nodes.");
      }
    }
  }

  const reviewedNodesById = new Map(map.nodes.filter((node): node is Extract<CapabilityMapPackageV1["nodes"][number], { kind: "reviewed_capability" }> => node.kind === "reviewed_capability").map((node) => [node.id, node]));
  const targetByReviewedNodeId = new Map<string, CapabilityMapTargetRefV1>();
  for (const target of map.targetCapabilityRefs.filter((target) => target.derivedAvailability === "released")) {
    const node = map.nodes.find((entry) => entry.kind === "reviewed_capability" && sameCapabilityRef(entry, target));
    if (node) targetByReviewedNodeId.set(node.id, target);
  }
  const projectNodeCount = new Map<string, number>();
  const proofNodeCount = new Map<string, number>();
  for (const node of map.nodes) {
    if (node.kind === "project") projectNodeCount.set(node.projectBindingRef, (projectNodeCount.get(node.projectBindingRef) ?? 0) + 1);
    if (node.kind === "proof") proofNodeCount.set(node.proofBindingRef, (proofNodeCount.get(node.proofBindingRef) ?? 0) + 1);
  }
  for (const binding of map.projectBindings) {
    if (projectNodeCount.get(binding.id) !== 1) add(issues, "map.project-binding-node-cardinality", `projectBindings.${binding.id}`, "Every project binding must be referenced by exactly one project node.");
    for (const targetNodeId of binding.targetNodeIds) {
      if (!reviewedNodesById.has(targetNodeId) || !targetByReviewedNodeId.has(targetNodeId)) {
        add(issues, "map.project-binding-target-invalid", `projectBindings.${binding.id}.targetNodeIds`, "Project bindings may target only released reviewed target nodes.");
      }
    }
  }
  for (const binding of map.proofBindings) {
    if (proofNodeCount.get(binding.id) !== 1) add(issues, "map.proof-binding-node-cardinality", `proofBindings.${binding.id}`, "Every proof binding must be referenced by exactly one proof node.");
    if (!reviewedNodesById.has(binding.targetNodeId) || !targetByReviewedNodeId.has(binding.targetNodeId)) {
      add(issues, "map.proof-target-invalid", `proofBindings.${binding.id}.targetNodeId`, "Proof must bind a released reviewed target node.");
      continue;
    }
    const graphNode = graphNodes.get(reviewedNodesById.get(binding.targetNodeId)!.curriculumNodeRef.id);
    const allowedTaskFamilies = graphNode?.evidenceRequirement.taskFamilyIds ?? [];
    for (const independent of binding.independentEvidenceBindings) {
      if (!allowedTaskFamilies.includes(independent.taskFamilyId)) {
        add(issues, "map.proof-task-family-unbound", `proofBindings.${binding.id}.${independent.id}`, "Independent proof task family must be bound by the exact graph evidence requirement.");
      }
    }
  }
  for (const targetNodeId of releasedTargetNodeIds) {
    const projects = map.projectBindings.filter((binding) => binding.targetNodeIds.includes(targetNodeId));
    if (projects.length !== 1 || projectNodeCount.get(projects[0]?.id ?? "") !== 1) {
      add(issues, "map.target-project-missing", `nodes.${targetNodeId}`, "Every released target requires exactly one referenced practical project binding.");
    }
    const proofs = map.proofBindings.filter((binding) => binding.targetNodeId === targetNodeId);
    if (proofs.length !== 1 || proofNodeCount.get(proofs[0]?.id ?? "") !== 1) {
      add(issues, "map.target-proof-missing", `nodes.${targetNodeId}`, "Every released target requires exactly one referenced protected proof binding.");
    }
  }

  const graphByCapability = new Map(graph.nodes.map((node) => [capabilityIdentity(node), node]));
  for (const edge of map.edges.filter((edge) => edge.kind === "prerequisite")) {
    const from = reviewedNodesById.get(edge.fromNodeId);
    const to = reviewedNodesById.get(edge.toNodeId);
    if (!from || !to) {
      add(issues, "map.prerequisite-node-kind-invalid", `edges.${edge.id}`, "Prerequisite edges must point from a reviewed dependent to a reviewed prerequisite.");
      continue;
    }
    const dependent = graphNodes.get(from.curriculumNodeRef.id);
    if (!dependent?.prerequisites.some((prerequisite) => prerequisite.capabilityId === to.curriculumNodeRef.capabilityId && prerequisite.capabilityVersion === to.curriculumNodeRef.capabilityVersion)) {
      add(issues, "map.prerequisite-edge-reversed-or-arbitrary", `edges.${edge.id}`, "Prerequisite edges use dependent-to-prerequisite direction and must match a graph prerequisite.");
    }
  }
  const requiredDependencyVisited = new Set<string>();
  const requireGraphPrerequisites = (dependentNodeId: string, dependentGraphId: string): void => {
    const visitKey = `${dependentNodeId}:${dependentGraphId}`;
    if (requiredDependencyVisited.has(visitKey)) return;
    requiredDependencyVisited.add(visitKey);
    const dependent = graphNodes.get(dependentGraphId);
    if (!dependent) return;
    for (const prerequisite of dependent.prerequisites) {
      const prerequisiteGraph = graphByCapability.get(capabilityIdentity(prerequisite));
      if (!prerequisiteGraph) continue;
      const prerequisiteNodes = [...reviewedNodesById.values()].filter((node) => node.curriculumNodeRef.id === prerequisiteGraph.id &&
        node.curriculumNodeRef.capabilityId === prerequisiteGraph.capabilityId && node.curriculumNodeRef.capabilityVersion === prerequisiteGraph.capabilityVersion);
      if (prerequisiteNodes.length !== 1) {
        add(issues, "map.required-prerequisite-skipped", `nodes.${dependentNodeId}`, "Every transitive graph prerequisite must be represented by one reviewed node.");
        continue;
      }
      const prerequisiteNode = prerequisiteNodes[0]!;
      const matchingEdges = map.edges.filter((edge) => edge.kind === "prerequisite" && edge.required && edge.fromNodeId === dependentNodeId && edge.toNodeId === prerequisiteNode.id);
      if (matchingEdges.length !== 1) {
        add(issues, "map.required-prerequisite-edge-missing", `nodes.${dependentNodeId}`, "Every direct graph prerequisite requires one dependent-to-prerequisite edge with a skip consequence.");
      }
      requireGraphPrerequisites(prerequisiteNode.id, prerequisiteGraph.id);
    }
  };
  for (const targetNodeId of releasedTargetNodeIds) requireGraphPrerequisites(targetNodeId, reviewedNodesById.get(targetNodeId)!.curriculumNodeRef.id);
}

function lifecycleIssues(map: CapabilityMapPackageV1, evaluationAt: string, issues: MutableIssue[]) {
  if (map.reviewState !== "reviewed") return;
  const at = Date.parse(evaluationAt);
  const review = map.mapReviewRecordRef;
  const decisions = map.scopedDecisionRefs;
  const decisionIds = decisions.map((decision) => decision.decisionId);
  if (!sameSet(review.scopedDecisionIds, decisionIds)) {
    add(issues, "map.review-record-mismatch", "mapReviewRecordRef", "Review record must enumerate the exact current scoped decisions.");
  }
  const scopes = decisions.map((decision) => decision.scope);
  if (!sameSet(scopes, ALL_REVIEW_SCOPES)) {
    add(issues, "map.review-scope-coverage-missing", "scopedDecisionRefs", "Review requires one accepted independent decision for every required scope.");
  }
  for (const decision of decisions) {
    if (decision.outcome !== "accepted" || decision.independence !== "independent" || decision.inputDigest !== map.mapDigest ||
      Date.parse(decision.decidedAt) > at || Date.parse(decision.expiresAt) <= at) {
      add(issues, "map.review-decision-not-current", `scopedDecisionRefs.${decision.decisionId}`, "Review decisions must be accepted, independent, current, and bind this exact map digest.");
    }
  }
  if (Date.parse(review.reviewedAt) > at || Date.parse(review.expiresAt) <= at ||
    decisions.some((decision) => Date.parse(decision.decidedAt) > Date.parse(review.reviewedAt) || Date.parse(decision.expiresAt) < Date.parse(review.expiresAt))) {
    add(issues, "map.review-record-not-current", "mapReviewRecordRef", "Review record must be current and cannot outlive its accepted decisions.");
  }
  if (map.publication.status === "published") {
    const publication = map.publication;
    if (Date.parse(publication.publishedAt) > at || Date.parse(publication.expiresAt) <= at ||
      decisions.some((decision) => publication.publisherAuthorityRef === decision.reviewerIdentityRef || publication.publisherAuthorityRef === decision.reviewerGrantRef)) {
      add(issues, "map.publisher-not-separated-or-current", "publication", "Publisher authority must be distinct from every reviewer/grant and publication must be current.");
    }
  }
}

async function intentAndPlannerIssues(
  map: CapabilityMapPackageV1,
  intent: LearningIntentV1,
  request: ForgePlanRequest,
  issues: MutableIssue[],
) {
  if (map.intentRef.intentId !== intent.intentId || map.intentRef.sanitizedIntentDigest !== intent.sanitizedIntentDigest || map.intentSummary !== intent.intentSummary) {
    add(issues, "map.sanitized-intent-mismatch", "intentRef", "Map intent identity, digest, and displayed summary must exactly match the parsed sanitized intent.");
  }
  if (!intent.learnerPreviewReceipt.acceptedUses.includes("internal-map")) {
    add(issues, "map.internal-map-use-not-accepted", "learningIntent.learnerPreviewReceipt", "The learner must explicitly accept the internal-map use for this sanitized digest.");
  }
  if (intent.constraints.audience !== "adult" || request.ageMode !== "adult") {
    add(issues, "map.adult-intent-or-planner-required", "plannerRequest.ageMode", "W6-A accepts only adult sanitized intents and adult planner requests.");
  }
  const plan = await planForgeLearning(request, { apiKey: "" });
  if (plan.contractKind === "refusal") {
    add(issues, "map.planner-refusal", "plannerRequest", "A refused deterministic planner result cannot compile a capability map.");
    return;
  }
  const expectedReceipt = await plannerGatewayReceiptFromPlan(plan);
  if (JSON.stringify(map.plannerGatewayReceipt) !== JSON.stringify(expectedReceipt)) {
    add(issues, "map.planner-receipt-mismatch", "plannerGatewayReceipt", "Map must carry the internally recomputed deterministic planner receipt.");
  }
  if (plan.contractKind === "grounded_learning" && !map.targetCapabilityRefs.some((target) =>
    target.derivedAvailability === "released" && target.releasedWorldAuthority.worldId === plan.route.worldId)) {
    add(issues, "map.planner-world-target-mismatch", "targetCapabilityRefs", "A grounded planner route must match one released target World identity.");
  }
  if (plan.contractKind === "exploratory_source_plan" &&
    (map.reviewState !== "candidate" || map.targetCapabilityRefs.some((target) => target.derivedAvailability === "released"))) {
    add(issues, "map.exploratory-route-not-candidate", "plannerGatewayReceipt", "Exploratory planning may produce only a candidate map with no released targets.");
  }
}

/** Pure validation. It deliberately cannot confer trusted release, review, publication, or assignment authority. */
export async function validateCapabilityMap(input: unknown): Promise<CapabilityMapValidation> {
  const issues: MutableIssue[] = [];
  const outer = validationInputSchema.safeParse(input);
  if (!outer.success) {
    schemaIssues(issues, "map.input-schema-invalid", "input", outer);
    return deepFreeze({ map: null, issues: stable(issues), runtimeEligibility: "fixture-only" as const, assignmentAllowed: false as const, authorityTrust: "caller-asserted-unverified" as const });
  }
  const mapResult = capabilityMapPackageSchema.safeParse(outer.data.map);
  const graphResult = curriculumGraphPackageSchema.safeParse(outer.data.graph);
  const policyResult = curriculumGraphPolicySchema.safeParse(outer.data.policy);
  const sourceResult = sourceAuthorityEvaluationsSchema.safeParse(outer.data.sourceAuthorities);
  const authorityResult = callerAssertedReleasedWorldAuthoritiesSchema.safeParse(outer.data.callerAssertedReleasedWorldAuthorities);
  const intentResult = learningIntentSchema.safeParse(outer.data.learningIntent);
  const plannerRequestResult = forgePlanRequestSchema.safeParse(outer.data.plannerRequest);
  const evaluationResult = timestampSchema.safeParse(outer.data.evaluationAt);
  if (!mapResult.success) schemaIssues(issues, "map.schema-invalid", "map", mapResult);
  if (!graphResult.success) schemaIssues(issues, "map.graph-schema-invalid", "graph", graphResult);
  if (!policyResult.success) schemaIssues(issues, "map.policy-schema-invalid", "policy", policyResult);
  if (!sourceResult.success) schemaIssues(issues, "map.source-schema-invalid", "sourceAuthorities", sourceResult);
  if (!authorityResult.success) schemaIssues(issues, "map.world-authority-schema-invalid", "callerAssertedReleasedWorldAuthorities", authorityResult);
  if (!intentResult.success) schemaIssues(issues, "map.intent-schema-invalid", "learningIntent", intentResult);
  if (!plannerRequestResult.success) schemaIssues(issues, "map.planner-request-schema-invalid", "plannerRequest", plannerRequestResult);
  if (!evaluationResult.success) schemaIssues(issues, "map.evaluation-schema-invalid", "evaluationAt", evaluationResult);
  if (!mapResult.success || !graphResult.success || !policyResult.success || !sourceResult.success || !authorityResult.success || !intentResult.success || !plannerRequestResult.success || !evaluationResult.success) {
    return deepFreeze({ map: mapResult.success ? mapResult.data : null, issues: stable(issues), runtimeEligibility: "fixture-only" as const, assignmentAllowed: false as const, authorityTrust: "caller-asserted-unverified" as const });
  }

  const map = mapResult.data;
  const graph = graphResult.data;
  const policy = policyResult.data;
  const sourceAuthorities = sourceResult.data;
  const authorities = authorityResult.data;
  const { mapDigest: _digest, ...unsigned } = map;
  void _digest;
  if (map.mapDigest !== await capabilityMapDigest(unsigned)) add(issues, "map.digest-mismatch", "map.mapDigest", "Map digest must match the canonical map payload.");
  const graphValidation = await validateCurriculumGraph({ graph, policy, sourceAuthorities, callerAssertedReleasedWorldAuthorities: authorities });
  for (const graphIssue of graphValidation.issues) add(issues, `graph.${graphIssue.code}`, `graph.${graphIssue.path}`, graphIssue.message);
  await intentAndPlannerIssues(map, intentResult.data, plannerRequestResult.data, issues);
  mapStructuralIssues(map, graph, policy, sourceAuthorities, authorities, new Map(graphValidation.nodes.map((node) => [node.nodeId, node.availability])), issues);
  cycleIssues(map, issues);
  lifecycleIssues(map, evaluationResult.data, issues);
  return deepFreeze({ map, issues: stable(issues), runtimeEligibility: "fixture-only" as const, assignmentAllowed: false as const, authorityTrust: "caller-asserted-unverified" as const });
}

/** Validates learner edits without mutating or republishing the reviewed package. */
export async function validateCapabilityMapPatch(value: unknown, baseValidationInput: unknown): Promise<CapabilityMapPatchValidation> {
  const issues: MutableIssue[] = [];
  const patchResult = capabilityMapPatchSchema.safeParse(value);
  if (!patchResult.success) schemaIssues(issues, "patch.schema-invalid", "patch", patchResult);
  const baseValidation = await validateCapabilityMap(baseValidationInput);
  if (baseValidation.issues.length > 0 || !baseValidation.map) {
    for (const issue of baseValidation.issues) add(issues, "patch.base-map-invalid", `baseMap.${issue.path}`, issue.message);
  }
  if (!patchResult.success || !baseValidation.map || baseValidation.issues.length > 0) {
    return deepFreeze({ patch: patchResult.success ? patchResult.data : null, issues: stable(issues), outcome: "invalid" as const });
  }
  const patch = patchResult.data;
  const map = baseValidation.map;
  const { mapDigest: _digest, ...unsigned } = map;
  void _digest;
  if (map.mapDigest !== await capabilityMapDigest(unsigned)) {
    add(issues, "patch.base-map-digest-mismatch", "baseMap.mapDigest", "Patch base map must retain its recomputed canonical digest.");
  }
  if (patch.baseMapRef.mapId !== map.mapId || patch.baseMapRef.version !== map.version || patch.baseMapRef.mapDigest !== map.mapDigest) {
    add(issues, "patch.base-map-mismatch", "patch.baseMapRef", "Patch must bind the exact immutable base map revision.");
  }
  const material = patch.operations.filter((operation) => ["propose-target-change", "propose-prerequisite-change", "propose-project-change", "propose-proof-change"].includes(operation.op));
  const hasUnsupportedRouteEdit = patch.operations.some((operation) => {
    if (operation.op === "set-route-preference") return !map.routeOptions.some((route) => route.id === operation.routeId);
    if (operation.op === "select-optional-node") return !map.routeOptions.some((route) => route.optionalNodeIds.includes(operation.nodeId));
    return false;
  });
  if (hasUnsupportedRouteEdit) add(issues, "patch.route-edit-not-reviewed", "patch.operations", "Only existing reviewed route ordering and optional nodes may remain on the same package.");
  if (material.length > 0 && patch.revalidation.outcome !== "candidate-revision-required") add(issues, "patch.material-edit-needs-candidate", "patch.revalidation", "Target, prerequisite, project, and proof edits always create a candidate revision.");
  if (material.length > 0 && patch.revalidation.outcome === "candidate-revision-required" &&
    patch.revalidation.candidateMapRef.mapId === map.mapId && patch.revalidation.candidateMapRef.version === map.version && patch.revalidation.candidateMapRef.mapDigest === map.mapDigest) {
    add(issues, "patch.candidate-revision-not-new", "patch.revalidation.candidateMapRef", "A material edit must point to a distinct candidate revision identity.");
  }
  if (material.length === 0 && patch.revalidation.outcome === "candidate-revision-required") add(issues, "patch.unnecessary-candidate-revision", "patch.revalidation", "A route-only edit must revalidate against the same reviewed package or be rejected.");
  if (patch.revalidation.outcome === "same-reviewed-package-route" && map.reviewState !== "reviewed") add(issues, "patch.same-package-unreviewed", "patch.revalidation", "Only a reviewed map can retain a same-package route edit.");
  const outcome = issues.length > 0 ? "invalid" : patch.revalidation.outcome;
  return deepFreeze({ patch, issues: stable(issues), outcome });
}
