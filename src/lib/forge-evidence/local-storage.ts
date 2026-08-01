import type {
  EvidenceLedgerPersistence,
  PersistenceReadResult,
  PersistenceWriteResult,
} from "./store";
import {
  createActiveForgeProfileBoundStorage,
} from "../forge-profile/device-profile";
import {
  createForgeProfileBoundStorage,
  FORGE_EVIDENCE_LEDGER_STORAGE_KEY,
} from "../forge-profile/profile-bound-data";

export const DEFAULT_EVIDENCE_LEDGER_STORAGE_KEY = FORGE_EVIDENCE_LEDGER_STORAGE_KEY;

export interface BrowserStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface LocalStorageEvidenceLedgerOptions {
  key?: string;
  /** Pass null explicitly to create an unavailable adapter (useful for SSR tests). */
  storage?: BrowserStorageLike | null;
  /** Bind an explicitly supplied storage adapter to one profile namespace. */
  profileId?: string | null;
}

/** Creates an exception-safe adapter. It never touches `window` during SSR. */
export function createLocalStorageEvidenceLedgerAdapter(
  options: LocalStorageEvidenceLedgerOptions = {},
): EvidenceLedgerPersistence {
  const key = options.key ?? DEFAULT_EVIDENCE_LEDGER_STORAGE_KEY;
  const hasExplicitStorage = Object.prototype.hasOwnProperty.call(options, "storage");
  const storage = hasExplicitStorage ? options.storage ?? null : browserLocalStorage();
  const profileId = options.profileId;

  function scopedStorage(): BrowserStorageLike | null {
    try {
      if (!storage || profileId === null) return null;
      if (profileId !== undefined) return createForgeProfileBoundStorage(storage, profileId);
      const isBrowserLocalStorage =
        typeof window !== "undefined" && storage === window.localStorage;
      if (!hasExplicitStorage || isBrowserLocalStorage) {
        return createActiveForgeProfileBoundStorage(storage);
      }
      return storage;
    } catch {
      return null;
    }
  }

  return {
    read(): PersistenceReadResult {
      const current = scopedStorage();
      if (!current) return { ok: false, reason: "unavailable" };
      try {
        return { ok: true, value: current.getItem(key) };
      } catch {
        return { ok: false, reason: "read_failed" };
      }
    },
    write(value: string): PersistenceWriteResult {
      const current = scopedStorage();
      if (!current) return { ok: false, reason: "unavailable" };
      try {
        current.setItem(key, value);
        if (current.getItem(key) !== value) return { ok: false, reason: "write_failed" };
        return { ok: true };
      } catch {
        return { ok: false, reason: "write_failed" };
      }
    },
    remove(): PersistenceWriteResult {
      const current = scopedStorage();
      if (!current) return { ok: false, reason: "unavailable" };
      try {
        current.removeItem(key);
        if (current.getItem(key) !== null) return { ok: false, reason: "write_failed" };
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
