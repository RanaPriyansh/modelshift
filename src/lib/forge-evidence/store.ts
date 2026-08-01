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
      reason: EvidenceLedgerRejectionReason | "recovery_required" | "storage_unavailable" | "storage_error";
      readStatus: EvidenceLedgerReadStatus;
    };

export type EvidenceLedgerStoreExportResult =
  | { ok: true; value: EvidenceExport; readStatus: EvidenceLedgerReadStatus }
  | { ok: false; reason: "invalid_export_time" | "recovery_required" | "storage_unavailable" | "storage_error"; readStatus: EvidenceLedgerReadStatus };

export type EvidenceLedgerRecoveryExportResult =
  | {
      ok: true;
      raw: string;
      status: Extract<EvidenceLedgerDecodeStatus, "reset_malformed" | "reset_unknown_version">;
    }
  | { ok: false; reason: "no_recovery_data" | "storage_unavailable" | "storage_error" };

export interface EvidenceLedgerStore {
  read(): EvidenceLedgerReadResult;
  append(entry: unknown): EvidenceLedgerMutationResult;
  delete(entryId: string): EvidenceLedgerMutationResult;
  deleteAll(): EvidenceLedgerMutationResult;
  setSharing(entryId: string, sharing: unknown): EvidenceLedgerMutationResult;
  completeReturnProof(entryId: string, completedAt: string): EvidenceLedgerMutationResult;
  export(scope: "learner_copy" | "educator" | "project_collaborators", exportedAt: string): EvidenceLedgerStoreExportResult;
  exportUnreadable(): EvidenceLedgerRecoveryExportResult;
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
    // Reading evidence is observational. Recovery data remains untouched until
    // the learner explicitly downloads or clears it.
    return decoded;
  };

  const mutate = (action: EvidenceLedgerAction): EvidenceLedgerMutationResult => {
    const before = read();
    if (before.status === "storage_unavailable" || before.status === "storage_error") {
      return { ok: false, ledger: before.ledger, reason: before.status, readStatus: before.status };
    }
    if (before.status === "reset_malformed" || before.status === "reset_unknown_version") {
      return {
        ok: false,
        ledger: before.ledger,
        reason: "recovery_required",
        readStatus: before.status,
      };
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
    const verified = persistence.read();
    if (!verified.ok || verified.value !== encoded) {
      const reason = !verified.ok
        ? verified.reason === "unavailable" ? "storage_unavailable" as const : "storage_error" as const
        : "storage_error" as const;
      return {
        ok: false,
        ledger: before.ledger,
        reason,
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
      const verified = persistence.read();
      if (!verified.ok || verified.value !== null) {
        const status = !verified.ok && verified.reason === "unavailable"
          ? "storage_unavailable"
          : "storage_error";
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
      if (current.status === "reset_malformed" || current.status === "reset_unknown_version") {
        return { ok: false, reason: "recovery_required", readStatus: current.status };
      }
      const exported = exportEvidenceLedger(current.ledger, scope, exportedAt);
      return exported.ok
        ? { ok: true, value: exported.value, readStatus: current.status }
        : { ok: false, reason: "invalid_export_time", readStatus: current.status };
    },
    exportUnreadable: () => {
      const persisted = persistence.read();
      if (!persisted.ok) {
        return {
          ok: false,
          reason: persisted.reason === "unavailable" ? "storage_unavailable" : "storage_error",
        };
      }
      if (persisted.value === null || persisted.value.trim() === "") {
        return { ok: false, reason: "no_recovery_data" };
      }
      const decoded = decodeEvidenceLedger(persisted.value);
      if (decoded.status !== "reset_malformed" && decoded.status !== "reset_unknown_version") {
        return { ok: false, reason: "no_recovery_data" };
      }
      return { ok: true, raw: persisted.value, status: decoded.status };
    },
  };
}
