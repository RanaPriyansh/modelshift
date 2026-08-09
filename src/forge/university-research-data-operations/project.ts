import { types as nodeUtilTypes } from "node:util";
import { ZodError } from "zod";

import { deepFreeze } from "../deep-freeze";
import { canonicalJson, sha256Digest } from "../events";
import {
  UNIVERSITY_RESEARCH_ALLOCATION_CELLS,
  UNIVERSITY_RESEARCH_CAPTURE_FIELD_IDS,
  UNIVERSITY_RESEARCH_DATA_OPERATION_ROLES,
  UNIVERSITY_RESEARCH_DATA_OPERATIONS_PROJECTION_SCHEMA_VERSION,
  UNIVERSITY_RESEARCH_DATA_PLAN_IDS,
  UNIVERSITY_RESEARCH_PROHIBITED_DATA_CLASSES,
  type UniversityResearchDataOperationsIssue,
  type UniversityResearchDataOperationsProjectionV1,
  type UniversityResearchDataOperationsRequestV1,
  universityResearchDataOperationsRequestSchema,
} from "./contracts";

const MAX_JSON_DEPTH = 16;
const MAX_JSON_NODES = 4_096;
const MAX_CONTAINER_KEYS = 128;
const MAX_PROPERTY_NAME_BYTES = 180;
const MAX_STRING_BYTES = 512;
const MAX_TOTAL_STRING_BYTES = 64_000;

const AUTHORITY = deepFreeze({
  projectionClass: "fixture_only_synthetic_data_operations_preflight",
  approvalAuthority: "not_established",
  operatorIdentityAuthority: "not_established",
  adultVerificationAuthority: "not_established",
  consentAuthority: "not_established",
  planContentAuthority: "not_established",
  participantOperationAllowed: false,
  participantDataCaptureAllowed: false,
  courseworkCaptureAllowed: false,
  persistenceAllowed: false,
  exportAllowed: false,
  eventEmissionAllowed: false,
  restartAllowed: false,
} satisfies UniversityResearchDataOperationsProjectionV1["authority"]);

class UnsafeJsonInput extends Error {}

function utf8Length(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function copyBoundedPlainJson(value: unknown): unknown {
  const budget = { nodes: 0, stringBytes: 0 };
  const visited = new WeakSet<object>();

  function boundedString(current: string, maximum: number): string {
    const bytes = utf8Length(current);
    budget.stringBytes += bytes;
    if (
      bytes > maximum
      || budget.stringBytes > MAX_TOTAL_STRING_BYTES
      || current !== current.normalize("NFC")
      || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u2028\u2029]/u.test(
        current,
      )
      || /[\u202A-\u202E\u2066-\u2069]/u.test(current)
    ) {
      throw new UnsafeJsonInput();
    }
    return current;
  }

  function visit(current: unknown, depth: number): unknown {
    budget.nodes += 1;
    if (budget.nodes > MAX_JSON_NODES || depth > MAX_JSON_DEPTH) {
      throw new UnsafeJsonInput();
    }
    if (current === null || typeof current === "boolean") return current;
    if (typeof current === "string") {
      return boundedString(current, MAX_STRING_BYTES);
    }
    if (typeof current === "number") {
      if (!Number.isSafeInteger(current)) throw new UnsafeJsonInput();
      return current;
    }
    if (typeof current !== "object" || nodeUtilTypes.isProxy(current)) {
      throw new UnsafeJsonInput();
    }
    if (visited.has(current)) throw new UnsafeJsonInput();
    visited.add(current);

    if (Array.isArray(current)) {
      if (Object.getPrototypeOf(current) !== Array.prototype) {
        throw new UnsafeJsonInput();
      }
      if (current.length >= MAX_CONTAINER_KEYS) {
        throw new UnsafeJsonInput();
      }
      const keys = Reflect.ownKeys(current);
      if (
        keys.length > MAX_CONTAINER_KEYS
        || keys.some((key) => typeof key === "symbol")
      ) {
        throw new UnsafeJsonInput();
      }
      const names = keys as string[];
      if (
        names.length !== current.length + 1
        || names.some(
          (name) => name !== "length" && !/^(0|[1-9][0-9]*)$/.test(name),
        )
      ) {
        throw new UnsafeJsonInput();
      }
      return names
        .filter((name) => name !== "length")
        .sort((left, right) => Number(left) - Number(right))
        .map((name) => {
          const descriptor = Object.getOwnPropertyDescriptor(current, name);
          if (
            !descriptor
            || !descriptor.enumerable
            || !("value" in descriptor)
          ) {
            throw new UnsafeJsonInput();
          }
          return visit(descriptor.value, depth + 1);
        });
    }

    const prototype = Object.getPrototypeOf(current);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new UnsafeJsonInput();
    }
    const keys = Reflect.ownKeys(current);
    if (
      keys.length > MAX_CONTAINER_KEYS
      || keys.some((key) => typeof key === "symbol")
    ) {
      throw new UnsafeJsonInput();
    }
    const copy: Record<string, unknown> = Object.create(null);
    for (const name of (keys as string[]).sort()) {
      boundedString(name, MAX_PROPERTY_NAME_BYTES);
      const descriptor = Object.getOwnPropertyDescriptor(current, name);
      if (
        !descriptor
        || !descriptor.enumerable
        || !("value" in descriptor)
        || name === "__proto__"
        || name === "prototype"
        || name === "constructor"
      ) {
        throw new UnsafeJsonInput();
      }
      copy[name] = visit(descriptor.value, depth + 1);
    }
    return copy;
  }

  return visit(value, 0);
}

function issue(
  code: UniversityResearchDataOperationsIssue["code"],
  path: string,
  message: string,
): UniversityResearchDataOperationsIssue {
  return { code, path, message };
}

function orderedIssues(
  issues: readonly UniversityResearchDataOperationsIssue[],
): readonly UniversityResearchDataOperationsIssue[] {
  return [...issues].sort((left, right) => {
    const codeOrder = left.code.localeCompare(right.code);
    return codeOrder !== 0 ? codeOrder : left.path.localeCompare(right.path);
  });
}

function structuralIssues(
  error: ZodError,
): readonly UniversityResearchDataOperationsIssue[] {
  return orderedIssues(error.issues.map((entry) => issue(
    "schema.invalid",
    entry.path.join("."),
    entry.message,
  )));
}

function exactOrderedSet(
  actual: readonly string[],
  expected: readonly string[],
): boolean {
  return actual.length === expected.length
    && actual.every((value, index) => value === expected[index])
    && new Set(actual).size === actual.length;
}

function duplicateValues(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

function semanticIssues(
  request: UniversityResearchDataOperationsRequestV1,
): readonly UniversityResearchDataOperationsIssue[] {
  const issues: UniversityResearchDataOperationsIssue[] = [];
  if (
    !exactOrderedSet(
      request.captureSchema.allowedFields,
      UNIVERSITY_RESEARCH_CAPTURE_FIELD_IDS,
    )
  ) {
    issues.push(issue(
      "capture.allowlist_mismatch",
      "captureSchema.allowedFields",
      "The synthetic capture proposal must preserve the exact closed field allowlist.",
    ));
  }
  if (
    !exactOrderedSet(
      request.captureSchema.prohibitedDataClasses,
      UNIVERSITY_RESEARCH_PROHIBITED_DATA_CLASSES,
    )
  ) {
    issues.push(issue(
      "capture.prohibited_vocabulary_mismatch",
      "captureSchema.prohibitedDataClasses",
      "The synthetic capture proposal must preserve every prohibited-data class.",
    ));
  }

  const planIds = request.requestedPlans.map((entry) => entry.planId);
  const planRefs = request.requestedPlans.map((entry) => entry.planRef);
  const declaredPlanDigests = request.requestedPlans.map(
    (entry) => entry.declaredPlanDigest,
  );
  if (
    !exactOrderedSet(planIds, UNIVERSITY_RESEARCH_DATA_PLAN_IDS)
    || duplicateValues(planRefs)
    || duplicateValues(declaredPlanDigests)
  ) {
    issues.push(issue(
      "plans.incomplete_or_conflicting",
      "requestedPlans",
      "Every requested data plan needs one distinct fixture reference and declared digest.",
    ));
  }

  const roleIds = request.roles.map((entry) => entry.role);
  const operatorRefs = request.roles.map((entry) => entry.operatorRef);
  if (
    !exactOrderedSet(roleIds, UNIVERSITY_RESEARCH_DATA_OPERATION_ROLES)
    || duplicateValues(operatorRefs)
  ) {
    issues.push(issue(
      "roles.incomplete_or_conflicting",
      "roles",
      "Every required role needs one distinct opaque fixture operator reference.",
    ));
  }

  if (
    !exactOrderedSet(
      request.allocation.cells,
      UNIVERSITY_RESEARCH_ALLOCATION_CELLS,
    )
  ) {
    issues.push(issue(
      "allocation.cells_incomplete_or_conflicting",
      "allocation.cells",
      "All four allocation cells must remain present once and in the locked order.",
    ));
  }
  return orderedIssues(issues);
}

function invalidProjection(
  issues: readonly UniversityResearchDataOperationsIssue[],
): Readonly<UniversityResearchDataOperationsProjectionV1> {
  return deepFreeze({
    schemaVersion:
      UNIVERSITY_RESEARCH_DATA_OPERATIONS_PROJECTION_SCHEMA_VERSION,
    status: "invalid",
    protocol: null,
    capture: null,
    requirements: null,
    authority: AUTHORITY,
    issues: orderedIssues(issues),
    requestDigest: null,
    projectionDigest: null,
  });
}

async function withProjectionDigest(
  projection: Omit<
    UniversityResearchDataOperationsProjectionV1,
    "projectionDigest"
  >,
): Promise<Readonly<UniversityResearchDataOperationsProjectionV1>> {
  return deepFreeze({
    ...projection,
    projectionDigest: await sha256Digest(canonicalJson(projection)),
  });
}

/**
 * Evaluates a fixture-only proposal for future research data operations.
 * Even the maximum state establishes no approval, identity, eligibility,
 * consent, participant operation, capture, persistence, export, event, or
 * restart authority.
 */
export async function projectUniversityResearchDataOperations(
  value: unknown,
): Promise<Readonly<UniversityResearchDataOperationsProjectionV1>> {
  try {
    let copied: unknown;
    try {
      copied = copyBoundedPlainJson(value);
    } catch {
      return invalidProjection([issue(
        "schema.invalid",
        "",
        "The data-operations request must be bounded accessor-free plain JSON.",
      )]);
    }
    const parsed = universityResearchDataOperationsRequestSchema.safeParse(
      copied,
    );
    if (!parsed.success) return invalidProjection(structuralIssues(parsed.error));

    const request = parsed.data;
    const issues = semanticIssues(request);
    const requestDigest = await sha256Digest(canonicalJson(request));
    const planDeclarationDigest = await sha256Digest(canonicalJson({
      captureSchema: request.captureSchema,
      requestedPlans: request.requestedPlans,
      roles: request.roles,
      allocation: request.allocation,
      stopAndRightsRules: request.stopAndRightsRules,
    }));

    return withProjectionDigest({
      schemaVersion:
        UNIVERSITY_RESEARCH_DATA_OPERATIONS_PROJECTION_SCHEMA_VERSION,
      status: issues.length === 0
        ? "synthetic_data_operations_plan_coherent"
        : "requirements_requested",
      protocol: {
        protocolId: request.protocol.protocolId,
        protocolVersion: request.protocol.protocolVersion,
        protocolDocumentDigest: request.protocol.protocolDocumentDigest,
      },
      capture: {
        allowedFieldCount: request.captureSchema.allowedFields.length,
        prohibitedDataClassCount:
          request.captureSchema.prohibitedDataClasses.length,
        exactAllowlist: !issues.some(
          (entry) => entry.code === "capture.allowlist_mismatch",
        ),
        exactProhibitedVocabulary: !issues.some(
          (entry) => (
            entry.code === "capture.prohibited_vocabulary_mismatch"
          ),
        ),
      },
      requirements: {
        requestedPlanCount: request.requestedPlans.length,
        requiredPlanCount: UNIVERSITY_RESEARCH_DATA_PLAN_IDS.length,
        distinctRoleCount: new Set(request.roles.map((entry) => entry.role)).size,
        requiredRoleCount: UNIVERSITY_RESEARCH_DATA_OPERATION_ROLES.length,
        allocationCellCount: request.allocation.cells.length,
        requiredAllocationCellCount: UNIVERSITY_RESEARCH_ALLOCATION_CELLS.length,
        planDeclarationDigest,
      },
      authority: AUTHORITY,
      issues,
      requestDigest,
    });
  } catch {
    return invalidProjection([issue(
      "schema.invalid",
      "",
      "The data-operations projector failed closed before exposing a plan state.",
    )]);
  }
}
