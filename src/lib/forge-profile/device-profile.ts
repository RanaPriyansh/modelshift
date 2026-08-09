import { z } from "zod";

import { exceedsUtf8ByteLimit } from "../storage/raw-byte-limit";
import {
  clearForgeProfileBoundLocalData,
  createForgeProfileBoundStorage,
  type ForgeProfileBoundLocalDataStorage,
  type ForgeProfileBoundStorageLike,
} from "./profile-bound-data";

export { forgeProfileBoundStorageKey } from "./profile-bound-data";

z.config({ jitless: true });

export const FORGE_DEVICE_PROFILE_KEY = "forge.device-profile:v1";
export const FORGE_DEVICE_PROFILE_EVENT = "forge:device-profile-changed";
export const MAX_FORGE_DEVICE_PROFILE_RAW_BYTES = 2 * 1024;

export const forgeDeviceProfileSchema = z.strictObject({
  schemaVersion: z.literal(1),
  profileId: z.string().uuid(),
  ageMode: z.enum(["child_with_grown_up", "teen", "adult"]),
  guardianPresent: z.boolean(),
  createdAt: z.string().datetime({ offset: true }),
}).superRefine((profile, context) => {
  const expectedGuardianPresence = profile.ageMode === "child_with_grown_up";
  if (profile.guardianPresent !== expectedGuardianPresence) {
    context.addIssue({
      code: "custom",
      message: "guardian presence must match the selected local device mode",
      path: ["guardianPresent"],
    });
  }
});

export type ForgeDeviceProfile = z.infer<typeof forgeDeviceProfileSchema>;

export function readForgeDeviceProfile(storage: Pick<Storage, "getItem">): ForgeDeviceProfile | null {
  try {
    const raw = storage.getItem(FORGE_DEVICE_PROFILE_KEY);
    if (!raw) return null;
    if (exceedsUtf8ByteLimit(raw, MAX_FORGE_DEVICE_PROFILE_RAW_BYTES)) return null;
    const parsed = forgeDeviceProfileSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function createForgeDeviceProfile(
  storage: Pick<Storage, "setItem">,
  ageMode: ForgeDeviceProfile["ageMode"],
  guardianPresent: boolean,
  now = new Date(),
  profileId = crypto.randomUUID(),
): ForgeDeviceProfile {
  if (ageMode === "child_with_grown_up" && !guardianPresent) {
    throw new Error("guardian_confirmation_required");
  }

  const profile = forgeDeviceProfileSchema.parse({
    schemaVersion: 1,
    profileId,
    ageMode,
    guardianPresent: ageMode === "child_with_grown_up" ? guardianPresent : false,
    createdAt: now.toISOString(),
  });
  const encoded = JSON.stringify(profile);
  if (exceedsUtf8ByteLimit(encoded, MAX_FORGE_DEVICE_PROFILE_RAW_BYTES)) {
    throw new Error("device_profile_size_exceeded");
  }
  storage.setItem(FORGE_DEVICE_PROFILE_KEY, encoded);
  return profile;
}

export type ClearForgeDeviceProfileResult =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; reason: "storage_error" | "value_remains" }>;

export function clearForgeDeviceProfile(
  storage: ForgeProfileBoundLocalDataStorage,
): ClearForgeDeviceProfileResult {
  try {
    const profile = readForgeDeviceProfile(storage);
    const localData = clearForgeProfileBoundLocalData(storage, profile?.profileId);
    if (!localData.ok) return localData;
    storage.removeItem(FORGE_DEVICE_PROFILE_KEY);
    return storage.getItem(FORGE_DEVICE_PROFILE_KEY) === null
      ? { ok: true }
      : { ok: false, reason: "value_remains" };
  } catch {
    return { ok: false, reason: "storage_error" };
  }
}

export function createActiveForgeProfileBoundStorage(
  storage: ForgeProfileBoundStorageLike,
): ForgeProfileBoundStorageLike | null {
  const profile = readForgeDeviceProfile(storage);
  if (!profile) return null;
  return createForgeProfileBoundStorage(
    storage,
    profile.profileId,
    () => readForgeDeviceProfile(storage)?.profileId === profile.profileId,
  );
}
