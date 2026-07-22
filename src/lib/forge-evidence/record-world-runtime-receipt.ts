import {
  isBoundedLocalWorldRuntimeReceipt,
  type BoundedLocalWorldRuntimeReceipt,
  type CanonicalSupportEvent,
} from "../../forge/world-runtime";
import { createLocalStorageEvidenceLedgerAdapter } from "./local-storage";
import type { AssistanceProvenance, EvidenceLedger } from "./schema";
import {
  createEvidenceLedgerStore,
  type EvidenceLedgerMutationResult,
  type EvidenceLedgerReadStatus,
} from "./store";

export type RecordWorldRuntimeReceiptResult =
  | EvidenceLedgerMutationResult
  | {
      ok: false;
      ledger: EvidenceLedger;
      reason: "invalid_runtime_receipt";
      readStatus: EvidenceLedgerReadStatus;
    };

function boundedOutcome(receipt: BoundedLocalWorldRuntimeReceipt): "proved" | "not_proved" | "open_question" {
  switch (receipt.validator.disposition) {
    case "demonstrated":
      return "proved";
    case "not_demonstrated":
      return "not_proved";
    case "open_question":
    case "not_evaluated":
    case "invalidated":
      return "open_question";
  }
}

function assistanceKind(event: CanonicalSupportEvent): AssistanceProvenance["kind"] {
  if (event.source === "model") return "model_interpretation";
  if (event.source === "human") return "human_guidance";
  if (event.tier === "representation") return "authored_representation";
  if (event.tier === "attention" || event.tier === "cue") return "authored_hint";
  if (event.tier === "example") return "authored_contrast";
  return "authored_principle";
}

function projectAssistance(receipt: BoundedLocalWorldRuntimeReceipt): AssistanceProvenance[] {
  const seen = new Set<string>();
  const assistance: AssistanceProvenance[] = [];
  for (const event of receipt.cognitiveSupport) {
    const kind = assistanceKind(event);
    const key = `${kind}:${event.actionId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    assistance.push({ kind, sourceId: event.actionId });
  }
  return assistance;
}

/**
 * The compatibility ledger sees exactly one bounded runtime receipt. It has
 * no access to a reducer state, raw response, return schedule, or adapter
 * chosen score. `attemptId` makes duplicate rerenders deterministically reject
 * within the same local ledger at the existing duplicate-ID boundary; it is
 * not cross-tab transactionality or durable idempotency.
 */
export function recordWorldRuntimeReceipt(receipt: BoundedLocalWorldRuntimeReceipt): RecordWorldRuntimeReceiptResult {
  const store = createEvidenceLedgerStore(createLocalStorageEvidenceLedgerAdapter());
  if (!isBoundedLocalWorldRuntimeReceipt(receipt)) {
    const current = store.read();
    return {
      ok: false,
      ledger: current.ledger,
      reason: "invalid_runtime_receipt",
      readStatus: current.status,
    };
  }

  return store.append({
    id: `proof.${receipt.attemptId}`,
    capabilityId: receipt.world.capabilityId,
    recordedAt: receipt.recordedAt,
    source: { kind: "authored_activity", refId: receipt.world.id },
    proof: {
      conditionId: receipt.world.proofClaimId,
      mode: "independent_transfer",
      assistanceAccess: "removed",
      outcome: boundedOutcome(receipt),
    },
    assistance: projectAssistance(receipt),
    sharing: { status: "private", updatedAt: receipt.recordedAt },
    returnSchedule: null,
  });
}
