"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import {
  createDeviceContinuityStore,
  decodeDeviceContinuityLedger,
  type DeviceContinuityPersistence,
  type DeviceContinuityReadResult,
  type DeviceContinuityStore,
} from "@/src/lib/forge-continuity";

export const FORGE_CONTINUITY_STORAGE_KEY = "forge.device-continuity:v1";
export const FORGE_CONTINUITY_CHANGED_EVENT = "forge:continuity-changed";

export function createBrowserContinuityStore(): DeviceContinuityStore {
  const persistence: DeviceContinuityPersistence = {
    read() {
      try {
        return { ok: true, value: window.localStorage.getItem(FORGE_CONTINUITY_STORAGE_KEY) };
      } catch {
        return { ok: false, reason: "read_failed" };
      }
    },
    write(value) {
      try {
        window.localStorage.setItem(FORGE_CONTINUITY_STORAGE_KEY, value);
        window.dispatchEvent(new Event(FORGE_CONTINUITY_CHANGED_EVENT));
        return { ok: true };
      } catch {
        return { ok: false, reason: "write_failed" };
      }
    },
    remove() {
      try {
        window.localStorage.removeItem(FORGE_CONTINUITY_STORAGE_KEY);
        window.dispatchEvent(new Event(FORGE_CONTINUITY_CHANGED_EVENT));
        return { ok: true };
      } catch {
        return { ok: false, reason: "write_failed" };
      }
    },
  };
  return createDeviceContinuityStore(persistence);
}

export type DeviceContinuityClientState =
  | Readonly<{ phase: "loading"; result: null }>
  | Readonly<{ phase: "ready"; result: DeviceContinuityReadResult }>;

const SERVER_SNAPSHOT = "__forge_continuity_server__";
const EMPTY_SNAPSHOT = "__forge_continuity_empty__";
const UNAVAILABLE_SNAPSHOT = "__forge_continuity_unavailable__";

function subscribeToContinuity(onStoreChange: () => void) {
  function onStorage(event: StorageEvent) {
    if (event.key === FORGE_CONTINUITY_STORAGE_KEY) onStoreChange();
  }
  window.addEventListener("storage", onStorage);
  window.addEventListener(FORGE_CONTINUITY_CHANGED_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(FORGE_CONTINUITY_CHANGED_EVENT, onStoreChange);
  };
}

function continuitySnapshot() {
  try {
    return window.localStorage.getItem(FORGE_CONTINUITY_STORAGE_KEY) ?? EMPTY_SNAPSHOT;
  } catch {
    return UNAVAILABLE_SNAPSHOT;
  }
}

export function useDeviceContinuity(): {
  state: DeviceContinuityClientState;
  refresh: () => void;
} {
  const snapshot = useSyncExternalStore(
    subscribeToContinuity,
    continuitySnapshot,
    () => SERVER_SNAPSHOT,
  );
  const state = useMemo<DeviceContinuityClientState>(() => {
    if (snapshot === SERVER_SNAPSHOT) return { phase: "loading", result: null };
    if (snapshot === UNAVAILABLE_SNAPSHOT) {
      return {
        phase: "ready",
        result: {
          ledger: decodeDeviceContinuityLedger(null).ledger,
          status: "storage_unavailable",
        },
      };
    }
    const decoded = decodeDeviceContinuityLedger(snapshot === EMPTY_SNAPSHOT ? null : snapshot);
    return { phase: "ready", result: decoded };
  }, [snapshot]);
  const refresh = useCallback(() => {
    window.dispatchEvent(new Event(FORGE_CONTINUITY_CHANGED_EVENT));
  }, []);

  return { state, refresh };
}
