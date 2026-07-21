import { z } from "zod";

import { evidenceEntrySchema, type EvidenceEntry } from "../forge-evidence";

export const MAX_PRIVATE_EVIDENCE_BATCH = 100;
export const MAX_PRIVATE_EVIDENCE_BODY_BYTES = 256 * 1024;

export const privateEvidenceSyncRequestSchema = z
  .object({
    entries: z.array(evidenceEntrySchema).min(1).max(MAX_PRIVATE_EVIDENCE_BATCH),
  })
  .strict();

export const privateEvidenceDeleteRequestSchema = z
  .object({
    entryId: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/).optional(),
    all: z.literal(true).optional(),
  })
  .strict()
  .refine((value) => Boolean(value.entryId) !== Boolean(value.all), {
    message: "Choose exactly one deletion scope",
  });

export interface AdultPrivateEvidenceRow {
  learner_user_id: string;
  client_evidence_id: string;
  recorded_at: string;
  entry: EvidenceEntry;
}

/** The authenticated user id always comes from the validated server session. */
export function toAdultPrivateEvidenceRows(
  learnerUserId: string,
  entries: readonly EvidenceEntry[],
): AdultPrivateEvidenceRow[] {
  return entries.map((entry) => ({
    learner_user_id: learnerUserId,
    client_evidence_id: entry.id,
    recorded_at: entry.recordedAt,
    entry,
  }));
}

export function isSameOriginMutation(requestUrl: string, originHeader: string | null): boolean {
  if (!originHeader) return false;
  try {
    return new URL(originHeader).origin === new URL(requestUrl).origin;
  } catch {
    return false;
  }
}
