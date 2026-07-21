import {
  EVIDENCE_LEDGER_EXPORT_FORMAT,
  EVIDENCE_LEDGER_SCHEMA_VERSION,
  createEmptyEvidenceLedger,
  evidenceEntrySchema,
  evidenceLedgerExportSchema,
  evidenceLedgerSchema,
  evidenceTimestampSchema,
  learnerSharingStateSchema,
  returnProofScheduleSchema,
  type EvidenceEntry,
  type EvidenceExport,
  type EvidenceLedger,
  type LearnerSharingState,
  type ReturnProofSchedule,
} from "./schema";

export type DerivedEvidenceState =
  | "building"
  | "proved_once"
  | "ready_to_revisit"
  | "carried_into_project"
  | "open_question";

export type EvidenceLedgerAction =
  | { type: "append"; entry: unknown }
  | { type: "delete"; entryId: string }
  | { type: "set_sharing"; entryId: string; sharing: unknown }
  | { type: "complete_return"; entryId: string; completedAt: string }
  | { type: "clear" };

export type EvidenceLedgerRejectionReason =
  | "invalid_ledger"
  | "invalid_entry"
  | "duplicate_entry"
  | "entry_not_found"
  | "invalid_sharing"
  | "invalid_completion_time"
  | "return_not_scheduled";

export type EvidenceLedgerTransition =
  | { accepted: true; ledger: EvidenceLedger }
  | { accepted: false; ledger: EvidenceLedger; reason: EvidenceLedgerRejectionReason };

export type ReturnScheduleCreation =
  | { ok: true; schedule: ReturnProofSchedule }
  | { ok: false; reason: "invalid_anchor" | "invalid_intervals" };

export type EvidenceExportResult =
  | { ok: true; value: EvidenceExport }
  | { ok: false; reason: "invalid_ledger" | "invalid_export_time" };

export interface DueReturnProof {
  entryId: string;
  capabilityId: string;
  dueAt: string;
}

export function createReturnProofSchedule(anchorAt: string, intervalsDays: readonly number[]): ReturnScheduleCreation {
  if (!evidenceTimestampSchema.safeParse(anchorAt).success) {
    return { ok: false, reason: "invalid_anchor" };
  }

  const canonicalAnchor = new Date(anchorAt).toISOString();
  const candidate = {
    anchorAt: canonicalAnchor,
    intervalsDays: [...intervalsDays],
    completedCount: 0,
    nextDueAt:
      intervalsDays.length > 0 && Number.isInteger(intervalsDays[0])
        ? addUtcDays(canonicalAnchor, intervalsDays[0])
        : null,
    lastCompletedAt: null,
  };
  const parsed = returnProofScheduleSchema.safeParse(candidate);
  return parsed.success ? { ok: true, schedule: parsed.data } : { ok: false, reason: "invalid_intervals" };
}

export function isReturnProofDue(schedule: ReturnProofSchedule | unknown, now: string): boolean {
  const parsedSchedule = returnProofScheduleSchema.safeParse(schedule);
  const parsedNow = evidenceTimestampSchema.safeParse(now);
  if (!parsedSchedule.success || !parsedNow.success || parsedSchedule.data.nextDueAt === null) {
    return false;
  }
  return Date.parse(now) >= Date.parse(parsedSchedule.data.nextDueAt);
}

export function listDueReturnProofs(ledger: EvidenceLedger | unknown, now: string): readonly DueReturnProof[] {
  const parsed = evidenceLedgerSchema.safeParse(ledger);
  if (!parsed.success || !evidenceTimestampSchema.safeParse(now).success) return [];

  return parsed.data.entries.flatMap((entry) =>
    entry.returnSchedule && isReturnProofDue(entry.returnSchedule, now)
      ? [{ entryId: entry.id, capabilityId: entry.capabilityId, dueAt: entry.returnSchedule.nextDueAt as string }]
      : [],
  );
}

/**
 * Derives a categorical evidence state only. It deliberately does not compute a
 * mastery percentage or combine evidence into a learner score.
 */
export function deriveEvidenceState(
  ledger: EvidenceLedger | unknown,
  capabilityId: string,
  now: string,
): DerivedEvidenceState {
  const parsed = evidenceLedgerSchema.safeParse(ledger);
  if (!parsed.success || !evidenceTimestampSchema.safeParse(now).success) return "building";

  const entries = parsed.data.entries
    .filter((entry) => entry.capabilityId === capabilityId)
    .sort((left, right) => Date.parse(left.recordedAt) - Date.parse(right.recordedAt));
  const latest = entries.at(-1);

  if (latest?.proof.outcome === "open_question") return "open_question";

  const due = entries.some((entry) => entry.returnSchedule && isReturnProofDue(entry.returnSchedule, now));
  const latestIndependentAttemptNeedsWork =
    latest?.proof.assistanceAccess === "removed" && latest.proof.outcome === "not_proved";
  if (due || latestIndependentAttemptNeedsWork) return "ready_to_revisit";

  const independentProofs = entries.filter(
    (entry) => entry.proof.assistanceAccess === "removed" && entry.proof.outcome === "proved",
  );
  if (independentProofs.some((entry) => entry.proof.mode === "project_application")) {
    return "carried_into_project";
  }
  if (independentProofs.length > 0) return "proved_once";
  return "building";
}

export function exportEvidenceLedger(
  ledger: EvidenceLedger | unknown,
  scope: "learner_copy" | "educator" | "project_collaborators",
  exportedAt: string,
): EvidenceExportResult {
  const parsedLedger = evidenceLedgerSchema.safeParse(ledger);
  if (!parsedLedger.success) return { ok: false, reason: "invalid_ledger" };
  if (!evidenceTimestampSchema.safeParse(exportedAt).success) {
    return { ok: false, reason: "invalid_export_time" };
  }

  const candidate = {
    format: EVIDENCE_LEDGER_EXPORT_FORMAT,
    schemaVersion: EVIDENCE_LEDGER_SCHEMA_VERSION,
    exportedAt,
    scope,
    entries:
      scope === "learner_copy"
        ? parsedLedger.data.entries
        : parsedLedger.data.entries.filter(
            (entry) => entry.sharing.status === "shared_by_learner" && entry.sharing.scope === scope,
          ),
  };
  const parsedExport = evidenceLedgerExportSchema.safeParse(candidate);
  return parsedExport.success
    ? { ok: true, value: parsedExport.data }
    : { ok: false, reason: "invalid_ledger" };
}

export function reduceEvidenceLedger(
  ledger: EvidenceLedger | unknown,
  action: EvidenceLedgerAction,
): EvidenceLedgerTransition {
  const parsedLedger = evidenceLedgerSchema.safeParse(ledger);
  if (!parsedLedger.success) {
    return { accepted: false, ledger: createEmptyEvidenceLedger(), reason: "invalid_ledger" };
  }
  const current = parsedLedger.data;

  switch (action.type) {
    case "append": {
      const parsedEntry = evidenceEntrySchema.safeParse(action.entry);
      if (!parsedEntry.success) return reject(current, "invalid_entry");
      if (current.entries.some((entry) => entry.id === parsedEntry.data.id)) {
        return reject(current, "duplicate_entry");
      }
      return accept({ ...current, entries: [...current.entries, parsedEntry.data] });
    }

    case "delete":
      if (!current.entries.some((entry) => entry.id === action.entryId)) return reject(current, "entry_not_found");
      return accept({ ...current, entries: current.entries.filter((entry) => entry.id !== action.entryId) });

    case "set_sharing": {
      const index = current.entries.findIndex((entry) => entry.id === action.entryId);
      if (index === -1) return reject(current, "entry_not_found");
      const parsedSharing = learnerSharingStateSchema.safeParse(action.sharing);
      if (!parsedSharing.success || Date.parse(parsedSharing.data.updatedAt) < Date.parse(current.entries[index].recordedAt)) {
        return reject(current, "invalid_sharing");
      }
      return accept(replaceEntry(current, index, { ...current.entries[index], sharing: parsedSharing.data }));
    }

    case "complete_return": {
      const index = current.entries.findIndex((entry) => entry.id === action.entryId);
      if (index === -1) return reject(current, "entry_not_found");
      const entry = current.entries[index];
      if (!entry.returnSchedule || entry.returnSchedule.nextDueAt === null) {
        return reject(current, "return_not_scheduled");
      }
      if (!evidenceTimestampSchema.safeParse(action.completedAt).success) {
        return reject(current, "invalid_completion_time");
      }

      const completedAt = new Date(action.completedAt).toISOString();
      if (Date.parse(completedAt) < Date.parse(entry.returnSchedule.nextDueAt)) {
        return reject(current, "invalid_completion_time");
      }

      const completedCount = entry.returnSchedule.completedCount + 1;
      const nextDueAt =
        completedCount === entry.returnSchedule.intervalsDays.length
          ? null
          : addUtcDays(completedAt, entry.returnSchedule.intervalsDays[completedCount]);
      const schedule = returnProofScheduleSchema.safeParse({
        ...entry.returnSchedule,
        completedCount,
        nextDueAt,
        lastCompletedAt: completedAt,
      });
      if (!schedule.success) return reject(current, "invalid_completion_time");
      return accept(replaceEntry(current, index, { ...entry, returnSchedule: schedule.data }));
    }

    case "clear":
      return accept(createEmptyEvidenceLedger());
  }
}

function replaceEntry(ledger: EvidenceLedger, index: number, entry: EvidenceEntry): EvidenceLedger {
  return { ...ledger, entries: ledger.entries.map((current, currentIndex) => (currentIndex === index ? entry : current)) };
}

function accept(ledger: EvidenceLedger): EvidenceLedgerTransition {
  return { accepted: true, ledger };
}

function reject(ledger: EvidenceLedger, reason: EvidenceLedgerRejectionReason): EvidenceLedgerTransition {
  return { accepted: false, ledger, reason };
}

export function privateSharingState(updatedAt: string): LearnerSharingState | null {
  const parsed = learnerSharingStateSchema.safeParse({ status: "private", updatedAt });
  return parsed.success ? parsed.data : null;
}

function addUtcDays(timestamp: string, days: number): string {
  return new Date(Date.parse(timestamp) + days * 86_400_000).toISOString();
}
