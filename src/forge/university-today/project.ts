import { types as nodeUtilTypes } from "node:util";
import { ZodError } from "zod";

import {
  buildCourseSourceGoalContext,
  type CourseSourceScopeV1,
} from "../course-sources";
import {
  projectNextAction,
  validateLearningPathRevisionIntegrity,
} from "../continuity";
import { boundedJsonSnapshot } from "../bounded-json-snapshot";
import { deepFreeze } from "../deep-freeze";
import { canonicalJson, sha256Digest } from "../events";
import {
  UNIVERSITY_TODAY_PROJECTION_SCHEMA_VERSION,
  type UniversityTermContextV1,
  type UniversityTodayAction,
  type UniversityTodayAuthority,
  type UniversityTodayCapacitySummary,
  type UniversityTodayIssue,
  type UniversityTodayProjectionV1,
  type UniversityTodaySourceSummary,
  universityTodayRequestSchema,
} from "./contracts";

const MAXIMUM_STRING_LENGTH = 4_096;
const MAXIMUM_SERIALIZED_JSON_BYTES = 512 * 1_024;

const AUTHORITY = deepFreeze({
  projectionClass: "fixture_only_research_projection",
  identityScopeAuthority: "caller_asserted_fixture_only",
  tenantIsolationAuthority: "not_established",
  rightsEnforcementAuthority: "not_established",
  institutionalCompleteness: "not_established",
  actionSelectionAuthority: "existing_learner_accepted_reviewed_path",
  sourceRecommendationAllowed: false,
  pathActivationAllowed: false,
  sessionStartAllowed: false,
  persistenceAllowed: false,
  eventEmissionAllowed: false,
  externalSideEffectsAllowed: false,
} satisfies UniversityTodayAuthority);

function sameScope(left: CourseSourceScopeV1, right: CourseSourceScopeV1): boolean {
  return left.ownerUserId === right.ownerUserId
    && left.tenantId === right.tenantId
    && left.termId === right.termId
    && left.courseId === right.courseId;
}

function orderedIssues(issues: readonly UniversityTodayIssue[]): readonly UniversityTodayIssue[] {
  return [...issues].sort((left, right) => {
    const codeOrder = left.code.localeCompare(right.code);
    return codeOrder !== 0 ? codeOrder : left.path.localeCompare(right.path);
  });
}

function invalidProjection(issues: readonly UniversityTodayIssue[]): Readonly<UniversityTodayProjectionV1> {
  return deepFreeze({
    schemaVersion: UNIVERSITY_TODAY_PROJECTION_SCHEMA_VERSION,
    status: "invalid",
    scope: null,
    asOf: null,
    termLabel: null,
    courseLabel: null,
    timeZone: null,
    authority: AUTHORITY,
    source: null,
    capacity: null,
    action: null,
    pathState: null,
    recovery: "repair_fixture_input",
    issues: orderedIssues(issues),
    projectionDigest: null,
  });
}

function zodIssues(error: ZodError): UniversityTodayIssue[] {
  return error.issues.map((entry) => ({
    code: "schema.invalid",
    path: entry.path.join("."),
    message: entry.message,
  }));
}

function capacityFor(context: UniversityTermContextV1): UniversityTodayCapacitySummary {
  const { availableMinutes } = context.studyWindow;
  const { minutesLow, minutesHigh } = context.effortEstimate;
  const state = availableMinutes >= minutesHigh
    ? "fits_declared_window"
    : availableMinutes >= minutesLow
      ? "tight_declared_window"
      : "insufficient_declared_window";
  return {
    state,
    startsAt: context.studyWindow.startsAt,
    endsAt: context.studyWindow.endsAt,
    availableMinutes,
    energy: context.studyWindow.energy,
    effortMinutesLow: minutesLow,
    effortMinutesHigh: minutesHigh,
    effortBasis: context.effortEstimate.basis,
  };
}

async function signedProjection(
  projection: Omit<UniversityTodayProjectionV1, "projectionDigest">,
): Promise<Readonly<UniversityTodayProjectionV1>> {
  return deepFreeze({
    ...projection,
    projectionDigest: await sha256Digest(canonicalJson(projection)),
  });
}

/**
 * Composes an already accepted learning-path action, reviewed connected-source
 * context, and learner-declared fixture capacity. It neither selects an action
 * from course facts nor performs a side effect.
 */
export async function projectUniversityToday(
  value: unknown,
): Promise<Readonly<UniversityTodayProjectionV1>> {
  try {
    let detached: unknown;
    try {
      detached = boundedJsonSnapshot(value, {
        maximumStringLength: MAXIMUM_STRING_LENGTH,
        maximumSerializedJsonBytes: MAXIMUM_SERIALIZED_JSON_BYTES,
        rejectObject: nodeUtilTypes.isProxy,
        allowNullPrototypeObjects: true,
      });
    } catch {
      return invalidProjection([{
        code: "schema.invalid",
        path: "",
        message: "The University Today request must be bounded accessor-free plain JSON.",
      }]);
    }
    const parsedRequest = universityTodayRequestSchema.safeParse(detached);
    if (!parsedRequest.success) return invalidProjection(zodIssues(parsedRequest.error));
    const request = parsedRequest.data;
    const { context } = request;

    const [goalContextResult, validPath] = await Promise.all([
      buildCourseSourceGoalContext({
        goalRef: context.goalRef,
        reconciliationRequest: request.reconciliationRequest,
      }),
      validateLearningPathRevisionIntegrity(request.pathRevision),
    ]);

    const issues: UniversityTodayIssue[] = [];
    if (
      goalContextResult.status === "unavailable"
      || goalContextResult.context === null
      || goalContextResult.reconciliation.scope === null
    ) {
      issues.push({
        code: "source.invalid",
        path: "reconciliationRequest",
        message: "The connected-source projection is unavailable or invalid.",
      });
    } else {
      if (!sameScope(goalContextResult.context.scope, context.scope)) {
        issues.push({
          code: "source.scope_mismatch",
          path: "context.scope",
          message: "The term context and connected-source projection must have the same owner, tenant, term, and course scope.",
        });
      }
      if (goalContextResult.reconciliation.asOf !== context.asOf) {
        issues.push({
          code: "source.as_of_mismatch",
          path: "context.asOf",
          message: "The term context and connected-source projection must use the same explicit time.",
        });
      }
    }
    if (validPath === null) {
      issues.push({
        code: "path.integrity_invalid",
        path: "pathRevision",
        message: "The learning path is malformed or its immutable revision digest does not match.",
      });
    } else {
      if (validPath.goalRef.goalId !== context.goalRef.goalId) {
        issues.push({
          code: "path.goal_mismatch",
          path: "pathRevision.goalRef.goalId",
          message: "The accepted path must belong to the exact learner-owned goal in this term context.",
        });
      }
      if (
        context.effortEstimate.pathId !== validPath.pathId
        || context.effortEstimate.pathRevisionId !== validPath.revisionId
      ) {
        issues.push({
          code: "effort.path_mismatch",
          path: "context.effortEstimate",
          message: "The effort range must bind the exact immutable path revision.",
        });
      }
      if (!validPath.nodes.some((node) => node.nodeId === context.effortEstimate.nodeId)) {
        issues.push({
          code: "effort.node_mismatch",
          path: "context.effortEstimate.nodeId",
          message: "The effort range must bind a node in the exact immutable path revision.",
        });
      }
    }
    if (issues.length > 0 || validPath === null || goalContextResult.context === null) {
      return invalidProjection(issues);
    }

    const pathState = await projectNextAction(validPath, request.activityStates);
    const source: UniversityTodaySourceSummary = {
      reconciliationStatus: goalContextResult.reconciliation.status as "review_required" | "connected_sources_reviewed",
      coverageState: goalContextResult.reconciliation.coverage.state,
      sourceAuthenticity: "not_established",
      institutionalCompleteness: "not_established",
      currentSourceCount: goalContextResult.reconciliation.freshness
        .filter((entry) => entry.state === "current_within_declared_window").length,
      staleOrUnknownSourceCount: goalContextResult.reconciliation.freshness
        .filter((entry) => entry.state !== "current_within_declared_window").length,
      unresolvedConflictCount: goalContextResult.reconciliation.conflicts.length,
      reviewedContextFactCount: goalContextResult.context.facts.length,
      facts: goalContextResult.context.facts.map((entry) => ({
        claimKey: entry.claimKey,
        fact: entry.fact,
        factAuthority: entry.factAuthority,
        effectiveAssessmentMode: entry.effectiveAssessmentMode,
      })),
    };
    const capacity = capacityFor(context);
    const shared = {
      schemaVersion: UNIVERSITY_TODAY_PROJECTION_SCHEMA_VERSION,
      scope: context.scope,
      asOf: context.asOf,
      termLabel: context.termLabel,
      courseLabel: context.courseLabel,
      timeZone: context.timeZone,
      authority: AUTHORITY,
      source,
      capacity,
      pathState,
      issues: [] as const,
    };

    if (pathState.kind === "complete") {
      return signedProjection({
        ...shared,
        status: "complete",
        action: null,
        recovery: "accepted_path_complete",
      });
    }
    if (pathState.kind === "blocked") {
      return signedProjection({
        ...shared,
        status: "blocked",
        action: null,
        recovery: "repair_or_replace_accepted_path",
      });
    }
    if (pathState.nodeId !== context.effortEstimate.nodeId) {
      return invalidProjection([{
        code: "effort.node_mismatch",
        path: "context.effortEstimate.nodeId",
        message: "The effort range does not bind the exact projected next-action node.",
      }]);
    }

    const node = validPath.nodes.find((entry) => entry.nodeId === pathState.nodeId)!;
    const action: UniversityTodayAction = {
      pathId: pathState.pathId,
      pathRevisionId: pathState.pathRevisionId,
      nodeId: pathState.nodeId,
      title: node.title,
      objective: node.objective,
      activity: pathState.activity,
      state: pathState.state,
      selectedBecause: "next_in_existing_learner_accepted_path",
      selectedFromCourseSourceFacts: false,
      startAllowedFromThisProjection: false,
    };

    if (source.reconciliationStatus !== "connected_sources_reviewed") {
      return signedProjection({
        ...shared,
        status: "source_review_required",
        action: null,
        recovery: "review_connected_source_copies",
      });
    }
    if (capacity.state === "insufficient_declared_window") {
      return signedProjection({
        ...shared,
        status: "capacity_conflict",
        action,
        recovery: "learner_replan_required",
      });
    }
    if (capacity.state === "tight_declared_window") {
      return signedProjection({
        ...shared,
        status: "learner_choice_required",
        action,
        recovery: "learner_replan_required",
      });
    }
    return signedProjection({
      ...shared,
      status: "ready",
      action,
      recovery: "inspect_existing_accepted_action",
    });
  } catch {
    return invalidProjection([{
      code: "projection.unexpected",
      path: "",
      message: "The fixture projection failed closed before producing a usable action.",
    }]);
  }
}
