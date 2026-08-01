export const FORGE_PROFILE_BOUND_STORAGE_PREFIX = "forge.profile-bound:v1:";
export const FORGE_CONTINUITY_STORAGE_KEY = "forge.device-continuity:v1";
export const FORGE_EVIDENCE_LEDGER_STORAGE_KEY = "forge.evidence-ledger";
export const FORGE_WORLD_SESSION_CHECKPOINT_STORAGE_PREFIX =
  "forge.world-session-checkpoint:v1:";

const PROFILE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface ForgeProfileBoundStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface ForgeProfileBoundLocalDataStorage extends ForgeProfileBoundStorageLike {
  readonly length: number;
  key(index: number): string | null;
}

export type ClearForgeProfileBoundLocalDataResult =
  | Readonly<{ ok: true; removedKeys: readonly string[] }>
  | Readonly<{ ok: false; reason: "storage_error" | "value_remains" }>;

function assertProfileId(profileId: string): void {
  if (!PROFILE_ID.test(profileId)) throw new Error("invalid_profile_id");
}

export function forgeProfileBoundStoragePrefix(profileId: string): string {
  assertProfileId(profileId);
  return `${FORGE_PROFILE_BOUND_STORAGE_PREFIX}${profileId}:`;
}

export function forgeProfileBoundStorageKey(key: string, profileId: string): string {
  if (!key || /[\u0000-\u001f\u007f]/.test(key)) throw new Error("invalid_storage_key");
  return `${forgeProfileBoundStoragePrefix(profileId)}${key}`;
}

export function createForgeProfileBoundStorage(
  storage: ForgeProfileBoundStorageLike,
  profileId: string,
  isActiveProfile?: () => boolean,
): ForgeProfileBoundStorageLike {
  const scopedKey = (key: string) => forgeProfileBoundStorageKey(key, profileId);
  const assertActive = () => {
    if (isActiveProfile && !isActiveProfile()) throw new Error("profile_mismatch");
  };

  return {
    getItem(key) {
      assertActive();
      return storage.getItem(scopedKey(key));
    },
    setItem(key, value) {
      assertActive();
      storage.setItem(scopedKey(key), value);
    },
    removeItem(key) {
      assertActive();
      storage.removeItem(scopedKey(key));
    },
  };
}

function isLegacyProfileBoundKey(key: string): boolean {
  return key === FORGE_CONTINUITY_STORAGE_KEY
    || key === FORGE_EVIDENCE_LEDGER_STORAGE_KEY
    || key.startsWith(FORGE_WORLD_SESSION_CHECKPOINT_STORAGE_PREFIX);
}

function isProfileBoundKey(key: string, profileId?: string): boolean {
  if (!key.startsWith(FORGE_PROFILE_BOUND_STORAGE_PREFIX)) return false;
  return profileId === undefined || key.startsWith(forgeProfileBoundStoragePrefix(profileId));
}

function isRemovalTarget(key: string, profileId?: string): boolean {
  return isLegacyProfileBoundKey(key) || isProfileBoundKey(key, profileId);
}

function enumerateKeys(storage: ForgeProfileBoundLocalDataStorage): readonly string[] | null {
  try {
    if (!Number.isSafeInteger(storage.length) || storage.length < 0) return null;
    const keys: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key === null) return null;
      keys.push(key);
    }
    return keys;
  } catch {
    return null;
  }
}

export function clearForgeProfileBoundLocalData(
  storage: ForgeProfileBoundLocalDataStorage,
  profileId?: string,
): ClearForgeProfileBoundLocalDataResult {
  if (profileId !== undefined) {
    try {
      assertProfileId(profileId);
    } catch {
      return { ok: false, reason: "storage_error" };
    }
  }

  const keys = enumerateKeys(storage);
  if (keys === null) return { ok: false, reason: "storage_error" };

  const targets = new Set<string>([
    FORGE_CONTINUITY_STORAGE_KEY,
    FORGE_EVIDENCE_LEDGER_STORAGE_KEY,
  ]);
  if (profileId !== undefined) {
    targets.add(forgeProfileBoundStorageKey(FORGE_CONTINUITY_STORAGE_KEY, profileId));
    targets.add(forgeProfileBoundStorageKey(FORGE_EVIDENCE_LEDGER_STORAGE_KEY, profileId));
  }
  keys.filter((key) => isRemovalTarget(key, profileId)).forEach((key) => targets.add(key));

  try {
    for (const key of targets) storage.removeItem(key);
  } catch {
    return { ok: false, reason: "storage_error" };
  }

  try {
    for (const key of targets) {
      if (storage.getItem(key) !== null) return { ok: false, reason: "value_remains" };
    }
  } catch {
    return { ok: false, reason: "storage_error" };
  }

  const remainingKeys = enumerateKeys(storage);
  if (remainingKeys === null) return { ok: false, reason: "storage_error" };
  if (remainingKeys.some((key) => isRemovalTarget(key, profileId))) {
    return { ok: false, reason: "value_remains" };
  }

  return { ok: true, removedKeys: [...targets] };
}
