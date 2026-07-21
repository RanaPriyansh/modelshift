import type {
  EvidenceLedgerPersistence,
  PersistenceReadResult,
  PersistenceWriteResult,
} from "./store";

export const DEFAULT_EVIDENCE_LEDGER_STORAGE_KEY = "forge.evidence-ledger";

export interface BrowserStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface LocalStorageEvidenceLedgerOptions {
  key?: string;
  /** Pass null explicitly to create an unavailable adapter (useful for SSR tests). */
  storage?: BrowserStorageLike | null;
}

/** Creates an exception-safe adapter. It never touches `window` during SSR. */
export function createLocalStorageEvidenceLedgerAdapter(
  options: LocalStorageEvidenceLedgerOptions = {},
): EvidenceLedgerPersistence {
  const key = options.key ?? DEFAULT_EVIDENCE_LEDGER_STORAGE_KEY;
  const storage = Object.prototype.hasOwnProperty.call(options, "storage") ? options.storage ?? null : browserLocalStorage();

  return {
    read(): PersistenceReadResult {
      if (!storage) return { ok: false, reason: "unavailable" };
      try {
        return { ok: true, value: storage.getItem(key) };
      } catch {
        return { ok: false, reason: "read_failed" };
      }
    },
    write(value: string): PersistenceWriteResult {
      if (!storage) return { ok: false, reason: "unavailable" };
      try {
        storage.setItem(key, value);
        return { ok: true };
      } catch {
        return { ok: false, reason: "write_failed" };
      }
    },
    remove(): PersistenceWriteResult {
      if (!storage) return { ok: false, reason: "unavailable" };
      try {
        storage.removeItem(key);
        return { ok: true };
      } catch {
        return { ok: false, reason: "write_failed" };
      }
    },
  };
}

function browserLocalStorage(): BrowserStorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
