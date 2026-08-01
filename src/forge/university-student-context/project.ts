import { types as nodeUtilTypes } from "node:util";

import { type ZodError } from "zod";

import { deepFreeze } from "../deep-freeze";
import { projectUniversityDegreeMap } from "../university-degree-map";
import { projectUniversityLearningMap } from "../university-learning-map";
import {
  UNIVERSITY_STUDENT_CONTEXT_PROJECTION_SCHEMA_VERSION,
  type UniversityStudentContextAuthority,
  type UniversityStudentContextIssue,
  type UniversityStudentContextProjectionV2,
  universityStudentContextRequestSchema,
} from "./contracts";

// The node and depth limits cover both accepted child boundaries plus the
// four-field outer envelope. The remaining limits match stricter child maxima.
const MAX_JSON_DEPTH = 18;
const MAX_JSON_NODES = 16_384;
const MAX_ARRAY_LENGTH = 512;
const MAX_OBJECT_KEYS = 16;
const MAX_PROPERTY_NAME_BYTES = 64;
const MAX_STRING_BYTES = 512;
const MAX_TOTAL_STRING_BYTES = 1_024 * 1_024;
const MAX_RETURNED_SCHEMA_ISSUES = 64;
const ARRAY_INDEX = /^(0|[1-9]\d*)$/;
const POLLUTION_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const AUTHORITY = deepFreeze({
  projectionClass: "learner_declared_student_context_inspection",
  bindingAuthority: "caller_supplied_opaque_not_verified",
  adultStatusAuthority: "self_attested_not_verified",
  degreeAndLearningAxesMerged: false,
  rankingAllowed: false,
  recommendationAllowed: false,
  globalActionSelectionAllowed: false,
  readinessInferenceAllowed: false,
  masteryInferenceAllowed: false,
  persistenceAllowed: false,
  networkAllowed: false,
  eventEmissionAllowed: false,
} satisfies UniversityStudentContextAuthority);

class UnsafeJsonInput extends Error {}

function utf8Length(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

/**
 * Takes one bounded snapshot of the complete outer request. It uses own data
 * descriptors only, so caller accessors never execute. Intrinsic Proxy
 * detection runs before reflective traversal.
 */
function copyBoundedOuterRequest(value: unknown): unknown {
  const budget = { nodes: 0, stringBytes: 0 };
  const visited = new WeakSet<object>();

  function boundedString(valueToCheck: string, maximum: number): string {
    const bytes = utf8Length(valueToCheck);
    budget.stringBytes += bytes;
    if (
      bytes > maximum
      || budget.stringBytes > MAX_TOTAL_STRING_BYTES
      || valueToCheck !== valueToCheck.normalize("NFC")
      || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u2028\u2029]/u.test(
        valueToCheck,
      )
      || /[\u202A-\u202E\u2066-\u2069]/u.test(valueToCheck)
    ) {
      throw new UnsafeJsonInput();
    }
    return valueToCheck;
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
      const lengthDescriptor = Object.getOwnPropertyDescriptor(
        current,
        "length",
      );
      if (
        !lengthDescriptor
        || !("value" in lengthDescriptor)
        || !Number.isSafeInteger(lengthDescriptor.value)
        || lengthDescriptor.value < 0
        || lengthDescriptor.value > MAX_ARRAY_LENGTH
      ) {
        throw new UnsafeJsonInput();
      }
      const length = lengthDescriptor.value as number;
      const keys = Reflect.ownKeys(current);
      if (
        keys.length !== length + 1
        || keys.some((key) => (
          key !== "length"
          && (typeof key !== "string" || !ARRAY_INDEX.test(key))
        ))
      ) {
        throw new UnsafeJsonInput();
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
          throw new UnsafeJsonInput();
        }
        output.push(visit(descriptor.value, depth + 1));
      }
      return output;
    }

    if (Object.getPrototypeOf(current) !== Object.prototype) {
      throw new UnsafeJsonInput();
    }
    const keys = Reflect.ownKeys(current);
    if (
      keys.length > MAX_OBJECT_KEYS
      || keys.some((key) => typeof key !== "string")
    ) {
      throw new UnsafeJsonInput();
    }
    const output: Record<string, unknown> = {};
    for (const key of (keys as string[]).sort()) {
      if (POLLUTION_KEYS.has(key)) throw new UnsafeJsonInput();
      boundedString(key, MAX_PROPERTY_NAME_BYTES);
      const descriptor = Object.getOwnPropertyDescriptor(current, key);
      if (
        !descriptor
        || !descriptor.enumerable
        || !("value" in descriptor)
        || descriptor.get
        || descriptor.set
      ) {
        throw new UnsafeJsonInput();
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
  issues: readonly UniversityStudentContextIssue[],
): readonly UniversityStudentContextIssue[] {
  return [...issues].sort((left, right) => (
    left.code.localeCompare(right.code)
    || left.path.localeCompare(right.path)
    || left.message.localeCompare(right.message)
  ));
}

function invalidProjection(
  issues: readonly UniversityStudentContextIssue[],
): Readonly<UniversityStudentContextProjectionV2> {
  return deepFreeze({
    schemaVersion: UNIVERSITY_STUDENT_CONTEXT_PROJECTION_SCHEMA_VERSION,
    status: "invalid",
    contextBinding: null,
    degreeAxis: null,
    learningAxis: null,
    authority: AUTHORITY,
    issues: orderedIssues(issues),
  });
}

function structuralIssues(
  error: ZodError,
): readonly UniversityStudentContextIssue[] {
  return orderedIssues(error.issues.slice(0, MAX_RETURNED_SCHEMA_ISSUES).map((entry) => {
    const root = entry.path[0];
    const child = root === "degreeMapRequest" || root === "learningMapRequest";
    return {
      code: child ? "child.invalid" : "schema.invalid",
      path: entry.path.join("."),
      message: entry.message,
    };
  }));
}

/**
 * Recomputes both canonical inspection projections under one opaque,
 * learner-declared binding. Degree and learning remain separate axes.
 */
export function projectUniversityStudentContext(
  value: unknown,
): Readonly<UniversityStudentContextProjectionV2> {
  try {
    let copied: unknown;
    try {
      copied = copyBoundedOuterRequest(value);
    } catch {
      return invalidProjection([{
        code: "schema.invalid",
        path: "",
        message:
          "The student-context request must be bounded accessor-free plain JSON.",
      }]);
    }

    const parsed = universityStudentContextRequestSchema.safeParse(copied);
    if (!parsed.success) return invalidProjection(structuralIssues(parsed.error));
    const request = parsed.data;

    const degreeAxis = projectUniversityDegreeMap(request.degreeMapRequest);
    const learningAxis = projectUniversityLearningMap(
      request.learningMapRequest,
    );
    const childIssues: UniversityStudentContextIssue[] = [];
    if (degreeAxis.status === "invalid") {
      childIssues.push({
        code: "child.invalid",
        path: "degreeMapRequest",
        message:
          "The raw degree-map request did not produce a valid canonical projection.",
      });
    }
    if (learningAxis.status === "invalid") {
      childIssues.push({
        code: "child.invalid",
        path: "learningMapRequest",
        message:
          "The raw learning-map request did not produce a valid canonical projection.",
      });
    }
    if (childIssues.length > 0) return invalidProjection(childIssues);

    if (!request.degreeMapRequest.courses.some(
      (course) => course.courseId === request.learningMapRequest.course.courseRef,
    )) {
      return invalidProjection([{
        code: "binding.course_mismatch",
        path: "learningMapRequest.course.courseRef",
        message:
          "The learning-map course must exist in the bound raw degree map.",
      }]);
    }

    return deepFreeze({
      schemaVersion: UNIVERSITY_STUDENT_CONTEXT_PROJECTION_SCHEMA_VERSION,
      status: degreeAxis.status === "review_required"
        || learningAxis.status === "review_required"
        ? "review_required"
        : "ready_for_inspection",
      contextBinding: request.contextBinding,
      degreeAxis,
      learningAxis,
      authority: AUTHORITY,
      issues: [],
    });
  } catch {
    return invalidProjection([{
      code: "projection.unexpected",
      path: "",
      message:
        "The student-context projector failed closed before exposing an inspection state.",
    }]);
  }
}
