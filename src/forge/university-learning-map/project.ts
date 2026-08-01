import { types as nodeUtilTypes } from "node:util";
import { type ZodError } from "zod";

import { boundedJsonSnapshot } from "../bounded-json-snapshot";
import { deepFreeze } from "../deep-freeze";
import {
  UNIVERSITY_LEARNING_MAP_PROJECTION_VERSION,
  type UniversityLearningMapIssue,
  type UniversityLearningMapIssueCode,
  type UniversityLearningMapProjectionV2,
  type UniversityLearningMapRequestV2,
  universityLearningMapRequestSchema,
} from "./contracts";

const MAXIMUM_STRING_LENGTH = 4_096;
const MAXIMUM_SERIALIZED_JSON_BYTES = 512 * 1_024;

const AUTHORITY = deepFreeze({
  projectionClass: "learner_declared_learning_map_inspection",
  adultStatusAuthority: "self_attested_not_verified",
  masteryEstablished: false,
  abilityScored: false,
  diagnosisAllowed: false,
  recommendationAllowed: false,
  answerGenerationAllowed: false,
  persistenceAllowed: false,
  networkAllowed: false,
  eventEmissionAllowed: false,
  personalDataAllowed: false,
} as const);

function issue(code: UniversityLearningMapIssueCode, path: string): UniversityLearningMapIssue {
  return { code, path };
}

function ordered(issues: readonly UniversityLearningMapIssue[]): readonly UniversityLearningMapIssue[] {
  return [...issues].sort((left, right) => (
    left.code.localeCompare(right.code) || left.path.localeCompare(right.path)
  ));
}

function structural(error: ZodError): readonly UniversityLearningMapIssue[] {
  return ordered(error.issues.map((entry) => issue("schema.invalid", entry.path.join("."))));
}

function invalid(issues: readonly UniversityLearningMapIssue[]): Readonly<UniversityLearningMapProjectionV2> {
  return deepFreeze({
    schemaVersion: UNIVERSITY_LEARNING_MAP_PROJECTION_VERSION,
    status: "invalid",
    map: null,
    review: null,
    authority: AUTHORITY,
    issues: ordered(issues),
  });
}

function duplicates(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

function cycleMembers(
  concepts: UniversityLearningMapRequestV2["concepts"],
): readonly string[] {
  const graph = new Map(concepts.map((entry) => [
    entry.conceptRef,
    entry.prerequisiteConceptRefs,
  ]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const cyclic = new Set<string>();

  function visit(ref: string, path: readonly string[]): void {
    if (visiting.has(ref)) {
      const start = path.indexOf(ref);
      for (const member of path.slice(start)) cyclic.add(member);
      cyclic.add(ref);
      return;
    }
    if (visited.has(ref)) return;
    visiting.add(ref);
    for (const dependency of graph.get(ref) ?? []) visit(dependency, [...path, ref]);
    visiting.delete(ref);
    visited.add(ref);
  }
  for (const ref of [...graph.keys()].sort()) visit(ref, []);
  return [...cyclic].sort();
}

function sortBy<T>(values: readonly T[], key: (value: T) => string): readonly T[] {
  return [...values].sort((left, right) => key(left).localeCompare(key(right)));
}

function containsUnsafeNumber(value: unknown): boolean {
  if (typeof value === "number") return !Number.isSafeInteger(value);
  if (Array.isArray(value)) return value.some(containsUnsafeNumber);
  if (value === null || typeof value !== "object") return false;
  return Object.values(value).some(containsUnsafeNumber);
}

export function projectUniversityLearningMap(
  value: unknown,
): Readonly<UniversityLearningMapProjectionV2> {
  try {
    let detached: unknown;
    try {
      detached = boundedJsonSnapshot(value, {
        rejectObject: (candidate) => nodeUtilTypes.isProxy(candidate),
        rejectRepeatedReferences: true,
        maximumStringLength: MAXIMUM_STRING_LENGTH,
        maximumSerializedJsonBytes: MAXIMUM_SERIALIZED_JSON_BYTES,
      });
    } catch {
      return invalid([issue("schema.invalid", "")]);
    }
    if (containsUnsafeNumber(detached)) {
      return invalid([issue("schema.invalid", "")]);
    }
    const parsed = universityLearningMapRequestSchema.safeParse(detached);
    if (!parsed.success) return invalid(structural(parsed.error));
    const request = parsed.data;

    const identityGroups = [
      request.outcomes.map((entry) => entry.outcomeRef),
      request.concepts.map((entry) => entry.conceptRef),
      request.evidence.map((entry) => entry.evidenceRef),
      request.attempts.map((entry) => entry.attemptRef),
      request.attempts.flatMap((entry) => entry.helpUsed.map((help) => help.helpRef)),
      request.delayedReturns.map((entry) => entry.returnRef),
      request.unknowns.map((entry) => entry.unknownRef),
    ];
    if (identityGroups.some(duplicates)) return invalid([issue("ids.duplicate", "")]);

    const outcomes = new Set(identityGroups[0]);
    const concepts = new Set(identityGroups[1]);
    const evidence = new Set(identityGroups[2]);
    const attempts = new Map(request.attempts.map((entry) => [entry.attemptRef, entry]));
    const allScopeRefs = new Set([
      request.course.courseRef,
      ...identityGroups.flat(),
    ]);
    const missingReference = request.concepts.some((entry) => (
      entry.outcomeRefs.some((ref) => !outcomes.has(ref))
      || entry.prerequisiteConceptRefs.some((ref) => !concepts.has(ref))
    )) || request.attempts.some((entry) => (
      entry.conceptRefs.some((ref) => !concepts.has(ref))
      || entry.evidenceRefs.some((ref) => !evidence.has(ref))
      || entry.helpUsed.some((help) => !evidence.has(help.provenanceEvidenceRef))
    )) || request.delayedReturns.some((entry) => {
      const sourceAttempt = attempts.get(entry.sourceAttemptRef);
      return !sourceAttempt || entry.conceptRefs.some((ref) => (
        !concepts.has(ref) || !sourceAttempt.conceptRefs.includes(ref)
      ));
    }) || request.unknowns.some((entry) => !allScopeRefs.has(entry.scopeRef));
    if (missingReference) return invalid([issue("references.missing", "")]);

    const reviewIssues: UniversityLearningMapIssue[] = [];
    const mapped = new Set(request.concepts.flatMap((entry) => entry.outcomeRefs));
    const unmappedOutcomeRefs = [...outcomes].filter((ref) => !mapped.has(ref)).sort();
    if (unmappedOutcomeRefs.length > 0) {
      reviewIssues.push(issue("outcomes.unmapped", "outcomes"));
    }
    const cyclicConceptRefs = cycleMembers(request.concepts);
    if (cyclicConceptRefs.length > 0) {
      reviewIssues.push(issue("prerequisites.cycle", "concepts"));
    }
    if (request.attempts.some((entry) => entry.evidenceRefs.length === 0)) {
      reviewIssues.push(issue("attempts.evidence_missing", "attempts"));
    }
    if (request.delayedReturns.some((entry) => (
      entry.dueOn <= attempts.get(entry.sourceAttemptRef)!.attemptedOn
    ))) {
      reviewIssues.push(issue("delayed_returns.order_invalid", "delayedReturns"));
    }
    if (
      request.unknowns.length > 0
      || request.concepts.some((entry) => entry.prerequisiteKnowledge === "unknown")
      || request.attempts.some((entry) => entry.disposition === "unknown")
      || request.delayedReturns.some((entry) => entry.completion === "unknown")
    ) {
      reviewIssues.push(issue("unknowns.explicit", "unknowns"));
    }

    return deepFreeze({
      schemaVersion: UNIVERSITY_LEARNING_MAP_PROJECTION_VERSION,
      status: reviewIssues.length > 0 ? "review_required" : "ready_for_inspection",
      map: {
        course: request.course,
        outcomes: sortBy(request.outcomes, (entry) => entry.outcomeRef),
        concepts: sortBy(request.concepts, (entry) => entry.conceptRef),
        evidence: sortBy(request.evidence, (entry) => entry.evidenceRef),
        attempts: sortBy(request.attempts, (entry) => entry.attemptRef),
        delayedReturns: sortBy(request.delayedReturns, (entry) => entry.returnRef),
        unknowns: sortBy(request.unknowns, (entry) => entry.unknownRef),
      },
      review: {
        unmappedOutcomeRefs,
        cyclicConceptRefs,
        explicitUnknownCount: request.unknowns.length,
      },
      authority: AUTHORITY,
      issues: ordered(reviewIssues),
    });
  } catch {
    return invalid([issue("schema.invalid", "")]);
  }
}
