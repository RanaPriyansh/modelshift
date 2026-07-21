import { z } from "zod";

z.config({ jitless: true });

export const FORGE_DEVICE_PROFILE_KEY = "forge.device-profile:v1";

export const forgeDeviceProfileSchema = z.strictObject({
  schemaVersion: z.literal(1),
  profileId: z.string().uuid(),
  ageMode: z.enum(["child_with_grown_up", "teen", "adult"]),
  guardianPresent: z.boolean(),
  createdAt: z.string().datetime({ offset: true }),
});

export type ForgeDeviceProfile = z.infer<typeof forgeDeviceProfileSchema>;

export function readForgeDeviceProfile(storage: Pick<Storage, "getItem">): ForgeDeviceProfile | null {
  try {
    const raw = storage.getItem(FORGE_DEVICE_PROFILE_KEY);
    if (!raw) return null;
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
  storage.setItem(FORGE_DEVICE_PROFILE_KEY, JSON.stringify(profile));
  return profile;
}

export function clearForgeDeviceProfile(storage: Pick<Storage, "removeItem">): void {
  try {
    storage.removeItem(FORGE_DEVICE_PROFILE_KEY);
  } catch {
    // Storage can be unavailable or read-only; clearing is best-effort.
  }
}
