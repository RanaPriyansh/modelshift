import { types as nodeUtilTypes } from "node:util";

import { ZodError } from "zod";

import { deepFreeze } from "../deep-freeze";
import { canonicalJson, sha256Digest } from "../events";
import {
  projectUniversityRecovery,
  universityRecoveryRequestSchema,
} from "../university-recovery";
import {
  projectUniversitySemesterLoop,
  type UniversitySemesterLoopProjectionV1,
} from "../university-semester-loop";
import {
  universityTodayRequestSchema,
  type UniversityTodayRequestV1,
} from "../university-today";
import {
  UNIVERSITY_SEMESTER_OVERVIEW_PROJECTION_SCHEMA_VERSION,
  type UniversitySemesterOverviewAuthority,
  type UniversitySemesterOverviewCourse,
  type UniversitySemesterOverviewIssue,
  type UniversitySemesterOverviewProjectionV1,
  universitySemesterOverviewRequestSchema,
} from "./contracts";

const INPUT_LIMITS = Object.freeze({
  maximumDepth: 20,
  maximumNodes: 16_384,
  maximumAggregateKeys: 24_576,
  maximumObjectKeys: 256,
  maximumArrayLength: 512,
});

const ARRAY_INDEX = /^(0|[1-9]\d*)$/;
const POLLUTION_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const AUTHORITY = deepFreeze({
  projectionClass: "fixture_only_semester_inspection",
  orderBasis: "course_id_not_priority",
  identityScopeAuthority: "not_established",
  tenantIsolationAuthority: "not_established",
  rightsEnforcementAuthority: "not_established",
  institutionalCompleteness: "not_established",
  termFeasibilityAllowed: false,
  courseSelectionAllowed: false,
  globalActionAllowed: false,
  recommendationAllowed: false,
  schedulingAllowed: false,
  providerCallAllowed: false,
  sessionStartAllowed: false,
  persistenceAllowed: false,
  evidenceClaimAllowed: false,
  messageSendAllowed: false,
  eventEmissionAllowed: false,
  externalSideEffectsAllowed: false,
} satisfies UniversitySemesterOverviewAuthority);

class UnsafeSemesterOverviewInput extends Error {}

/**
 * Captures one bounded server-side snapshot before schema or child-projector
 * traversal. Node's intrinsic Proxy classifier runs before every reflective
 * operation, so transparent and revoked Proxies are refused without traps.
 * A graph-wide seen set also rejects repeated-object aliases, not only cycles.
 */
function copyBoundedPlainJson(value: unknown): unknown {
  const budget = { nodes: 0, keys: 0 };
  const seen = new WeakSet<object>();

  function addKeys(count: number): void {
    budget.keys += count;
    if (budget.keys > INPUT_LIMITS.maximumAggregateKeys) {
      throw new UnsafeSemesterOverviewInput();
    }
  }

  function visit(current: unknown, depth: number): unknown {
    budget.nodes += 1;
    if (
      depth > INPUT_LIMITS.maximumDepth
      || budget.nodes > INPUT_LIMITS.maximumNodes
    ) {
      throw new UnsafeSemesterOverviewInput();
    }
    if (
      current === null
      || typeof current === "string"
      || typeof current === "boolean"
    ) {
      return current;
    }
    if (typeof current === "number") {
      if (
        !Number.isFinite(current)
        || Object.is(current, -0)
        || (Number.isInteger(current) && !Number.isSafeInteger(current))
      ) {
        throw new UnsafeSemesterOverviewInput();
      }
      return current;
    }
    if (typeof current !== "object") {
      throw new UnsafeSemesterOverviewInput();
    }
    if (nodeUtilTypes.isProxy(current)) {
      throw new UnsafeSemesterOverviewInput();
    }
    if (seen.has(current)) {
      throw new UnsafeSemesterOverviewInput();
    }
    seen.add(current);

    if (Array.isArray(current)) {
      if (Object.getPrototypeOf(current) !== Array.prototype) {
        throw new UnsafeSemesterOverviewInput();
      }
      const lengthDescriptor = Object.getOwnPropertyDescriptor(
        current,
        "length",
      );
      if (
        !lengthDescriptor
        || !("value" in lengthDescriptor)
        || !Number.isSafeInteger(lengthDescriptor.value)
        || lengthDescriptor.value < 0
        || lengthDescriptor.value > INPUT_LIMITS.maximumArrayLength
      ) {
        throw new UnsafeSemesterOverviewInput();
      }
      const length = lengthDescriptor.value;
      const keys = Reflect.ownKeys(current);
      addKeys(keys.length);
      if (
        keys.length !== length + 1
        || keys.some((key) => (
          typeof key !== "string"
          || (
            key !== "length"
            && (
              !ARRAY_INDEX.test(key)
              || Number(key) >= length
            )
          )
        ))
      ) {
        throw new UnsafeSemesterOverviewInput();
      }

      const output: unknown[] = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(
          current,
          String(index),
        );
        if (
          !descriptor
          || !descriptor.enumerable
          || !("value" in descriptor)
          || descriptor.get
          || descriptor.set
        ) {
          throw new UnsafeSemesterOverviewInput();
        }
        output.push(visit(descriptor.value, depth + 1));
      }
      return output;
    }

    if (Object.getPrototypeOf(current) !== Object.prototype) {
      throw new UnsafeSemesterOverviewInput();
    }
    const keys = Reflect.ownKeys(current);
    addKeys(keys.length);
    if (
      keys.length > INPUT_LIMITS.maximumObjectKeys
      || keys.some((key) => (
        typeof key !== "string"
        || POLLUTION_KEYS.has(key)
      ))
    ) {
      throw new UnsafeSemesterOverviewInput();
    }

    const output: Record<string, unknown> = {};
    for (const key of (keys as string[]).sort()) {
      const descriptor = Object.getOwnPropertyDescriptor(current, key);
      if (
        !descriptor
        || !descriptor.enumerable
        || !("value" in descriptor)
        || descriptor.get
        || descriptor.set
      ) {
        throw new UnsafeSemesterOverviewInput();
      }
      Object.defineProperty(output, key, {
        configurable: true,
        enumerable: true,
        value: visit(descriptor.value, depth + 1),
        writable: true,
      });
    }
    return output;
  }

  return visit(value, 0);
}

function orderedIssues(
  issues: readonly UniversitySemesterOverviewIssue[],
): readonly UniversitySemesterOverviewIssue[] {
  return [...issues].sort((left, right) => {
    const codeOrder = left.code.localeCompare(right.code);
    return codeOrder !== 0 ? codeOrder : left.path.localeCompare(right.path);
  });
}

function invalidProjection(
  issues: readonly UniversitySemesterOverviewIssue[],
): Readonly<UniversitySemesterOverviewProjectionV1> {
  return deepFreeze({
    schemaVersion: UNIVERSITY_SEMESTER_OVERVIEW_PROJECTION_SCHEMA_VERSION,
    status: "invalid",
    authority: AUTHORITY,
    termRecovery: null,
    courses: [],
    issues: orderedIssues(issues),
    projectionDigest: null,
  });
}

function zodIssues(
  error: ZodError,
  pathPrefix = "",
): UniversitySemesterOverviewIssue[] {
  return error.issues.map((entry) => ({
    code: "schema.invalid",
    path: [pathPrefix, entry.path.join(".")].filter(Boolean).join("."),
    message: entry.message,
  }));
}

function sameTermEnvelope(
  today: UniversityTodayRequestV1,
  recovery: ReturnType<typeof universityRecoveryRequestSchema.parse>,
): boolean {
  const { context } = today;
  return context.scope.ownerUserId === recovery.scope.ownerUserId
    && context.scope.tenantId === recovery.scope.tenantId
    && context.scope.termId === recovery.scope.termId
    && context.asOf === recovery.asOf
    && context.termLabel === recovery.termLabel
    && context.timeZone === recovery.timeZone;
}

function sameStringSet(
  left: readonly string[],
  right: readonly string[],
): boolean {
  if (left.length !== right.length) return false;
  const orderedLeft = [...left].sort();
  const orderedRight = [...right].sort();
  return orderedLeft.every((entry, index) => entry === orderedRight[index]);
}

function usableSemesterLoop(
  value: Readonly<UniversitySemesterLoopProjectionV1>,
): value is Readonly<UniversitySemesterLoopProjectionV1> & {
  readonly status: Exclude<
    UniversitySemesterLoopProjectionV1["status"],
    "invalid"
  >;
  readonly today: NonNullable<UniversitySemesterLoopProjectionV1["today"]> & {
    readonly status: Exclude<
      NonNullable<UniversitySemesterLoopProjectionV1["today"]>["status"],
      "invalid"
    >;
    readonly projectionDigest: string;
  };
  readonly projectionDigest: string;
} {
  return value.status !== "invalid"
    && value.today !== null
    && value.today.status !== "invalid"
    && value.today.projectionDigest !== null
    && value.projectionDigest !== null;
}

async function signedProjection(
  projection: Omit<UniversitySemesterOverviewProjectionV1, "projectionDigest">,
): Promise<Readonly<UniversitySemesterOverviewProjectionV1>> {
  return deepFreeze({
    ...projection,
    projectionDigest: await sha256Digest(canonicalJson(projection)),
  });
}

/**
 * Projects one separately exposed term Recovery axis and one complete
 * semester-loop child per course; each child performs its own canonical
 * Recovery recomputation. The result is an inspection index only: it cannot
 * select a course, synthesize a global next action, strengthen authority, or
 * expose child data.
 */
export async function projectUniversitySemesterOverview(
  value: unknown,
): Promise<Readonly<UniversitySemesterOverviewProjectionV1>> {
  try {
    let copied: unknown;
    try {
      copied = copyBoundedPlainJson(value);
    } catch {
      return invalidProjection([{
        code: "schema.invalid",
        path: "",
        message:
          "The semester overview request must be bounded, alias-free, accessor-free plain JSON.",
      }]);
    }

    const parsed = universitySemesterOverviewRequestSchema.safeParse(copied);
    if (!parsed.success) return invalidProjection(zodIssues(parsed.error));

    const recoveryRequest = universityRecoveryRequestSchema.safeParse(
      parsed.data.recoveryRequest,
    );
    if (!recoveryRequest.success) {
      return invalidProjection(
        zodIssues(recoveryRequest.error, "recoveryRequest"),
      );
    }

    const rawCourses: Array<{
      readonly today: UniversityTodayRequestV1;
      readonly worldPack: unknown;
      readonly inputIndex: number;
    }> = [];
    const structuralIssues: UniversitySemesterOverviewIssue[] = [];
    parsed.data.courses.forEach((course, index) => {
      const today = universityTodayRequestSchema.safeParse(course.todayRequest);
      if (!today.success) {
        structuralIssues.push(
          ...zodIssues(today.error, `courses.${index}.todayRequest`),
        );
        return;
      }
      rawCourses.push({
        today: today.data,
        worldPack: course.worldPack,
        inputIndex: index,
      });
    });
    if (structuralIssues.length > 0) {
      return invalidProjection(structuralIssues);
    }

    const envelopeIssues: UniversitySemesterOverviewIssue[] = [];
    const seenCourseIds = new Set<string>();
    for (const course of rawCourses) {
      const courseId = course.today.context.scope.courseId;
      if (seenCourseIds.has(courseId)) {
        envelopeIssues.push({
          code: "course.duplicate",
          path: `courses.${course.inputIndex}.todayRequest.context.scope.courseId`,
          message:
            "Each Today-derived course identifier may appear only once.",
        });
      }
      seenCourseIds.add(courseId);
      if (!sameTermEnvelope(course.today, recoveryRequest.data)) {
        envelopeIssues.push({
          code: "envelope.mismatch",
          path: `courses.${course.inputIndex}.todayRequest.context`,
          message:
            "Every course must share the exact Recovery owner, tenant, term, as-of time, term label, and time zone.",
        });
      }
    }

    const todayCourseIds = rawCourses.map(
      (course) => course.today.context.scope.courseId,
    );
    const recoveryCourseIds = recoveryRequest.data.courses.map(
      (course) => course.courseId,
    );
    if (!sameStringSet(todayCourseIds, recoveryCourseIds)) {
      envelopeIssues.push({
        code: "course_set.mismatch",
        path: "courses",
        message:
          "The Today-derived course set must exactly match the full Recovery course set.",
      });
    }

    rawCourses.forEach((course) => {
      const courseId = course.today.context.scope.courseId;
      const recoveryCourse = recoveryRequest.data.courses.find(
        (entry) => entry.courseId === courseId,
      );
      if (!recoveryCourse) return;
      if (recoveryCourse.courseLabel !== course.today.context.courseLabel) {
        envelopeIssues.push({
          code: "course_label.mismatch",
          path: `courses.${course.inputIndex}.todayRequest.context.courseLabel`,
          message:
            "Each Today course label must exactly match its Recovery course label.",
        });
      }
      if (
        canonicalJson(recoveryCourse.reconciliationRequest)
        !== canonicalJson(course.today.reconciliationRequest)
      ) {
        envelopeIssues.push({
          code: "source.binding_mismatch",
          path: `courses.${course.inputIndex}.todayRequest.reconciliationRequest`,
          message:
            "Each Today course must use the exact canonical Recovery reconciliation request.",
        });
      }
    });
    if (envelopeIssues.length > 0) {
      return invalidProjection(envelopeIssues);
    }

    const recovery = await projectUniversityRecovery(recoveryRequest.data);
    if (
      recovery.status === "invalid"
      || recovery.projectionDigest === null
    ) {
      return invalidProjection([{
        code: "recovery.invalid",
        path: "recoveryRequest",
        message:
          "The raw Recovery request did not produce a usable term projection.",
      }]);
    }

    const semesterLoops = await Promise.all(rawCourses.map(async (course) => (
      projectUniversitySemesterLoop({
        schemaVersion: "university-semester-loop-request.v1",
        todayRequest: course.today,
        recoveryRequest: recoveryRequest.data,
        worldPack: course.worldPack,
      })
    )));
    const invalidChildren = semesterLoops.flatMap((semesterLoop, index) => (
      usableSemesterLoop(semesterLoop)
        ? []
        : [{
            code: "child.invalid" as const,
            path: `courses.${rawCourses[index]!.inputIndex}`,
            message:
              "A course did not produce a usable canonical semester-loop projection.",
          }]
    ));
    if (invalidChildren.length > 0) {
      return invalidProjection(invalidChildren);
    }

    const courses = semesterLoops.map((semesterLoop, index) => {
      if (!usableSemesterLoop(semesterLoop)) {
        throw new Error("Semester-loop usability changed after validation.");
      }
      const rawCourse = rawCourses[index]!;
      return {
        courseId: rawCourse.today.context.scope.courseId,
        courseLabel: rawCourse.today.context.courseLabel,
        todayStatus: semesterLoop.today.status,
        semesterLoopStatus: semesterLoop.status,
        todayProjectionDigest: semesterLoop.today.projectionDigest,
        semesterLoopDigest: semesterLoop.projectionDigest,
      } satisfies UniversitySemesterOverviewCourse;
    }).sort((left, right) => left.courseId.localeCompare(right.courseId));

    return signedProjection({
      schemaVersion: UNIVERSITY_SEMESTER_OVERVIEW_PROJECTION_SCHEMA_VERSION,
      status: "ready_for_inspection",
      authority: AUTHORITY,
      termRecovery: {
        status: recovery.status,
        projectionDigest: recovery.projectionDigest,
      },
      courses,
      issues: [],
    });
  } catch {
    return invalidProjection([{
      code: "projection.unexpected",
      path: "",
      message:
        "The semester overview failed closed before producing an inspection projection.",
    }]);
  }
}
