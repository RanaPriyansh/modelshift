import { exportEvidenceLedger, reduceEvidenceLedger, type EvidenceLedgerAction, type EvidenceLedgerRejectionReason } from "./ledger";
import {
  createEmptyEvidenceLedger,
  decodeEvidenceLedger,
  encodeEvidenceLedger,
  type EvidenceExport,
  type EvidenceLedger,
  type EvidenceLedgerDecodeStatus,
} from "./schema";

export type PersistenceFailureReason = "unavailable" | "read_failed" | "write_failed";

export type PersistenceReadResult =
  | { ok: true; value: string | null }
  | { ok: false; reason: "unavailable" | "read_failed" };

export type PersistenceWriteResult =
  | { ok: true }
  | { ok: false; reason: "unavailable" | "write_failed" };

/** Persistence boundary implemented by localStorage or an integration-owned adapter. */
export interface EvidenceLedgerPersistence {
  read(): PersistenceReadResult;
  write(value: string): PersistenceWriteResult;
  remove(): PersistenceWriteResult;
}

export type EvidenceLedgerReadStatus = EvidenceLedgerDecodeStatus | "storage_unavailable" | "storage_error";

export interface EvidenceLedgerReadResult {
  ledger: EvidenceLedger;
  status: EvidenceLedgerReadStatus;
}

export type EvidenceLedgerMutationResult =
  | { ok: true; ledger: EvidenceLedger; readStatus: EvidenceLedgerReadStatus }
  | {
      ok: false;
      ledger: EvidenceLedger;
      reason: EvidenceLedgerRejectionReason | "storage_unavailable" | "storage_error";
      readStatus: EvidenceLedgerReadStatus;
    };

export type EvidenceLedgerStoreExportResult =
  | { ok: true; value: EvidenceExport; readStatus: EvidenceLedgerReadStatus }
  | { ok: false; reason: "invalid_export_time" | "storage_unavailable" | "storage_error"; readStatus: EvidenceLedgerReadStatus };

export interface EvidenceLedgerStore {
  read(): EvidenceLedgerReadResult;
  append(entry: unknown): EvidenceLedgerMutationResult;
  delete(entryId: string): EvidenceLedgerMutationResult;
  deleteAll(): EvidenceLedgerMutationResult;
  setSharing(entryId: string, sharing: unknown): EvidenceLedgerMutationResult;
  completeReturnProof(entryId: string, completedAt: string): EvidenceLedgerMutationResult;
  export(scope: "learner_copy" | "educator" | "project_collaborators", exportedAt: string): EvidenceLedgerStoreExportResult;
}

export function createEvidenceLedgerStore(persistence: EvidenceLedgerPersistence): EvidenceLedgerStore {
  const read = (): EvidenceLedgerReadResult => {
    const persisted = persistence.read();
    if (!persisted.ok) {
      return {
        ledger: createEmptyEvidenceLedger(),
        status: persisted.reason === "unavailable" ? "storage_unavailable" : "storage_error",
      };
    }

    const decoded = decodeEvidenceLedger(persisted.value);
    if (decoded.status === "reset_malformed" || decoded.status === "reset_unknown_version") {
      const encoded = encodeEvidenceLedger(decoded.ledger);
      if (encoded !== null) {
        const repaired = persistence.write(encoded);
        if (!repaired.ok) {
          return {
            ledger: decoded.ledger,
            status: repaired.reason === "unavailable" ? "storage_unavailable" : "storage_error",
          };
        }
      }
    }
    return decoded;
  };

  const mutate = (action: EvidenceLedgerAction): EvidenceLedgerMutationResult => {
    const before = read();
    if (before.status === "storage_unavailable" || before.status === "storage_error") {
      return { ok: false, ledger: before.ledger, reason: before.status, readStatus: before.status };
    }

    const transition = reduceEvidenceLedger(before.ledger, action);
    if (!transition.accepted) {
      return { ok: false, ledger: transition.ledger, reason: transition.reason, readStatus: before.status };
    }

    const encoded = encodeEvidenceLedger(transition.ledger);
    if (encoded === null) {
      return { ok: false, ledger: before.ledger, reason: "storage_error", readStatus: before.status };
    }
    const saved = persistence.write(encoded);
    if (!saved.ok) {
      return {
        ok: false,
        ledger: before.ledger,
        reason: saved.reason === "unavailable" ? "storage_unavailable" : "storage_error",
        readStatus: before.status,
      };
    }
    return { ok: true, ledger: transition.ledger, readStatus: before.status };
  };

  return {
    read,
    append: (entry) => mutate({ type: "append", entry }),
    delete: (entryId) => mutate({ type: "delete", entryId }),
    deleteAll: () => {
      const removed = persistence.remove();
      if (!removed.ok) {
        const status = removed.reason === "unavailable" ? "storage_unavailable" : "storage_error";
        return { ok: false, ledger: createEmptyEvidenceLedger(), reason: status, readStatus: status };
      }
      return { ok: true, ledger: createEmptyEvidenceLedger(), readStatus: "empty" };
    },
    setSharing: (entryId, sharing) => mutate({ type: "set_sharing", entryId, sharing }),
    completeReturnProof: (entryId, completedAt) => mutate({ type: "complete_return", entryId, completedAt }),
    export: (scope, exportedAt) => {
      const current = read();
      if (current.status === "storage_unavailable" || current.status === "storage_error") {
        return { ok: false, reason: current.status, readStatus: current.status };
      }
      const exported = exportEvidenceLedger(current.ledger, scope, exportedAt);
      return exported.ok
        ? { ok: true, value: exported.value, readStatus: current.status }
        : { ok: false, reason: "invalid_export_time", readStatus: current.status };
    },
  };
}
