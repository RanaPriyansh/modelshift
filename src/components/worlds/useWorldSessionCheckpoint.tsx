"use client";

/* eslint-disable react-hooks/set-state-in-effect -- checkpoint reads and write failures intentionally synchronize external storage into fail-closed UI state */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  createWorldRuntimeSession,
  dispatchWorldRuntimeCommand,
  type RuntimeDispatchResult,
  type WorldRuntimeAdapter,
  type WorldRuntimeSession,
} from "../../forge/world-runtime";
import {
  clearWorldSessionCheckpoint,
  readWorldSessionCheckpoint,
  writeWorldSessionCheckpoint,
  type WorldSessionCheckpointIdentity,
  type WorldSessionCheckpointReadResult,
  type WorldSessionCheckpointWriteResult,
} from "../../lib/forge-continuity/world-session-checkpoint";

export type WorldCheckpointErrorReason =
  | Extract<WorldSessionCheckpointReadResult, { ok: false }>["reason"]
  | Extract<WorldSessionCheckpointWriteResult, { ok: false }>["reason"]
  | "identity_mismatch"
  | "invalid_ui"
  | "replay_rejected";

type CheckpointPhase =
  | Readonly<{ status: "disabled" | "loading" | "ready"; reason: null }>
  | Readonly<{ status: "failed"; reason: WorldCheckpointErrorReason }>;

type BrowserCheckpointStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function browserCheckpointStorage(): BrowserCheckpointStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function identityKey(identity: WorldSessionCheckpointIdentity | undefined): string {
  return identity
    ? `${identity.sessionId}:${identity.worldId}:${identity.worldVersion}`
    : "checkpoint-disabled";
}

export function useWorldSessionCheckpoint<State, Event, Proof, Ui>(input: {
  adapter: WorldRuntimeAdapter<State, Event, Proof>;
  checkpointIdentity?: WorldSessionCheckpointIdentity;
  ui: Ui;
  decodeUi(value: unknown): Ui | null;
  restoreUi(value: Ui): void;
  resetUi(): void;
  onCheckpointError?: (reason: WorldCheckpointErrorReason) => void;
  compactEvents?: (events: readonly Event[], event: Event) => readonly Event[];
}): {
  runtime: WorldRuntimeSession<State, Proof>;
  runtimeRef: React.MutableRefObject<WorldRuntimeSession<State, Proof>>;
  send(event: Event): RuntimeDispatchResult<State, Proof> | null;
  phase: CheckpointPhase;
  canDiscardCheckpoint: boolean;
  discardCheckpointAndRestart(): boolean;
} {
  const {
    adapter,
    checkpointIdentity: receivedCheckpointIdentity,
    compactEvents,
    decodeUi,
    onCheckpointError,
    resetUi,
    restoreUi,
    ui,
  } = input;
  const checkpointSessionId = receivedCheckpointIdentity?.sessionId;
  const checkpointWorldId = receivedCheckpointIdentity?.worldId;
  const checkpointWorldVersion = receivedCheckpointIdentity?.worldVersion;
  const checkpointIdentity = useMemo(
    () => checkpointSessionId && checkpointWorldId && checkpointWorldVersion
      ? {
          sessionId: checkpointSessionId,
          worldId: checkpointWorldId,
          worldVersion: checkpointWorldVersion,
        }
      : undefined,
    [
      checkpointSessionId,
      checkpointWorldId,
      checkpointWorldVersion,
    ],
  );
  const [runtime, setRuntime] = useState(() => createWorldRuntimeSession(adapter));
  const runtimeRef = useRef(runtime);
  const [events, setEvents] = useState<readonly Event[]>([]);
  const eventsRef = useRef<readonly Event[]>(events);
  const [phase, setPhase] = useState<CheckpointPhase>(
    checkpointIdentity
      ? { status: "loading", reason: null }
      : { status: "disabled", reason: null },
  );
  const decodeUiRef = useRef(decodeUi);
  const restoreUiRef = useRef(restoreUi);
  const resetUiRef = useRef(resetUi);
  const onCheckpointErrorRef = useRef(onCheckpointError);
  const key = identityKey(checkpointIdentity);

  useEffect(() => {
    decodeUiRef.current = decodeUi;
    restoreUiRef.current = restoreUi;
    resetUiRef.current = resetUi;
    onCheckpointErrorRef.current = onCheckpointError;
  }, [decodeUi, onCheckpointError, resetUi, restoreUi]);

  const fail = useCallback((reason: WorldCheckpointErrorReason) => {
    setPhase({ status: "failed", reason });
    onCheckpointErrorRef.current?.(reason);
  }, []);

  useEffect(() => {
    const fresh = createWorldRuntimeSession(adapter);
    runtimeRef.current = fresh;
    eventsRef.current = [];
    setRuntime(fresh);
    setEvents([]);

    if (!checkpointIdentity) {
      setPhase({ status: "disabled", reason: null });
      return;
    }
    if (
      checkpointIdentity.worldId !== adapter.pack.manifest.id
      || checkpointIdentity.worldVersion !== adapter.pack.manifest.version
    ) {
      fail("identity_mismatch");
      return;
    }
    const storage = browserCheckpointStorage();
    if (!storage) {
      fail("unavailable");
      return;
    }
    const read = readWorldSessionCheckpoint(storage, checkpointIdentity);
    if (!read.ok) {
      fail(read.reason);
      return;
    }
    if (!read.checkpoint) {
      setPhase({ status: "ready", reason: null });
      return;
    }
    const restoredUi = decodeUiRef.current(read.checkpoint.ui);
    if (restoredUi === null) {
      fail("invalid_ui");
      return;
    }

    try {
      let replayed = createWorldRuntimeSession(adapter, read.checkpoint.attemptId);
      const acceptedEvents: Event[] = [];
      for (const rawEvent of read.checkpoint.events) {
        const replay = dispatchWorldRuntimeCommand(adapter, replayed, {
          kind: "domain",
          event: rawEvent as Event,
        });
        if (!replay.accepted) {
          fail("replay_rejected");
          return;
        }
        replayed = replay.session;
        acceptedEvents.push(rawEvent as Event);
      }
      restoreUiRef.current(restoredUi);
      runtimeRef.current = replayed;
      eventsRef.current = acceptedEvents;
      setRuntime(replayed);
      setEvents(acceptedEvents);
      setPhase({ status: "ready", reason: null });
    } catch {
      fail("replay_rejected");
    }
  }, [adapter, checkpointIdentity, fail, key]);

  useEffect(() => {
    if (phase.status !== "ready" || !checkpointIdentity) return;
    const storage = browserCheckpointStorage();
    if (!storage) {
      fail("unavailable");
      return;
    }
    const written = writeWorldSessionCheckpoint(storage, checkpointIdentity, {
      attemptId: runtime.attemptId,
      events,
      ui,
    });
    if (!written.ok) fail(written.reason);
  }, [checkpointIdentity, events, fail, key, phase.status, runtime.attemptId, ui]);

  const send = useCallback((event: Event): RuntimeDispatchResult<State, Proof> | null => {
    if (phase.status === "loading" || phase.status === "failed") return null;
    const result = dispatchWorldRuntimeCommand(adapter, runtimeRef.current, {
      kind: "domain",
      event,
    });
    runtimeRef.current = result.session;
    setRuntime(result.session);
    if (!result.accepted) return result;

    const isReset = typeof event === "object"
      && event !== null
      && "type" in event
      && event.type === "RESET";
    const nextEvents = isReset
      ? []
      : compactEvents
        ? compactEvents(eventsRef.current, event)
        : [...eventsRef.current, event];
    eventsRef.current = nextEvents;
    setEvents(nextEvents);
    return result;
  }, [adapter, compactEvents, phase.status]);

  const identityMatchesAdapter = checkpointIdentity !== undefined
    && checkpointIdentity.worldId === adapter.pack.manifest.id
    && checkpointIdentity.worldVersion === adapter.pack.manifest.version;
  const canDiscardCheckpoint = phase.status === "failed"
    && identityMatchesAdapter
    && phase.reason !== "invalid_identity"
    && phase.reason !== "unavailable";

  const discardCheckpointAndRestart = useCallback((): boolean => {
    if (!checkpointIdentity || !identityMatchesAdapter) return false;
    const storage = browserCheckpointStorage();
    if (!storage) {
      fail("unavailable");
      return false;
    }
    const cleared = clearWorldSessionCheckpoint(storage, checkpointIdentity);
    if (!cleared.ok) {
      fail(cleared.reason);
      return false;
    }
    const fresh = createWorldRuntimeSession(adapter);
    resetUiRef.current();
    runtimeRef.current = fresh;
    eventsRef.current = [];
    setRuntime(fresh);
    setEvents([]);
    setPhase({ status: "ready", reason: null });
    return true;
  }, [adapter, checkpointIdentity, fail, identityMatchesAdapter]);

  return {
    runtime,
    runtimeRef,
    send,
    phase,
    canDiscardCheckpoint,
    discardCheckpointAndRestart,
  };
}

export function WorldCheckpointBoundary({
  label,
  onDiscard,
  phase,
}: {
  label: string;
  onDiscard?: () => void;
  phase: CheckpointPhase;
}): ReactNode | null {
  if (phase.status === "disabled" || phase.status === "ready") return null;
  if (phase.status === "loading") {
    return (
      <main data-testid="world-checkpoint-loading" tabIndex={-1}>
        <p role="status">Restoring this exact local {label} session…</p>
      </main>
    );
  }
  return (
    <main data-testid="world-checkpoint-error" tabIndex={-1}>
      <section role="alert">
        <h1>This local {label} checkpoint cannot be restored safely.</h1>
        <p>
          FORGE left the stored bytes untouched. No learning state, evidence,
          or completion is being inferred.
        </p>
        <code>{phase.reason}</code>
        {onDiscard ? (
          <button
            data-testid="discard-world-checkpoint"
            onClick={onDiscard}
            type="button"
          >
            Discard this local checkpoint and start again
          </button>
        ) : null}
      </section>
    </main>
  );
}
