import { createReturnProofSchedule } from "./ledger";
import { createLocalStorageEvidenceLedgerAdapter } from "./local-storage";
import type { EvidenceLedger } from "./schema";
import {
  createEvidenceLedgerStore,
  type EvidenceLedgerMutationResult,
  type EvidenceLedgerReadStatus,
} from "./store";

export interface RecordWorldProofInput {
  capabilityId: string;
  conditionId: string;
  sourceRefId: string;
  outcome: "proved" | "not_proved" | "open_question";
  assistance?: ReadonlyArray<{
    kind: "authored_hint" | "authored_contrast" | "authored_principle" | "model_interpretation";
    sourceId: string;
  }>;
  recordedAt?: string;
  returnIntervalsDays?: readonly number[];
}

export type RecordWorldProofResult =
  | EvidenceLedgerMutationResult
  | {
      ok: false;
      ledger: EvidenceLedger;
      reason: "invalid_return_schedule";
      readStatus: EvidenceLedgerReadStatus;
    };

/**
 * Records only bounded proof metadata. Learner text, identity, confidence,
 * inferred traits, and raw model output are deliberately outside this API.
 */
export function recordWorldProof(input: RecordWorldProofInput): RecordWorldProofResult {
  const recordedAt = input.recordedAt ?? new Date().toISOString();
  const store = createEvidenceLedgerStore(createLocalStorageEvidenceLedgerAdapter());
  let returnSchedule = null;

  if (input.returnIntervalsDays !== undefined) {
    const schedule = createReturnProofSchedule(recordedAt, input.returnIntervalsDays);
    if (!schedule.ok) {
      const current = store.read();
      return {
        ok: false,
        ledger: current.ledger,
        reason: "invalid_return_schedule",
        readStatus: current.status,
      };
    }
    if (input.outcome === "proved") returnSchedule = schedule.schedule;
  }

  const suffix = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  return store.append({
    id: `proof.${suffix}`,
    capabilityId: input.capabilityId,
    recordedAt,
    source: { kind: "authored_activity", refId: input.sourceRefId },
    proof: {
      conditionId: input.conditionId,
      mode: "independent_transfer",
      assistanceAccess: "removed",
      outcome: input.outcome,
    },
    assistance: input.assistance ?? [],
    sharing: { status: "private", updatedAt: recordedAt },
    returnSchedule,
  });
}
