import { types as nodeUtilTypes } from "node:util";

import { ZodError } from "zod";

import type { CourseSourceScopeV1 } from "../course-sources";
import { deepFreeze } from "../deep-freeze";
import { canonicalJson, sha256Digest } from "../events";
import { projectUniversityProtectedStudy } from "../university-protected-study";
import {
  projectUniversityRecovery,
  universityRecoveryRequestSchema,
} from "../university-recovery";
import {
  projectUniversityToday,
  universityTodayRequestSchema,
} from "../university-today";
import {
  UNIVERSITY_SEMESTER_LOOP_PROJECTION_SCHEMA_VERSION,
  type UniversitySemesterLoopAuthority,
  type UniversitySemesterLoopIssue,
  type UniversitySemesterLoopProjectionV1,
  universitySemesterLoopRequestSchema,
} from "./contracts";

const MAX_JSON_DEPTH = 20;
const MAX_JSON_NODES = 16_384;
const ARRAY_INDEX = /^(0|[1-9][0-9]*)$/;
const POLLUTION_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const AUTHORITY = deepFreeze({
  projectionClass: "fixture_only_university_semester_loop",
  identityScopeAuthority: "caller_asserted_fixture_only",
  actionSelectionBasis: "today_existing_learner_accepted_path_only",
  sourceFactsMaySelectAction: false,
  recommendationAllowed: false,
  sessionStartAllowed: false,
  persistenceAllowed: false,
  evidenceClaimAllowed: false,
  messageSendAllowed: false,
  eventEmissionAllowed: false,
  externalSideEffectsAllowed: false,
} satisfies UniversitySemesterLoopAuthority);

class UnsafeJsonInput extends Error {}

/**
 * Copies a bounded JSON-shaped graph through own data descriptors only. This
 * runs before schema parsing, so getters, exotic prototypes, proxy failures,
 * cycles, symbols, holes, aliases that exceed the budget, and pollution keys
 * cannot reach Zod or any child projector.
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
        if (current.length > MAX_JSON_NODES - budget.nodes) {
          throw new UnsafeJsonInput();
        }
        const names = Object.getOwnPropertyNames(current);
        if (
          names.length !== current.length + 1
          || names.some((name) => name !== "length" && !ARRAY_INDEX.test(name))
        ) throw new UnsafeJsonInput();
        const result: unknown[] = [];
        for (let index = 0; index < current.length; index += 1) {
          const descriptor = Object.getOwnPropertyDescriptor(current, String(index));
          if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
            throw new UnsafeJsonInput();
          }
          result.push(visit(descriptor.value, depth + 1));
        }
        if (Object.getOwnPropertySymbols(current).length > 0) {
          throw new UnsafeJsonInput();
        }
        return result;
      }

      if (Object.getPrototypeOf(current) !== Object.prototype) {
        throw new UnsafeJsonInput();
      }
      const result: Record<string, unknown> = Object.create(null);
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
      if (Object.getOwnPropertySymbols(current).length > 0) {
        throw new UnsafeJsonInput();
      }
      return result;
    } finally {
      active.delete(current);
    }
  }

  return visit(value, 0);
}

function orderedIssues(
  issues: readonly UniversitySemesterLoopIssue[],
): readonly UniversitySemesterLoopIssue[] {
  return [...issues].sort((left, right) => {
    const codeOrder = left.code.localeCompare(right.code);
    return codeOrder !== 0 ? codeOrder : left.path.localeCompare(right.path);
  });
}

function invalidProjection(
  issues: readonly UniversitySemesterLoopIssue[],
  today: UniversitySemesterLoopProjectionV1["today"] = null,
): Readonly<UniversitySemesterLoopProjectionV1> {
  return deepFreeze({
    schemaVersion: UNIVERSITY_SEMESTER_LOOP_PROJECTION_SCHEMA_VERSION,
    status: "invalid",
    scope: null,
    asOf: null,
    termLabel: null,
    courseLabel: null,
    timeZone: null,
    authority: AUTHORITY,
    today,
    recoveryDraft: null,
    protectedStudy: null,
    issues: orderedIssues(issues),
    projectionDigest: null,
  });
}

function zodIssues(error: ZodError): UniversitySemesterLoopIssue[] {
  return error.issues.map((entry) => ({
    code: "schema.invalid",
    path: entry.path.join("."),
    message: entry.message,
  }));
}

function sameTermEnvelope(
  todayScope: CourseSourceScopeV1,
  recoveryScope: {
    readonly ownerUserId: string;
    readonly tenantId: string;
    readonly termId: string;
  },
): boolean {
  return todayScope.ownerUserId === recoveryScope.ownerUserId
    && todayScope.tenantId === recoveryScope.tenantId
    && todayScope.termId === recoveryScope.termId;
}

async function signedProjection(
  projection: Omit<UniversitySemesterLoopProjectionV1, "projectionDigest">,
): Promise<Readonly<UniversitySemesterLoopProjectionV1>> {
  return deepFreeze({
    ...projection,
    projectionDigest: await sha256Digest(canonicalJson(projection)),
  });
}

/**
 * Recomputes the raw Today, recovery, and protected-study requests into one
 * transient semester decision surface. Today is the only action selector;
 * source facts can contextualize or block that action but never create one.
 */
export async function projectUniversitySemesterLoop(
  value: unknown,
): Promise<Readonly<UniversitySemesterLoopProjectionV1>> {
  try {
    let copied: unknown;
    try {
      copied = copyPlainJson(value);
    } catch {
      return invalidProjection([{
        code: "schema.invalid",
        path: "",
        message: "The semester-loop request must be bounded accessor-free plain JSON.",
      }]);
    }

    const parsed = universitySemesterLoopRequestSchema.safeParse(copied);
    if (!parsed.success) return invalidProjection(zodIssues(parsed.error));
    const request = parsed.data;

    const rawToday = universityTodayRequestSchema.safeParse(request.todayRequest);
    const rawRecovery = universityRecoveryRequestSchema.safeParse(request.recoveryRequest);
    const [today, recovery, protectedStudy] = await Promise.all([
      projectUniversityToday(request.todayRequest),
      projectUniversityRecovery(request.recoveryRequest),
      projectUniversityProtectedStudy({
        schemaVersion: "university-protected-study-request.v1",
        todayRequest: request.todayRequest,
        worldPack: request.worldPack,
      }),
    ]);

    const childIssues: UniversitySemesterLoopIssue[] = [];
    if (!rawToday.success || today.status === "invalid" || today.scope === null) {
      childIssues.push({
        code: "child.invalid",
        path: "todayRequest",
        message: "The raw Today request did not produce a valid semester-loop child projection.",
      });
    }
    if (!rawRecovery.success || recovery.status === "invalid" || recovery.scope === null) {
      childIssues.push({
        code: "child.invalid",
        path: "recoveryRequest",
        message: "The raw recovery request did not produce a valid semester-loop child projection.",
      });
    }
    if (childIssues.length > 0) return invalidProjection(childIssues, today);

    const envelopeIssues: UniversitySemesterLoopIssue[] = [];
    if (
      !sameTermEnvelope(today.scope!, recovery.scope!)
      || today.asOf !== recovery.asOf
      || today.timeZone !== recovery.timeZone
      || today.termLabel !== recovery.termLabel
    ) {
      envelopeIssues.push({
        code: "envelope.mismatch",
        path: "recoveryRequest",
        message: "Today and recovery must use one exact owner, tenant, term, term label, as-of time, and time-zone envelope.",
      });
    }

    const matchingCourse = recovery.sourceCourses.find(
      (course) => course.courseId === today.scope!.courseId,
    );
    if (!matchingCourse) {
      envelopeIssues.push({
        code: "course.missing",
        path: "recoveryRequest.courses",
        message: "The Today course must exist in the recomputed recovery source courses.",
      });
    } else if (
      matchingCourse.scope.ownerUserId !== today.scope!.ownerUserId
      || matchingCourse.scope.tenantId !== today.scope!.tenantId
      || matchingCourse.scope.termId !== today.scope!.termId
      || matchingCourse.scope.courseId !== today.scope!.courseId
      || matchingCourse.courseLabel !== today.courseLabel
    ) {
      envelopeIssues.push({
        code: "envelope.mismatch",
        path: "recoveryRequest.courses",
        message: "The matching recovery course must preserve the exact Today course scope and label.",
      });
    }

    if (rawToday.success && rawRecovery.success && matchingCourse) {
      const rawMatchingCourse = rawRecovery.data.courses.find(
        (course) => course.courseId === rawToday.data.context.scope.courseId,
      );
      if (
        !rawMatchingCourse
        || canonicalJson(rawMatchingCourse.reconciliationRequest)
          !== canonicalJson(rawToday.data.reconciliationRequest)
      ) {
        envelopeIssues.push({
          code: "source.binding_mismatch",
          path: "recoveryRequest.courses",
          message: "The matching recovery course must use the exact canonical Today source-reconciliation request.",
        });
      }
    }
    if (envelopeIssues.length > 0) {
      return invalidProjection(envelopeIssues, today);
    }

    const shared = {
      schemaVersion: UNIVERSITY_SEMESTER_LOOP_PROJECTION_SCHEMA_VERSION,
      scope: today.scope,
      asOf: today.asOf,
      termLabel: today.termLabel,
      courseLabel: today.courseLabel,
      timeZone: today.timeZone,
      authority: AUTHORITY,
      today,
      issues: [] as const,
    };

    if (recovery.status === "source_review_required") {
      return signedProjection({
        ...shared,
        status: "source_review_required",
        recoveryDraft: null,
        protectedStudy: null,
      });
    }

    switch (today.status) {
      case "source_review_required":
        return signedProjection({
          ...shared,
          status: "source_review_required",
          recoveryDraft: null,
          protectedStudy: null,
        });
      case "capacity_conflict":
        return signedProjection({
          ...shared,
          status: "recovery_required",
          recoveryDraft: recovery,
          protectedStudy: null,
        });
      case "learner_choice_required":
        return signedProjection({
          ...shared,
          status: "learner_choice_required",
          recoveryDraft: null,
          protectedStudy: null,
        });
      case "complete":
        return signedProjection({
          ...shared,
          status: "path_complete",
          recoveryDraft: null,
          protectedStudy: null,
        });
      case "blocked":
        return signedProjection({
          ...shared,
          status: "path_blocked",
          recoveryDraft: null,
          protectedStudy: null,
        });
      case "ready":
        if (protectedStudy.status === "ready") {
          return signedProjection({
            ...shared,
            status: "protected_study_ready",
            recoveryDraft: null,
            protectedStudy,
          });
        }
        if (protectedStudy.status === "invalid") {
          return invalidProjection([{
            code: "child.invalid",
            path: "worldPack",
            message: "The supplied World package did not produce a valid protected-study child projection.",
          }], today);
        }
        return signedProjection({
          ...shared,
          status: "world_review_required",
          recoveryDraft: null,
          protectedStudy,
        });
      case "invalid":
        return invalidProjection([{
          code: "child.invalid",
          path: "todayRequest",
          message: "The raw Today request did not produce a valid semester-loop child projection.",
        }], today);
    }
  } catch {
    return invalidProjection([{
      code: "projection.unexpected",
      path: "",
      message: "The semester-loop compositor failed closed before producing a usable projection.",
    }]);
  }
}
