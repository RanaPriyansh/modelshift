import "server-only";

import { types as nodeUtilTypes } from "node:util";

import { ZodError } from "zod";

import {
  courseSourceReconciliationRequestSchema,
  type CourseSourceReconciliationRequestV1,
} from "../course-sources";
import { deepFreeze } from "../deep-freeze";
import { canonicalJson, sha256Digest } from "../events";
import {
  projectUniversitySemesterLoop,
  type UniversitySemesterLoopProjectionStatus,
  type UniversitySemesterLoopProjectionV1,
  type UniversitySemesterLoopRequestV1,
} from "../university-semester-loop";
import {
  universityRecoveryRequestSchema,
  type UniversityRecoveryRequestV1,
} from "../university-recovery";
import {
  universityTodayRequestSchema,
  type UniversityTodayRequestV1,
} from "../university-today";
import {
  UNIVERSITY_SEMESTER_SANDBOX_PROJECTION_SCHEMA_VERSION,
  type UniversitySemesterSandboxAuthority,
  type UniversitySemesterSandboxIssue,
  type UniversitySemesterSandboxProjectionV1,
  type UniversitySemesterSandboxStatus,
  universitySemesterSandboxRequestSchema,
} from "./contracts";

const MAX_JSON_DEPTH = 24;
const MAX_JSON_NODES = 32_768;
const ARRAY_INDEX = /^(0|[1-9][0-9]*)$/;
const POLLUTION_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const AUTHORITY = deepFreeze({
  identityAuthority: false,
  tenantIsolationAuthority: false,
  sourceAuthenticityAuthority: false,
  institutionalCompletenessAuthority: false,
  sourceReviewAuthority: false,
  actionSelectionAuthority: false,
  recommendationAllowed: false,
  sessionStartAllowed: false,
  persistenceAllowed: false,
  evidenceClaimAllowed: false,
  messageSendAllowed: false,
  eventEmissionAllowed: false,
  externalSideEffectsAllowed: false,
} satisfies UniversitySemesterSandboxAuthority);

class UnsafeJsonInput extends Error {}

/**
 * Copies a bounded JSON-shaped graph using own data descriptors only before
 * any parser or projector can traverse it.
 */
function copyPlainJson(value: unknown): unknown {
  const budget = { nodes: 0 };
  const active = new WeakSet<object>();

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
    if (typeof current !== "object") throw new UnsafeJsonInput();
    if (nodeUtilTypes.isProxy(current)) throw new UnsafeJsonInput();
    if (active.has(current)) throw new UnsafeJsonInput();
    active.add(current);

    try {
      if (Array.isArray(current)) {
        if (Object.getPrototypeOf(current) !== Array.prototype) {
          throw new UnsafeJsonInput();
        }
        const names = Object.getOwnPropertyNames(current);
        if (
          names.length !== current.length + 1
          || names.some((name) => name !== "length" && !ARRAY_INDEX.test(name))
        ) throw new UnsafeJsonInput();
        if (Object.getOwnPropertySymbols(current).length > 0) {
          throw new UnsafeJsonInput();
        }

        const result: unknown[] = [];
        for (let index = 0; index < current.length; index += 1) {
          const descriptor = Object.getOwnPropertyDescriptor(current, String(index));
          if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
            throw new UnsafeJsonInput();
          }
          result.push(visit(descriptor.value, depth + 1));
        }
        return result;
      }

      if (Object.getPrototypeOf(current) !== Object.prototype) {
        throw new UnsafeJsonInput();
      }
      if (Object.getOwnPropertySymbols(current).length > 0) {
        throw new UnsafeJsonInput();
      }

      const result: Record<string, unknown> = {};
      for (const name of Object.getOwnPropertyNames(current).sort()) {
        const descriptor = Object.getOwnPropertyDescriptor(current, name);
        if (
          !descriptor
          || !descriptor.enumerable
          || !("value" in descriptor)
          || POLLUTION_KEYS.has(name)
        ) throw new UnsafeJsonInput();
        result[name] = visit(descriptor.value, depth + 1);
      }
      return result;
    } finally {
      active.delete(current);
    }
  }

  return visit(value, 0);
}

function orderedIssues(
  issues: readonly UniversitySemesterSandboxIssue[],
): readonly UniversitySemesterSandboxIssue[] {
  return [...issues].sort((left, right) => {
    const codeOrder = left.code.localeCompare(right.code);
    return codeOrder !== 0 ? codeOrder : left.path.localeCompare(right.path);
  });
}

function invalidProjection(
  issues: readonly UniversitySemesterSandboxIssue[],
  sourceDecisionCount: number | null = null,
  semesterLoop: Readonly<UniversitySemesterLoopProjectionV1> | null = null,
): Readonly<UniversitySemesterSandboxProjectionV1> {
  return deepFreeze({
    schemaVersion: UNIVERSITY_SEMESTER_SANDBOX_PROJECTION_SCHEMA_VERSION,
    projectionClass: "development_only_transient_semester_sandbox",
    status: "invalid",
    authority: AUTHORITY,
    sourceDecisionCount,
    semesterLoop,
    issues: orderedIssues(issues),
    projectionDigest: null,
  });
}

function zodIssues(error: ZodError): UniversitySemesterSandboxIssue[] {
  return error.issues.map((entry) => ({
    code: "schema.invalid",
    path: entry.path.join("."),
    message: entry.message,
  }));
}

function childInvalid(
  code: "today.invalid" | "recovery.invalid" | "source.invalid",
  path: string,
  message: string,
  sourceDecisionCount: number,
): Readonly<UniversitySemesterSandboxProjectionV1> {
  return invalidProjection([{ code, path, message }], sourceDecisionCount);
}

function sandboxStatus(
  status: UniversitySemesterLoopProjectionStatus,
): UniversitySemesterSandboxStatus {
  switch (status) {
    case "invalid":
      return "invalid";
    case "source_review_required":
      return "review_required";
    case "protected_study_ready":
      return "ready";
    case "recovery_required":
    case "learner_choice_required":
    case "world_review_required":
    case "path_complete":
    case "path_blocked":
      return status;
  }
}

async function signedProjection(
  projection: Omit<UniversitySemesterSandboxProjectionV1, "projectionDigest">,
): Promise<Readonly<UniversitySemesterSandboxProjectionV1>> {
  return deepFreeze({
    ...projection,
    projectionDigest: await sha256Digest(canonicalJson(projection)),
  });
}

/**
 * Applies explicit learner-fixture source decisions to both exact copies of
 * the Today course reconciliation request, then delegates every semester
 * decision to the canonical compositor. No input is persisted or emitted.
 */
export async function projectUniversitySemesterSandbox(
  value: unknown,
): Promise<Readonly<UniversitySemesterSandboxProjectionV1>> {
  try {
    let copied: unknown;
    try {
      copied = copyPlainJson(value);
    } catch {
      return invalidProjection([{
        code: "schema.invalid",
        path: "",
        message: "The semester sandbox request must be bounded accessor-free plain JSON.",
      }]);
    }

    const parsed = universitySemesterSandboxRequestSchema.safeParse(copied);
    if (!parsed.success) return invalidProjection(zodIssues(parsed.error));
    const request = parsed.data;
    const sourceDecisionCount = request.sourceDecisions.length;

    const rawLoop = request.semesterLoopRequest as UniversitySemesterLoopRequestV1;
    const parsedToday = universityTodayRequestSchema.safeParse(rawLoop.todayRequest);
    if (!parsedToday.success) {
      return childInvalid(
        "today.invalid",
        "semesterLoopRequest.todayRequest",
        "The sandbox requires one exact raw University Today request.",
        sourceDecisionCount,
      );
    }
    const today = parsedToday.data as UniversityTodayRequestV1;

    const parsedRecovery = universityRecoveryRequestSchema.safeParse(rawLoop.recoveryRequest);
    if (!parsedRecovery.success) {
      return childInvalid(
        "recovery.invalid",
        "semesterLoopRequest.recoveryRequest",
        "The sandbox requires one exact raw university recovery request.",
        sourceDecisionCount,
      );
    }
    const recovery = parsedRecovery.data as UniversityRecoveryRequestV1;

    const parsedTodaySource = courseSourceReconciliationRequestSchema.safeParse(
      today.reconciliationRequest,
    );
    if (!parsedTodaySource.success) {
      return childInvalid(
        "source.invalid",
        "semesterLoopRequest.todayRequest.reconciliationRequest",
        "The raw Today request must embed one exact course-source reconciliation request.",
        sourceDecisionCount,
      );
    }

    const matchingCourseIndex = recovery.courses.findIndex(
      (course) => course.courseId === today.context.scope.courseId,
    );
    if (matchingCourseIndex < 0) {
      return invalidProjection([{
        code: "source.course_missing",
        path: "semesterLoopRequest.recoveryRequest.courses",
        message: "The recovery request must contain the exact Today course before decisions can be rebuilt.",
      }], sourceDecisionCount);
    }
    const matchingCourse = recovery.courses[matchingCourseIndex]!;
    const parsedRecoverySource = courseSourceReconciliationRequestSchema.safeParse(
      matchingCourse.reconciliationRequest,
    );
    if (!parsedRecoverySource.success) {
      return childInvalid(
        "source.invalid",
        `semesterLoopRequest.recoveryRequest.courses.${matchingCourseIndex}.reconciliationRequest`,
        "The matching recovery course must embed one exact course-source reconciliation request.",
        sourceDecisionCount,
      );
    }
    if (
      canonicalJson(parsedTodaySource.data)
      !== canonicalJson(parsedRecoverySource.data)
    ) {
      return invalidProjection([{
        code: "source.binding_mismatch",
        path: "semesterLoopRequest.recoveryRequest.courses",
        message: "Today and recovery must begin with the same exact source-reconciliation request.",
      }], sourceDecisionCount);
    }

    const rebuiltSource: CourseSourceReconciliationRequestV1 = {
      ...parsedTodaySource.data,
      decisions: request.sourceDecisions,
    };
    const rebuiltToday: UniversityTodayRequestV1 = {
      ...today,
      reconciliationRequest: rebuiltSource,
    };
    const rebuiltRecovery: UniversityRecoveryRequestV1 = {
      ...recovery,
      courses: recovery.courses.map((course, index) => (
        index === matchingCourseIndex
          ? { ...course, reconciliationRequest: rebuiltSource }
          : course
      )),
    };
    const rebuiltLoop: UniversitySemesterLoopRequestV1 = {
      ...rawLoop,
      todayRequest: rebuiltToday,
      recoveryRequest: rebuiltRecovery,
    };

    const semesterLoop = await projectUniversitySemesterLoop(rebuiltLoop);
    const status = sandboxStatus(semesterLoop.status);
    if (status === "invalid") {
      return invalidProjection([{
        code: "semester.invalid",
        path: "semesterLoopRequest",
        message: "The rebuilt raw request did not produce a valid canonical semester projection.",
      }], sourceDecisionCount, semesterLoop);
    }

    return signedProjection({
      schemaVersion: UNIVERSITY_SEMESTER_SANDBOX_PROJECTION_SCHEMA_VERSION,
      projectionClass: "development_only_transient_semester_sandbox",
      status,
      authority: AUTHORITY,
      sourceDecisionCount,
      semesterLoop,
      issues: [],
    });
  } catch {
    return invalidProjection([{
      code: "projection.unexpected",
      path: "",
      message: "The semester sandbox failed closed before producing a usable projection.",
    }]);
  }
}
