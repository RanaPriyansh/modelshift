import { types as nodeUtilTypes } from "node:util";
import { ZodError } from "zod";

import {
  reconcileCourseSources,
  type CourseSourceCandidateProjection,
  type CourseSourceReconciliationResult,
  type CourseSourceScopeV1,
} from "../course-sources";
import { boundedJsonSnapshot } from "../bounded-json-snapshot";
import { deepFreeze } from "../deep-freeze";
import { canonicalJson, sha256Digest } from "../events";
import {
  UNIVERSITY_RECOVERY_PROJECTION_SCHEMA_VERSION,
  type UniversityRecoveryAuthority,
  type UniversityRecoveryCapacitySummary,
  type UniversityRecoveryHumanHelpDraft,
  type UniversityRecoveryIssue,
  type UniversityRecoveryItemV1,
  type UniversityRecoveryProjectedItem,
  type UniversityRecoveryProjectionV1,
  type UniversityRecoveryRequestV1,
  universityRecoveryRequestSchema,
} from "./contracts";

const MAXIMUM_STRING_LENGTH = 4_096;
const MAXIMUM_SERIALIZED_JSON_BYTES = 512 * 1_024;

const AUTHORITY = deepFreeze({
  projectionClass: "fixture_only_recovery_draft",
  identityScopeAuthority: "caller_asserted_fixture_only",
  tenantIsolationAuthority: "not_established",
  rightsEnforcementAuthority: "not_established",
  institutionalCompleteness: "not_established",
  capacityAuthority: "learner_declared_fixture_only",
  dispositionAuthority: "learner_declared_fixture_only",
  orderBasis: "reviewed_deadline_then_item_id_not_priority_score",
  recommendationAllowed: false,
  deadlineChangeAllowed: false,
  effortCompressionAllowed: false,
  automaticDeferralAllowed: false,
  backlogDebtAllowed: false,
  persistenceAllowed: false,
  eventEmissionAllowed: false,
  messageSendAllowed: false,
  externalSideEffectsAllowed: false,
} satisfies UniversityRecoveryAuthority);

function orderedIssues(issues: readonly UniversityRecoveryIssue[]): readonly UniversityRecoveryIssue[] {
  return [...issues].sort((left, right) => {
    const codeOrder = left.code.localeCompare(right.code);
    return codeOrder !== 0 ? codeOrder : left.path.localeCompare(right.path);
  });
}

function invalidProjection(
  issues: readonly UniversityRecoveryIssue[],
): Readonly<UniversityRecoveryProjectionV1> {
  return deepFreeze({
    schemaVersion: UNIVERSITY_RECOVERY_PROJECTION_SCHEMA_VERSION,
    status: "invalid",
    scope: null,
    asOf: null,
    termLabel: null,
    timeZone: null,
    declaredChange: null,
    authority: AUTHORITY,
    sourceCourses: [],
    capacity: null,
    lanes: {
      protectNow: [],
      decideOrAsk: [],
      outsideThisWindow: [],
    },
    highConsequenceConflictItemIds: [],
    humanHelpDraft: null,
    recovery: "repair_fixture_input",
    issues: orderedIssues(issues),
    projectionDigest: null,
  });
}

function zodIssues(error: ZodError): UniversityRecoveryIssue[] {
  return error.issues.map((entry) => ({
    code: "schema.invalid",
    path: entry.path.join("."),
    message: entry.message,
  }));
}

function sameTermScope(
  scope: CourseSourceScopeV1,
  request: UniversityRecoveryRequestV1,
  courseId: string,
): boolean {
  return scope.ownerUserId === request.scope.ownerUserId
    && scope.tenantId === request.scope.tenantId
    && scope.termId === request.scope.termId
    && scope.courseId === courseId;
}

function dependencyCycle(items: readonly UniversityRecoveryItemV1[]): string | null {
  const dependencies = new Map(items.map((item) => [item.itemId, item.dependencyItemIds]));
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function walk(itemId: string): string | null {
    if (visiting.has(itemId)) return itemId;
    if (visited.has(itemId)) return null;
    visiting.add(itemId);
    for (const dependencyId of dependencies.get(itemId) ?? []) {
      const cycle = walk(dependencyId);
      if (cycle) return cycle;
    }
    visiting.delete(itemId);
    visited.add(itemId);
    return null;
  }

  for (const item of items) {
    const cycle = walk(item.itemId);
    if (cycle) return cycle;
  }
  return null;
}

function laneFor(item: UniversityRecoveryItemV1): Pick<
  UniversityRecoveryProjectedItem,
  "lane" | "laneReason" | "includedInProtectedCapacity"
> {
  if (item.learnerDisposition === "required") {
    return {
      lane: "protect_now",
      laneReason: "learner_marked_required",
      includedInProtectedCapacity: true,
    };
  }
  if (item.learnerDisposition === "negotiable" || item.learningEssential.value) {
    return {
      lane: "decide_or_ask",
      laneReason: "learner_choice_or_human_decision_needed",
      includedInProtectedCapacity: false,
    };
  }
  if (item.learnerDisposition === "deferrable") {
    return {
      lane: "outside_this_window",
      laneReason: "learner_marked_deferrable",
      includedInProtectedCapacity: false,
    };
  }
  return {
    lane: "outside_this_window",
    laneReason: "learner_marked_no_longer_useful",
    includedInProtectedCapacity: false,
  };
}

function itemOrder(
  left: UniversityRecoveryProjectedItem,
  right: UniversityRecoveryProjectedItem,
): number {
  const deadlineOrder = Date.parse(left.dueAt) - Date.parse(right.dueAt);
  return deadlineOrder !== 0 ? deadlineOrder : left.itemId.localeCompare(right.itemId);
}

function capacityFor(
  request: UniversityRecoveryRequestV1,
  protectedItems: readonly UniversityRecoveryProjectedItem[],
): UniversityRecoveryCapacitySummary {
  const protectedEffortMinutesLow = protectedItems
    .reduce((total, item) => total + item.effortMinutesLow, 0);
  const protectedEffortMinutesHigh = protectedItems
    .reduce((total, item) => total + item.effortMinutesHigh, 0);
  const { availableMinutes, bufferMinutes } = request.recoveryWindow;
  const workableMinutes = availableMinutes - bufferMinutes;
  const state = protectedEffortMinutesLow > workableMinutes
    ? "insufficient_declared_window"
    : protectedEffortMinutesHigh > workableMinutes
      ? "tight_declared_window"
      : "fits_declared_window";
  return {
    state,
    availableMinutes,
    protectedBufferMinutes: bufferMinutes,
    workableMinutes,
    protectedEffortMinutesLow,
    protectedEffortMinutesHigh,
    declaredBy: request.recoveryWindow.declaredBy,
    effortBasis: "fixture_authored",
  };
}

function helpDraft(
  item: UniversityRecoveryProjectedItem,
  capacity: UniversityRecoveryCapacitySummary,
): UniversityRecoveryHumanHelpDraft {
  return {
    state: "prepared_not_sent",
    route: item.humanRoute ?? "not_declared",
    relatedItemId: item.itemId,
    subject: `Recovery question about ${item.title}`,
    question: `Could we review what is still required for ${item.title}, copied as due ${item.dueAt}? This recovery window has ${capacity.workableMinutes} workable minutes, while protected required work is estimated at ${capacity.protectedEffortMinutesLow}-${capacity.protectedEffortMinutesHigh} minutes.`,
    sourceLinkAvailable: false,
    sendAllowed: false,
  };
}

async function signedProjection(
  projection: Omit<UniversityRecoveryProjectionV1, "projectionDigest">,
): Promise<Readonly<UniversityRecoveryProjectionV1>> {
  return deepFreeze({
    ...projection,
    projectionDigest: await sha256Digest(canonicalJson(projection)),
  });
}

type ReviewedCourse = Readonly<{
  courseId: string;
  courseLabel: string;
  reconciliation: Readonly<CourseSourceReconciliationResult>;
}>;

/**
 * Builds a transient recovery draft from reviewed deadline copies, a
 * learner-declared capacity window, and learner-declared dispositions. It does
 * not recommend, reschedule, persist, send, or mutate any learner record.
 */
export async function projectUniversityRecovery(
  value: unknown,
): Promise<Readonly<UniversityRecoveryProjectionV1>> {
  try {
    let copied: unknown;
    try {
      copied = boundedJsonSnapshot(value, {
        // Trusted projectors may already have detached the request into
        // null-prototype dictionaries. Snapshot again before parsing while
        // preserving that internal composition boundary.
        maximumStringLength: MAXIMUM_STRING_LENGTH,
        maximumSerializedJsonBytes: MAXIMUM_SERIALIZED_JSON_BYTES,
        rejectObject: nodeUtilTypes.isProxy,
        allowNullPrototypeObjects: true,
      });
    } catch {
      return invalidProjection([{
        code: "schema.invalid",
        path: "",
        message: "The recovery request must be bounded accessor-free plain JSON.",
      }]);
    }

    const parsed = universityRecoveryRequestSchema.safeParse(copied);
    if (!parsed.success) return invalidProjection(zodIssues(parsed.error));
    const request = parsed.data;
    const cycle = dependencyCycle(request.items);
    if (cycle) {
      return invalidProjection([{
        code: "item.dependency_cycle",
        path: "items",
        message: `Recovery dependencies must be acyclic; a cycle includes ${cycle}.`,
      }]);
    }

    const reconciliations = await Promise.all(request.courses.map(async (course): Promise<ReviewedCourse> => ({
      courseId: course.courseId,
      courseLabel: course.courseLabel,
      reconciliation: await reconcileCourseSources(course.reconciliationRequest),
    })));
    const issues: UniversityRecoveryIssue[] = [];

    reconciliations.forEach((course, index) => {
      const { reconciliation } = course;
      if (reconciliation.status === "invalid" || reconciliation.scope === null) {
        issues.push({
          code: "source.invalid",
          path: `courses.${index}.reconciliationRequest`,
          message: "A course-source projection is invalid and cannot shape a recovery draft.",
        });
        return;
      }
      if (!sameTermScope(reconciliation.scope, request, course.courseId)) {
        issues.push({
          code: "source.scope_mismatch",
          path: `courses.${index}.courseId`,
          message: "Every course projection must match the exact owner, tenant, term, and declared course.",
        });
      }
      if (reconciliation.asOf !== request.asOf) {
        issues.push({
          code: "source.as_of_mismatch",
          path: `courses.${index}.reconciliationRequest.asOf`,
          message: "Every course projection must use the recovery request's explicit time.",
        });
      }
    });
    if (issues.length > 0) return invalidProjection(issues);

    const coursesById = new Map(reconciliations.map((course) => [course.courseId, course]));
    const resolvedItems: Array<{
      item: UniversityRecoveryItemV1;
      course: ReviewedCourse;
      candidate: CourseSourceCandidateProjection;
    }> = [];
    request.items.forEach((item, index) => {
      const course = coursesById.get(item.courseId)!;
      const candidate = course.reconciliation.candidates
        .find((entry) => entry.candidateId === item.deadlineCandidateId);
      if (!candidate || candidate.effectiveFact?.kind !== "deadline") {
        issues.push({
          code: "source.deadline_missing",
          path: `items.${index}.deadlineCandidateId`,
          message: "Every recovery item must bind one exact deadline candidate in its declared course.",
        });
        return;
      }
      resolvedItems.push({ item, course, candidate });
    });
    if (issues.length > 0) return invalidProjection(issues);

    const sourceCourses = reconciliations.map((course) => {
      const { reconciliation } = course;
      return {
        courseId: course.courseId,
        courseLabel: course.courseLabel,
        scope: reconciliation.scope!,
        reconciliationStatus: reconciliation.status as "review_required" | "connected_sources_reviewed",
        coverageState: reconciliation.coverage.state,
        currentSourceCount: reconciliation.freshness
          .filter((entry) => entry.state === "current_within_declared_window").length,
        staleOrUnknownSourceCount: reconciliation.freshness
          .filter((entry) => entry.state !== "current_within_declared_window").length,
        unresolvedConflictCount: reconciliation.conflicts.length,
        institutionalCompleteness: "not_established" as const,
      };
    }).sort((left, right) => left.courseId.localeCompare(right.courseId));

    const shared = {
      schemaVersion: UNIVERSITY_RECOVERY_PROJECTION_SCHEMA_VERSION,
      scope: request.scope,
      asOf: request.asOf,
      termLabel: request.termLabel,
      timeZone: request.timeZone,
      declaredChange: request.declaredChange,
      authority: AUTHORITY,
      sourceCourses,
      issues: [] as const,
    };
    if (reconciliations.some((course) => course.reconciliation.status !== "connected_sources_reviewed")) {
      return signedProjection({
        ...shared,
        status: "source_review_required",
        capacity: null,
        lanes: {
          protectNow: [],
          decideOrAsk: [],
          outsideThisWindow: [],
        },
        highConsequenceConflictItemIds: [],
        humanHelpDraft: null,
        recovery: "review_connected_source_copies",
      });
    }

    const projectedItems: UniversityRecoveryProjectedItem[] = [];
    resolvedItems.forEach((entry, index) => {
      const { item, course, candidate } = entry;
      const fact = candidate.effectiveFact;
      if (
        fact?.kind !== "deadline"
        || !course.reconciliation.contextCandidateIds.includes(candidate.candidateId)
        || (
          candidate.factAuthority !== "learner_connected_source_copy"
          && candidate.factAuthority !== "student_entered_correction"
        )
      ) {
        issues.push({
          code: "source.deadline_not_reviewed",
          path: `items.${index}.deadlineCandidateId`,
          message: "A recovery item may use only a learner-confirmed or learner-corrected deadline outside conflict groups.",
        });
        return;
      }
      const due = Date.parse(fact.dueAt);
      const timing = due < Date.parse(request.asOf)
        ? "overdue"
        : due <= Date.parse(request.recoveryWindow.endsAt)
          ? "inside_recovery_window"
          : "after_recovery_window";
      projectedItems.push({
        itemId: item.itemId,
        courseId: item.courseId,
        courseLabel: course.courseLabel,
        title: fact.title,
        dueAt: fact.dueAt,
        timeZone: fact.timeZone,
        consequenceClass: fact.consequenceClass,
        timing,
        learnerDisposition: item.learnerDisposition,
        learningEssential: item.learningEssential.value,
        effortMinutesLow: item.effort.minutesLow,
        effortMinutesHigh: item.effort.minutesHigh,
        effortBasis: item.effort.basis,
        dependencyItemIds: [...item.dependencyItemIds].sort(),
        humanRoute: item.humanRoute?.owner ?? null,
        ...laneFor(item),
        source: {
          candidateId: candidate.candidateId,
          claimKey: candidate.claimKey,
          factAuthority: candidate.factAuthority,
          sourceAuthenticity: "not_established",
          institutionalCompleteness: "not_established",
        },
      });
    });
    if (issues.length > 0) return invalidProjection(issues);

    const protectNow = projectedItems.filter((item) => item.lane === "protect_now").sort(itemOrder);
    const decideOrAsk = projectedItems.filter((item) => item.lane === "decide_or_ask").sort(itemOrder);
    const outsideThisWindow = projectedItems
      .filter((item) => item.lane === "outside_this_window")
      .sort(itemOrder);
    const capacity = capacityFor(request, protectNow);
    const highConsequenceConflicts = projectedItems.filter((item) => (
      item.timing === "overdue"
      && item.consequenceClass !== "routine"
      && item.learnerDisposition !== "no_longer_useful"
    )).sort(itemOrder);
    const firstHelpItem = highConsequenceConflicts[0]
      ?? (capacity.state === "insufficient_declared_window" ? protectNow[0] : undefined);
    const humanHelpDraft = firstHelpItem ? helpDraft(firstHelpItem, capacity) : null;
    const needsLearnerChoice = capacity.state === "tight_declared_window"
      || decideOrAsk.length > 0;
    const status = humanHelpDraft
      ? "human_help_required" as const
      : needsLearnerChoice
        ? "learner_choice_required" as const
        : "draft_ready" as const;

    return signedProjection({
      ...shared,
      status,
      capacity,
      lanes: {
        protectNow,
        decideOrAsk,
        outsideThisWindow,
      },
      highConsequenceConflictItemIds: highConsequenceConflicts.map((item) => item.itemId),
      humanHelpDraft,
      recovery: status === "draft_ready"
        ? "inspect_recovery_draft"
        : status === "learner_choice_required"
          ? "learner_revision_required"
          : "review_prepared_human_question",
    });
  } catch {
    return invalidProjection([{
      code: "projection.unexpected",
      path: "",
      message: "The recovery projector failed closed before producing a usable draft.",
    }]);
  }
}
