import { types as nodeUtilTypes } from "node:util";
import { ZodError } from "zod";

import { deepFreeze } from "../deep-freeze";
import {
  UNIVERSITY_DEGREE_MAP_PROJECTION_SCHEMA_VERSION,
  type UniversityDegreeMapCourseProjection,
  type UniversityDegreeMapIssue,
  type UniversityDegreeMapProjectionV1,
  type UniversityDegreeMapRequestV1,
  type UniversityDegreeMapRequirementProjection,
  universityDegreeMapRequestSchema,
} from "./contracts";

const MAX_JSON_DEPTH = 16;
const MAX_JSON_NODES = 12_000;
const MAX_CONTAINER_KEYS = 512;
const MAX_PROPERTY_NAME_BYTES = 120;
const MAX_STRING_BYTES = 512;
const MAX_TOTAL_STRING_BYTES = 192_000;

const AUTHORITY = deepFreeze({
  projectionClass: "adult_learner_owned_degree_map_inspection",
  adultStatusAuthority: "self_attested_not_verified",
  sourceAuthority: "learner_supplied_not_verified",
  rankingAllowed: false,
  recommendationAllowed: false,
  persistenceAllowed: false,
  networkAllowed: false,
  eventEmissionAllowed: false,
} satisfies UniversityDegreeMapProjectionV1["authority"]);

class UnsafeJsonInput extends Error {}

function utf8Length(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function copyBoundedPlainJson(value: unknown): unknown {
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
  code: UniversityDegreeMapIssue["code"],
  path: string,
  message: string,
): UniversityDegreeMapIssue {
  return { code, path, message };
}

function sortedUnique(values: Iterable<string>): readonly string[] {
  return [...new Set(values)].sort();
}

function duplicateValues(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

function orderedIssues(
  issues: readonly UniversityDegreeMapIssue[],
): readonly UniversityDegreeMapIssue[] {
  return [...issues].sort((left, right) => {
    const codeOrder = left.code.localeCompare(right.code);
    return codeOrder !== 0 ? codeOrder : left.path.localeCompare(right.path);
  });
}

function structuralIssues(error: ZodError): readonly UniversityDegreeMapIssue[] {
  return orderedIssues(error.issues.map((entry) => issue(
    "schema.invalid",
    entry.path.join("."),
    entry.message,
  )));
}

function emptyFlags(): UniversityDegreeMapProjectionV1["flags"] {
  return {
    duplicateSourceRefs: [],
    duplicateCourseIds: [],
    conflictingStateCourseIds: [],
    duplicatePrerequisiteCourseIds: [],
    duplicateRequirementIds: [],
    duplicateRequirementCourseReferenceIds: [],
    unknownCourseIds: [],
    prerequisiteCycleCourseIds: [],
    activeCourseUnmetPrerequisiteIds: [],
    missingSources: {
      program: false,
      courseIds: [],
      requirementIds: [],
    },
  };
}

function invalidProjection(
  issues: readonly UniversityDegreeMapIssue[],
): Readonly<UniversityDegreeMapProjectionV1> {
  return deepFreeze({
    schemaVersion: UNIVERSITY_DEGREE_MAP_PROJECTION_SCHEMA_VERSION,
    status: "invalid",
    programRef: null,
    courses: [],
    requirements: [],
    creditTotals: null,
    unmetRequirementIds: [],
    flags: emptyFlags(),
    authority: AUTHORITY,
    issues: orderedIssues(issues),
  });
}

function prerequisiteCycles(
  courses: ReadonlyMap<string, UniversityDegreeMapRequestV1["courses"][number]>,
): readonly string[] {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const cycles = new Set<string>();
  const stack: string[] = [];

  function visit(courseId: string): void {
    if (visited.has(courseId)) return;
    if (visiting.has(courseId)) {
      const cycleStart = stack.lastIndexOf(courseId);
      for (const member of stack.slice(cycleStart)) cycles.add(member);
      return;
    }
    visiting.add(courseId);
    stack.push(courseId);
    for (const prerequisiteId of courses.get(courseId)?.prerequisiteCourseIds
      ?? []) {
      if (courses.has(prerequisiteId)) visit(prerequisiteId);
    }
    stack.pop();
    visiting.delete(courseId);
    visited.add(courseId);
  }

  for (const courseId of [...courses.keys()].sort()) visit(courseId);
  return [...cycles].sort();
}

function projectValid(
  request: UniversityDegreeMapRequestV1,
): Readonly<UniversityDegreeMapProjectionV1> {
  const issues: UniversityDegreeMapIssue[] = [];
  const sourceRefs = request.sourceRegistry.map((entry) => entry.sourceRef);
  const knownSources = new Set(sourceRefs);
  const duplicateSourceRefs = duplicateValues(sourceRefs);

  const courseIds = request.courses.map((entry) => entry.courseId);
  const duplicateCourseIds = duplicateValues(courseIds);
  const coursesById = new Map<
    string,
    UniversityDegreeMapRequestV1["courses"][number]
  >();
  const stateSets = new Map<string, Set<string>>();
  for (const course of request.courses) {
    if (!coursesById.has(course.courseId)) coursesById.set(course.courseId, course);
    const states = stateSets.get(course.courseId) ?? new Set<string>();
    states.add(course.state);
    stateSets.set(course.courseId, states);
  }
  const conflictingStateCourseIds = [...stateSets.entries()]
    .filter(([, states]) => states.size > 1)
    .map(([courseId]) => courseId)
    .sort();

  const duplicatePrerequisiteCourseIds = request.courses
    .filter((course) => (
      duplicateValues(course.prerequisiteCourseIds).length > 0
    ))
    .map((course) => course.courseId)
    .sort();

  const requirementIds = request.requirements.map(
    (entry) => entry.requirementId,
  );
  const duplicateRequirementIds = duplicateValues(requirementIds);
  const requirementsById = new Map<
    string,
    UniversityDegreeMapRequestV1["requirements"][number]
  >();
  for (const requirement of request.requirements) {
    if (!requirementsById.has(requirement.requirementId)) {
      requirementsById.set(requirement.requirementId, requirement);
    }
  }
  const duplicateRequirementCourseReferenceIds = request.requirements
    .filter((requirement) => (
      requirement.kind === "minimum_credits"
      && duplicateValues(requirement.eligibleCourseIds).length > 0
    ))
    .map((requirement) => requirement.requirementId)
    .sort();

  const referencedCourseIds: string[] = [];
  for (const course of request.courses) {
    referencedCourseIds.push(...course.prerequisiteCourseIds);
  }
  for (const requirement of request.requirements) {
    referencedCourseIds.push(...(
      requirement.kind === "required_course"
        ? [requirement.courseId]
        : requirement.eligibleCourseIds
    ));
  }
  const unknownCourseIds = sortedUnique(
    referencedCourseIds.filter((courseId) => !coursesById.has(courseId)),
  );

  const programSourceMissing = (
    request.program.sourceRef === undefined
    || !knownSources.has(request.program.sourceRef)
  );
  const missingCourseSourceIds = request.courses
    .filter((course) => (
      course.sourceRef === undefined || !knownSources.has(course.sourceRef)
    ))
    .map((course) => course.courseId);
  const missingRequirementSourceIds = request.requirements
    .filter((requirement) => (
      requirement.sourceRef === undefined
      || !knownSources.has(requirement.sourceRef)
    ))
    .map((requirement) => requirement.requirementId);

  const prerequisiteCycleCourseIds = prerequisiteCycles(coursesById);
  const completedCourseIds = new Set(
    [...coursesById.values()]
      .filter((course) => course.state === "completed")
      .map((course) => course.courseId),
  );
  const courses: UniversityDegreeMapCourseProjection[] = [...coursesById.values()]
    .sort((left, right) => left.courseId.localeCompare(right.courseId))
    .map((course) => ({
      courseId: course.courseId,
      creditUnits: course.creditUnits,
      state: course.state,
      prerequisiteCourseIds: sortedUnique(course.prerequisiteCourseIds),
      unmetPrerequisiteCourseIds: sortedUnique(
        course.prerequisiteCourseIds.filter(
          (prerequisiteId) => !completedCourseIds.has(prerequisiteId),
        ),
      ),
    }));
  const activeCourseUnmetPrerequisiteIds = courses
    .filter((course) => (
      course.state !== "planned"
      && course.unmetPrerequisiteCourseIds.length > 0
    ))
    .map((course) => course.courseId);

  const requirements: UniversityDegreeMapRequirementProjection[] = [
    ...requirementsById.values(),
  ]
    .sort((left, right) => left.requirementId.localeCompare(right.requirementId))
    .map((requirement) => {
      if (requirement.kind === "required_course") {
        return {
          requirementId: requirement.requirementId,
          kind: requirement.kind,
          met: completedCourseIds.has(requirement.courseId),
          earnedCreditUnits: completedCourseIds.has(requirement.courseId)
            ? (coursesById.get(requirement.courseId)?.creditUnits ?? 0)
            : 0,
          requiredCreditUnits:
            coursesById.get(requirement.courseId)?.creditUnits ?? 0,
          referencedCourseIds: [requirement.courseId],
        };
      }
      const eligibleIds = sortedUnique(requirement.eligibleCourseIds);
      const earnedCreditUnits = eligibleIds.reduce((total, courseId) => {
        const course = coursesById.get(courseId);
        return total + (
          course?.state === "completed" ? course.creditUnits : 0
        );
      }, 0);
      return {
        requirementId: requirement.requirementId,
        kind: requirement.kind,
        met: earnedCreditUnits >= requirement.minimumCreditUnits,
        earnedCreditUnits,
        requiredCreditUnits: requirement.minimumCreditUnits,
        referencedCourseIds: eligibleIds,
      };
    });

  const creditTotals = {
    completed: courses
      .filter((course) => course.state === "completed")
      .reduce((total, course) => total + course.creditUnits, 0),
    inProgress: courses
      .filter((course) => course.state === "in_progress")
      .reduce((total, course) => total + course.creditUnits, 0),
    planned: courses
      .filter((course) => course.state === "planned")
      .reduce((total, course) => total + course.creditUnits, 0),
    allDeclared: courses.reduce(
      (total, course) => total + course.creditUnits,
      0,
    ),
  };

  if (duplicateSourceRefs.length > 0) {
    issues.push(issue(
      "sources.duplicate_ref",
      "sourceRegistry",
      "Source references must be unique.",
    ));
  }
  if (
    programSourceMissing
    || missingCourseSourceIds.length > 0
    || missingRequirementSourceIds.length > 0
  ) {
    issues.push(issue(
      "sources.missing_or_unbound",
      "program",
      "Every program, course, and requirement needs a bound declared source.",
    ));
  }
  if (duplicateCourseIds.length > 0) {
    issues.push(issue(
      "courses.duplicate_id",
      "courses",
      "Course identifiers must be unique.",
    ));
  }
  if (conflictingStateCourseIds.length > 0) {
    issues.push(issue(
      "courses.conflicting_state",
      "courses",
      "A course cannot occupy multiple learner-declared states.",
    ));
  }
  if (duplicatePrerequisiteCourseIds.length > 0) {
    issues.push(issue(
      "courses.duplicate_prerequisite",
      "courses",
      "A prerequisite may appear only once per course.",
    ));
  }
  if (duplicateRequirementIds.length > 0) {
    issues.push(issue(
      "requirements.duplicate_id",
      "requirements",
      "Requirement identifiers must be unique.",
    ));
  }
  if (duplicateRequirementCourseReferenceIds.length > 0) {
    issues.push(issue(
      "requirements.duplicate_course_reference",
      "requirements",
      "A course may appear only once in a credit requirement.",
    ));
  }
  if (unknownCourseIds.length > 0) {
    issues.push(issue(
      "references.unknown_course",
      "courses",
      "Every prerequisite and requirement course must exist in the map.",
    ));
  }
  if (prerequisiteCycleCourseIds.length > 0) {
    issues.push(issue(
      "prerequisites.cycle",
      "courses",
      "Prerequisite relationships must be acyclic.",
    ));
  }
  if (activeCourseUnmetPrerequisiteIds.length > 0) {
    issues.push(issue(
      "prerequisites.active_course_unmet",
      "courses",
      "Completed or in-progress courses have learner-declared unmet prerequisites.",
    ));
  }

  return deepFreeze({
    schemaVersion: UNIVERSITY_DEGREE_MAP_PROJECTION_SCHEMA_VERSION,
    status: issues.length > 0 ? "review_required" : "ready_for_inspection",
    programRef: request.program.programRef,
    courses,
    requirements,
    creditTotals,
    unmetRequirementIds: requirements
      .filter((requirement) => !requirement.met)
      .map((requirement) => requirement.requirementId),
    flags: {
      duplicateSourceRefs,
      duplicateCourseIds,
      conflictingStateCourseIds,
      duplicatePrerequisiteCourseIds,
      duplicateRequirementIds,
      duplicateRequirementCourseReferenceIds,
      unknownCourseIds,
      prerequisiteCycleCourseIds,
      activeCourseUnmetPrerequisiteIds,
      missingSources: {
        program: programSourceMissing,
        courseIds: sortedUnique(missingCourseSourceIds),
        requirementIds: sortedUnique(missingRequirementSourceIds),
      },
    },
    authority: AUTHORITY,
    issues: orderedIssues(issues),
  });
}

/**
 * Projects an adult learner-owned degree map for inspection only.
 * It ranks or recommends nothing and performs no persistence, network, storage,
 * or event operation.
 */
export function projectUniversityDegreeMap(
  value: unknown,
): Readonly<UniversityDegreeMapProjectionV1> {
  try {
    let copied: unknown;
    try {
      copied = copyBoundedPlainJson(value);
    } catch {
      return invalidProjection([issue(
        "schema.invalid",
        "",
        "The degree-map request must be bounded accessor-free plain JSON.",
      )]);
    }
    const parsed = universityDegreeMapRequestSchema.safeParse(copied);
    if (!parsed.success) return invalidProjection(structuralIssues(parsed.error));
    return projectValid(parsed.data);
  } catch {
    return invalidProjection([issue(
      "schema.invalid",
      "",
      "The degree-map projector failed closed before exposing an inspection state.",
    )]);
  }
}
