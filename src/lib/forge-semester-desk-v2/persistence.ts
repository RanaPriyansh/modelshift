import { z } from "zod";

import {
  SEMESTER_DESK_MAX_CONFLICT_FACT_IDS,
  SEMESTER_DESK_MAX_CONFLICTS_PER_COURSE,
  SEMESTER_DESK_MAX_COURSES,
  SEMESTER_DESK_MAX_DELAYED_RETURNS,
  SEMESTER_DESK_MAX_FACTS_PER_COURSE,
  SEMESTER_DESK_MAX_IDENTIFIER_UTF8_BYTES,
  SEMESTER_DESK_MAX_PLAN_ITEMS,
  SEMESTER_DESK_MAX_PROOFS,
  SEMESTER_DESK_MAX_PROGRESS_EVIDENCE,
  SEMESTER_DESK_MAX_RAW_JSON_UTF8_BYTES,
  SEMESTER_DESK_MAX_RECOVERY_CHANGES,
  SEMESTER_DESK_MAX_RECOVERY_DECISIONS,
  SEMESTER_DESK_MAX_STUDY_SESSIONS,
  SEMESTER_DESK_MAX_TEXT_UTF8_BYTES,
  SEMESTER_DESK_V2_SCHEMA_VERSION,
  semesterDeskUtf8ByteLength,
  type SemesterDeskState,
  validateSemesterDeskState,
} from "@/src/forge/semester-desk-v2";

const storagePrefix = "forge.semester-desk-v2.v1.profile";

function boundedString(maximumBytes: number) {
  return z.string().refine(
    (value) => semesterDeskUtf8ByteLength(value) <= maximumBytes,
  ).trim().min(1);
}

const identifierSchema = boundedString(SEMESTER_DESK_MAX_IDENTIFIER_UTF8_BYTES);
const textSchema = boundedString(SEMESTER_DESK_MAX_TEXT_UTF8_BYTES);
const dateSchema = z.string().max(10).regex(/^\d{4}-\d{2}-\d{2}$/);
const timestampSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
).max(24);
const courseFactStatusSchema = z.enum([
  "checked",
  "needs-review",
  "not-confirmed",
  "changed-since-last-check",
]);
const recoveryOutcomeSchema = z.enum(["moved", "reduced", "kept", "deferred"]);

const courseFactSchema = z.object({
  id: identifierSchema,
  label: textSchema,
  value: textSchema,
  status: courseFactStatusSchema,
  sourceLabel: textSchema,
  checkedAt: timestampSchema.nullable(),
}).strict();

const sourceConflictSchema = z.object({
  id: identifierSchema,
  factIds: z.array(identifierSchema).min(2).max(SEMESTER_DESK_MAX_CONFLICT_FACT_IDS),
  summary: textSchema,
  status: z.enum(["open", "reviewed"]),
  detectedAt: timestampSchema,
  reviewedAt: timestampSchema.nullable(),
}).strict();

const courseSchema = z.object({
  id: identifierSchema,
  code: textSchema,
  title: textSchema,
  facts: z.array(courseFactSchema).max(SEMESTER_DESK_MAX_FACTS_PER_COURSE),
  sourceConflicts: z.array(sourceConflictSchema).max(SEMESTER_DESK_MAX_CONFLICTS_PER_COURSE),
}).strict();

const planItemSchema = z.object({
  id: identifierSchema,
  courseId: identifierSchema,
  title: textSchema,
  originalDate: dateSchema,
  currentDate: dateSchema,
  originalMinutes: z.number().int().positive(),
  currentMinutes: z.number().int().positive(),
  status: z.enum([
    "planned",
    "deferred",
    "in-progress",
    "practice-complete",
    "proof-complete",
    "return-complete",
  ]),
}).strict();

const recoveryDecisionSchema = z.object({
  planItemId: identifierSchema,
  outcome: recoveryOutcomeSchema,
  nextDate: dateSchema.nullable(),
  nextMinutes: z.number().int().positive().nullable(),
  reason: textSchema,
}).strict();

const recoveryDraftSchema = z.object({
  id: identifierSchema,
  summary: textSchema,
  createdAt: timestampSchema,
  decisions: z.array(recoveryDecisionSchema).max(SEMESTER_DESK_MAX_RECOVERY_DECISIONS),
}).strict();

const recoveryChangeSchema = z.object({
  id: identifierSchema,
  recoveryDraftId: identifierSchema,
  planItemId: identifierSchema,
  outcome: recoveryOutcomeSchema,
  reason: textSchema,
  previousDate: dateSchema,
  currentDate: dateSchema,
  previousMinutes: z.number().int().positive(),
  currentMinutes: z.number().int().positive(),
  recordedAt: timestampSchema,
}).strict();

const protectedStudySessionSchema = z.object({
  id: identifierSchema,
  planItemId: identifierSchema,
  status: z.enum(["active", "practice-complete"]),
  startedAt: timestampSchema,
  practiceCompletedAt: timestampSchema.nullable(),
  practiceOutcome: z.enum(["completed", "needs-more-work"]).nullable(),
}).strict();

const independentProofSchema = z.object({
  id: identifierSchema,
  planItemId: identifierSchema,
  outcome: z.enum(["demonstrated", "needs-return"]),
  completedAt: timestampSchema,
}).strict();

const delayedReturnSchema = z.object({
  id: identifierSchema,
  planItemId: identifierSchema,
  dueAt: timestampSchema,
  status: z.enum(["due", "open", "completed"]),
  openedAt: timestampSchema.nullable(),
  completedAt: timestampSchema.nullable(),
  retentionOutcome: z.enum(["retained", "needs-more-work"]).nullable(),
}).strict();

const progressEvidenceSchema = z.object({
  id: identifierSchema,
  planItemId: identifierSchema,
  kind: z.enum([
    "practice-completed",
    "independent-proof-completed",
    "delayed-return-completed",
  ]),
  outcome: z.enum([
    "completed",
    "needs-more-work",
    "demonstrated",
    "needs-return",
    "retained",
  ]),
  occurredAt: timestampSchema,
}).strict();

export const semesterDeskStateSchema = z.object({
  schemaVersion: z.literal(SEMESTER_DESK_V2_SCHEMA_VERSION),
  id: identifierSchema,
  profileId: identifierSchema,
  title: textSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  courses: z.array(courseSchema).max(SEMESTER_DESK_MAX_COURSES),
  capacity: z.object({
    availableMinutes: z.number().int().nonnegative(),
    declaredAt: timestampSchema,
  }).strict().nullable(),
  capacityDraft: z.object({
    id: identifierSchema,
    availableMinutes: z.number().int().nonnegative(),
    draftedAt: timestampSchema,
  }).strict().nullable(),
  planItems: z.array(planItemSchema).max(SEMESTER_DESK_MAX_PLAN_ITEMS),
  recoveryDraft: recoveryDraftSchema.nullable(),
  recoveryChanges: z.array(recoveryChangeSchema).max(SEMESTER_DESK_MAX_RECOVERY_CHANGES),
  selectedNextActionId: identifierSchema.nullable(),
  protectedStudySessions: z.array(protectedStudySessionSchema).max(SEMESTER_DESK_MAX_STUDY_SESSIONS),
  independentProofs: z.array(independentProofSchema).max(SEMESTER_DESK_MAX_PROOFS),
  delayedReturns: z.array(delayedReturnSchema).max(SEMESTER_DESK_MAX_DELAYED_RETURNS),
  progressEvidence: z.array(progressEvidenceSchema).max(SEMESTER_DESK_MAX_PROGRESS_EVIDENCE),
}).strict();

export type SemesterDeskPersistenceRead =
  | { readonly kind: "missing" }
  | { readonly kind: "loaded"; readonly state: SemesterDeskState; readonly raw: string }
  | { readonly kind: "malformed"; readonly raw: string; readonly message: string };

export type SemesterDeskPersistenceResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string };

type SemesterDeskPersistenceFailure = Extract<SemesterDeskPersistenceResult, { readonly ok: false }>;

export type SemesterDeskExportResult =
  | { readonly ok: true; readonly raw: string }
  | { readonly ok: false; readonly message: string };

/**
 * This interface has no browser requirement. A signed-in provider can replace
 * this device adapter without changing the Semester Desk user interface.
 */
export interface SemesterDeskPersistence {
  read(profileId: string): Promise<SemesterDeskPersistenceRead>;
  save(state: SemesterDeskState): Promise<SemesterDeskPersistenceResult>;
  exportRaw(profileId: string): Promise<SemesterDeskExportResult>;
  reset(profileId: string): Promise<SemesterDeskPersistenceResult>;
}

export function semesterDeskStorageKey(profileId: string): string {
  return `${storagePrefix}.${encodeURIComponent(profileId)}`;
}

function storageFailure(error: unknown, action: string): SemesterDeskPersistenceFailure {
  const detail = error instanceof Error && error.message.trim().length > 0
    ? ` ${error.message.trim()}`
    : "";
  return { ok: false, message: `FORGE could not ${action} on this device.${detail}` };
}

function malformed(raw: string, message: string): SemesterDeskPersistenceRead {
  return { kind: "malformed", raw, message };
}

export class BrowserSemesterDeskPersistence implements SemesterDeskPersistence {
  constructor(private readonly storage: Storage) {}

  async read(profileId: string): Promise<SemesterDeskPersistenceRead> {
    if (profileId.trim().length === 0) {
      return malformed("", "The local profile reference is empty.");
    }

    let raw: string | null;
    try {
      raw = this.storage.getItem(semesterDeskStorageKey(profileId));
    } catch (error) {
      return malformed("", storageFailure(error, "read local data").message);
    }

    if (raw === null) return { kind: "missing" };
    if (semesterDeskUtf8ByteLength(raw) > SEMESTER_DESK_MAX_RAW_JSON_UTF8_BYTES) {
      return malformed(raw, "The local data is too large to use.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return malformed(raw, "The local data is not valid JSON.");
    }

    const checked = semesterDeskStateSchema.safeParse(parsed);
    if (!checked.success) {
      return malformed(raw, "The local data does not match this Semester Desk version.");
    }
    if (checked.data.profileId !== profileId) {
      return malformed(raw, "The local data belongs to a different profile.");
    }
    const validated = validateSemesterDeskState(checked.data);
    if (!validated.ok) {
      return malformed(raw, "The local data does not match this Semester Desk version.");
    }

    return {
      kind: "loaded",
      state: validated.value,
      raw,
    };
  }

  async save(state: SemesterDeskState): Promise<SemesterDeskPersistenceResult> {
    const checked = semesterDeskStateSchema.safeParse(state);
    if (!checked.success) {
      return { ok: false, message: "FORGE could not save data that did not pass its local check." };
    }
    const validated = validateSemesterDeskState(checked.data);
    if (!validated.ok) {
      return { ok: false, message: "FORGE could not save data that did not pass its local check." };
    }

    let raw: string;
    try {
      raw = JSON.stringify(validated.value);
    } catch {
      return { ok: false, message: "FORGE could not save data that did not pass its local check." };
    }
    if (semesterDeskUtf8ByteLength(raw) > SEMESTER_DESK_MAX_RAW_JSON_UTF8_BYTES) {
      return { ok: false, message: "FORGE could not save local data that is too large." };
    }

    try {
      this.storage.setItem(
        semesterDeskStorageKey(validated.value.profileId),
        raw,
      );
      return { ok: true };
    } catch (error) {
      return storageFailure(error, "save local data");
    }
  }

  async exportRaw(profileId: string): Promise<SemesterDeskExportResult> {
    if (profileId.trim().length === 0) {
      return { ok: false, message: "The local profile reference is empty." };
    }
    try {
      const raw = this.storage.getItem(semesterDeskStorageKey(profileId));
      if (raw === null) {
        return { ok: false, message: "There is no saved local data to download." };
      }
      return { ok: true, raw };
    } catch (error) {
      return { ok: false, message: storageFailure(error, "read local data").message };
    }
  }

  async reset(profileId: string): Promise<SemesterDeskPersistenceResult> {
    if (profileId.trim().length === 0) {
      return { ok: false, message: "The local profile reference is empty." };
    }
    try {
      this.storage.removeItem(semesterDeskStorageKey(profileId));
      return { ok: true };
    } catch (error) {
      return storageFailure(error, "remove local data");
    }
  }
}
