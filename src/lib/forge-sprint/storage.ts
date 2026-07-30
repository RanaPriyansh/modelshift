import {
  FORGE_SPRINT_STORAGE_KEY,
  type ForgeSprintStore,
  parseForgeSprintStore,
  serializeForgeSprintStore,
} from "./model";

export interface ForgeSprintStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function readForgeSprintStore(
  storage: ForgeSprintStorageLike,
): ReturnType<typeof parseForgeSprintStore> {
  try {
    return parseForgeSprintStore(storage.getItem(FORGE_SPRINT_STORAGE_KEY));
  } catch {
    return {
      store: { version: 1, revision: 0, sprints: [] },
      issues: ["Local sprint data could not be read. No stored data was changed."],
    };
  }
}

export function writeForgeSprintStore(
  storage: ForgeSprintStorageLike,
  store: ForgeSprintStore,
  expectedRevision?: number,
): void {
  if (expectedRevision !== undefined) {
    const current = readForgeSprintStore(storage);
    if (current.store.revision !== expectedRevision) {
      throw new Error("stale_revision");
    }
  }
  storage.setItem(FORGE_SPRINT_STORAGE_KEY, serializeForgeSprintStore(store));
}

export function deleteForgeSprintStore(storage: ForgeSprintStorageLike): void {
  storage.removeItem(FORGE_SPRINT_STORAGE_KEY);
}

export function readRawForgeSprintStore(storage: ForgeSprintStorageLike): string | null {
  try {
    return storage.getItem(FORGE_SPRINT_STORAGE_KEY);
  } catch {
    return null;
  }
}
