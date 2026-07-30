import { z } from "zod";

import {
  courseSourceGoalRefSchema,
  courseSourceScopeSchema,
  type CourseSourceFactV1,
  type CourseSourceScopeV1,
} from "../course-sources";
import type { NextActionProjectionV1, PathActivityV1 } from "../continuity";

z.config({ jitless: true });

export const UNIVERSITY_TERM_CONTEXT_SCHEMA_VERSION = "university-term-context.v1" as const;
export const UNIVERSITY_TODAY_REQUEST_SCHEMA_VERSION = "university-today-request.v1" as const;
export const UNIVERSITY_TODAY_PROJECTION_SCHEMA_VERSION = "university-today-projection.v1" as const;

const timestampSchema = z.string().datetime({ offset: true });
const boundedLabelSchema = z.string().trim().min(1).max(240);
const pathIdSchema = z.string().trim().max(160).regex(/^path\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/);
const pathRevisionIdSchema = z.string().trim().max(180).regex(/^path-revision\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/);
const nodeIdSchema = z.string().trim().max(160).regex(/^path-node\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/);

export const universityTermContextSchema = z.strictObject({
  schemaVersion: z.literal(UNIVERSITY_TERM_CONTEXT_SCHEMA_VERSION),
  goalRef: courseSourceGoalRefSchema,
  scope: courseSourceScopeSchema,
  asOf: timestampSchema,
  termLabel: boundedLabelSchema,
  courseLabel: boundedLabelSchema,
  timeZone: z.string().trim().min(1).max(120),
  studyWindow: z.strictObject({
    startsAt: timestampSchema,
    endsAt: timestampSchema,
    availableMinutes: z.number().int().min(0).max(480),
    energy: z.enum(["low", "steady", "high"]),
    declaredBy: z.literal("learner_fixture"),
  }),
  effortEstimate: z.strictObject({
    pathId: pathIdSchema,
    pathRevisionId: pathRevisionIdSchema,
    nodeId: nodeIdSchema,
    minutesLow: z.number().int().min(5).max(240),
    minutesHigh: z.number().int().min(5).max(240),
    basis: z.literal("fixture_authored"),
  }),
}).superRefine((context, refinement) => {
  const startsAt = Date.parse(context.studyWindow.startsAt);
  const endsAt = Date.parse(context.studyWindow.endsAt);
  const asOf = Date.parse(context.asOf);
  if (endsAt <= startsAt) {
    refinement.addIssue({
      code: "custom",
      path: ["studyWindow", "endsAt"],
      message: "The study window must end after it starts.",
    });
  }
  if (asOf < startsAt || asOf >= endsAt) {
    refinement.addIssue({
      code: "custom",
      path: ["asOf"],
      message: "The explicit projection time must fall inside the declared study window.",
    });
  }
  const windowMinutes = Math.floor((endsAt - startsAt) / 60_000);
  if (context.studyWindow.availableMinutes > windowMinutes) {
    refinement.addIssue({
      code: "custom",
      path: ["studyWindow", "availableMinutes"],
      message: "Available minutes cannot exceed the declared study window.",
    });
  }
  if (context.effortEstimate.minutesHigh < context.effortEstimate.minutesLow) {
    refinement.addIssue({
      code: "custom",
      path: ["effortEstimate", "minutesHigh"],
      message: "The high effort bound must not be lower than the low bound.",
    });
  }
});
export type UniversityTermContextV1 = z.infer<typeof universityTermContextSchema>;

export const universityTodayRequestSchema = z.strictObject({
  schemaVersion: z.literal(UNIVERSITY_TODAY_REQUEST_SCHEMA_VERSION),
  context: universityTermContextSchema,
  reconciliationRequest: z.unknown(),
  pathRevision: z.unknown(),
  activityStates: z.array(z.unknown()).max(128),
});
export type UniversityTodayRequestV1 = z.infer<typeof universityTodayRequestSchema>;

export const UNIVERSITY_TODAY_ISSUE_CODES = Object.freeze([
  "schema.invalid",
  "source.invalid",
  "source.as_of_mismatch",
  "source.scope_mismatch",
  "path.integrity_invalid",
  "path.goal_mismatch",
  "effort.path_mismatch",
  "effort.node_mismatch",
  "projection.unexpected",
] as const);
export type UniversityTodayIssueCode = (typeof UNIVERSITY_TODAY_ISSUE_CODES)[number];

export interface UniversityTodayIssue {
  readonly code: UniversityTodayIssueCode;
  readonly path: string;
  readonly message: string;
}

export interface UniversityTodayAuthority {
  readonly projectionClass: "fixture_only_research_projection";
  readonly identityScopeAuthority: "caller_asserted_fixture_only";
  readonly tenantIsolationAuthority: "not_established";
  readonly rightsEnforcementAuthority: "not_established";
  readonly institutionalCompleteness: "not_established";
  readonly actionSelectionAuthority: "existing_learner_accepted_reviewed_path";
  readonly sourceRecommendationAllowed: false;
  readonly pathActivationAllowed: false;
  readonly sessionStartAllowed: false;
  readonly persistenceAllowed: false;
  readonly eventEmissionAllowed: false;
  readonly externalSideEffectsAllowed: false;
}

export interface UniversityTodaySourceSummary {
  readonly reconciliationStatus: "review_required" | "connected_sources_reviewed";
  readonly coverageState: "unknown" | "partial" | "connected_sources_reviewed";
  readonly sourceAuthenticity: "not_established";
  readonly institutionalCompleteness: "not_established";
  readonly currentSourceCount: number;
  readonly staleOrUnknownSourceCount: number;
  readonly unresolvedConflictCount: number;
  readonly reviewedContextFactCount: number;
  readonly facts: readonly {
    readonly claimKey: string;
    readonly fact: CourseSourceFactV1;
    readonly factAuthority: "learner_connected_source_copy" | "student_entered_correction";
    readonly effectiveAssessmentMode: "restricted_assessment" | null;
  }[];
}

export interface UniversityTodayCapacitySummary {
  readonly state: "fits_declared_window" | "tight_declared_window" | "insufficient_declared_window";
  readonly startsAt: string;
  readonly endsAt: string;
  readonly availableMinutes: number;
  readonly energy: "low" | "steady" | "high";
  readonly effortMinutesLow: number;
  readonly effortMinutesHigh: number;
  readonly effortBasis: "fixture_authored";
}

export interface UniversityTodayAction {
  readonly pathId: string;
  readonly pathRevisionId: string;
  readonly nodeId: string;
  readonly title: string;
  readonly objective: string;
  readonly activity: Extract<PathActivityV1, { runnable: true }>;
  readonly state: Extract<NextActionProjectionV1, { kind: "action" }>["state"];
  readonly selectedBecause: "next_in_existing_learner_accepted_path";
  readonly selectedFromCourseSourceFacts: false;
  readonly startAllowedFromThisProjection: false;
}

export type UniversityTodayProjectionStatus =
  | "invalid"
  | "source_review_required"
  | "capacity_conflict"
  | "learner_choice_required"
  | "ready"
  | "complete"
  | "blocked";

export interface UniversityTodayProjectionV1 {
  readonly schemaVersion: typeof UNIVERSITY_TODAY_PROJECTION_SCHEMA_VERSION;
  readonly status: UniversityTodayProjectionStatus;
  readonly scope: CourseSourceScopeV1 | null;
  readonly asOf: string | null;
  readonly termLabel: string | null;
  readonly courseLabel: string | null;
  readonly timeZone: string | null;
  readonly authority: UniversityTodayAuthority;
  readonly source: UniversityTodaySourceSummary | null;
  readonly capacity: UniversityTodayCapacitySummary | null;
  readonly action: UniversityTodayAction | null;
  readonly pathState: NextActionProjectionV1 | null;
  readonly recovery:
    | "repair_fixture_input"
    | "review_connected_source_copies"
    | "learner_replan_required"
    | "inspect_existing_accepted_action"
    | "accepted_path_complete"
    | "repair_or_replace_accepted_path";
  readonly issues: readonly UniversityTodayIssue[];
  readonly projectionDigest: string | null;
}
