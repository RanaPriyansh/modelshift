import { types as nodeUtilTypes } from "node:util";
import { ZodError } from "zod";

import { deepFreeze } from "../deep-freeze";
import { canonicalJson, sha256Digest } from "../events";
import {
  UNIVERSITY_RESEARCH_ACCEPTED_SOURCE_COMMIT,
  UNIVERSITY_RESEARCH_APPROVAL_ENVELOPE_PURPOSE,
  UNIVERSITY_RESEARCH_CANDIDATE_ROUTE,
  UNIVERSITY_RESEARCH_DECISION_OUTCOMES,
  UNIVERSITY_RESEARCH_EVIDENCE_DIMENSIONS,
  UNIVERSITY_RESEARCH_EXPOSURE_TASK_SET_DIGEST,
  UNIVERSITY_RESEARCH_INFORMATION_ITEM_IDS,
  UNIVERSITY_RESEARCH_READINESS_PROJECTION_SCHEMA_VERSION,
  UNIVERSITY_RESEARCH_REQUIRED_APPROVALS,
  UNIVERSITY_RESEARCH_REQUIRED_ROLES,
  UNIVERSITY_RESEARCH_SCENARIO_IDS,
  UNIVERSITY_RESEARCH_TASK_FAMILIES,
  type UniversityResearchReadinessIssue,
  type UniversityResearchReadinessProjectionV1,
  type UniversityResearchReadinessRequestV1,
  type UniversityResearchReadinessStatus,
  universityResearchReadinessRequestSchema,
} from "./contracts";

const MAX_JSON_DEPTH = 16;
const MAX_JSON_NODES = 8_192;

const AUTHORITY = deepFreeze({
  projectionClass: "fixture_only_research_operations_preflight",
  artifactIdentityAuthority: "caller_asserted_fixture_only",
  operatorIdentityAuthority: "caller_asserted_fixture_only",
  independentApprovalAuthority: "not_established",
  participantEnrollmentAllowed: false,
  participantDataCaptureAllowed: false,
  courseworkCaptureAllowed: false,
  claimUpgradeAllowed: false,
  externalSendAllowed: false,
  persistenceAllowed: false,
  eventEmissionAllowed: false,
} satisfies UniversityResearchReadinessProjectionV1["authority"]);

const EMPTY_OPERATIONS = deepFreeze({
  requiredRoleCount: UNIVERSITY_RESEARCH_REQUIRED_ROLES.length,
  validFixtureRoleBindingCount: 0,
  requiredApprovalCount: UNIVERSITY_RESEARCH_REQUIRED_APPROVALS.length,
  boundApprovalReferenceCount: 0,
  operationsPlanDigest: null,
});

class UnsafeJsonInput extends Error {}

function copyPlainJson(value: unknown): unknown {
  const budget = { nodes: 0 };

  function visit(current: unknown, depth: number): unknown {
    budget.nodes += 1;
    if (budget.nodes > MAX_JSON_NODES || depth > MAX_JSON_DEPTH) {
      throw new UnsafeJsonInput();
    }
    if (
      current === null
      || typeof current === "string"
      || typeof current === "boolean"
    ) return current;
    if (typeof current === "number") {
      if (!Number.isFinite(current)) throw new UnsafeJsonInput();
      return current;
    }
    if (typeof current !== "object" || nodeUtilTypes.isProxy(current)) {
      throw new UnsafeJsonInput();
    }

    if (Array.isArray(current)) {
      if (Object.getPrototypeOf(current) !== Array.prototype) {
        throw new UnsafeJsonInput();
      }
      if (current.length > MAX_JSON_NODES - budget.nodes) {
        throw new UnsafeJsonInput();
      }
      const keys = Reflect.ownKeys(current);
      if (
        keys.length > MAX_JSON_NODES - budget.nodes + 1
        || keys.some((key) => typeof key === "symbol")
      ) throw new UnsafeJsonInput();
      const names = keys as string[];
      if (
        names.some((name) => name !== "length" && !/^(0|[1-9][0-9]*)$/.test(name))
        || names.length !== current.length + 1
      ) throw new UnsafeJsonInput();
      return names
        .filter((name) => name !== "length")
        .sort((left, right) => Number(left) - Number(right))
        .map((name) => {
          const descriptor = Object.getOwnPropertyDescriptor(current, name);
          if (
            !descriptor
            || !descriptor.enumerable
            || !("value" in descriptor)
          ) throw new UnsafeJsonInput();
          return visit(descriptor.value, depth + 1);
        });
    }

    const prototype = Object.getPrototypeOf(current);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new UnsafeJsonInput();
    }
    const keys = Reflect.ownKeys(current);
    if (
      keys.length > MAX_JSON_NODES - budget.nodes
      || keys.some((key) => typeof key === "symbol")
    ) throw new UnsafeJsonInput();
    const copy: Record<string, unknown> = Object.create(null);
    for (const name of (keys as string[]).sort()) {
      const descriptor = Object.getOwnPropertyDescriptor(current, name);
      if (
        !descriptor
        || !descriptor.enumerable
        || !("value" in descriptor)
        || name === "__proto__"
        || name === "prototype"
        || name === "constructor"
      ) throw new UnsafeJsonInput();
      copy[name] = visit(descriptor.value, depth + 1);
    }
    return copy;
  }

  return visit(value, 0);
}

function issue(
  code: UniversityResearchReadinessIssue["code"],
  path: string,
  message: string,
): UniversityResearchReadinessIssue {
  return { code, path, message };
}

function orderedIssues(
  issues: readonly UniversityResearchReadinessIssue[],
): readonly UniversityResearchReadinessIssue[] {
  return [...issues].sort((left, right) => {
    const codeOrder = left.code.localeCompare(right.code);
    return codeOrder !== 0 ? codeOrder : left.path.localeCompare(right.path);
  });
}

function exactOrderedSet(
  actual: readonly string[],
  expected: readonly string[],
): boolean {
  return actual.length === expected.length
    && actual.every((value, index) => value === expected[index]);
}

function duplicateValues(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

function counterbalanceScheduleDeclared(
  request: UniversityResearchReadinessRequestV1,
): boolean {
  const scenarioPackIds = request.counterbalance.scenarioPacks.map(
    (pack) => pack.packId,
  );
  const scenarioPackDigests = request.counterbalance.scenarioPacks.map(
    (pack) => pack.packDigest,
  );
  const equivalenceReviewRefs = request.counterbalance.scenarioPacks.map(
    (pack) => pack.equivalenceReviewRef,
  );
  return exactOrderedSet(scenarioPackIds, ["pack-p", "pack-q"])
    && !duplicateValues(scenarioPackIds)
    && !duplicateValues(scenarioPackDigests)
    && !duplicateValues(equivalenceReviewRefs)
    && request.counterbalance.scenarioPacks.every((pack) => (
      exactOrderedSet(pack.scenarioIds, UNIVERSITY_RESEARCH_SCENARIO_IDS)
      && !duplicateValues(pack.scenarioIds)
    ))
    && exactOrderedSet(request.counterbalance.cells, [
      "candidate_p_then_substitute_q",
      "substitute_p_then_candidate_q",
      "candidate_q_then_substitute_p",
      "substitute_q_then_candidate_p",
    ])
    && !duplicateValues(request.counterbalance.cells);
}

function sameInformation(
  left: UniversityResearchReadinessRequestV1["conditions"]["candidate"]["informationItems"],
  right: UniversityResearchReadinessRequestV1["conditions"]["substitute"]["informationItems"],
): boolean {
  const leftIds = left.map((item) => item.itemId);
  const rightIds = right.map((item) => item.itemId);
  return exactOrderedSet(leftIds, UNIVERSITY_RESEARCH_INFORMATION_ITEM_IDS)
    && exactOrderedSet(rightIds, UNIVERSITY_RESEARCH_INFORMATION_ITEM_IDS)
    && !duplicateValues(leftIds)
    && !duplicateValues(rightIds)
    && left.length === right.length && left.every((item, index) => (
      item.itemId === right[index]?.itemId && item.digest === right[index]?.digest
    ));
}

function structuralIssues(error: ZodError): UniversityResearchReadinessIssue[] {
  return error.issues.map((entry) => issue(
    "schema.invalid",
    entry.path.join("."),
    entry.message,
  ));
}

function approvalEnvelopeValueForParsedRequest(
  request: UniversityResearchReadinessRequestV1,
): unknown {
  return {
    digestPurpose: UNIVERSITY_RESEARCH_APPROVAL_ENVELOPE_PURPOSE,
    schemaVersion: request.schemaVersion,
    protocol: request.protocol,
    conditions: request.conditions,
    counterbalance: request.counterbalance,
    taskScript: request.taskScript,
    sample: request.sample,
    evidence: request.evidence,
    decisionPlan: request.decisionPlan,
    operations: {
      roles: request.operations.roles,
      incidentStopRule: request.operations.incidentStopRule,
      withdrawalRule: request.operations.withdrawalRule,
      amendmentRule: request.operations.amendmentRule,
    },
  };
}

/**
 * Returns a canonical approval-envelope value only after the same bounded,
 * accessor-free plain-JSON copy and strict schema check used by the projector.
 */
export function universityResearchApprovalEnvelopeValue(
  value: unknown,
): unknown | null {
  try {
    const copied = copyPlainJson(value);
    const parsed = universityResearchReadinessRequestSchema.safeParse(copied);
    return parsed.success
      ? approvalEnvelopeValueForParsedRequest(parsed.data)
      : null;
  } catch {
    return null;
  }
}

export async function universityResearchApprovalEnvelopeDigest(
  value: unknown,
): Promise<string | null> {
  const envelope = universityResearchApprovalEnvelopeValue(value);
  return envelope === null
    ? null
    : sha256Digest(canonicalJson(envelope));
}

function semanticIssues(
  request: UniversityResearchReadinessRequestV1,
  approvalEnvelopeDigest: string,
): readonly UniversityResearchReadinessIssue[] {
  const issues: UniversityResearchReadinessIssue[] = [];
  const protocol = request.protocol;
  const candidate = request.conditions.candidate;
  const substitute = request.conditions.substitute;

  if (protocol.sourceCommit !== UNIVERSITY_RESEARCH_ACCEPTED_SOURCE_COMMIT) {
    issues.push(issue(
      "protocol.source_commit_mismatch",
      "protocol.sourceCommit",
      "The preflight plan must bind the exact accepted semester-loop source commit.",
    ));
  }
  if (
    !exactOrderedSet(protocol.scenarioIds, UNIVERSITY_RESEARCH_SCENARIO_IDS)
    || duplicateValues(protocol.scenarioIds)
  ) {
    issues.push(issue(
      "protocol.scenario_set_mismatch",
      "protocol.scenarioIds",
      "The preflight plan must preserve the exact seven semester-loop scenarios in their locked order.",
    ));
  }
  if (protocol.fixtureDigest !== candidate.artifactDigest) {
    issues.push(issue(
      "protocol.fixture_digest_mismatch",
      "protocol.fixtureDigest",
      "The protocol fixture digest must match the exact candidate artifact digest.",
    ));
  }
  if (
    protocol.amendmentVersion !== 0
    || protocol.comparability !== "baseline"
  ) {
    issues.push(issue(
      "protocol.amendment_invalidates_comparability",
      "protocol.amendmentVersion",
      "Any amended fixture or protocol establishes a new baseline before comparison.",
    ));
  }
  if (
    request.sample.targetMinimum > request.sample.targetMaximum
    || request.decisionPlan.minimumStartersReported
      !== request.sample.targetMinimum
  ) {
    issues.push(issue(
      "sample.plan_invalid",
      "sample",
      "The minimum starters reported must equal the sample minimum and not exceed the maximum.",
    ));
  }
  if (
    !exactOrderedSet(
      request.evidence.dimensions,
      UNIVERSITY_RESEARCH_EVIDENCE_DIMENSIONS,
    )
    || duplicateValues(request.evidence.dimensions)
  ) {
    issues.push(issue(
      "evidence.plan_invalid",
      "evidence.dimensions",
      "Evidence dimensions must remain complete, separate, unique, and in the locked order.",
    ));
  }
  if (
    !exactOrderedSet(
      request.decisionPlan.outcomes,
      UNIVERSITY_RESEARCH_DECISION_OUTCOMES,
    )
    || duplicateValues(request.decisionPlan.outcomes)
  ) {
    issues.push(issue(
      "decision.plan_invalid",
      "decisionPlan.outcomes",
      "The adjudication grammar must remain accept, narrow, repair, then reject.",
    ));
  }

  const approvalKinds = request.operations.approvalReferences.map(
    (approval) => approval.kind,
  );
  const approvalIds = request.operations.approvalReferences.map(
    (approval) => approval.referenceId,
  );
  if (duplicateValues(approvalKinds) || duplicateValues(approvalIds)) {
    issues.push(issue(
      "approval.conflict",
      "operations.approvalReferences",
      "Approval fixture references must be unique by kind and opaque reference.",
    ));
  }
  for (const required of UNIVERSITY_RESEARCH_REQUIRED_APPROVALS) {
    const approval = request.operations.approvalReferences.find(
      (entry) => entry.kind === required,
    );
    if (!approval || approval.declaredStatus !== "independent_approved") {
      issues.push(issue(
        "approval.missing",
        `operations.approvalReferences.${required}`,
        `The ${required.replaceAll("_", " ")} approval is not represented by an independently-approved fixture declaration.`,
      ));
    }
    if (
      approval
      && approval.approvedEnvelopeDigest !== approvalEnvelopeDigest
    ) {
      issues.push(issue(
        "approval.envelope_mismatch",
        `operations.approvalReferences.${required}.approvedEnvelopeDigest`,
        `The ${required.replaceAll("_", " ")} approval reference is not bound to this exact preflight envelope.`,
      ));
    }
  }

  const roleKinds = request.operations.roles.map((assignment) => assignment.role);
  const operatorRefs = request.operations.roles.map(
    (assignment) => assignment.operatorRef,
  );
  if (duplicateValues(roleKinds) || duplicateValues(operatorRefs)) {
    issues.push(issue(
      "operator.conflict",
      "operations.roles",
      "Every required role must have one distinct opaque fixture operator.",
    ));
  }
  for (const required of UNIVERSITY_RESEARCH_REQUIRED_ROLES) {
    if (!roleKinds.includes(required)) {
      issues.push(issue(
        "operator.missing",
        `operations.roles.${required}`,
        `The ${required.replaceAll("_", " ")} role has no fixture operator.`,
      ));
    }
  }

  if (!sameInformation(candidate.informationItems, substitute.informationItems)) {
    issues.push(issue(
      "comparator.information_mismatch",
      "conditions",
      "Candidate and substitute must expose the same ordered synthetic information items.",
    ));
  }
  if (
    !exactOrderedSet(candidate.taskFamilies, UNIVERSITY_RESEARCH_TASK_FAMILIES)
    || !exactOrderedSet(substitute.taskFamilies, UNIVERSITY_RESEARCH_TASK_FAMILIES)
    || !exactOrderedSet(candidate.taskFamilies, substitute.taskFamilies)
    || duplicateValues(candidate.taskFamilies)
    || duplicateValues(substitute.taskFamilies)
  ) {
    issues.push(issue(
      "comparator.task_mismatch",
      "conditions",
      "Candidate and substitute must use the same complete ordered task families.",
    ));
  }
  if (!counterbalanceScheduleDeclared(request)) {
    issues.push(issue(
      "comparator.counterbalance_missing",
      "counterbalance.cells",
      "Both synthetic packs and all four locked surface-order cells are required.",
    ));
  }

  return orderedIssues(issues);
}

function statusFor(
  issues: readonly UniversityResearchReadinessIssue[],
): UniversityResearchReadinessStatus {
  if (issues.some((entry) => (
    entry.code.startsWith("schema.")
    || entry.code.startsWith("protocol.")
    || entry.code.startsWith("sample.")
    || entry.code.startsWith("evidence.")
    || entry.code.startsWith("decision.")
  ))) return "draft_invalid";
  if (issues.some((entry) => entry.code.startsWith("comparator."))) {
    return "substitute_mismatch";
  }
  if (issues.some((entry) => entry.code.startsWith("approval."))) {
    return "approval_required";
  }
  if (issues.some((entry) => entry.code.startsWith("operator."))) {
    return "operator_gap";
  }
  return "synthetic_plan_coherent";
}

function invalidProjection(
  issues: readonly UniversityResearchReadinessIssue[],
): Readonly<UniversityResearchReadinessProjectionV1> {
  return deepFreeze({
    schemaVersion: UNIVERSITY_RESEARCH_READINESS_PROJECTION_SCHEMA_VERSION,
    status: "draft_invalid",
    protocol: null,
    comparator: null,
    sample: null,
    operations: EMPTY_OPERATIONS,
    evidenceDimensions: [],
    decisionOutcomes: [...UNIVERSITY_RESEARCH_DECISION_OUTCOMES],
    authority: AUTHORITY,
    issues: orderedIssues(issues),
    projectionDigest: null,
  });
}

async function signedProjection(
  projection: Omit<UniversityResearchReadinessProjectionV1, "projectionDigest">,
): Promise<Readonly<UniversityResearchReadinessProjectionV1>> {
  return deepFreeze({
    ...projection,
    projectionDigest: await sha256Digest(canonicalJson(projection)),
  });
}

/**
 * Evaluates only whether a synthetic paired-workflow preflight plan is
 * internally coherent. Even the maximum state authorizes no participant,
 * data capture, research operation, claim upgrade, persistence, or send.
 */
export async function projectUniversityResearchReadiness(
  value: unknown,
): Promise<Readonly<UniversityResearchReadinessProjectionV1>> {
  try {
    let copied: unknown;
    try {
      copied = copyPlainJson(value);
    } catch {
      return invalidProjection([issue(
        "schema.invalid",
        "",
        "The research-readiness request must be bounded accessor-free plain JSON.",
      )]);
    }
    const parsed = universityResearchReadinessRequestSchema.safeParse(copied);
    if (!parsed.success) return invalidProjection(structuralIssues(parsed.error));

    const request = parsed.data;
    const approvalEnvelopeDigest = await sha256Digest(canonicalJson(
      approvalEnvelopeValueForParsedRequest(request),
    ));
    const issues = semanticIssues(request, approvalEnvelopeDigest);
    const validApprovalKinds = new Set(
      request.operations.approvalReferences
        .filter((entry) => (
          request.operations.approvalReferences.filter(
            (candidate) => candidate.kind === entry.kind,
          ).length === 1
          && request.operations.approvalReferences.filter(
            (candidate) => candidate.referenceId === entry.referenceId,
          ).length === 1
          && entry.declaredStatus === "independent_approved"
          && entry.approvedEnvelopeDigest === approvalEnvelopeDigest
        ))
        .map((entry) => entry.kind),
    );
    const roleKinds = request.operations.roles.map((entry) => entry.role);
    const operatorRefs = request.operations.roles.map(
      (entry) => entry.operatorRef,
    );
    const validRoleKinds = new Set(
      request.operations.roles
        .filter((entry) => (
          roleKinds.filter((role) => role === entry.role).length === 1
          && operatorRefs.filter(
            (operatorRef) => operatorRef === entry.operatorRef,
          ).length === 1
        ))
        .map((entry) => entry.role),
    );
    const informationParity = sameInformation(
      request.conditions.candidate.informationItems,
      request.conditions.substitute.informationItems,
    );
    const taskParity = exactOrderedSet(
      request.conditions.candidate.taskFamilies,
      request.conditions.substitute.taskFamilies,
    ) && exactOrderedSet(
      request.conditions.candidate.taskFamilies,
      UNIVERSITY_RESEARCH_TASK_FAMILIES,
    );
    const scheduleDeclared = counterbalanceScheduleDeclared(request);
    const comparisonPlanDigest = await sha256Digest(canonicalJson({
      candidate: request.conditions.candidate,
      substitute: request.conditions.substitute,
      counterbalance: request.counterbalance,
    }));
    const operationsPlanDigest = await sha256Digest(canonicalJson(
      request.operations,
    ));
    const protocolPlanDigest = await sha256Digest(canonicalJson({
      protocol: request.protocol,
      taskScript: request.taskScript,
      sample: request.sample,
      evidence: request.evidence,
      decisionPlan: request.decisionPlan,
    }));

    return signedProjection({
      schemaVersion: UNIVERSITY_RESEARCH_READINESS_PROJECTION_SCHEMA_VERSION,
      status: statusFor(issues),
      protocol: {
        protocolId: request.protocol.protocolId,
        protocolVersion: request.protocol.protocolVersion,
        protocolDocumentDigest: request.protocol.protocolDocumentDigest,
        sourceCommit: request.protocol.sourceCommit,
        candidateRoute: UNIVERSITY_RESEARCH_CANDIDATE_ROUTE,
        fixtureDigest: request.protocol.fixtureDigest,
        candidateBuildDigest: request.protocol.candidateBuildDigest,
        lockedAt: request.protocol.lockedAt,
        amendmentVersion: request.protocol.amendmentVersion,
        protocolPlanDigest,
      },
      comparator: {
        informationParity,
        taskParity,
        counterbalanceScheduleDeclared: scheduleDeclared,
        scenarioPackCount: request.counterbalance.scenarioPacks.length,
        candidateInformationItemCount:
          request.conditions.candidate.informationItems.length,
        candidateTaskFamilyCount:
          request.conditions.candidate.taskFamilies.length,
        exposureTaskSetDigest: UNIVERSITY_RESEARCH_EXPOSURE_TASK_SET_DIGEST,
        comparisonPlanDigest,
      },
      sample: {
        targetMinimum: request.sample.targetMinimum,
        targetMaximum: request.sample.targetMaximum,
        adultOnly: true,
        syntheticOnly: true,
        allStartersDenominator: true,
      },
      operations: {
        requiredRoleCount: UNIVERSITY_RESEARCH_REQUIRED_ROLES.length,
        validFixtureRoleBindingCount: validRoleKinds.size,
        requiredApprovalCount: UNIVERSITY_RESEARCH_REQUIRED_APPROVALS.length,
        boundApprovalReferenceCount: validApprovalKinds.size,
        operationsPlanDigest,
      },
      evidenceDimensions: [...request.evidence.dimensions],
      decisionOutcomes: [...UNIVERSITY_RESEARCH_DECISION_OUTCOMES],
      authority: AUTHORITY,
      issues,
    });
  } catch {
    return invalidProjection([issue(
      "schema.invalid",
      "",
      "The research-readiness projector failed closed before exposing a preflight state.",
    )]);
  }
}
