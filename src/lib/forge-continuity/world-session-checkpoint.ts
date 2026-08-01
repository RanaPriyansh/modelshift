import { deepFreeze } from "@/src/forge/deep-freeze";
import { exceedsUtf8ByteLimit } from "@/src/lib/storage/raw-byte-limit";
import { FORGE_WORLD_SESSION_CHECKPOINT_STORAGE_PREFIX } from "@/src/lib/forge-profile/profile-bound-data";

export const WORLD_SESSION_CHECKPOINT_SCHEMA_VERSION =
  "world-session-checkpoint.v1" as const;
export const MAX_WORLD_SESSION_CHECKPOINT_BYTES = 64 * 1024;
export const MAX_WORLD_SESSION_CHECKPOINT_EVENTS = 128;

const SESSION_ID = /^study-session\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const WORLD_ID = /^world\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+$/;
const ATTEMPT_ID = /^attempt\.[a-z0-9][a-z0-9._-]{2,113}$/;

export interface WorldSessionCheckpointIdentity {
  readonly sessionId: string;
  readonly worldId: string;
  readonly worldVersion: string;
}

export interface WorldSessionCheckpointV1 {
  readonly schemaVersion: typeof WORLD_SESSION_CHECKPOINT_SCHEMA_VERSION;
  readonly sessionId: string;
  readonly worldId: string;
  readonly worldVersion: string;
  readonly attemptId: string;
  readonly events: readonly unknown[];
  readonly ui: unknown;
}

export interface WorldSessionCheckpointStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type WorldSessionCheckpointReadResult =
  | Readonly<{ ok: true; checkpoint: WorldSessionCheckpointV1 | null }>
  | Readonly<{
      ok: false;
      reason: "invalid_identity" | "unavailable" | "malformed" | "too_large";
    }>;

export type WorldSessionCheckpointWriteResult =
  | Readonly<{ ok: true; operation: "saved" | "cleared" }>
  | Readonly<{
      ok: false;
      reason:
        | "invalid_identity"
        | "invalid_checkpoint"
        | "unavailable"
        | "too_large";
    }>;

function validIdentity(identity: WorldSessionCheckpointIdentity): boolean {
  return (
    SESSION_ID.test(identity.sessionId)
    && WORLD_ID.test(identity.worldId)
    && SEMVER.test(identity.worldVersion)
  );
}

function checkpointKey(identity: WorldSessionCheckpointIdentity): string {
  return [
    FORGE_WORLD_SESSION_CHECKPOINT_STORAGE_PREFIX.slice(0, -1),
    identity.sessionId,
    identity.worldId,
    identity.worldVersion,
  ].join(":");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactCheckpoint(
  value: unknown,
  identity: WorldSessionCheckpointIdentity,
): WorldSessionCheckpointV1 | null {
  if (!isRecord(value)) return null;
  const expectedKeys = [
    "attemptId",
    "events",
    "schemaVersion",
    "sessionId",
    "ui",
    "worldId",
    "worldVersion",
  ];
  if (Object.keys(value).sort().join(",") !== expectedKeys.join(",")) return null;
  if (
    value.schemaVersion !== WORLD_SESSION_CHECKPOINT_SCHEMA_VERSION
    || value.sessionId !== identity.sessionId
    || value.worldId !== identity.worldId
    || value.worldVersion !== identity.worldVersion
    || typeof value.attemptId !== "string"
    || !ATTEMPT_ID.test(value.attemptId)
    || !Array.isArray(value.events)
    || value.events.length > MAX_WORLD_SESSION_CHECKPOINT_EVENTS
  ) {
    return null;
  }
  return deepFreeze({
    schemaVersion: WORLD_SESSION_CHECKPOINT_SCHEMA_VERSION,
    sessionId: value.sessionId,
    worldId: value.worldId,
    worldVersion: value.worldVersion,
    attemptId: value.attemptId,
    events: value.events,
    ui: value.ui,
  });
}

export function readWorldSessionCheckpoint(
  storage: WorldSessionCheckpointStorage,
  identity: WorldSessionCheckpointIdentity,
): WorldSessionCheckpointReadResult {
  if (!validIdentity(identity)) {
    return deepFreeze({ ok: false as const, reason: "invalid_identity" as const });
  }
  let raw: string | null;
  try {
    raw = storage.getItem(checkpointKey(identity));
  } catch {
    return deepFreeze({ ok: false as const, reason: "unavailable" as const });
  }
  if (raw === null) return deepFreeze({ ok: true as const, checkpoint: null });
  if (exceedsUtf8ByteLimit(raw, MAX_WORLD_SESSION_CHECKPOINT_BYTES)) {
    return deepFreeze({ ok: false as const, reason: "too_large" as const });
  }
  try {
    const checkpoint = exactCheckpoint(JSON.parse(raw), identity);
    return checkpoint
      ? deepFreeze({ ok: true as const, checkpoint })
      : deepFreeze({ ok: false as const, reason: "malformed" as const });
  } catch {
    return deepFreeze({ ok: false as const, reason: "malformed" as const });
  }
}

export function writeWorldSessionCheckpoint(
  storage: WorldSessionCheckpointStorage,
  identity: WorldSessionCheckpointIdentity,
  value: {
    readonly attemptId: string;
    readonly events: readonly unknown[];
    readonly ui: unknown;
  },
): WorldSessionCheckpointWriteResult {
  if (!validIdentity(identity)) {
    return deepFreeze({ ok: false as const, reason: "invalid_identity" as const });
  }
  const checkpoint = exactCheckpoint({
    schemaVersion: WORLD_SESSION_CHECKPOINT_SCHEMA_VERSION,
    ...identity,
    ...value,
  }, identity);
  if (!checkpoint) {
    return deepFreeze({
      ok: false as const,
      reason: "invalid_checkpoint" as const,
    });
  }
  let encoded: string;
  try {
    encoded = JSON.stringify(checkpoint);
  } catch {
    return deepFreeze({
      ok: false as const,
      reason: "invalid_checkpoint" as const,
    });
  }
  if (exceedsUtf8ByteLimit(encoded, MAX_WORLD_SESSION_CHECKPOINT_BYTES)) {
    return deepFreeze({ ok: false as const, reason: "too_large" as const });
  }
  try {
    storage.setItem(checkpointKey(identity), encoded);
    return deepFreeze({ ok: true as const, operation: "saved" as const });
  } catch {
    return deepFreeze({ ok: false as const, reason: "unavailable" as const });
  }
}

export function clearWorldSessionCheckpoint(
  storage: WorldSessionCheckpointStorage,
  identity: WorldSessionCheckpointIdentity,
): WorldSessionCheckpointWriteResult {
  if (!validIdentity(identity)) {
    return deepFreeze({ ok: false as const, reason: "invalid_identity" as const });
  }
  try {
    const key = checkpointKey(identity);
    storage.removeItem(key);
    if (storage.getItem(key) !== null) {
      return deepFreeze({ ok: false as const, reason: "unavailable" as const });
    }
    return deepFreeze({ ok: true as const, operation: "cleared" as const });
  } catch {
    return deepFreeze({ ok: false as const, reason: "unavailable" as const });
  }
}
