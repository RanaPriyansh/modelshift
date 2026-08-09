import {
  COURSE_FACT_STATUSES,
  RECOVERY_OUTCOMES,
  SEMESTER_DESK_MAX_CONFLICT_FACT_IDS,
  SEMESTER_DESK_MAX_CONFLICTS_PER_COURSE,
  SEMESTER_DESK_MAX_COURSES,
  SEMESTER_DESK_MAX_DELAYED_RETURNS,
  SEMESTER_DESK_MAX_FACTS_PER_COURSE,
  SEMESTER_DESK_MAX_IDENTIFIER_UTF8_BYTES,
  SEMESTER_DESK_MAX_PLAN_ITEMS,
  SEMESTER_DESK_MAX_PROOFS,
  SEMESTER_DESK_MAX_PROGRESS_EVIDENCE,
  SEMESTER_DESK_MAX_RECOVERY_CHANGES,
  SEMESTER_DESK_MAX_RECOVERY_DECISIONS,
  SEMESTER_DESK_MAX_STUDY_SESSIONS,
  SEMESTER_DESK_MAX_TEXT_UTF8_BYTES,
  SEMESTER_DESK_V2_SCHEMA_VERSION,
  semesterDeskUtf8ByteLength,
  type CapacityDraft,
  type CreateSemesterDeskInput,
  type DelayedReturn,
  type IndependentProof,
  type ProgressEvidence,
  type RecoveryChange,
  type RecoveryDecision,
  type RecoveryDecisionInput,
  type SemesterCourse,
  type SemesterDeskCommand,
  type SemesterDeskErrorCode,
  type SemesterDeskIdentifierKind,
  type SemesterDeskResult,
  type SemesterDeskRuntime,
  type SemesterDeskState,
  type SemesterPlanItem,
} from "./types";

function success<T>(value: T): SemesterDeskResult<T> {
  return { ok: true, value };
}

function failure<T>(code: SemesterDeskErrorCode, message: string): SemesterDeskResult<T> {
  return { ok: false, error: { code, message } };
}

function nonBlank(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isDateOnly(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  if (Number(value.slice(0, 4)) < 1) return false;
  try {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
  } catch {
    return false;
  }
}

function isTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  if (Number(value.slice(0, 4)) < 1) return false;
  try {
    const parsed = new Date(value);
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString() === value;
  } catch {
    return false;
  }
}

function timestamp(runtime: SemesterDeskRuntime): SemesterDeskResult<string> {
  try {
    const value = runtime.clock.now();
    if (typeof value !== "string" || !isTimestamp(value)) {
      return failure("invalid-input", "The injected clock must return an ISO timestamp.");
    }
    return success(value);
  } catch {
    return failure("invalid-input", "The injected clock did not return a timestamp.");
  }
}

function identifier(
  runtime: SemesterDeskRuntime,
  kind: SemesterDeskIdentifierKind,
): SemesterDeskResult<string> {
  try {
    const value = runtime.identifiers.next(kind);
    if (!isBoundedIdentifier(value)) {
      return failure("invalid-input", "The identifier factory returned an empty identifier.");
    }
    return success(value);
  } catch {
    return failure("invalid-input", "The identifier factory did not return an identifier.");
  }
}

function courseFor(
  state: SemesterDeskState,
  courseId: string,
): SemesterDeskResult<SemesterCourse> {
  const course = state.courses.find((entry) => entry.id === courseId);
  return course
    ? success(course)
    : failure("not-found", "The course does not exist in this semester.");
}

function planItemFor(
  state: SemesterDeskState,
  planItemId: string,
): SemesterDeskResult<SemesterPlanItem> {
  const item = state.planItems.find((entry) => entry.id === planItemId);
  return item
    ? success(item)
    : failure("not-found", "The plan item does not exist in this semester.");
}

function replaceCourse(
  state: SemesterDeskState,
  course: SemesterCourse,
  updatedAt: string,
): SemesterDeskState {
  return {
    ...state,
    updatedAt,
    courses: state.courses.map((entry) => (entry.id === course.id ? course : entry)),
  };
}

function replacePlanItem(
  state: SemesterDeskState,
  item: SemesterPlanItem,
  updatedAt: string,
): SemesterDeskState {
  return {
    ...state,
    updatedAt,
    planItems: state.planItems.map((entry) => (entry.id === item.id ? item : entry)),
  };
}

function courseNeedsReview(course: SemesterCourse): boolean {
  return course.sourceConflicts.some((conflict) => conflict.status === "open")
    || course.facts.some((fact) => fact.status !== "checked");
}

function canActOnItem(
  state: SemesterDeskState,
  item: SemesterPlanItem,
): SemesterDeskResult<SemesterPlanItem> {
  if (item.status !== "planned") {
    return failure("invalid-transition", "Only planned work can become the next action.");
  }
  const course = courseFor(state, item.courseId);
  if (!course.ok) return course;
  if (courseNeedsReview(course.value)) {
    return failure("course-review-required", "Review changed, unconfirmed, or conflicting course facts before this action.");
  }
  return success(item);
}

function recoveryDecision(
  item: SemesterPlanItem,
  input: RecoveryDecisionInput,
): SemesterDeskResult<RecoveryDecision> {
  if (!nonBlank(input.reason)) {
    return failure("recovery-decision-invalid", "Each recovery decision needs a reason.");
  }
  if (!RECOVERY_OUTCOMES.includes(input.outcome)) {
    return failure("recovery-decision-invalid", "The recovery outcome is invalid.");
  }

  switch (input.outcome) {
    case "moved":
      if (!input.nextDate || !isDateOnly(input.nextDate) || input.nextDate === item.currentDate) {
        return failure("recovery-decision-invalid", "A moved item needs a different valid current date.");
      }
      if (input.nextMinutes !== undefined) {
        return failure("recovery-decision-invalid", "A moved item cannot change minutes in the same decision.");
      }
      return success({
        planItemId: item.id,
        outcome: "moved",
        nextDate: input.nextDate,
        nextMinutes: null,
        reason: input.reason.trim(),
      });
    case "reduced":
      if (
        input.nextMinutes === undefined
        || !Number.isInteger(input.nextMinutes)
        || input.nextMinutes < 1
        || input.nextMinutes >= item.currentMinutes
      ) {
        return failure("recovery-decision-invalid", "A reduced item needs fewer positive minutes.");
      }
      if (input.nextDate !== undefined) {
        return failure("recovery-decision-invalid", "A reduced item cannot move in the same decision.");
      }
      return success({
        planItemId: item.id,
        outcome: "reduced",
        nextDate: null,
        nextMinutes: input.nextMinutes,
        reason: input.reason.trim(),
      });
    case "kept":
      if (input.nextDate !== undefined || input.nextMinutes !== undefined) {
        return failure("recovery-decision-invalid", "A kept item cannot change its date or minutes.");
      }
      return success({
        planItemId: item.id,
        outcome: "kept",
        nextDate: null,
        nextMinutes: null,
        reason: input.reason.trim(),
      });
    case "deferred":
      if (!input.nextDate || !isDateOnly(input.nextDate) || input.nextDate === item.currentDate) {
        return failure("recovery-decision-invalid", "A deferred item needs a different valid current date.");
      }
      if (input.nextMinutes !== undefined) {
        return failure("recovery-decision-invalid", "A deferred item cannot change minutes in the same decision.");
      }
      return success({
        planItemId: item.id,
        outcome: "deferred",
        nextDate: input.nextDate,
        nextMinutes: null,
        reason: input.reason.trim(),
      });
  }
}

function applyRecoveryDecision(
  item: SemesterPlanItem,
  decision: RecoveryDecision,
): SemesterPlanItem {
  switch (decision.outcome) {
    case "moved":
      return { ...item, currentDate: decision.nextDate ?? item.currentDate, status: "planned" };
    case "reduced":
      return { ...item, currentMinutes: decision.nextMinutes ?? item.currentMinutes, status: "planned" };
    case "kept":
      return { ...item, status: "planned" };
    case "deferred":
      return { ...item, currentDate: decision.nextDate ?? item.currentDate, status: "deferred" };
  }
}

function appendEvidence(
  state: SemesterDeskState,
  evidence: ProgressEvidence,
): SemesterDeskState {
  return { ...state, progressEvidence: [...state.progressEvidence, evidence] };
}

function isPracticeOutcome(value: string): value is "completed" | "needs-more-work" {
  return value === "completed" || value === "needs-more-work";
}

function isProofOutcome(value: string): value is "demonstrated" | "needs-return" {
  return value === "demonstrated" || value === "needs-return";
}

function isRetentionOutcome(value: string): value is "retained" | "needs-more-work" {
  return value === "retained" || value === "needs-more-work";
}

const semesterDeskStateKeys = [
  "schemaVersion",
  "id",
  "profileId",
  "title",
  "createdAt",
  "updatedAt",
  "courses",
  "capacity",
  "capacityDraft",
  "planItems",
  "recoveryDraft",
  "recoveryChanges",
  "selectedNextActionId",
  "protectedStudySessions",
  "independentProofs",
  "delayedReturns",
  "progressEvidence",
] as const;

const courseKeys = ["id", "code", "title", "facts", "sourceConflicts"] as const;
const courseFactKeys = ["id", "label", "value", "status", "sourceLabel", "checkedAt"] as const;
const sourceConflictKeys = ["id", "factIds", "summary", "status", "detectedAt", "reviewedAt"] as const;
const capacityKeys = ["availableMinutes", "declaredAt"] as const;
const capacityDraftKeys = ["id", "availableMinutes", "draftedAt"] as const;
const planItemKeys = [
  "id",
  "courseId",
  "title",
  "originalDate",
  "currentDate",
  "originalMinutes",
  "currentMinutes",
  "status",
] as const;
const recoveryDraftKeys = ["id", "summary", "createdAt", "decisions"] as const;
const recoveryDecisionKeys = ["planItemId", "outcome", "nextDate", "nextMinutes", "reason"] as const;
const recoveryChangeKeys = [
  "id",
  "recoveryDraftId",
  "planItemId",
  "outcome",
  "reason",
  "previousDate",
  "currentDate",
  "previousMinutes",
  "currentMinutes",
  "recordedAt",
] as const;
const protectedStudySessionKeys = [
  "id",
  "planItemId",
  "status",
  "startedAt",
  "practiceCompletedAt",
  "practiceOutcome",
] as const;
const independentProofKeys = ["id", "planItemId", "outcome", "completedAt"] as const;
const delayedReturnKeys = [
  "id",
  "planItemId",
  "dueAt",
  "status",
  "openedAt",
  "completedAt",
  "retentionOutcome",
] as const;
const progressEvidenceKeys = ["id", "planItemId", "kind", "outcome", "occurredAt"] as const;

const planItemStatuses = new Set([
  "planned",
  "deferred",
  "in-progress",
  "practice-complete",
  "proof-complete",
  "return-complete",
]);
const sourceConflictStatuses = new Set(["open", "reviewed"]);
const studySessionStatuses = new Set(["active", "practice-complete"]);
const proofOutcomes = new Set(["demonstrated", "needs-return"]);
const delayedReturnStatuses = new Set(["due", "open", "completed"]);
const progressEvidenceKinds = new Set([
  "practice-completed",
  "independent-proof-completed",
  "delayed-return-completed",
]);
const progressEvidenceOutcomes = new Set([
  "completed",
  "needs-more-work",
  "demonstrated",
  "needs-return",
  "retained",
]);

type StateRecord = Record<string, unknown>;

function isExactRecord(value: unknown, keys: readonly string[]): value is StateRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  const actualKeys = Object.keys(value);
  return actualKeys.length === keys.length
    && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
    && Object.getOwnPropertySymbols(value).length === 0;
}

function isDenseArray(value: unknown, maximum: number): value is readonly unknown[] {
  if (!Array.isArray(value) || value.length > maximum || Object.getOwnPropertySymbols(value).length > 0) {
    return false;
  }
  if (Object.keys(value).length !== value.length) return false;
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(value, index)) return false;
  }
  return true;
}

function isBoundedText(value: unknown): value is string {
  return nonBlank(value) && semesterDeskUtf8ByteLength(value) <= SEMESTER_DESK_MAX_TEXT_UTF8_BYTES;
}

function isBoundedIdentifier(value: unknown): value is string {
  return nonBlank(value) && semesterDeskUtf8ByteLength(value) <= SEMESTER_DESK_MAX_IDENTIFIER_UTF8_BYTES;
}

function isPositiveWhole(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isNonnegativeWhole(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isCourseFactStatus(value: unknown): value is string {
  return typeof value === "string" && COURSE_FACT_STATUSES.includes(value as (typeof COURSE_FACT_STATUSES)[number]);
}

function isRecoveryOutcome(value: unknown): value is string {
  return typeof value === "string" && RECOVERY_OUTCOMES.includes(value as (typeof RECOVERY_OUTCOMES)[number]);
}

function isKnownValue(value: unknown, values: ReadonlySet<string>): value is string {
  return typeof value === "string" && values.has(value);
}

function registerIdentifier(value: unknown, identifiers: Set<string>): value is string {
  if (!isBoundedIdentifier(value) || identifiers.has(value)) return false;
  identifiers.add(value);
  return true;
}

function isStateValid(state: unknown): boolean {
  if (!isExactRecord(state, semesterDeskStateKeys)) return false;
  if (state.schemaVersion !== SEMESTER_DESK_V2_SCHEMA_VERSION) return false;
  if (!isBoundedIdentifier(state.id) || !isBoundedIdentifier(state.profileId) || !isBoundedText(state.title)) {
    return false;
  }
  if (!isTimestamp(state.createdAt) || !isTimestamp(state.updatedAt) || state.createdAt > state.updatedAt) {
    return false;
  }
  if (
    !isDenseArray(state.courses, SEMESTER_DESK_MAX_COURSES)
    || !isDenseArray(state.planItems, SEMESTER_DESK_MAX_PLAN_ITEMS)
    || !isDenseArray(state.recoveryChanges, SEMESTER_DESK_MAX_RECOVERY_CHANGES)
    || !isDenseArray(state.protectedStudySessions, SEMESTER_DESK_MAX_STUDY_SESSIONS)
    || !isDenseArray(state.independentProofs, SEMESTER_DESK_MAX_PROOFS)
    || !isDenseArray(state.delayedReturns, SEMESTER_DESK_MAX_DELAYED_RETURNS)
    || !isDenseArray(state.progressEvidence, SEMESTER_DESK_MAX_PROGRESS_EVIDENCE)
  ) {
    return false;
  }

  const identifiers = new Set<string>();
  if (!registerIdentifier(state.id, identifiers)) return false;
  const courseIds = new Set<string>();
  const courseCodes = new Set<string>();

  for (const rawCourse of state.courses) {
    if (!isExactRecord(rawCourse, courseKeys)) return false;
    const courseId = rawCourse.id;
    const courseCode = rawCourse.code;
    if (!registerIdentifier(courseId, identifiers) || !isBoundedText(courseCode) || !isBoundedText(rawCourse.title)) {
      return false;
    }
    if (courseIds.has(courseId) || courseCodes.has(courseCode)) return false;
    courseIds.add(courseId);
    courseCodes.add(courseCode);
    if (
      !isDenseArray(rawCourse.facts, SEMESTER_DESK_MAX_FACTS_PER_COURSE)
      || !isDenseArray(rawCourse.sourceConflicts, SEMESTER_DESK_MAX_CONFLICTS_PER_COURSE)
    ) {
      return false;
    }

    const factIds = new Set<string>();
    for (const rawFact of rawCourse.facts) {
      if (!isExactRecord(rawFact, courseFactKeys)) return false;
      const factId = rawFact.id;
      const checkedAt = rawFact.checkedAt;
      if (
        !registerIdentifier(factId, identifiers)
        || factIds.has(factId)
        || !isBoundedText(rawFact.label)
        || !isBoundedText(rawFact.value)
        || !isCourseFactStatus(rawFact.status)
        || !isBoundedText(rawFact.sourceLabel)
        || (checkedAt !== null && !isTimestamp(checkedAt))
        || (rawFact.status === "checked" && !isTimestamp(checkedAt))
      ) {
        return false;
      }
      factIds.add(factId);
    }

    for (const rawConflict of rawCourse.sourceConflicts) {
      if (!isExactRecord(rawConflict, sourceConflictKeys)) return false;
      const conflictId = rawConflict.id;
      const factIdsForConflict = rawConflict.factIds;
      const detectedAt = rawConflict.detectedAt;
      const reviewedAt = rawConflict.reviewedAt;
      if (
        !registerIdentifier(conflictId, identifiers)
        || !isDenseArray(factIdsForConflict, SEMESTER_DESK_MAX_CONFLICT_FACT_IDS)
        || factIdsForConflict.length < 2
        || !isBoundedText(rawConflict.summary)
        || !isKnownValue(rawConflict.status, sourceConflictStatuses)
        || !isTimestamp(detectedAt)
      ) {
        return false;
      }
      const referencedFacts = new Set<string>();
      for (const factId of factIdsForConflict) {
        if (!isBoundedIdentifier(factId) || !factIds.has(factId) || referencedFacts.has(factId)) {
          return false;
        }
        referencedFacts.add(factId);
      }
      if (rawConflict.status === "open" && reviewedAt !== null) return false;
      if (
        rawConflict.status === "reviewed"
        && (!isTimestamp(reviewedAt) || reviewedAt < detectedAt)
      ) {
        return false;
      }
    }
  }

  if (state.capacity !== null) {
    if (
      !isExactRecord(state.capacity, capacityKeys)
      || !isNonnegativeWhole(state.capacity.availableMinutes)
      || !isTimestamp(state.capacity.declaredAt)
    ) {
      return false;
    }
  }
  if (state.capacityDraft !== null) {
    if (
      !isExactRecord(state.capacityDraft, capacityDraftKeys)
      || !registerIdentifier(state.capacityDraft.id, identifiers)
      || !isNonnegativeWhole(state.capacityDraft.availableMinutes)
      || !isTimestamp(state.capacityDraft.draftedAt)
    ) {
      return false;
    }
  }

  const planItems = new Map<string, StateRecord>();
  const plannedItemIds = new Set<string>();
  for (const rawPlanItem of state.planItems) {
    if (!isExactRecord(rawPlanItem, planItemKeys)) return false;
    const planItemId = rawPlanItem.id;
    const courseId = rawPlanItem.courseId;
    if (
      !registerIdentifier(planItemId, identifiers)
      || planItems.has(planItemId)
      || !isBoundedIdentifier(courseId)
      || !courseIds.has(courseId)
      || !isBoundedText(rawPlanItem.title)
      || !isDateOnly(rawPlanItem.originalDate)
      || !isDateOnly(rawPlanItem.currentDate)
      || !isPositiveWhole(rawPlanItem.originalMinutes)
      || !isPositiveWhole(rawPlanItem.currentMinutes)
      || !isKnownValue(rawPlanItem.status, planItemStatuses)
    ) {
      return false;
    }
    planItems.set(planItemId, rawPlanItem);
    if (rawPlanItem.status === "planned") plannedItemIds.add(planItemId);
  }

  if (state.recoveryDraft !== null) {
    if (!isExactRecord(state.recoveryDraft, recoveryDraftKeys)) return false;
    const recoveryDraft = state.recoveryDraft;
    if (
      !registerIdentifier(recoveryDraft.id, identifiers)
      || !isBoundedText(recoveryDraft.summary)
      || !isTimestamp(recoveryDraft.createdAt)
      || !isDenseArray(recoveryDraft.decisions, SEMESTER_DESK_MAX_RECOVERY_DECISIONS)
      || plannedItemIds.size === 0
      || recoveryDraft.decisions.length !== plannedItemIds.size
    ) {
      return false;
    }
    const decisionPlanItemIds = new Set<string>();
    for (const rawDecision of recoveryDraft.decisions) {
      if (!isExactRecord(rawDecision, recoveryDecisionKeys)) return false;
      const planItemId = rawDecision.planItemId;
      if (!isBoundedIdentifier(planItemId)) return false;
      const item = planItems.get(planItemId);
      if (
        !item
        || !plannedItemIds.has(planItemId)
        || decisionPlanItemIds.has(planItemId)
        || !isRecoveryOutcome(rawDecision.outcome)
        || !isBoundedText(rawDecision.reason)
      ) {
        return false;
      }
      const nextDate = rawDecision.nextDate;
      const nextMinutes = rawDecision.nextMinutes;
      const currentDate = item.currentDate;
      const currentMinutes = item.currentMinutes;
      if (typeof currentDate !== "string" || typeof currentMinutes !== "number") return false;
      switch (rawDecision.outcome) {
        case "moved":
        case "deferred":
          if (!isDateOnly(nextDate) || nextDate === currentDate || nextMinutes !== null) return false;
          break;
        case "reduced":
          if (nextDate !== null || !isPositiveWhole(nextMinutes) || nextMinutes >= currentMinutes) return false;
          break;
        case "kept":
          if (nextDate !== null || nextMinutes !== null) return false;
          break;
      }
      decisionPlanItemIds.add(planItemId);
    }
    if (decisionPlanItemIds.size !== plannedItemIds.size) return false;
  }

  for (const rawChange of state.recoveryChanges) {
    if (!isExactRecord(rawChange, recoveryChangeKeys)) return false;
    const planItemId = rawChange.planItemId;
    if (
      !registerIdentifier(rawChange.id, identifiers)
      || !isBoundedIdentifier(rawChange.recoveryDraftId)
      || !isBoundedIdentifier(planItemId)
      || !planItems.has(planItemId)
      || !isRecoveryOutcome(rawChange.outcome)
      || !isBoundedText(rawChange.reason)
      || !isDateOnly(rawChange.previousDate)
      || !isDateOnly(rawChange.currentDate)
      || !isPositiveWhole(rawChange.previousMinutes)
      || !isPositiveWhole(rawChange.currentMinutes)
      || !isTimestamp(rawChange.recordedAt)
    ) {
      return false;
    }
    switch (rawChange.outcome) {
      case "moved":
      case "deferred":
        if (
          rawChange.previousDate === rawChange.currentDate
          || rawChange.previousMinutes !== rawChange.currentMinutes
        ) {
          return false;
        }
        break;
      case "reduced":
        if (
          rawChange.previousDate !== rawChange.currentDate
          || rawChange.currentMinutes >= rawChange.previousMinutes
        ) {
          return false;
        }
        break;
      case "kept":
        if (
          rawChange.previousDate !== rawChange.currentDate
          || rawChange.previousMinutes !== rawChange.currentMinutes
        ) {
          return false;
        }
        break;
    }
  }

  if (
    state.selectedNextActionId !== null
    && (!isBoundedIdentifier(state.selectedNextActionId) || !planItems.has(state.selectedNextActionId))
  ) {
    return false;
  }

  const activeStudyPlanItemIds = new Set<string>();
  const studySessionsByPlanItem = new Map<string, StateRecord[]>();
  const completedStudySessionsByPlanItem = new Map<string, StateRecord[]>();
  for (const rawSession of state.protectedStudySessions) {
    if (!isExactRecord(rawSession, protectedStudySessionKeys)) return false;
    const planItemId = rawSession.planItemId;
    const startedAt = rawSession.startedAt;
    if (
      !registerIdentifier(rawSession.id, identifiers)
      || !isBoundedIdentifier(planItemId)
      || !planItems.has(planItemId)
      || !isKnownValue(rawSession.status, studySessionStatuses)
      || !isTimestamp(startedAt)
    ) {
      return false;
    }
    const sessions = studySessionsByPlanItem.get(planItemId) ?? [];
    sessions.push(rawSession);
    studySessionsByPlanItem.set(planItemId, sessions);
    const planItem = planItems.get(planItemId);
    if (!planItem || typeof planItem.status !== "string") return false;
    if (rawSession.status === "active") {
      if (
        activeStudyPlanItemIds.size > 0
        || activeStudyPlanItemIds.has(planItemId)
        || rawSession.practiceCompletedAt !== null
        || (rawSession.practiceOutcome !== null && rawSession.practiceOutcome !== "needs-more-work")
        || planItem.status !== "in-progress"
      ) {
        return false;
      }
      activeStudyPlanItemIds.add(planItemId);
      continue;
    }
    const completedAt = rawSession.practiceCompletedAt;
    if (
      !isTimestamp(completedAt)
      || completedAt < startedAt
      || rawSession.practiceOutcome !== "completed"
    ) {
      return false;
    }
    const completedSessions = completedStudySessionsByPlanItem.get(planItemId) ?? [];
    completedSessions.push(rawSession);
    completedStudySessionsByPlanItem.set(planItemId, completedSessions);
  }

  const proofsByPlanItem = new Map<string, StateRecord[]>();
  for (const rawProof of state.independentProofs) {
    if (!isExactRecord(rawProof, independentProofKeys)) return false;
    const planItemId = rawProof.planItemId;
    const completedAt = rawProof.completedAt;
    if (
      !registerIdentifier(rawProof.id, identifiers)
      || !isBoundedIdentifier(planItemId)
      || !planItems.has(planItemId)
      || !isKnownValue(rawProof.outcome, proofOutcomes)
      || !isTimestamp(completedAt)
    ) {
      return false;
    }
    const completedStudy = completedStudySessionsByPlanItem.get(planItemId) ?? [];
    if (!completedStudy.some((session) => session.practiceCompletedAt === completedAt || (
      isTimestamp(session.practiceCompletedAt) && session.practiceCompletedAt <= completedAt
    ))) {
      return false;
    }
    const proofs = proofsByPlanItem.get(planItemId) ?? [];
    proofs.push(rawProof);
    proofsByPlanItem.set(planItemId, proofs);
  }

  const delayedReturnsByPlanItem = new Map<string, StateRecord[]>();
  const retainedReturnPlanItemIds = new Set<string>();
  const unfinishedReturnPlanItemIds = new Set<string>();
  for (const rawDelayedReturn of state.delayedReturns) {
    if (!isExactRecord(rawDelayedReturn, delayedReturnKeys)) return false;
    const planItemId = rawDelayedReturn.planItemId;
    const dueAt = rawDelayedReturn.dueAt;
    if (!isBoundedIdentifier(planItemId)) return false;
    const planItem = planItems.get(planItemId);
    if (
      !registerIdentifier(rawDelayedReturn.id, identifiers)
      || !planItem
      || !isKnownValue(rawDelayedReturn.status, delayedReturnStatuses)
      || !isTimestamp(dueAt)
      || !proofsByPlanItem.has(planItemId)
      || typeof planItem.status !== "string"
    ) {
      return false;
    }
    const returns = delayedReturnsByPlanItem.get(planItemId) ?? [];
    returns.push(rawDelayedReturn);
    delayedReturnsByPlanItem.set(planItemId, returns);
    switch (rawDelayedReturn.status) {
      case "due":
        if (
          rawDelayedReturn.openedAt !== null
          || rawDelayedReturn.completedAt !== null
          || rawDelayedReturn.retentionOutcome !== null
          || unfinishedReturnPlanItemIds.has(planItemId)
          || planItem.status !== "proof-complete"
        ) {
          return false;
        }
        unfinishedReturnPlanItemIds.add(planItemId);
        break;
      case "open": {
        const openedAt = rawDelayedReturn.openedAt;
        if (
          !isTimestamp(openedAt)
          || openedAt < dueAt
          || rawDelayedReturn.completedAt !== null
          || rawDelayedReturn.retentionOutcome !== null
          || unfinishedReturnPlanItemIds.has(planItemId)
          || planItem.status !== "proof-complete"
        ) {
          return false;
        }
        unfinishedReturnPlanItemIds.add(planItemId);
        break;
      }
      case "completed": {
        const openedAt = rawDelayedReturn.openedAt;
        const completedAt = rawDelayedReturn.completedAt;
        const retentionOutcome = rawDelayedReturn.retentionOutcome;
        if (
          !isTimestamp(openedAt)
          || !isTimestamp(completedAt)
          || openedAt < dueAt
          || completedAt < openedAt
          || (retentionOutcome !== "retained" && retentionOutcome !== "needs-more-work")
        ) {
          return false;
        }
        if (retentionOutcome === "retained") {
          if (planItem.status !== "return-complete") return false;
          retainedReturnPlanItemIds.add(planItemId);
        } else if (planItem.status === "return-complete") {
          return false;
        }
        break;
      }
    }
  }

  for (const [planItemId, planItem] of planItems) {
    switch (planItem.status) {
      case "in-progress":
        if (!activeStudyPlanItemIds.has(planItemId)) return false;
        break;
      case "practice-complete":
        if (!completedStudySessionsByPlanItem.has(planItemId)) return false;
        break;
      case "proof-complete":
        if (!proofsByPlanItem.has(planItemId)) return false;
        break;
      case "return-complete":
        if (!retainedReturnPlanItemIds.has(planItemId)) return false;
        break;
    }
  }

  for (const rawEvidence of state.progressEvidence) {
    if (!isExactRecord(rawEvidence, progressEvidenceKeys)) return false;
    const planItemId = rawEvidence.planItemId;
    const occurredAt = rawEvidence.occurredAt;
    if (
      !registerIdentifier(rawEvidence.id, identifiers)
      || !isBoundedIdentifier(planItemId)
      || !planItems.has(planItemId)
      || !isKnownValue(rawEvidence.kind, progressEvidenceKinds)
      || !isKnownValue(rawEvidence.outcome, progressEvidenceOutcomes)
      || !isTimestamp(occurredAt)
    ) {
      return false;
    }
    switch (rawEvidence.kind) {
      case "practice-completed": {
        if (rawEvidence.outcome !== "completed" && rawEvidence.outcome !== "needs-more-work") return false;
        const sessions = studySessionsByPlanItem.get(planItemId) ?? [];
        if (
          !sessions.some((session) => (
            isTimestamp(session.startedAt) && session.startedAt <= occurredAt
          ))
        ) {
          return false;
        }
        if (
          rawEvidence.outcome === "completed"
          && !sessions.some((session) => (
            session.practiceOutcome === "completed" && session.practiceCompletedAt === occurredAt
          ))
        ) {
          return false;
        }
        break;
      }
      case "independent-proof-completed": {
        if (rawEvidence.outcome !== "demonstrated" && rawEvidence.outcome !== "needs-return") return false;
        const proofs = proofsByPlanItem.get(planItemId) ?? [];
        if (!proofs.some((proof) => proof.outcome === rawEvidence.outcome && proof.completedAt === occurredAt)) {
          return false;
        }
        break;
      }
      case "delayed-return-completed": {
        if (rawEvidence.outcome !== "retained" && rawEvidence.outcome !== "needs-more-work") return false;
        const returns = delayedReturnsByPlanItem.get(planItemId) ?? [];
        if (!returns.some((delayedReturn) => (
          delayedReturn.status === "completed"
          && delayedReturn.retentionOutcome === rawEvidence.outcome
          && delayedReturn.completedAt === occurredAt
        ))) {
          return false;
        }
        break;
      }
    }
  }

  return true;
}

function invalidState<T>(): SemesterDeskResult<T> {
  return failure("invalid-input", "This Semester Desk data cannot be used.");
}

/** Validate one decoded or in-memory Semester Desk before use. */
export function validateSemesterDeskState(state: unknown): SemesterDeskResult<SemesterDeskState> {
  try {
    return isStateValid(state) ? success(state as SemesterDeskState) : invalidState();
  } catch {
    return invalidState();
  }
}

/**
 * Create one profile-bound semester desk. The supplied runtime provides all
 * timestamps and identifiers so that application code and tests remain deterministic.
 */
export function createSemesterDesk(
  input: CreateSemesterDeskInput,
  runtime: SemesterDeskRuntime,
): SemesterDeskResult<SemesterDeskState> {
  if (!nonBlank(input.profileId) || !nonBlank(input.title)) {
    return failure("invalid-input", "A semester desk needs a profile and a title.");
  }
  const createdAt = timestamp(runtime);
  if (!createdAt.ok) return createdAt;
  const id = identifier(runtime, "semester");
  if (!id.ok) return id;

  return validateSemesterDeskState({
    schemaVersion: SEMESTER_DESK_V2_SCHEMA_VERSION,
    id: id.value,
    profileId: input.profileId,
    title: input.title.trim(),
    createdAt: createdAt.value,
    updatedAt: createdAt.value,
    courses: [],
    capacity: null,
    capacityDraft: null,
    planItems: [],
    recoveryDraft: null,
    recoveryChanges: [],
    selectedNextActionId: null,
    protectedStudySessions: [],
    independentProofs: [],
    delayedReturns: [],
    progressEvidence: [],
  });
}

/**
 * Apply one explicit student action. The function never mutates the supplied
 * state, never sorts plan items, and never writes answer text into state.
 */
function transitionSemesterDeskUnchecked(
  state: SemesterDeskState,
  command: SemesterDeskCommand,
  runtime: SemesterDeskRuntime,
): SemesterDeskResult<SemesterDeskState> {
  if (state.profileId !== command.profileId) {
    return failure("profile-mismatch", "This command belongs to a different profile.");
  }
  const now = timestamp(runtime);
  if (!now.ok) return now;

  switch (command.kind) {
    case "add-course": {
      if (!nonBlank(command.code) || !nonBlank(command.title)) {
        return failure("invalid-input", "A course needs a code and a title.");
      }
      if (state.courses.some((course) => course.code === command.code.trim())) {
        return failure("already-exists", "A course with this code already exists in the semester.");
      }
      const id = identifier(runtime, "course");
      if (!id.ok) return id;
      return success({
        ...state,
        updatedAt: now.value,
        courses: [
          ...state.courses,
          {
            id: id.value,
            code: command.code.trim(),
            title: command.title.trim(),
            facts: [],
            sourceConflicts: [],
          },
        ],
      });
    }
    case "add-course-fact": {
      if (
        !nonBlank(command.label)
        || !nonBlank(command.value)
        || !nonBlank(command.sourceLabel)
        || !COURSE_FACT_STATUSES.includes(command.status)
      ) {
        return failure("invalid-input", "A course fact needs text, source, and a valid status.");
      }
      if (
        command.status === "checked"
        && (command.checkedAt === undefined || !isTimestamp(command.checkedAt))
      ) {
        return failure("invalid-input", "A checked course fact needs a valid check time.");
      }
      if (command.checkedAt !== undefined && !isTimestamp(command.checkedAt)) {
        return failure("invalid-input", "The course fact check time is invalid.");
      }
      const course = courseFor(state, command.courseId);
      if (!course.ok) return course;
      const id = identifier(runtime, "course-fact");
      if (!id.ok) return id;
      return success(replaceCourse(state, {
        ...course.value,
        facts: [
          ...course.value.facts,
          {
            id: id.value,
            label: command.label.trim(),
            value: command.value.trim(),
            status: command.status,
            sourceLabel: command.sourceLabel.trim(),
            checkedAt: command.checkedAt ?? null,
          },
        ],
      }, now.value));
    }
    case "set-course-fact-status": {
      if (!COURSE_FACT_STATUSES.includes(command.status)) {
        return failure("invalid-input", "The course fact status is invalid.");
      }
      if (
        command.status === "checked"
        && (command.checkedAt === undefined || !isTimestamp(command.checkedAt))
      ) {
        return failure("invalid-input", "A checked course fact needs a valid check time.");
      }
      if (command.checkedAt !== undefined && !isTimestamp(command.checkedAt)) {
        return failure("invalid-input", "The course fact check time is invalid.");
      }
      const course = courseFor(state, command.courseId);
      if (!course.ok) return course;
      const fact = course.value.facts.find((entry) => entry.id === command.factId);
      if (!fact) return failure("not-found", "The course fact does not exist in this course.");
      return success(replaceCourse(state, {
        ...course.value,
        facts: course.value.facts.map((entry) => (
          entry.id === command.factId
            ? { ...entry, status: command.status, checkedAt: command.checkedAt ?? entry.checkedAt }
            : entry
        )),
      }, now.value));
    }
    case "record-source-conflict": {
      if (!nonBlank(command.summary) || command.factIds.length < 2) {
        return failure("invalid-input", "A source conflict needs two facts and a summary.");
      }
      const course = courseFor(state, command.courseId);
      if (!course.ok) return course;
      const uniqueFactIds = [...new Set(command.factIds)];
      if (
        uniqueFactIds.length !== command.factIds.length
        || uniqueFactIds.some((factId) => !course.value.facts.some((fact) => fact.id === factId))
      ) {
        return failure("invalid-input", "A source conflict must reference distinct facts from this course.");
      }
      const id = identifier(runtime, "source-conflict");
      if (!id.ok) return id;
      return success(replaceCourse(state, {
        ...course.value,
        sourceConflicts: [
          ...course.value.sourceConflicts,
          {
            id: id.value,
            factIds: uniqueFactIds,
            summary: command.summary.trim(),
            status: "open",
            detectedAt: now.value,
            reviewedAt: null,
          },
        ],
      }, now.value));
    }
    case "review-source-conflict": {
      const course = courseFor(state, command.courseId);
      if (!course.ok) return course;
      const conflict = course.value.sourceConflicts.find((entry) => entry.id === command.conflictId);
      if (!conflict) return failure("not-found", "The source conflict does not exist in this course.");
      if (conflict.status === "reviewed") {
        return failure("invalid-transition", "The source conflict is already reviewed.");
      }
      return success(replaceCourse(state, {
        ...course.value,
        sourceConflicts: course.value.sourceConflicts.map((entry) => (
          entry.id === command.conflictId
            ? { ...entry, status: "reviewed", reviewedAt: now.value }
            : entry
        )),
      }, now.value));
    }
    case "draft-capacity": {
      if (!Number.isInteger(command.availableMinutes) || command.availableMinutes < 0) {
        return failure("invalid-input", "Capacity must be zero or more whole minutes.");
      }
      const id = identifier(runtime, "capacity-draft");
      if (!id.ok) return id;
      const capacityDraft: CapacityDraft = {
        id: id.value,
        availableMinutes: command.availableMinutes,
        draftedAt: now.value,
      };
      return success({ ...state, updatedAt: now.value, capacityDraft });
    }
    case "confirm-capacity": {
      if (!state.capacityDraft) {
        return failure("capacity-draft-missing", "Draft capacity before confirmation.");
      }
      return success({
        ...state,
        updatedAt: now.value,
        capacity: {
          availableMinutes: state.capacityDraft.availableMinutes,
          declaredAt: now.value,
        },
        capacityDraft: null,
      });
    }
    case "add-plan-item": {
      if (!nonBlank(command.title) || !isDateOnly(command.date) || !Number.isInteger(command.minutes) || command.minutes < 1) {
        return failure("invalid-input", "A plan item needs a title, date, and positive whole minutes.");
      }
      const course = courseFor(state, command.courseId);
      if (!course.ok) return course;
      const id = identifier(runtime, "plan-item");
      if (!id.ok) return id;
      return success({
        ...state,
        updatedAt: now.value,
        planItems: [
          ...state.planItems,
          {
            id: id.value,
            courseId: course.value.id,
            title: command.title.trim(),
            originalDate: command.date,
            currentDate: command.date,
            originalMinutes: command.minutes,
            currentMinutes: command.minutes,
            status: "planned",
          },
        ],
      });
    }
    case "prepare-recovery": {
      if (!nonBlank(command.summary)) {
        return failure("invalid-input", "A recovery draft needs a summary.");
      }
      if (state.recoveryDraft) {
        return failure("invalid-transition", "Confirm or replace the current recovery draft first.");
      }
      const recoverableItems = state.planItems.filter((item) => item.status === "planned");
      if (recoverableItems.length === 0) {
        return failure("invalid-transition", "There is no planned work to recover.");
      }
      const uniqueIds = new Set(command.decisions.map((decision) => decision.planItemId));
      if (
        uniqueIds.size !== command.decisions.length
        || uniqueIds.size !== recoverableItems.length
        || recoverableItems.some((item) => !uniqueIds.has(item.id))
      ) {
        return failure("recovery-decision-invalid", "Recovery must state one explicit decision for every planned item.");
      }
      const decisions: RecoveryDecision[] = [];
      for (const input of command.decisions) {
        const item = recoverableItems.find((entry) => entry.id === input.planItemId);
        if (!item) {
          return failure("recovery-decision-invalid", "Recovery cannot include work that is not currently planned.");
        }
        const decision = recoveryDecision(item, input);
        if (!decision.ok) return decision;
        decisions.push(decision.value);
      }
      const id = identifier(runtime, "recovery-draft");
      if (!id.ok) return id;
      return success({
        ...state,
        updatedAt: now.value,
        recoveryDraft: {
          id: id.value,
          summary: command.summary.trim(),
          createdAt: now.value,
          decisions,
        },
      });
    }
    case "confirm-recovery": {
      if (!state.recoveryDraft) {
        return failure("recovery-draft-missing", "Prepare a recovery draft before confirmation.");
      }
      const recoveryDraft = state.recoveryDraft;
      const decisions = new Map(recoveryDraft.decisions.map((decision) => [decision.planItemId, decision]));
      const changes: RecoveryChange[] = [];
      const planItems: SemesterPlanItem[] = [];
      for (const item of state.planItems) {
        const decision = decisions.get(item.id);
        if (!decision) {
          planItems.push(item);
          continue;
        }
        const next = applyRecoveryDecision(item, decision);
        const id = identifier(runtime, "recovery-change");
        if (!id.ok) return id;
        changes.push({
          id: id.value,
          recoveryDraftId: recoveryDraft.id,
          planItemId: item.id,
          outcome: decision.outcome,
          reason: decision.reason,
          previousDate: item.currentDate,
          currentDate: next.currentDate,
          previousMinutes: item.currentMinutes,
          currentMinutes: next.currentMinutes,
          recordedAt: now.value,
        });
        planItems.push(next);
      }
      const recoveredState = { ...state, planItems };
      const selectedItem = state.selectedNextActionId
        ? planItems.find((item) => item.id === state.selectedNextActionId)
        : null;
      const selectedNextActionId = selectedItem && canActOnItem(recoveredState, selectedItem).ok
        ? selectedItem.id
        : null;
      return success({
        ...state,
        updatedAt: now.value,
        planItems,
        recoveryChanges: [...state.recoveryChanges, ...changes],
        recoveryDraft: null,
        selectedNextActionId,
      });
    }
    case "choose-next-action": {
      if (state.recoveryDraft) {
        return failure("invalid-transition", "Confirm the open recovery plan before you choose work.");
      }
      const item = planItemFor(state, command.planItemId);
      if (!item.ok) return item;
      const actionable = canActOnItem(state, item.value);
      if (!actionable.ok) return actionable;
      return success({ ...state, updatedAt: now.value, selectedNextActionId: actionable.value.id });
    }
    case "resume-deferred-item": {
      const item = planItemFor(state, command.planItemId);
      if (!item.ok) return item;
      if (item.value.status !== "deferred") {
        return failure("invalid-transition", "Only deferred work can return to the active semester plan.");
      }
      return success(replacePlanItem(state, { ...item.value, status: "planned" }, now.value));
    }
    case "start-protected-study": {
      if (state.recoveryDraft) {
        return failure("invalid-transition", "Confirm the open recovery plan before protected study.");
      }
      if (state.capacityDraft) {
        return failure("invalid-transition", "Confirm the available time before protected study.");
      }
      if (state.selectedNextActionId !== command.planItemId) {
        return failure("next-action-required", "Choose this item as the next action before protected study.");
      }
      if (state.protectedStudySessions.some((session) => session.status === "active")) {
        return failure("invalid-transition", "Complete the active protected study before starting another one.");
      }
      const item = planItemFor(state, command.planItemId);
      if (!item.ok) return item;
      const actionable = canActOnItem(state, item.value);
      if (!actionable.ok) return actionable;
      const id = identifier(runtime, "study-session");
      if (!id.ok) return id;
      const nextItem: SemesterPlanItem = { ...actionable.value, status: "in-progress" };
      const updated = replacePlanItem(state, nextItem, now.value);
      return success({
        ...updated,
        protectedStudySessions: [
          ...updated.protectedStudySessions,
          {
            id: id.value,
            planItemId: nextItem.id,
            status: "active",
            startedAt: now.value,
            practiceCompletedAt: null,
            practiceOutcome: null,
          },
        ],
      });
    }
    case "complete-practice": {
      if (!isPracticeOutcome(command.outcome)) {
        return failure("invalid-input", "The practice outcome is invalid.");
      }
      const session = state.protectedStudySessions.find((entry) => entry.id === command.studySessionId);
      if (!session) return failure("not-found", "The protected study session does not exist.");
      if (session.status !== "active") {
        return failure("invalid-transition", "Practice is already complete for this protected study.");
      }
      const item = planItemFor(state, session.planItemId);
      if (!item.ok) return item;
      if (item.value.status !== "in-progress") {
        return failure("invalid-transition", "This plan item is not in protected study.");
      }
      const evidenceId = identifier(runtime, "progress-evidence");
      if (!evidenceId.ok) return evidenceId;
      const practiceComplete = command.outcome === "completed";
      const updated = replacePlanItem(
        state,
        {
          ...item.value,
          status: practiceComplete ? "practice-complete" : "in-progress",
        },
        now.value,
      );
      return success(appendEvidence({
        ...updated,
        protectedStudySessions: updated.protectedStudySessions.map((entry) => (
          entry.id === session.id
            ? {
              ...entry,
              status: practiceComplete ? "practice-complete" : "active",
              practiceCompletedAt: practiceComplete ? now.value : null,
              practiceOutcome: command.outcome,
            }
            : entry
        )),
      }, {
        id: evidenceId.value,
        planItemId: item.value.id,
        kind: "practice-completed",
        outcome: command.outcome,
        occurredAt: now.value,
      }));
    }
    case "submit-independent-proof": {
      if (!isProofOutcome(command.outcome)) {
        return failure("invalid-input", "The independent proof outcome is invalid.");
      }
      const item = planItemFor(state, command.planItemId);
      if (!item.ok) return item;
      if (item.value.status !== "practice-complete") {
        return failure("practice-required", "Complete protected practice before independent proof.");
      }
      const proofId = identifier(runtime, "proof");
      if (!proofId.ok) return proofId;
      const evidenceId = identifier(runtime, "progress-evidence");
      if (!evidenceId.ok) return evidenceId;
      const proof: IndependentProof = {
        id: proofId.value,
        planItemId: item.value.id,
        outcome: command.outcome,
        completedAt: now.value,
      };
      const updated = replacePlanItem(state, { ...item.value, status: "proof-complete" }, now.value);
      return success(appendEvidence({
        ...updated,
        independentProofs: [...updated.independentProofs, proof],
      }, {
        id: evidenceId.value,
        planItemId: item.value.id,
        kind: "independent-proof-completed",
        outcome: command.outcome,
        occurredAt: now.value,
      }));
    }
    case "schedule-delayed-return": {
      if (!isTimestamp(command.dueAt) || Date.parse(command.dueAt) <= Date.parse(now.value)) {
        return failure("invalid-input", "A delayed return needs a future due time.");
      }
      const item = planItemFor(state, command.planItemId);
      if (!item.ok) return item;
      if (item.value.status !== "proof-complete") {
        return failure("proof-required", "Complete independent proof before a delayed return.");
      }
      if (state.delayedReturns.some((entry) => entry.planItemId === item.value.id && entry.status !== "completed")) {
        return failure("invalid-transition", "This plan item already has an unfinished delayed return.");
      }
      const id = identifier(runtime, "delayed-return");
      if (!id.ok) return id;
      const delayedReturn: DelayedReturn = {
        id: id.value,
        planItemId: item.value.id,
        dueAt: command.dueAt,
        status: "due",
        openedAt: null,
        completedAt: null,
        retentionOutcome: null,
      };
      return success({
        ...state,
        updatedAt: now.value,
        delayedReturns: [...state.delayedReturns, delayedReturn],
      });
    }
    case "open-delayed-return": {
      const delayedReturn = state.delayedReturns.find((entry) => entry.id === command.delayedReturnId);
      if (!delayedReturn) return failure("not-found", "The delayed return does not exist.");
      if (delayedReturn.status !== "due") {
        return failure("invalid-transition", "Only a due delayed return can open.");
      }
      if (Date.parse(now.value) < Date.parse(delayedReturn.dueAt)) {
        return failure("return-not-due", "This delayed return is not due yet.");
      }
      return success({
        ...state,
        updatedAt: now.value,
        delayedReturns: state.delayedReturns.map((entry) => (
          entry.id === delayedReturn.id
            ? { ...entry, status: "open", openedAt: now.value }
            : entry
        )),
      });
    }
    case "complete-delayed-return": {
      if (!isRetentionOutcome(command.outcome)) {
        return failure("invalid-input", "The delayed return outcome is invalid.");
      }
      const delayedReturn = state.delayedReturns.find((entry) => entry.id === command.delayedReturnId);
      if (!delayedReturn) return failure("not-found", "The delayed return does not exist.");
      if (delayedReturn.status !== "open") {
        return failure("return-not-open", "Open the delayed return before completion.");
      }
      const item = planItemFor(state, delayedReturn.planItemId);
      if (!item.ok) return item;
      const evidenceId = identifier(runtime, "progress-evidence");
      if (!evidenceId.ok) return evidenceId;
      const updated = replacePlanItem(
        state,
        {
          ...item.value,
          status: command.outcome === "retained" ? "return-complete" : "planned",
        },
        now.value,
      );
      const completedReturn: SemesterDeskState = {
        ...updated,
        selectedNextActionId:
          command.outcome === "retained"
          && updated.selectedNextActionId === item.value.id
            ? null
            : updated.selectedNextActionId,
        delayedReturns: updated.delayedReturns.map((entry) => (
          entry.id === delayedReturn.id
            ? {
              ...entry,
              status: "completed",
              completedAt: now.value,
              retentionOutcome: command.outcome,
            }
            : entry
        )),
      };
      return success(appendEvidence(completedReturn, {
        id: evidenceId.value,
        planItemId: item.value.id,
        kind: "delayed-return-completed",
        outcome: command.outcome,
        occurredAt: now.value,
      }));
    }
  }
}

/**
 * Apply one explicit student action only when the supplied and resulting state
 * both satisfy the Semester Desk integrity rules.
 */
export function transitionSemesterDesk(
  state: SemesterDeskState,
  command: SemesterDeskCommand,
  runtime: SemesterDeskRuntime,
): SemesterDeskResult<SemesterDeskState> {
  const validatedInput = validateSemesterDeskState(state);
  if (!validatedInput.ok) return validatedInput;
  const result = transitionSemesterDeskUnchecked(validatedInput.value, command, runtime);
  return result.ok ? validateSemesterDeskState(result.value) : result;
}

/**
 * Return a copy of plan items in their authored order. The engine never applies
 * a priority sort, hides a deferred item, or calculates an implicit ordering.
 */
export function orderedPlanItems(state: SemesterDeskState): readonly SemesterPlanItem[] {
  return state.planItems.map((item) => ({ ...item }));
}

/** Return answer-free progress evidence for a learner-facing progress view. */
export function progressEvidenceFor(state: SemesterDeskState): readonly ProgressEvidence[] {
  return state.progressEvidence.map((evidence) => ({
    id: evidence.id,
    planItemId: evidence.planItemId,
    kind: evidence.kind,
    outcome: evidence.outcome,
    occurredAt: evidence.occurredAt,
  }));
}
