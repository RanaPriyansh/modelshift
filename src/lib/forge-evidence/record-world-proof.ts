import { createReturnProofSchedule } from "./ledger";
import { createLocalStorageEvidenceLedgerAdapter } from "./local-storage";
import { createEvidenceLedgerStore, type EvidenceLedgerMutationResult } from "./store";

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

/**
 * Records only bounded proof metadata. Learner text, identity, confidence,
 * inferred traits, and raw model output are deliberately outside this API.
 */
export function recordWorldProof(input: RecordWorldProofInput): EvidenceLedgerMutationResult {
  const recordedAt = input.recordedAt ?? new Date().toISOString();
  const schedule =
    input.outcome === "proved"
      ? createReturnProofSchedule(recordedAt, input.returnIntervalsDays ?? [7, 30])
      : null;
  const suffix = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const store = createEvidenceLedgerStore(createLocalStorageEvidenceLedgerAdapter());

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
    returnSchedule: schedule?.ok ? schedule.schedule : null,
  });
}
