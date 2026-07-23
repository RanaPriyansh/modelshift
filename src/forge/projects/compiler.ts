import { z } from "zod";

import {
  capabilityMapDigest,
  capabilityMapPackageSchema,
  type CapabilityMapPackageV1,
} from "../capability-map";
import { deepFreeze } from "../deep-freeze";
import { canonicalJson, forgeEventDigestSchema, sha256Digest } from "../events";
import {
  validatePracticePackage,
} from "../practice/contracts";
import {
  practicalProjectPackageSchema,
  projectCompletionEventSchema,
  strictProjectTimestampSchema,
  type DelayedReturnScheduleV1,
  type PracticalProjectPackageV1,
} from "./contracts";
import {
  compileDelayedReturnSchedule,
  validatePracticalProjectPackage,
  type PracticalProjectValidationContext,
  type ProjectValidationIssue,
} from "./validation";
import type { ProjectFixtureGrant } from "./fixture-authority";

z.config({ jitless: true });

export const PRACTICAL_PROJECT_COMPILATION_SCHEMA_VERSION = "practical-project-compilation.v1" as const;
export const PREREQUISITE_GAP_EVENT_SCHEMA_VERSION = "prerequisite-gap-event.v1" as const;
export const MAX_PROJECT_COMPILATION_INPUT_BYTES = 1_048_576 as const;

const gapEventSchema = z.strictObject({
  schemaVersion: z.literal(PREREQUISITE_GAP_EVENT_SCHEMA_VERSION),
  gapEventId: z.string().trim().max(160).regex(/^prerequisite-gap\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/),
  mapDigest: forgeEventDigestSchema,
  prerequisiteNodeId: z.string().trim().max(160).regex(/^map-node\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/),
  observedAt: strictProjectTimestampSchema,
  eventDigest: forgeEventDigestSchema,
});
export type PrerequisiteGapEventV1 = z.infer<typeof gapEventSchema>;
export type PrerequisiteGapEventInput = Omit<PrerequisiteGapEventV1, "eventDigest"> & { eventDigest?: string };

const compilationRequestSchema = z.strictObject({
  schemaVersion: z.literal(PRACTICAL_PROJECT_COMPILATION_SCHEMA_VERSION),
  project: z.unknown(),
  capabilityMap: z.unknown(),
  practicePackages: z.array(z.unknown()).max(32),
  prerequisiteGapEvents: z.array(z.unknown()).max(32),
  projectCompletionEvent: z.unknown().optional(),
  evaluatedAt: z.unknown(),
});

export type PracticalProjectCompilationContext = PracticalProjectValidationContext & Readonly<{
  practiceReviewGrants: readonly ProjectFixtureGrant[];
}>;

export type PracticalProjectCompilation = Readonly<{
  outcome: "invalid" | "unavailable-gap" | "repair-required" | "workflow-ready";
  issues: readonly ProjectValidationIssue[];
  workflow: readonly Readonly<{ step: string; action: string; artifactIds: readonly string[] }>[];
  repairWorkflow: readonly Readonly<{
    repairRouteId: string;
    prerequisiteCapabilityId: string;
    practicePackageRef: Readonly<{ id: string; version: string; digest: string }>;
  }>[];
  delayedReturnSchedule: Readonly<DelayedReturnScheduleV1> | null;
  runtimeAssignmentAuthority: "fixture-only";
  runtimeAssignmentAllowed: false;
  proofAuthority: false;
  capabilityClaimIssued: false;
  autonomousScoreIssued: false;
  autonomousMasteryClaimIssued: false;
}>;

type MutableIssue = { code: string; path: string; message: string };

function compare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function stable(issues: readonly MutableIssue[]): readonly ProjectValidationIssue[] {
  return deepFreeze([...issues].sort((left, right) =>
    compare(left.code, right.code) || compare(left.path, right.path) || compare(left.message, right.message),
  ));
}

function add(issues: MutableIssue[], code: string, path: string, message: string): void {
  issues.push({ code, path, message });
}

function schemaIssues(error: { issues: readonly { code: string; path: readonly PropertyKey[]; message: string }[] }): MutableIssue[] {
  return error.issues.map((issue) => ({
    code: `schema.${issue.code}`,
    path: issue.path.map(String).join(".") || "root",
    message: issue.message,
  }));
}

function boundedInput(value: unknown): boolean {
  try {
    const encoded = new TextEncoder().encode(JSON.stringify(value));
    return encoded.byteLength <= MAX_PROJECT_COMPILATION_INPUT_BYTES;
  } catch {
    return false;
  }
}

function capabilityKey(entry: { curriculumNodeId: string; capabilityId: string; capabilityVersion: string }): string {
  return `${entry.curriculumNodeId}@${entry.capabilityId}@${entry.capabilityVersion}`;
}

function refKey(entry: { id: string; version: string; digest: string }): string {
  return `${entry.id}@${entry.version}@${entry.digest}`;
}

function sameSet(left: readonly string[], right: readonly string[]): boolean {
  const sortedLeft = [...left].sort(compare);
  const sortedRight = [...right].sort(compare);
  return sortedLeft.length === sortedRight.length && sortedLeft.every((value, index) => value === sortedRight[index]);
}

function rawMapAssociationIssues(
  project: PracticalProjectPackageV1,
  map: CapabilityMapPackageV1,
  evaluationAt: string,
  issues: MutableIssue[],
): ReadonlyMap<string, Extract<CapabilityMapPackageV1["nodes"][number], { kind: "reviewed_capability" }>> {
  if (map.mapId !== project.mapAssociation.capabilityMapId || map.version !== project.mapAssociation.capabilityMapVersion) {
    add(issues, "compiler.map-identity-mismatch", "capabilityMap", "Project association must name the exact raw capability-map identity.");
  }
  if (map.reviewState !== "reviewed") {
    add(issues, "compiler.map-not-reviewed-fixture", "capabilityMap.reviewState", "The W6-E fixture compiler accepts only a reviewed map shape; this still grants no runtime authority.");
  } else {
    const requiredScopes = ["domain-capability", "learning-sequence", "access", "safety-rights"];
    const decisionIds = map.scopedDecisionRefs.map((entry) => entry.decisionId);
    if (
      !sameSet(map.mapReviewRecordRef.scopedDecisionIds, decisionIds)
      || !sameSet(map.scopedDecisionRefs.map((entry) => entry.scope), requiredScopes)
      || Date.parse(map.mapReviewRecordRef.reviewedAt) > Date.parse(evaluationAt)
      || Date.parse(map.mapReviewRecordRef.expiresAt) <= Date.parse(evaluationAt)
      || map.scopedDecisionRefs.some((entry) =>
        entry.outcome !== "accepted"
        || entry.independence !== "independent"
        || entry.inputDigest !== map.mapDigest
        || Date.parse(entry.decidedAt) > Date.parse(evaluationAt)
        || Date.parse(entry.expiresAt) <= Date.parse(evaluationAt),
      )
    ) {
      add(issues, "compiler.map-review-not-current", "capabilityMap", "Raw map review shape must be complete, independent, current, and digest-bound for this fixture compile.");
    }
  }
  const reviewedNodes = new Map(
    map.nodes
      .filter((node): node is Extract<CapabilityMapPackageV1["nodes"][number], { kind: "reviewed_capability" }> => node.kind === "reviewed_capability")
      .map((node) => [node.id, node]),
  );
  const projectBinding = map.projectBindings.find((entry) => entry.id === project.mapAssociation.projectBindingId);
  if (!projectBinding) {
    add(issues, "compiler.project-binding-missing", "capabilityMap.projectBindings", "Raw map must contain the exact project binding.");
    return reviewedNodes;
  }
  if (
    projectBinding.projectPackageRef.id !== project.projectId
    || projectBinding.projectPackageRef.version !== project.version
    || projectBinding.projectPackageRef.digest !== project.projectDigest
  ) {
    add(issues, "compiler.project-seal-mismatch", "capabilityMap.projectBindings", "Map must point one-way to the exact sealed project id, version, and digest.");
  }
  if (
    projectBinding.noCostAlternativeRef.id !== project.templateContent.noCostMaterialAlternative.alternativeRef.id
    || projectBinding.noCostAlternativeRef.version !== project.templateContent.noCostMaterialAlternative.alternativeRef.version
    || projectBinding.noCostAlternativeRef.digest !== project.templateContent.noCostMaterialAlternative.alternativeRef.digest
    || projectBinding.safetyClass !== "reviewed-low-risk"
    || projectBinding.practicalOutcome !== project.templateContent.mapBindingSemantics.practicalOutcome
  ) {
    add(issues, "compiler.project-binding-content-mismatch", "capabilityMap.projectBindings", "Map project binding must match the authored practical outcome, alternative, and low-risk class exactly.");
  }
  const targetNodes = projectBinding.targetNodeIds.map((nodeId) => reviewedNodes.get(nodeId)).filter((node): node is NonNullable<typeof node> => Boolean(node));
  if (targetNodes.length !== projectBinding.targetNodeIds.length) {
    add(issues, "compiler.project-target-node-invalid", "capabilityMap.projectBindings.targetNodeIds", "Every project target must resolve to one reviewed capability node.");
  }
  if (!sameSet(targetNodes.map((node) => capabilityKey({
    curriculumNodeId: node.curriculumNodeRef.id,
    capabilityId: node.curriculumNodeRef.capabilityId,
    capabilityVersion: node.curriculumNodeRef.capabilityVersion,
  })), project.targetCapabilityRefs.map(capabilityKey))) {
    add(issues, "compiler.project-target-capability-mismatch", "targetCapabilityRefs", "Project targets must equal the capabilities bound by the raw map project binding.");
  }
  const releasedTargets = map.targetCapabilityRefs
    .filter((entry) => entry.derivedAvailability === "released")
    .map(capabilityKey);
  if (project.targetCapabilityRefs.some((entry) => !releasedTargets.includes(capabilityKey(entry)))) {
    add(issues, "compiler.project-target-not-released-map-target", "targetCapabilityRefs", "Every project target must also be an exact released target in the raw map package.");
  }
  if (map.nodes.filter((node) => node.kind === "project" && node.projectBindingRef === project.mapAssociation.projectBindingId).length !== 1) {
    add(issues, "compiler.project-node-cardinality", "capabilityMap.nodes", "Exactly one map project node must reference the exact project binding.");
  }

  const adjacency = new Map<string, string[]>();
  for (const edge of map.edges.filter((entry) => entry.kind === "prerequisite" && entry.required)) {
    adjacency.set(edge.fromNodeId, [...(adjacency.get(edge.fromNodeId) ?? []), edge.toNodeId]);
  }
  const prerequisiteNodeIds = new Set<string>();
  const visit = (nodeId: string): void => {
    for (const prerequisiteNodeId of adjacency.get(nodeId) ?? []) {
      if (prerequisiteNodeIds.has(prerequisiteNodeId)) continue;
      prerequisiteNodeIds.add(prerequisiteNodeId);
      visit(prerequisiteNodeId);
    }
  };
  for (const targetNodeId of projectBinding.targetNodeIds) visit(targetNodeId);
  const prerequisiteCapabilities = [...prerequisiteNodeIds]
    .map((nodeId) => reviewedNodes.get(nodeId))
    .filter((node): node is NonNullable<typeof node> => Boolean(node))
    .map((node) => capabilityKey({
      curriculumNodeId: node.curriculumNodeRef.id,
      capabilityId: node.curriculumNodeRef.capabilityId,
      capabilityVersion: node.curriculumNodeRef.capabilityVersion,
    }));
  if (prerequisiteCapabilities.length !== prerequisiteNodeIds.size || !sameSet(prerequisiteCapabilities, project.prerequisiteCapabilityRefs.map(capabilityKey))) {
    add(issues, "compiler.project-prerequisite-mismatch", "prerequisiteCapabilityRefs", "Project prerequisites must equal the complete transitive raw-map prerequisite set.");
  }

  const mapRepresentationRefs = map.nodes
    .filter((node): node is Extract<CapabilityMapPackageV1["nodes"][number], { kind: "representation" }> => node.kind === "representation")
    .map((node) => refKey(node.representationRef));
  for (const representation of project.mapAssociation.requiredRepresentationRefs) {
    if (!mapRepresentationRefs.includes(refKey(representation))) {
      add(issues, "compiler.representation-binding-missing", "mapAssociation.requiredRepresentationRefs", "Every project representation must resolve to the exact raw-map representation identity.");
    }
  }

  const proofBinding = map.proofBindings.find((entry) => entry.id === project.mapAssociation.proofBindingId);
  if (!proofBinding) {
    add(issues, "compiler.proof-binding-missing", "capabilityMap.proofBindings", "Raw map must contain the exact protected-proof binding.");
    return reviewedNodes;
  }
  if (map.nodes.filter((node) => node.kind === "proof" && node.proofBindingRef === project.mapAssociation.proofBindingId).length !== 1) {
    add(issues, "compiler.proof-node-cardinality", "capabilityMap.nodes", "Exactly one map proof node must reference the exact proof binding.");
  }
  const proofTarget = reviewedNodes.get(proofBinding.targetNodeId);
  if (
    !proofTarget
    || capabilityKey({
      curriculumNodeId: proofTarget.curriculumNodeRef.id,
      capabilityId: proofTarget.curriculumNodeRef.capabilityId,
      capabilityVersion: proofTarget.curriculumNodeRef.capabilityVersion,
    }) !== capabilityKey(project.proof.targetCapabilityRef)
  ) {
    add(issues, "compiler.proof-target-mismatch", "capabilityMap.proofBindings.targetNodeId", "Map proof target must equal the project's exact proof target capability.");
  }
  const mapEvidence = proofBinding.independentEvidenceBindings.map((entry) =>
    `${entry.id}@${entry.taskFamilyId}@${entry.taskVersion}@${entry.representation}`,
  );
  const projectEvidence = project.proof.independentEvidenceBindings.map((entry) =>
    `${entry.id}@${entry.taskFamilyId}@${entry.taskVersion}@${entry.representation}`,
  );
  if (
    proofBinding.assistanceMode !== "closed"
    || proofBinding.protectedOperation !== project.proof.protectedOperationText
    || proofBinding.protectedOperation !== project.templateContent.mapBindingSemantics.protectedOperationText
    || refKey(proofBinding.separatingExperienceRef) !== refKey(project.proof.separatingExperienceRef)
    || !sameSet(mapEvidence, projectEvidence)
    || proofBinding.returnIntervalDays !== project.delayedReturn.delayDays
  ) {
    add(issues, "compiler.proof-binding-content-mismatch", "capabilityMap.proofBindings", "Proof operation, experience, task families, transfer representations, support closure, and return interval must match exactly.");
  }
  return reviewedNodes;
}

function emptyResult(outcome: PracticalProjectCompilation["outcome"], issues: readonly ProjectValidationIssue[]): PracticalProjectCompilation {
  return deepFreeze({
    outcome,
    issues,
    workflow: [],
    repairWorkflow: [],
    delayedReturnSchedule: null,
    runtimeAssignmentAuthority: "fixture-only",
    runtimeAssignmentAllowed: false,
    proofAuthority: false,
    capabilityClaimIssued: false,
    autonomousScoreIssued: false,
    autonomousMasteryClaimIssued: false,
  });
}

function canonicalGapEventPayload(input: PrerequisiteGapEventInput): object {
  const parsed = gapEventSchema.parse({ ...input, eventDigest: `sha256:${"0".repeat(64)}` });
  const { eventDigest: _digest, ...unsigned } = parsed;
  void _digest;
  return unsigned;
}

export async function prerequisiteGapEventDigest(input: PrerequisiteGapEventInput): Promise<string> {
  return sha256Digest(canonicalJson(canonicalGapEventPayload(input)));
}

export async function createPrerequisiteGapEvent(input: PrerequisiteGapEventInput): Promise<Readonly<PrerequisiteGapEventV1>> {
  const parsed = gapEventSchema.parse({ ...input, eventDigest: `sha256:${"0".repeat(64)}` });
  const { eventDigest: _digest, ...unsigned } = parsed;
  void _digest;
  return deepFreeze(gapEventSchema.parse({ ...unsigned, eventDigest: await prerequisiteGapEventDigest(unsigned) }));
}

export async function compilePracticalProject(
  value: unknown,
  context: PracticalProjectCompilationContext,
): Promise<PracticalProjectCompilation> {
  if (!boundedInput(value)) {
    return emptyResult("invalid", stable([{ code: "compiler.input-too-large-or-non-json", path: "request", message: `Compiler input must be finite JSON no larger than ${MAX_PROJECT_COMPILATION_INPUT_BYTES} bytes.` }]));
  }
  const requestResult = compilationRequestSchema.safeParse(value);
  if (!requestResult.success) return emptyResult("invalid", stable(schemaIssues(requestResult.error)));
  const request = requestResult.data;
  if (request.evaluatedAt !== context.evaluationAt) {
    return emptyResult("invalid", stable([{ code: "compiler.evaluation-time-mismatch", path: "evaluatedAt", message: "Request and process-local validation context must use the same strict evaluation instant." }]));
  }

  const projectResult = practicalProjectPackageSchema.safeParse(request.project);
  const mapResult = capabilityMapPackageSchema.safeParse(request.capabilityMap);
  const issues: MutableIssue[] = [];
  if (!projectResult.success) issues.push(...schemaIssues(projectResult.error));
  if (!mapResult.success) issues.push(...schemaIssues(mapResult.error));
  if (!projectResult.success || !mapResult.success) return emptyResult("invalid", stable(issues));

  const projectValidation = await validatePracticalProjectPackage(projectResult.data, context);
  issues.push(...projectValidation.issues);
  const map = mapResult.data;
  const { mapDigest: _mapDigest, ...unsignedMap } = map;
  void _mapDigest;
  if (map.mapDigest !== await capabilityMapDigest(unsignedMap)) {
    add(issues, "compiler.map-digest-mismatch", "capabilityMap.mapDigest", "Compiler must revalidate the exact raw capability-map digest.");
  }
  rawMapAssociationIssues(projectResult.data, map, context.evaluationAt, issues);
  if (issues.length > 0) return emptyResult("invalid", stable(issues));

  const gapEvents: PrerequisiteGapEventV1[] = [];
  for (const [index, valueAtIndex] of request.prerequisiteGapEvents.entries()) {
    const result = gapEventSchema.safeParse(valueAtIndex);
    if (!result.success) {
      issues.push(...schemaIssues(result.error).map((issue) => ({ ...issue, path: `prerequisiteGapEvents.${index}.${issue.path}` })));
      continue;
    }
    const event = result.data;
    const { eventDigest: _eventDigest, ...unsigned } = event;
    void _eventDigest;
    if (
      event.eventDigest !== await prerequisiteGapEventDigest(unsigned)
      || event.mapDigest !== map.mapDigest
      || Date.parse(event.observedAt) > Date.parse(context.evaluationAt)
    ) {
      add(issues, "compiler.gap-event-invalid", `prerequisiteGapEvents.${index}`, "Gap event must have an exact digest, bind this raw map, and not come from the future.");
    }
    gapEvents.push(event);
  }
  if (issues.length > 0) return emptyResult("invalid", stable(issues));

  const reviewedNodes = new Map(
    map.nodes
      .filter((node): node is Extract<CapabilityMapPackageV1["nodes"][number], { kind: "reviewed_capability" }> => node.kind === "reviewed_capability")
      .map((node) => [node.id, node]),
  );
  const prerequisiteKeys = new Set(projectResult.data.prerequisiteCapabilityRefs.map(capabilityKey));
  const gapCapabilities: string[] = [];
  for (const event of gapEvents) {
    const node = reviewedNodes.get(event.prerequisiteNodeId);
    const key = node ? capabilityKey({
      curriculumNodeId: node.curriculumNodeRef.id,
      capabilityId: node.curriculumNodeRef.capabilityId,
      capabilityVersion: node.curriculumNodeRef.capabilityVersion,
    }) : "";
    if (!node || !prerequisiteKeys.has(key)) {
      add(issues, "compiler.gap-node-not-prerequisite", `prerequisiteGapEvents.${event.gapEventId}`, "Gap event node must resolve to one exact project prerequisite from the raw map.");
    } else {
      gapCapabilities.push(key);
    }
  }
  if (issues.length > 0) return emptyResult("invalid", stable(issues));

  if (gapCapabilities.length > 0) {
    const repairWorkflow: PracticalProjectCompilation["repairWorkflow"][number][] = [];
    for (const key of [...new Set(gapCapabilities)].sort(compare)) {
      const route = projectResult.data.prerequisiteRepairRoutes.find((entry) => capabilityKey(entry.prerequisiteCapabilityRef) === key);
      const candidateValue = request.practicePackages.find((entry) => {
        const parsed = z.object({ practiceId: z.string(), version: z.string(), practiceDigest: z.string() }).safeParse(entry);
        return parsed.success && route
          && parsed.data.practiceId === route.practicePackageRef.id
          && parsed.data.version === route.practicePackageRef.version
          && parsed.data.practiceDigest === route.practicePackageRef.digest;
      });
      if (!route || !candidateValue) {
        add(issues, "compiler.repair-practice-unavailable", `prerequisite.${key}`, "A revealed prerequisite gap has no exact raw practice package.");
        continue;
      }
      const parsedCandidate = z.object({ review: z.object({ reviewerGrantMarker: z.string() }) }).safeParse(candidateValue);
      const grant = parsedCandidate.success
        ? context.practiceReviewGrants.find((entry) => entry.grantMarker === parsedCandidate.data.review.reviewerGrantMarker)
        : undefined;
      const practiceValidation = await validatePracticePackage(candidateValue, context.evaluationAt, grant);
      for (const issue of practiceValidation.issues) add(issues, `compiler.${issue.code}`, `practicePackages.${issue.path}`, issue.message);
      const practice = practiceValidation.practice;
      if (
        !practice
        || practice.practiceId !== route.practicePackageRef.id
        || practice.version !== route.practicePackageRef.version
        || practice.practiceDigest !== route.practicePackageRef.digest
        || !sameSet(practice.targetCapabilityRefs.map(capabilityKey), [key])
      ) {
        add(issues, "compiler.repair-practice-binding-mismatch", `prerequisite.${key}`, "Practice package must have the exact reference, target capability, authored access alternative, and current fixture review.");
        continue;
      }
      repairWorkflow.push(deepFreeze({
        repairRouteId: route.repairRouteId,
        prerequisiteCapabilityId: route.prerequisiteCapabilityRef.capabilityId,
        practicePackageRef: deepFreeze({ ...route.practicePackageRef }),
      }));
    }
    if (issues.length > 0) return emptyResult("unavailable-gap", stable(issues));
    return deepFreeze({
      ...emptyResult("repair-required", []),
      repairWorkflow: deepFreeze(repairWorkflow.sort((left, right) => compare(left.repairRouteId, right.repairRouteId))),
    });
  }

  let delayedReturnSchedule: DelayedReturnScheduleV1 | null = null;
  if (request.projectCompletionEvent !== undefined) {
    const completion = projectCompletionEventSchema.safeParse(request.projectCompletionEvent);
    if (!completion.success) issues.push(...schemaIssues(completion.error));
    else {
      const schedule = await compileDelayedReturnSchedule(projectResult.data, completion.data, context);
      issues.push(...schedule.issues);
      delayedReturnSchedule = schedule.schedule;
    }
  }
  if (issues.length > 0) return emptyResult("invalid", stable(issues));
  const workflow = projectResult.data.templateContent.milestones
    .slice()
    .sort((left, right) => left.sequence - right.sequence || compare(left.milestoneId, right.milestoneId))
    .map((entry) => deepFreeze({
      step: entry.milestoneId,
      action: entry.learnerAction,
      artifactIds: deepFreeze([...entry.completionArtifactIds].sort(compare)),
    }));
  return deepFreeze({
    outcome: "workflow-ready",
    issues: [],
    workflow: deepFreeze(workflow),
    repairWorkflow: [],
    delayedReturnSchedule,
    runtimeAssignmentAuthority: "fixture-only",
    runtimeAssignmentAllowed: false,
    proofAuthority: false,
    capabilityClaimIssued: false,
    autonomousScoreIssued: false,
    autonomousMasteryClaimIssued: false,
  });
}
