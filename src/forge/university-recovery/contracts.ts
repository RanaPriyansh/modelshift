import { z } from "zod";

import type {
  CourseSourceFactV1,
  CourseSourceScopeV1,
} from "../course-sources";

z.config({ jitless: true });

export const UNIVERSITY_RECOVERY_REQUEST_SCHEMA_VERSION = "university-recovery-request.v1" as const;
export const UNIVERSITY_RECOVERY_ITEM_SCHEMA_VERSION = "university-recovery-item.v1" as const;
export const UNIVERSITY_RECOVERY_PROJECTION_SCHEMA_VERSION = "university-recovery-projection.v1" as const;

const timestampSchema = z.string().datetime({ offset: true });
const uuidSchema = z.string().uuid();
const termIdSchema = z.string().trim().max(160).regex(/^term\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/);
const courseIdSchema = z.string().trim().max(160).regex(/^course\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/);
const itemIdSchema = z.string().trim().max(180).regex(/^recovery-item\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/);
const candidateIdSchema = z.string().trim().max(180).regex(/^course-source-candidate\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/);
const boundedLabelSchema = z.string().trim().min(1).max(240);

export const universityRecoveryTermScopeSchema = z.strictObject({
  ownerUserId: uuidSchema,
  tenantId: uuidSchema,
  termId: termIdSchema,
});
export type UniversityRecoveryTermScopeV1 = z.infer<typeof universityRecoveryTermScopeSchema>;

export const universityRecoveryCourseInputSchema = z.strictObject({
  courseId: courseIdSchema,
  courseLabel: boundedLabelSchema,
  reconciliationRequest: z.unknown(),
});
export type UniversityRecoveryCourseInputV1 = z.infer<typeof universityRecoveryCourseInputSchema>;

export const universityRecoveryItemSchema = z.strictObject({
  schemaVersion: z.literal(UNIVERSITY_RECOVERY_ITEM_SCHEMA_VERSION),
  itemId: itemIdSchema,
  courseId: courseIdSchema,
  deadlineCandidateId: candidateIdSchema,
  learnerDisposition: z.enum(["required", "negotiable", "deferrable", "no_longer_useful"]),
  learningEssential: z.strictObject({
    value: z.boolean(),
    declaredBy: z.literal("learner_fixture"),
  }),
  effort: z.strictObject({
    minutesLow: z.number().int().min(5).max(960),
    minutesHigh: z.number().int().min(5).max(960),
    basis: z.literal("fixture_authored"),
  }),
  dependencyItemIds: z.array(itemIdSchema).max(16).superRefine((values, context) => {
    const seen = new Set<string>();
    values.forEach((value, index) => {
      if (seen.has(value)) {
        context.addIssue({
          code: "custom",
          path: [index],
          message: "A recovery item cannot repeat a dependency.",
        });
      }
      seen.add(value);
    });
  }),
  humanRoute: z.strictObject({
    owner: z.enum(["instructor", "academic_advisor", "student_support"]),
    declaredBy: z.literal("learner_fixture"),
  }).nullable(),
}).superRefine((item, context) => {
  if (item.effort.minutesHigh < item.effort.minutesLow) {
    context.addIssue({
      code: "custom",
      path: ["effort", "minutesHigh"],
      message: "The high effort bound must not be lower than the low bound.",
    });
  }
  if (item.dependencyItemIds.includes(item.itemId)) {
    context.addIssue({
      code: "custom",
      path: ["dependencyItemIds"],
      message: "A recovery item cannot depend on itself.",
    });
  }
  if (item.learnerDisposition === "no_longer_useful" && item.learningEssential.value) {
    context.addIssue({
      code: "custom",
      path: ["learningEssential", "value"],
      message: "An item cannot be both no longer useful and essential for learning.",
    });
  }
});
export type UniversityRecoveryItemV1 = z.infer<typeof universityRecoveryItemSchema>;

export const universityRecoveryRequestSchema = z.strictObject({
  schemaVersion: z.literal(UNIVERSITY_RECOVERY_REQUEST_SCHEMA_VERSION),
  scope: universityRecoveryTermScopeSchema,
  asOf: timestampSchema,
  termLabel: boundedLabelSchema,
  timeZone: z.string().trim().min(1).max(120),
  declaredChange: z.strictObject({
    kind: z.enum(["schedule_changed", "capacity_changed", "source_changed", "estimate_changed", "other"]),
    declaredBy: z.literal("learner_fixture"),
  }),
  recoveryWindow: z.strictObject({
    startsAt: timestampSchema,
    endsAt: timestampSchema,
    availableMinutes: z.number().int().min(0).max(10_080),
    bufferMinutes: z.number().int().min(0).max(1_440),
    declaredBy: z.literal("learner_fixture"),
  }),
  courses: z.array(universityRecoveryCourseInputSchema).min(1).max(8).superRefine((courses, context) => {
    const seen = new Set<string>();
    courses.forEach((course, index) => {
      if (seen.has(course.courseId)) {
        context.addIssue({
          code: "custom",
          path: [index, "courseId"],
          message: "A course may appear only once in a recovery request.",
        });
      }
      seen.add(course.courseId);
    });
  }),
  items: z.array(universityRecoveryItemSchema).min(1).max(32).superRefine((items, context) => {
    const itemIds = new Set<string>();
    const deadlineRefs = new Set<string>();
    items.forEach((item, index) => {
      if (itemIds.has(item.itemId)) {
        context.addIssue({
          code: "custom",
          path: [index, "itemId"],
          message: "A recovery item identifier may appear only once.",
        });
      }
      itemIds.add(item.itemId);
      const deadlineRef = `${item.courseId}:${item.deadlineCandidateId}`;
      if (deadlineRefs.has(deadlineRef)) {
        context.addIssue({
          code: "custom",
          path: [index, "deadlineCandidateId"],
          message: "A reviewed deadline may bind only one recovery item.",
        });
      }
      deadlineRefs.add(deadlineRef);
    });
  }),
}).superRefine((request, context) => {
  const asOf = Date.parse(request.asOf);
  const startsAt = Date.parse(request.recoveryWindow.startsAt);
  const endsAt = Date.parse(request.recoveryWindow.endsAt);
  if (startsAt !== asOf) {
    context.addIssue({
      code: "custom",
      path: ["recoveryWindow", "startsAt"],
      message: "The recovery window must begin at the explicit projection time.",
    });
  }
  if (endsAt <= startsAt) {
    context.addIssue({
      code: "custom",
      path: ["recoveryWindow", "endsAt"],
      message: "The recovery window must end after it starts.",
    });
  }
  const windowMinutes = Math.floor((endsAt - startsAt) / 60_000);
  if (request.recoveryWindow.availableMinutes > windowMinutes) {
    context.addIssue({
      code: "custom",
      path: ["recoveryWindow", "availableMinutes"],
      message: "Available minutes cannot exceed the recovery window.",
    });
  }
  if (request.recoveryWindow.bufferMinutes > request.recoveryWindow.availableMinutes) {
    context.addIssue({
      code: "custom",
      path: ["recoveryWindow", "bufferMinutes"],
      message: "The protected buffer cannot exceed available minutes.",
    });
  }

  const courseIds = new Set(request.courses.map((course) => course.courseId));
  const itemIds = new Set(request.items.map((item) => item.itemId));
  request.items.forEach((item, itemIndex) => {
    if (!courseIds.has(item.courseId)) {
      context.addIssue({
        code: "custom",
        path: ["items", itemIndex, "courseId"],
        message: "Every recovery item must belong to a declared course.",
      });
    }
    item.dependencyItemIds.forEach((dependencyId, dependencyIndex) => {
      if (!itemIds.has(dependencyId)) {
        context.addIssue({
          code: "custom",
          path: ["items", itemIndex, "dependencyItemIds", dependencyIndex],
          message: "Every dependency must reference another item in this recovery request.",
        });
      }
    });
  });
});
export type UniversityRecoveryRequestV1 = z.infer<typeof universityRecoveryRequestSchema>;

export const UNIVERSITY_RECOVERY_ISSUE_CODES = Object.freeze([
  "schema.invalid",
  "source.invalid",
  "source.as_of_mismatch",
  "source.scope_mismatch",
  "source.deadline_missing",
  "source.deadline_not_reviewed",
  "item.dependency_cycle",
  "projection.unexpected",
] as const);
export type UniversityRecoveryIssueCode = (typeof UNIVERSITY_RECOVERY_ISSUE_CODES)[number];

export interface UniversityRecoveryIssue {
  readonly code: UniversityRecoveryIssueCode;
  readonly path: string;
  readonly message: string;
}

export interface UniversityRecoveryAuthority {
  readonly projectionClass: "fixture_only_recovery_draft";
  readonly identityScopeAuthority: "caller_asserted_fixture_only";
  readonly tenantIsolationAuthority: "not_established";
  readonly rightsEnforcementAuthority: "not_established";
  readonly institutionalCompleteness: "not_established";
  readonly capacityAuthority: "learner_declared_fixture_only";
  readonly dispositionAuthority: "learner_declared_fixture_only";
  readonly orderBasis: "reviewed_deadline_then_item_id_not_priority_score";
  readonly recommendationAllowed: false;
  readonly deadlineChangeAllowed: false;
  readonly effortCompressionAllowed: false;
  readonly automaticDeferralAllowed: false;
  readonly backlogDebtAllowed: false;
  readonly persistenceAllowed: false;
  readonly eventEmissionAllowed: false;
  readonly messageSendAllowed: false;
  readonly externalSideEffectsAllowed: false;
}

export interface UniversityRecoverySourceCourse {
  readonly courseId: string;
  readonly courseLabel: string;
  readonly scope: CourseSourceScopeV1;
  readonly reconciliationStatus: "review_required" | "connected_sources_reviewed";
  readonly coverageState: "unknown" | "partial" | "connected_sources_reviewed";
  readonly currentSourceCount: number;
  readonly staleOrUnknownSourceCount: number;
  readonly unresolvedConflictCount: number;
  readonly institutionalCompleteness: "not_established";
}

export type UniversityRecoveryLane = "protect_now" | "decide_or_ask" | "outside_this_window";

export interface UniversityRecoveryProjectedItem {
  readonly itemId: string;
  readonly courseId: string;
  readonly courseLabel: string;
  readonly title: string;
  readonly dueAt: string;
  readonly timeZone: string;
  readonly consequenceClass: Extract<CourseSourceFactV1, { kind: "deadline" }>["consequenceClass"];
  readonly timing: "overdue" | "inside_recovery_window" | "after_recovery_window";
  readonly learnerDisposition: UniversityRecoveryItemV1["learnerDisposition"];
  readonly learningEssential: boolean;
  readonly effortMinutesLow: number;
  readonly effortMinutesHigh: number;
  readonly effortBasis: "fixture_authored";
  readonly dependencyItemIds: readonly string[];
  readonly humanRoute: "instructor" | "academic_advisor" | "student_support" | null;
  readonly lane: UniversityRecoveryLane;
  readonly laneReason:
    | "learner_marked_required"
    | "learner_choice_or_human_decision_needed"
    | "learner_marked_deferrable"
    | "learner_marked_no_longer_useful";
  readonly includedInProtectedCapacity: boolean;
  readonly source: {
    readonly candidateId: string;
    readonly claimKey: string;
    readonly factAuthority: "learner_connected_source_copy" | "student_entered_correction";
    readonly sourceAuthenticity: "not_established";
    readonly institutionalCompleteness: "not_established";
  };
}

export interface UniversityRecoveryCapacitySummary {
  readonly state: "fits_declared_window" | "tight_declared_window" | "insufficient_declared_window";
  readonly availableMinutes: number;
  readonly protectedBufferMinutes: number;
  readonly workableMinutes: number;
  readonly protectedEffortMinutesLow: number;
  readonly protectedEffortMinutesHigh: number;
  readonly declaredBy: "learner_fixture";
  readonly effortBasis: "fixture_authored";
}

export interface UniversityRecoveryHumanHelpDraft {
  readonly state: "prepared_not_sent";
  readonly route: "instructor" | "academic_advisor" | "student_support" | "not_declared";
  readonly relatedItemId: string;
  readonly subject: string;
  readonly question: string;
  readonly sourceLinkAvailable: false;
  readonly sendAllowed: false;
}

export type UniversityRecoveryProjectionStatus =
  | "invalid"
  | "source_review_required"
  | "draft_ready"
  | "learner_choice_required"
  | "human_help_required";

export interface UniversityRecoveryProjectionV1 {
  readonly schemaVersion: typeof UNIVERSITY_RECOVERY_PROJECTION_SCHEMA_VERSION;
  readonly status: UniversityRecoveryProjectionStatus;
  readonly scope: UniversityRecoveryTermScopeV1 | null;
  readonly asOf: string | null;
  readonly termLabel: string | null;
  readonly timeZone: string | null;
  readonly declaredChange: UniversityRecoveryRequestV1["declaredChange"] | null;
  readonly authority: UniversityRecoveryAuthority;
  readonly sourceCourses: readonly UniversityRecoverySourceCourse[];
  readonly capacity: UniversityRecoveryCapacitySummary | null;
  readonly lanes: {
    readonly protectNow: readonly UniversityRecoveryProjectedItem[];
    readonly decideOrAsk: readonly UniversityRecoveryProjectedItem[];
    readonly outsideThisWindow: readonly UniversityRecoveryProjectedItem[];
  };
  readonly highConsequenceConflictItemIds: readonly string[];
  readonly humanHelpDraft: UniversityRecoveryHumanHelpDraft | null;
  readonly recovery:
    | "repair_fixture_input"
    | "review_connected_source_copies"
    | "inspect_recovery_draft"
    | "learner_revision_required"
    | "review_prepared_human_question";
  readonly issues: readonly UniversityRecoveryIssue[];
  readonly projectionDigest: string | null;
}
