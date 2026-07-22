import { z } from "zod";

// These schemas also run in strict-CSP browser surfaces. Disable Zod's
// optional Function-constructor fast path so CSP reports remain clean.
z.config({ jitless: true });

export const EVIDENCE_LEDGER_SCHEMA_VERSION = 1 as const;
export const EVIDENCE_LEDGER_EXPORT_FORMAT = "forge-evidence-ledger" as const;

const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export const evidenceIdentifierSchema = z.string().regex(IDENTIFIER_PATTERN);
export const evidenceTimestampSchema = z
  .string()
  .length(24)
  .regex(ISO_TIMESTAMP_PATTERN)
  .refine((value) => {
    const parsed = new Date(value);
    return Number.isFinite(parsed.valueOf()) && parsed.toISOString() === value;
  }, "Invalid timestamp");

export const evidenceSourceSchema = z
  .object({
    kind: z.enum(["authored_activity", "return_challenge", "learner_project"]),
    refId: evidenceIdentifierSchema,
  })
  .strict();

export const proofConditionsSchema = z
  .object({
    conditionId: evidenceIdentifierSchema,
    mode: z.enum(["supported_practice", "independent_transfer", "return_proof", "project_application"]),
    assistanceAccess: z.enum(["available", "removed"]),
    outcome: z.enum(["practice_completed", "proved", "not_proved", "open_question"]),
  })
  .strict();

export const assistanceProvenanceSchema = z
  .object({
    kind: z.enum([
      "authored_hint",
      "authored_contrast",
      "authored_principle",
      // Additive: old ledger records remain valid while runtime receipts can
      // preserve an authored representational accommodation distinctly.
      "authored_representation",
      "model_interpretation",
      "human_guidance",
    ]),
    sourceId: evidenceIdentifierSchema,
  })
  .strict();

const privateSharingSchema = z
  .object({
    status: z.literal("private"),
    updatedAt: evidenceTimestampSchema,
  })
  .strict();

const learnerSharedSchema = z
  .object({
    status: z.literal("shared_by_learner"),
    scope: z.enum(["educator", "project_collaborators"]),
    updatedAt: evidenceTimestampSchema,
  })
  .strict();

export const learnerSharingStateSchema = z.discriminatedUnion("status", [privateSharingSchema, learnerSharedSchema]);

const intervalDaysSchema = z.number().int().min(1).max(3_650);

function addUtcDays(timestamp: string, days: number): string {
  return new Date(Date.parse(timestamp) + days * 86_400_000).toISOString();
}

export const returnProofScheduleSchema = z
  .object({
    anchorAt: evidenceTimestampSchema,
    intervalsDays: z.array(intervalDaysSchema).min(1).max(16),
    completedCount: z.number().int().min(0).max(16),
    nextDueAt: evidenceTimestampSchema.nullable(),
    lastCompletedAt: evidenceTimestampSchema.nullable(),
  })
  .strict()
  .superRefine((schedule, context) => {
    if (schedule.intervalsDays.some((days, index) => index > 0 && days <= schedule.intervalsDays[index - 1])) {
      context.addIssue({ code: "custom", message: "Return-proof intervals must be strictly increasing" });
    }

    if (schedule.completedCount > schedule.intervalsDays.length) {
      context.addIssue({ code: "custom", message: "Completed count exceeds configured intervals" });
      return;
    }

    if ((schedule.completedCount === 0) !== (schedule.lastCompletedAt === null)) {
      context.addIssue({ code: "custom", message: "Last completion does not match completed count" });
    }

    const expectedDueAt =
      schedule.completedCount === schedule.intervalsDays.length
        ? null
        : addUtcDays(
            schedule.completedCount === 0 ? schedule.anchorAt : (schedule.lastCompletedAt ?? schedule.anchorAt),
            schedule.intervalsDays[schedule.completedCount],
          );

    if (schedule.nextDueAt !== expectedDueAt) {
      context.addIssue({ code: "custom", message: "Next due time does not match the schedule" });
    }
  });

export const evidenceEntrySchema = z
  .object({
    id: evidenceIdentifierSchema,
    capabilityId: evidenceIdentifierSchema,
    recordedAt: evidenceTimestampSchema,
    source: evidenceSourceSchema,
    proof: proofConditionsSchema,
    assistance: z.array(assistanceProvenanceSchema).max(8),
    sharing: learnerSharingStateSchema,
    returnSchedule: returnProofScheduleSchema.nullable(),
  })
  .strict()
  .superRefine((entry, context) => {
    const projectEvidence = entry.source.kind === "learner_project";
    if (projectEvidence !== (entry.proof.mode === "project_application")) {
      context.addIssue({ code: "custom", message: "Project sources require project proof conditions" });
    }

    const returnEvidence = entry.source.kind === "return_challenge";
    if (returnEvidence !== (entry.proof.mode === "return_proof")) {
      context.addIssue({ code: "custom", message: "Return sources require return-proof conditions" });
    }

    if (entry.returnSchedule) {
      if (entry.returnSchedule.anchorAt !== entry.recordedAt) {
        context.addIssue({ code: "custom", message: "Return schedule must be anchored to the evidence time" });
      }
      if (entry.proof.outcome !== "proved" || entry.proof.assistanceAccess !== "removed") {
        context.addIssue({ code: "custom", message: "Only independent proof can schedule a return proof" });
      }
    }
  });

export const evidenceLedgerSchema = z
  .object({
    schemaVersion: z.literal(EVIDENCE_LEDGER_SCHEMA_VERSION),
    entries: z.array(evidenceEntrySchema).max(5_000),
  })
  .strict()
  .superRefine((ledger, context) => {
    const seen = new Set<string>();
    for (const entry of ledger.entries) {
      if (seen.has(entry.id)) {
        context.addIssue({ code: "custom", message: `Duplicate evidence ID: ${entry.id}` });
      }
      seen.add(entry.id);
    }
  });

export const evidenceLedgerExportSchema = z
  .object({
    format: z.literal(EVIDENCE_LEDGER_EXPORT_FORMAT),
    schemaVersion: z.literal(EVIDENCE_LEDGER_SCHEMA_VERSION),
    exportedAt: evidenceTimestampSchema,
    scope: z.enum(["learner_copy", "educator", "project_collaborators"]),
    entries: z.array(evidenceEntrySchema).max(5_000),
  })
  .strict();

export type EvidenceSource = z.infer<typeof evidenceSourceSchema>;
export type ProofConditions = z.infer<typeof proofConditionsSchema>;
export type AssistanceProvenance = z.infer<typeof assistanceProvenanceSchema>;
export type LearnerSharingState = z.infer<typeof learnerSharingStateSchema>;
export type ReturnProofSchedule = z.infer<typeof returnProofScheduleSchema>;
export type EvidenceEntry = z.infer<typeof evidenceEntrySchema>;
export type EvidenceLedger = z.infer<typeof evidenceLedgerSchema>;
export type EvidenceExport = z.infer<typeof evidenceLedgerExportSchema>;

export type EvidenceLedgerDecodeStatus = "ok" | "empty" | "reset_unknown_version" | "reset_malformed";

export interface EvidenceLedgerDecodeResult {
  ledger: EvidenceLedger;
  status: EvidenceLedgerDecodeStatus;
}

export function createEmptyEvidenceLedger(): EvidenceLedger {
  return { schemaVersion: EVIDENCE_LEDGER_SCHEMA_VERSION, entries: [] };
}

/** Unknown and malformed data is replaced, never migrated field-by-field. */
export function decodeEvidenceLedger(raw: string | null): EvidenceLedgerDecodeResult {
  if (raw === null || raw.trim() === "") {
    return { ledger: createEmptyEvidenceLedger(), status: "empty" };
  }

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { ledger: createEmptyEvidenceLedger(), status: "reset_malformed" };
  }

  if (
    typeof value !== "object" ||
    value === null ||
    !("schemaVersion" in value) ||
    (value as { schemaVersion?: unknown }).schemaVersion !== EVIDENCE_LEDGER_SCHEMA_VERSION
  ) {
    return { ledger: createEmptyEvidenceLedger(), status: "reset_unknown_version" };
  }

  const parsed = evidenceLedgerSchema.safeParse(value);
  return parsed.success
    ? { ledger: parsed.data, status: "ok" }
    : { ledger: createEmptyEvidenceLedger(), status: "reset_malformed" };
}

export function encodeEvidenceLedger(ledger: EvidenceLedger): string | null {
  const parsed = evidenceLedgerSchema.safeParse(ledger);
  return parsed.success ? JSON.stringify(parsed.data) : null;
}
