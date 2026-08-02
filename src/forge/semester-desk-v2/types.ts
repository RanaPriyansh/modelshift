export const SEMESTER_DESK_V2_SCHEMA_VERSION = "forge-semester-desk-v2" as const;

export const COURSE_FACT_STATUSES = [
  "checked",
  "needs-review",
  "not-confirmed",
  "changed-since-last-check",
] as const;

export type CourseFactStatus = (typeof COURSE_FACT_STATUSES)[number];

export const RECOVERY_OUTCOMES = [
  "moved",
  "reduced",
  "kept",
  "deferred",
] as const;

export type RecoveryOutcome = (typeof RECOVERY_OUTCOMES)[number];

export type SemesterDeskIdentifierKind =
  | "semester"
  | "course"
  | "course-fact"
  | "source-conflict"
  | "capacity-draft"
  | "plan-item"
  | "recovery-draft"
  | "recovery-change"
  | "study-session"
  | "proof"
  | "delayed-return"
  | "progress-evidence";

export interface SemesterDeskClock {
  now(): string;
}

export interface SemesterDeskIdentifierFactory {
  next(kind: SemesterDeskIdentifierKind): string;
}

export interface SemesterDeskRuntime {
  readonly clock: SemesterDeskClock;
  readonly identifiers: SemesterDeskIdentifierFactory;
}

export type SemesterDeskErrorCode =
  | "invalid-input"
  | "profile-mismatch"
  | "not-found"
  | "already-exists"
  | "invalid-transition"
  | "course-review-required"
  | "capacity-draft-missing"
  | "recovery-draft-missing"
  | "recovery-decision-invalid"
  | "next-action-required"
  | "practice-required"
  | "proof-required"
  | "return-not-due"
  | "return-not-open";

export interface SemesterDeskError {
  readonly code: SemesterDeskErrorCode;
  readonly message: string;
}

export type SemesterDeskResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: SemesterDeskError };

export interface CourseFact {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly status: CourseFactStatus;
  readonly sourceLabel: string;
  readonly checkedAt: string | null;
}

export interface SourceConflict {
  readonly id: string;
  readonly factIds: readonly string[];
  readonly summary: string;
  readonly status: "open" | "reviewed";
  readonly detectedAt: string;
  readonly reviewedAt: string | null;
}

export interface SemesterCourse {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly facts: readonly CourseFact[];
  readonly sourceConflicts: readonly SourceConflict[];
}

export interface ConfirmedCapacity {
  readonly availableMinutes: number;
  readonly declaredAt: string;
}

export interface CapacityDraft {
  readonly id: string;
  readonly availableMinutes: number;
  readonly draftedAt: string;
}

export type PlanItemStatus =
  | "planned"
  | "deferred"
  | "in-progress"
  | "practice-complete"
  | "proof-complete"
  | "return-complete";

export interface SemesterPlanItem {
  readonly id: string;
  readonly courseId: string;
  readonly title: string;
  readonly originalDate: string;
  readonly currentDate: string;
  readonly originalMinutes: number;
  readonly currentMinutes: number;
  readonly status: PlanItemStatus;
}

export interface RecoveryDecision {
  readonly planItemId: string;
  readonly outcome: RecoveryOutcome;
  readonly nextDate: string | null;
  readonly nextMinutes: number | null;
  readonly reason: string;
}

export interface RecoveryDraft {
  readonly id: string;
  readonly summary: string;
  readonly createdAt: string;
  readonly decisions: readonly RecoveryDecision[];
}

export interface RecoveryChange {
  readonly id: string;
  readonly recoveryDraftId: string;
  readonly planItemId: string;
  readonly outcome: RecoveryOutcome;
  readonly reason: string;
  readonly previousDate: string;
  readonly currentDate: string;
  readonly previousMinutes: number;
  readonly currentMinutes: number;
  readonly recordedAt: string;
}

export interface ProtectedStudySession {
  readonly id: string;
  readonly planItemId: string;
  readonly status: "active" | "practice-complete";
  readonly startedAt: string;
  readonly practiceCompletedAt: string | null;
  readonly practiceOutcome: "completed" | "needs-more-work" | null;
}

export interface IndependentProof {
  readonly id: string;
  readonly planItemId: string;
  readonly outcome: "demonstrated" | "needs-return";
  readonly completedAt: string;
}

export interface DelayedReturn {
  readonly id: string;
  readonly planItemId: string;
  readonly dueAt: string;
  readonly status: "due" | "open" | "completed";
  readonly openedAt: string | null;
  readonly completedAt: string | null;
  readonly retentionOutcome: "retained" | "needs-more-work" | null;
}

export type ProgressEvidenceKind =
  | "practice-completed"
  | "independent-proof-completed"
  | "delayed-return-completed";

/**
 * Progress evidence is intentionally answer-free. The engine never accepts or
 * stores raw practice or proof answers in this record or elsewhere in state.
 */
export interface ProgressEvidence {
  readonly id: string;
  readonly planItemId: string;
  readonly kind: ProgressEvidenceKind;
  readonly outcome: "completed" | "needs-more-work" | "demonstrated" | "needs-return" | "retained";
  readonly occurredAt: string;
}

export interface SemesterDeskState {
  readonly schemaVersion: typeof SEMESTER_DESK_V2_SCHEMA_VERSION;
  readonly id: string;
  readonly profileId: string;
  readonly title: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly courses: readonly SemesterCourse[];
  readonly capacity: ConfirmedCapacity | null;
  readonly capacityDraft: CapacityDraft | null;
  readonly planItems: readonly SemesterPlanItem[];
  readonly recoveryDraft: RecoveryDraft | null;
  readonly recoveryChanges: readonly RecoveryChange[];
  readonly selectedNextActionId: string | null;
  readonly protectedStudySessions: readonly ProtectedStudySession[];
  readonly independentProofs: readonly IndependentProof[];
  readonly delayedReturns: readonly DelayedReturn[];
  readonly progressEvidence: readonly ProgressEvidence[];
}

export interface CreateSemesterDeskInput {
  readonly profileId: string;
  readonly title: string;
}

export interface RecoveryDecisionInput {
  readonly planItemId: string;
  readonly outcome: RecoveryOutcome;
  readonly nextDate?: string;
  readonly nextMinutes?: number;
  readonly reason: string;
}

export type SemesterDeskCommand =
  | {
    readonly kind: "add-course";
    readonly profileId: string;
    readonly code: string;
    readonly title: string;
  }
  | {
    readonly kind: "add-course-fact";
    readonly profileId: string;
    readonly courseId: string;
    readonly label: string;
    readonly value: string;
    readonly status: CourseFactStatus;
    readonly sourceLabel: string;
    readonly checkedAt?: string;
  }
  | {
    readonly kind: "set-course-fact-status";
    readonly profileId: string;
    readonly courseId: string;
    readonly factId: string;
    readonly status: CourseFactStatus;
    readonly checkedAt?: string;
  }
  | {
    readonly kind: "record-source-conflict";
    readonly profileId: string;
    readonly courseId: string;
    readonly factIds: readonly string[];
    readonly summary: string;
  }
  | {
    readonly kind: "review-source-conflict";
    readonly profileId: string;
    readonly courseId: string;
    readonly conflictId: string;
  }
  | {
    readonly kind: "draft-capacity";
    readonly profileId: string;
    readonly availableMinutes: number;
  }
  | {
    readonly kind: "confirm-capacity";
    readonly profileId: string;
  }
  | {
    readonly kind: "add-plan-item";
    readonly profileId: string;
    readonly courseId: string;
    readonly title: string;
    readonly date: string;
    readonly minutes: number;
  }
  | {
    readonly kind: "prepare-recovery";
    readonly profileId: string;
    readonly summary: string;
    readonly decisions: readonly RecoveryDecisionInput[];
  }
  | {
    readonly kind: "confirm-recovery";
    readonly profileId: string;
  }
  | {
    readonly kind: "choose-next-action";
    readonly profileId: string;
    readonly planItemId: string;
  }
  | {
    readonly kind: "resume-deferred-item";
    readonly profileId: string;
    readonly planItemId: string;
  }
  | {
    readonly kind: "start-protected-study";
    readonly profileId: string;
    readonly planItemId: string;
  }
  | {
    readonly kind: "complete-practice";
    readonly profileId: string;
    readonly studySessionId: string;
    readonly outcome: "completed" | "needs-more-work";
  }
  | {
    readonly kind: "submit-independent-proof";
    readonly profileId: string;
    readonly planItemId: string;
    readonly outcome: "demonstrated" | "needs-return";
  }
  | {
    readonly kind: "schedule-delayed-return";
    readonly profileId: string;
    readonly planItemId: string;
    readonly dueAt: string;
  }
  | {
    readonly kind: "open-delayed-return";
    readonly profileId: string;
    readonly delayedReturnId: string;
  }
  | {
    readonly kind: "complete-delayed-return";
    readonly profileId: string;
    readonly delayedReturnId: string;
    readonly outcome: "retained" | "needs-more-work";
  };
