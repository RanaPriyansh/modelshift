import { describe, expect, it } from "vitest";

import {
  clearWorldSessionCheckpoint,
  MAX_WORLD_SESSION_CHECKPOINT_BYTES,
  readWorldSessionCheckpoint,
  writeWorldSessionCheckpoint,
  type WorldSessionCheckpointStorage,
} from "./world-session-checkpoint";

const identity = {
  sessionId: "study-session.resume-fixture",
  worldId: "world.force-and-motion",
  worldVersion: "1.0.2",
} as const;

function memoryStorage(): WorldSessionCheckpointStorage & {
  values: Map<string, string>;
} {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}

describe("device-local World session checkpoints", () => {
  it("round-trips one exact session/world checkpoint and clears it explicitly", () => {
    const storage = memoryStorage();
    expect(writeWorldSessionCheckpoint(storage, identity, {
      attemptId: "attempt.resume-fixture",
      events: [{ type: "START" }],
      ui: { explanation: "device-local draft" },
    })).toEqual({ ok: true, operation: "saved" });
    expect(readWorldSessionCheckpoint(storage, identity)).toMatchObject({
      ok: true,
      checkpoint: {
        ...identity,
        attemptId: "attempt.resume-fixture",
        events: [{ type: "START" }],
        ui: { explanation: "device-local draft" },
      },
    });
    expect(clearWorldSessionCheckpoint(storage, identity)).toEqual({
      ok: true,
      operation: "cleared",
    });
    expect(readWorldSessionCheckpoint(storage, identity)).toEqual({
      ok: true,
      checkpoint: null,
    });
  });

  it("fails closed for malformed, oversized, and unavailable storage", () => {
    const storage = memoryStorage();
    expect(writeWorldSessionCheckpoint(storage, identity, {
      attemptId: "forged",
      events: [],
      ui: null,
    })).toEqual({ ok: false, reason: "invalid_checkpoint" });

    const key =
      "forge.world-session-checkpoint:v1:study-session.resume-fixture:world.force-and-motion:1.0.2";
    storage.values.set(key, JSON.stringify({
      schemaVersion: "world-session-checkpoint.v1",
      ...identity,
      attemptId: "attempt.resume-fixture",
      events: [],
      ui: null,
      extra: true,
    }));
    expect(readWorldSessionCheckpoint(storage, identity)).toEqual({
      ok: false,
      reason: "malformed",
    });

    storage.values.set(key, "x".repeat(MAX_WORLD_SESSION_CHECKPOINT_BYTES + 1));
    expect(readWorldSessionCheckpoint(storage, identity)).toEqual({
      ok: false,
      reason: "too_large",
    });

    const unavailable: WorldSessionCheckpointStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(readWorldSessionCheckpoint(unavailable, identity)).toEqual({
      ok: false,
      reason: "unavailable",
    });
    expect(writeWorldSessionCheckpoint(unavailable, identity, {
      attemptId: "attempt.resume-fixture",
      events: [],
      ui: null,
    })).toEqual({ ok: false, reason: "unavailable" });
  });
});
