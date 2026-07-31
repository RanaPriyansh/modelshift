import { types as nodeUtilTypes } from "node:util";

import { type ZodError } from "zod";

import { boundedJsonSnapshot } from "../bounded-json-snapshot";
import {
  reconcileCourseSources,
  type CourseSourceCandidateProjection,
  type CourseSourceReconciliationResult,
} from "../course-sources";
import { deepFreeze } from "../deep-freeze";
import { canonicalJson, sha256Digest } from "../events";
import {
  projectUniversityStudentContext,
  type UniversityStudentContextProjectionV2,
} from "../university-student-context";
import {
  UNIVERSITY_SOURCE_MAP_CONTEXT_PROJECTION_SCHEMA_VERSION,
  type UniversityDegreeSourceInspectionRecordV1,
  type UniversityLearningSourceInspectionRecordV1,
  type UniversitySourceMapBindingV1,
  type UniversitySourceMapContextAuthority,
  type UniversitySourceMapContextIssue,
  type UniversitySourceMapContextProjectionV2,
  universitySourceMapContextRequestSchema,
} from "./contracts";

const UNIVERSITY_SOURCE_MAP_MAXIMUM_STRING_LENGTH = 4_096;
const UNIVERSITY_SOURCE_MAP_MAXIMUM_SERIALIZED_JSON_BYTES = 512 * 1_024;

const AUTHORITY = deepFreeze({
  projectionClass: "learner_declared_source_map_inspection",
  bindingAuthority: "caller_supplied_not_verified",
  identityAuthority: "not_established",
  identityEstablished: false,
  adultStatusAuthority: "self_attested_not_verified",
  tenantIsolationAuthority: "not_established",
  sourceClass: "learner_connected_source_copy",
  sourceAuthenticity: "not_established",
  institutionalCompleteness: "not_established",
  learningContentGrounding: "not_established",
  conceptSourceGroundingEstablished: false,
  persistenceAllowed: false,
  eventEmissionAllowed: false,
  providerAllowed: false,
  networkAllowed: false,
  recommendationAllowed: false,
  answerGenerationAllowed: false,
  masteryInferenceAllowed: false,
  pathActivationAllowed: false,
  externalSideEffectsAllowed: false,
} satisfies UniversitySourceMapContextAuthority);

type PlainRecord = Record<string, unknown>;

function record(value: unknown): PlainRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as PlainRecord
    : null;
}

function orderedIssues(
  issues: readonly UniversitySourceMapContextIssue[],
): readonly UniversitySourceMapContextIssue[] {
  return [...issues].sort((left, right) => (
    left.code.localeCompare(right.code)
    || left.path.localeCompare(right.path)
    || left.message.localeCompare(right.message)
  ));
}

function invalidProjection(
  issues: readonly UniversitySourceMapContextIssue[],
): Readonly<UniversitySourceMapContextProjectionV2> {
  return deepFreeze({
    schemaVersion: UNIVERSITY_SOURCE_MAP_CONTEXT_PROJECTION_SCHEMA_VERSION,
    status: "invalid",
    courseId: null,
    asOf: null,
    studentContextStatus: null,
    courseSourceStatus: null,
    degreeSources: [],
    learningSources: [],
    unboundCandidateIds: [],
    unboundConceptRefs: [],
    authority: AUTHORITY,
    issues: orderedIssues(issues),
    projectionDigest: null,
  });
}

function zodIssues(
  error: ZodError,
): readonly UniversitySourceMapContextIssue[] {
  return orderedIssues(error.issues.map((entry) => ({
    code: "schema.invalid",
    path: entry.path.join("."),
    message: entry.message,
  })));
}

function issue(
  issues: UniversitySourceMapContextIssue[],
  code: UniversitySourceMapContextIssue["code"],
  path: string,
  message: string,
): void {
  issues.push({ code, path, message });
}

function exactRawBindingIssues(
  rawValue: unknown,
  binding: UniversitySourceMapBindingV1,
  bindingIndex: number,
): readonly UniversitySourceMapContextIssue[] {
  const issues: UniversitySourceMapContextIssue[] = [];
  const root = record(rawValue);
  const scope = record(root?.scope);
  if (
    !root
    || !scope
    || !Array.isArray(root.sourceRevisions)
    || !Array.isArray(root.candidates)
    || !Array.isArray(root.decisions)
  ) {
    return [];
  }
  const revisions = Array.isArray(root?.sourceRevisions)
    ? root.sourceRevisions
    : [];
  const candidates = Array.isArray(root?.candidates)
    ? root.candidates
    : [];
  const decisions = Array.isArray(root?.decisions)
    ? root.decisions
    : [];
  const prefix = `bindings.${bindingIndex}`;

  if (scope?.courseId !== binding.courseId) {
    issue(
      issues,
      "binding.raw_identity_mismatch",
      `${prefix}.courseId`,
      "The bound course identifier must equal the detached raw scope identifier.",
    );
  }

  const rawRevision = revisions
    .map(record)
    .find((entry) => entry?.revisionId === binding.sourceRevisionId);
  if (!rawRevision) {
    issue(
      issues,
      "binding.raw_identity_mismatch",
      `${prefix}.sourceRevisionId`,
      "The bound source revision must exist exactly in the detached raw request.",
    );
  } else {
    const revisionScope = record(rawRevision.scope);
    if (revisionScope?.courseId !== binding.courseId) {
      issue(
        issues,
        "binding.raw_identity_mismatch",
        `${prefix}.courseId`,
        "The bound course identifier must equal the detached raw revision scope.",
      );
    }
  }

  const rawCandidate = candidates
    .map(record)
    .find((entry) => entry?.candidateId === binding.candidateId);
  if (!rawCandidate) {
    issue(
      issues,
      "binding.raw_identity_mismatch",
      `${prefix}.candidateId`,
      "The bound candidate must exist exactly in the detached raw request.",
    );
  } else {
    const candidateScope = record(rawCandidate.scope);
    const comparisons = [
      [
        rawCandidate.sourceRevisionId,
        binding.sourceRevisionId,
        "sourceRevisionId",
      ],
      [rawCandidate.claimKey, binding.claimKey, "claimKey"],
      [candidateScope?.courseId, binding.courseId, "courseId"],
    ] as const;
    comparisons.forEach(([actual, expected, field]) => {
      if (actual !== expected) {
        issue(
          issues,
          "binding.raw_identity_mismatch",
          `${prefix}.${field}`,
          `The bound ${field} must equal the detached raw candidate identifier.`,
        );
      }
    });
  }

  const normalizedCandidate = candidates
    .map(record)
    .some((entry) => (
      typeof entry?.candidateId === "string"
      && entry.candidateId.trim() === binding.candidateId
    ));
  if (normalizedCandidate) {
    const relevantDecisions = decisions
      .map(record)
      .filter((entry) => (
        typeof entry?.candidateId === "string"
        && entry.candidateId.trim() === binding.candidateId
      ));
    if (relevantDecisions.some((entry) => (
      entry?.candidateId !== binding.candidateId
      || record(entry?.scope)?.courseId !== binding.courseId
    ))) {
      issue(
        issues,
        "binding.raw_identity_mismatch",
        `${prefix}.candidateId`,
        "The raw decision candidate and course identifiers must match without normalization.",
      );
    }
  }

  return orderedIssues(issues);
}

function bindingKey(binding: UniversitySourceMapBindingV1): string {
  return [
    binding.courseId,
    binding.degreeSourceRef,
    binding.sourceRevisionId,
    binding.sourceDigest,
    binding.conceptRef,
    binding.candidateId,
    binding.claimKey,
  ].join("\u0000");
}

function bindingOrder(
  left: UniversitySourceMapBindingV1,
  right: UniversitySourceMapBindingV1,
): number {
  return bindingKey(left).localeCompare(bindingKey(right));
}

function degreeSourceKey(
  binding: UniversitySourceMapBindingV1,
): string {
  return [
    binding.courseId,
    binding.degreeSourceRef,
    binding.sourceRevisionId,
    binding.sourceDigest,
  ].join("\u0000");
}

function candidateIsBlocked(
  candidateId: string,
  reconciliation: Readonly<CourseSourceReconciliationResult>,
): boolean {
  return reconciliation.duplicateGroups.some(
    (group) => group.candidateIds.includes(candidateId),
  ) || reconciliation.conflicts.some(
    (group) => group.candidateIds.includes(candidateId),
  );
}

function bindingCanBecomeCandidate(input: {
  readonly studentContext:
    Readonly<UniversityStudentContextProjectionV2>;
  readonly reconciliation:
    Readonly<CourseSourceReconciliationResult>;
  readonly candidate: CourseSourceCandidateProjection;
  readonly freshnessState:
    UniversityDegreeSourceInspectionRecordV1["freshnessState"];
  readonly duplicateBinding: boolean;
  readonly degreeCourseDuplicate: boolean;
  readonly degreeSourceDuplicate: boolean;
}): boolean {
  return input.studentContext.status === "ready_for_inspection"
    && input.reconciliation.status === "connected_sources_reviewed"
    && input.reconciliation.coverage.state === "connected_sources_reviewed"
    && input.freshnessState === "current_within_declared_window"
    && (
      input.candidate.extractionState === "learner_confirmed"
      || input.candidate.extractionState === "learner_corrected"
    )
    && input.candidate.effectiveFact !== null
    && !candidateIsBlocked(input.candidate.candidateId, input.reconciliation)
    && !input.duplicateBinding
    && !input.degreeCourseDuplicate
    && !input.degreeSourceDuplicate;
}

async function signedProjection(
  projection: Omit<UniversitySourceMapContextProjectionV2, "projectionDigest">,
): Promise<Readonly<UniversitySourceMapContextProjectionV2>> {
  return deepFreeze({
    ...projection,
    projectionDigest: await sha256Digest(canonicalJson(projection)),
  });
}

/**
 * Connects exact reviewed course-source copies to the separate degree and
 * learning inspection axes. It does not establish content grounding.
 */
export async function projectUniversitySourceMapContext(
  value: unknown,
): Promise<Readonly<UniversitySourceMapContextProjectionV2>> {
  try {
    let copied: unknown;
    try {
      copied = boundedJsonSnapshot(value, {
        maximumSerializedJsonBytes:
          UNIVERSITY_SOURCE_MAP_MAXIMUM_SERIALIZED_JSON_BYTES,
        maximumStringLength: UNIVERSITY_SOURCE_MAP_MAXIMUM_STRING_LENGTH,
        rejectObject: nodeUtilTypes.isProxy,
        rejectRepeatedReferences: true,
      });
    } catch {
      return invalidProjection([{
        code: "schema.invalid",
        path: "",
        message:
          "The source-map request must be bounded, alias-free, accessor-free plain JSON.",
      }]);
    }

    const parsed = universitySourceMapContextRequestSchema.safeParse(copied);
    if (!parsed.success) return invalidProjection(zodIssues(parsed.error));
    const request = parsed.data;

    const rawIssues = request.bindings.flatMap((binding, index) => (
      exactRawBindingIssues(
        request.courseSourceReconciliationRequest,
        binding,
        index,
      )
    ));
    if (rawIssues.length > 0) return invalidProjection(rawIssues);

    const studentContext = projectUniversityStudentContext(
      request.studentContextRequest,
    );
    if (
      studentContext.status === "invalid"
      || studentContext.degreeAxis === null
      || studentContext.learningAxis === null
      || studentContext.learningAxis.map === null
    ) {
      return invalidProjection([{
        code: "student_context.invalid",
        path: "studentContextRequest",
        message:
          "The raw student-context request did not produce a valid canonical projection.",
      }]);
    }

    const reconciliation = await reconcileCourseSources(
      request.courseSourceReconciliationRequest,
    );
    if (
      reconciliation.status === "invalid"
      || reconciliation.scope === null
      || reconciliation.asOf === null
    ) {
      return invalidProjection([{
        code: "course_source.invalid",
        path: "courseSourceReconciliationRequest",
        message:
          "The raw course-source request did not produce a valid canonical reconciliation.",
      }]);
    }

    const fatalIssues: UniversitySourceMapContextIssue[] = [];
    const reviewIssues: UniversitySourceMapContextIssue[] = [];
    const rawStudentContext = record(request.studentContextRequest);
    const rawDegree = record(rawStudentContext?.degreeMapRequest);
    const rawLearning = record(rawStudentContext?.learningMapRequest);
    const rawLearningCourse = record(rawLearning?.course);
    const degreeCourses = Array.isArray(rawDegree?.courses)
      ? rawDegree.courses.map(record)
      : [];
    const degreeSources = Array.isArray(rawDegree?.sourceRegistry)
      ? rawDegree.sourceRegistry.map(record)
      : [];
    const learningConcepts = Array.isArray(rawLearning?.concepts)
      ? rawLearning.concepts.map(record)
      : [];
    const bindingCounts = new Map<string, number>();
    request.bindings.forEach((binding) => {
      const key = bindingKey(binding);
      bindingCounts.set(key, (bindingCounts.get(key) ?? 0) + 1);
    });

    const orderedBindings = request.bindings
      .map((binding, inputIndex) => ({ binding, inputIndex }))
      .sort((left, right) => bindingOrder(left.binding, right.binding));
    const degreeRecordsByKey =
      new Map<string, UniversityDegreeSourceInspectionRecordV1>();
    const learningRecords: UniversityLearningSourceInspectionRecordV1[] = [];
    const boundCandidateIds = new Set<string>();
    const boundConceptRefs = new Set<string>();

    orderedBindings.forEach(({ binding, inputIndex }) => {
      const path = `bindings.${inputIndex}`;
      const matchingDegreeCourses = degreeCourses.filter(
        (course) => course?.courseId === binding.courseId,
      );
      const matchingDegreeSources = degreeSources.filter(
        (source) => source?.sourceRef === binding.degreeSourceRef,
      );
      const matchingConcepts = learningConcepts.filter(
        (concept) => concept?.conceptRef === binding.conceptRef,
      );
      const revision = reconciliation.sources.find(
        (source) => source.revisionId === binding.sourceRevisionId,
      );
      const candidate = reconciliation.candidates.find(
        (entry) => entry.candidateId === binding.candidateId,
      );
      const duplicateBinding = (bindingCounts.get(bindingKey(binding)) ?? 0) > 1;
      const degreeCourseDuplicate = matchingDegreeCourses.length > 1;
      const degreeSourceDuplicate = matchingDegreeSources.length > 1;

      if (
        reconciliation.scope!.courseId !== binding.courseId
        || rawLearningCourse?.courseRef !== binding.courseId
        || matchingDegreeCourses.length === 0
      ) {
        issue(
          fatalIssues,
          "binding.course_mismatch",
          `${path}.courseId`,
          "The bound course must match the source scope and both student-context axes.",
        );
      }
      if (matchingDegreeSources.length === 0) {
        issue(
          fatalIssues,
          "binding.degree_source_missing",
          `${path}.degreeSourceRef`,
          "The bound degree source must exist in the degree source registry.",
        );
      } else if (matchingDegreeSources.some(
        (source) => source?.declaredSourceDigest !== binding.sourceDigest,
      )) {
        issue(
          fatalIssues,
          "binding.degree_source_digest_mismatch",
          `${path}.sourceDigest`,
          "The bound digest must match the exact degree source registry digest.",
        );
      }
      if (matchingDegreeCourses.some(
        (course) => course?.sourceRef !== binding.degreeSourceRef,
      )) {
        issue(
          fatalIssues,
          "binding.degree_source_missing",
          `${path}.degreeSourceRef`,
          "The degree course must reference the exact bound degree source.",
        );
      }
      if (!revision) {
        issue(
          fatalIssues,
          "binding.source_revision_missing",
          `${path}.sourceRevisionId`,
          "The exact source revision is missing from reconciliation.",
        );
      } else if (revision.sourceDigest !== binding.sourceDigest) {
        issue(
          fatalIssues,
          "binding.source_digest_mismatch",
          `${path}.sourceDigest`,
          "The bound digest must match the exact reconciled source revision.",
        );
      }
      if (!candidate) {
        issue(
          fatalIssues,
          "binding.candidate_missing",
          `${path}.candidateId`,
          "The exact course-source candidate is missing from reconciliation.",
        );
      } else {
        if (candidate.sourceRevisionId !== binding.sourceRevisionId) {
          issue(
            fatalIssues,
            "binding.candidate_source_mismatch",
            `${path}.sourceRevisionId`,
            "The bound candidate must reference the exact bound source revision.",
          );
        }
        if (candidate.claimKey !== binding.claimKey) {
          issue(
            fatalIssues,
            "binding.claim_mismatch",
            `${path}.claimKey`,
            "The bound claim key must match the exact reconciled candidate.",
          );
        }
      }
      if (matchingConcepts.length === 0) {
        issue(
          fatalIssues,
          "binding.concept_missing",
          `${path}.conceptRef`,
          "The bound concept must exist in the learning map.",
        );
      }
      if (
        !revision
        || !candidate
        || matchingDegreeCourses.length === 0
        || matchingDegreeSources.length === 0
        || matchingConcepts.length === 0
      ) {
        return;
      }

      const freshness = reconciliation.freshness.find(
        (entry) => entry.sourceRevisionId === binding.sourceRevisionId,
      );
      if (!freshness) {
        issue(
          fatalIssues,
          "binding.source_revision_missing",
          `${path}.sourceRevisionId`,
          "The exact source revision has no freshness projection.",
        );
        return;
      }

      if (duplicateBinding) {
        issue(
          reviewIssues,
          "binding.duplicate",
          path,
          "The same complete source-map binding appears more than once.",
        );
      }
      if (degreeCourseDuplicate || degreeSourceDuplicate) {
        issue(
          reviewIssues,
          "binding.duplicate",
          path,
          "The degree map has a duplicate bound course or source identifier.",
        );
      }

      const canBecomeCandidate = bindingCanBecomeCandidate({
        studentContext,
        reconciliation,
        candidate,
        freshnessState: freshness.state,
        duplicateBinding,
        degreeCourseDuplicate,
        degreeSourceDuplicate,
      });
      const bindingState = canBecomeCandidate
        ? "bound_review_candidate" as const
        : "review_required" as const;

      const degreeRecord: UniversityDegreeSourceInspectionRecordV1 = {
        courseId: binding.courseId,
        degreeSourceRef: binding.degreeSourceRef,
        sourceRevisionId: binding.sourceRevisionId,
        sourceDigest: binding.sourceDigest,
        degreeCourseState: matchingDegreeCourses.length === 1
          ? matchingDegreeCourses[0]?.state as
            | "completed"
            | "in_progress"
            | "planned"
          : null,
        observedAt: revision.observedAt,
        freshnessReviewDueAt: revision.freshnessReviewDueAt,
        freshnessState: freshness.state,
        coverageState: reconciliation.coverage.state,
        reconciliationStatus: reconciliation.status as
          | "review_required"
          | "connected_sources_reviewed",
        bindingState,
        sourceAuthenticity: "not_established",
        institutionalCompleteness: "not_established",
      };
      const existingDegreeRecord = degreeRecordsByKey.get(
        degreeSourceKey(binding),
      );
      if (!existingDegreeRecord) {
        degreeRecordsByKey.set(degreeSourceKey(binding), degreeRecord);
      } else if (
        existingDegreeRecord.bindingState === "review_required"
        || degreeRecord.bindingState === "review_required"
      ) {
        degreeRecordsByKey.set(degreeSourceKey(binding), {
          ...existingDegreeRecord,
          bindingState: "review_required",
        });
      }
      learningRecords.push({
        courseId: binding.courseId,
        conceptRef: binding.conceptRef,
        candidateId: binding.candidateId,
        claimKey: binding.claimKey,
        sourceRevisionId: binding.sourceRevisionId,
        sourceDigest: binding.sourceDigest,
        factKind: candidate.originalFact.kind,
        extractionState: candidate.extractionState,
        factAuthority: candidate.factAuthority,
        bindingState,
        conceptAssociationAuthority: "caller_supplied_not_verified",
        learningContentGrounding: "not_established",
        answerGenerationAllowed: false,
        masteryInferenceAllowed: false,
      });
      boundCandidateIds.add(candidate.candidateId);
      boundConceptRefs.add(binding.conceptRef);

      if (freshness.state !== "current_within_declared_window") {
        issue(
          reviewIssues,
          "source.freshness_review_required",
          `${path}.sourceRevisionId`,
          "The bound source freshness is stale or unknown.",
        );
      }
      if (
        candidate.extractionState === "candidate"
        || candidate.effectiveFact === null
      ) {
        issue(
          reviewIssues,
          candidate.extractionState === "learner_rejected"
            ? "source.candidate_rejected"
            : "source.candidate_review_required",
          `${path}.candidateId`,
          candidate.extractionState === "learner_rejected"
            ? "The learner rejected the bound source candidate."
            : "The bound source candidate needs learner review.",
        );
      }
    });

    if (fatalIssues.length > 0) return invalidProjection(fatalIssues);

    if (studentContext.status === "review_required") {
      issue(
        reviewIssues,
        "map.review_required",
        "studentContextRequest",
        "The degree or learning inspection axis still needs review.",
      );
    }
    if (reconciliation.status === "review_required") {
      issue(
        reviewIssues,
        "source.reconciliation_review_required",
        "courseSourceReconciliationRequest",
        "The course-source reconciliation still needs review.",
      );
    }
    if (reconciliation.coverage.state !== "connected_sources_reviewed") {
      issue(
        reviewIssues,
        "source.coverage_review_required",
        "courseSourceReconciliationRequest.sourceRevisions",
        "The connected source coverage is partial or unknown.",
      );
    }
    reconciliation.duplicateGroups.forEach((group) => {
      issue(
        reviewIssues,
        "source.duplicate_review_required",
        `courseSourceReconciliationRequest.candidates.${group.claimKey}`,
        "Duplicate course-source facts need learner review.",
      );
    });
    reconciliation.conflicts.forEach((group) => {
      issue(
        reviewIssues,
        "source.conflict_review_required",
        `courseSourceReconciliationRequest.candidates.${group.claimKey}`,
        "Conflicting course-source facts need learner or authorized human review.",
      );
    });
    const unboundCandidateIds = reconciliation.candidates
      .filter((candidate) => !boundCandidateIds.has(candidate.candidateId))
      .map((candidate) => candidate.candidateId)
      .sort();
    unboundCandidateIds
      .forEach((candidate) => {
        issue(
          reviewIssues,
          "source.fact_unbound",
          `courseSourceReconciliationRequest.candidates.${candidate}`,
          "A course-source candidate has no explicit concept inspection binding.",
        );
      });

    const unboundConceptRefs = [...new Set(
      studentContext.learningAxis.map.concepts
        .map((concept) => concept.conceptRef)
        .filter((conceptRef) => !boundConceptRefs.has(conceptRef)),
    )].sort().slice(0, 96);
    if (unboundConceptRefs.length > 0) {
      issue(
        reviewIssues,
        "map.concept_unbound",
        "studentContextRequest.learningMapRequest.concepts",
        "One or more learning-map concepts have no explicit source inspection binding.",
      );
    }

    const degreeRecords = [...degreeRecordsByKey.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([, record]) => record);
    const issues = orderedIssues(reviewIssues);
    const status = issues.length === 0
      && degreeRecords.every(
        (entry) => entry.bindingState === "bound_review_candidate",
      )
      && learningRecords.every(
        (entry) => entry.bindingState === "bound_review_candidate",
      )
      ? "bound_review_candidate" as const
      : "review_required" as const;

    return signedProjection({
      schemaVersion:
        UNIVERSITY_SOURCE_MAP_CONTEXT_PROJECTION_SCHEMA_VERSION,
      status,
      courseId: reconciliation.scope.courseId,
      asOf: reconciliation.asOf,
      studentContextStatus: studentContext.status,
      courseSourceStatus: reconciliation.status,
      degreeSources: degreeRecords,
      learningSources: learningRecords,
      unboundCandidateIds,
      unboundConceptRefs,
      authority: AUTHORITY,
      issues,
    });
  } catch {
    return invalidProjection([{
      code: "projection.unexpected",
      path: "",
      message:
        "The source-map projector failed closed before it exposed an inspection state.",
    }]);
  }
}
