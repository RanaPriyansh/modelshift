import type { ForgeDeviceProfile } from "@/src/lib/forge-profile/device-profile";

export const WORLD_ENTRY_AGE_MODES = ["under-13", "13-17", "18-plus"] as const;
export const WORLD_ROUTE_AUDIENCES = ["child_with_grown_up", "teen", "adult"] as const;
export const RENDERED_WORLD_IDS = [
  "world.force-and-motion",
  "world.source-corroboration",
  "world.proportional-reasoning",
  "world.primary-source-reasoning",
] as const;

export type WorldEntryAgeMode = (typeof WORLD_ENTRY_AGE_MODES)[number];
export type WorldRouteAudience = (typeof WORLD_ROUTE_AUDIENCES)[number];
export type RenderedWorldId = (typeof RENDERED_WORLD_IDS)[number];

export type WorldEntryPolicy = Readonly<{
  worldId: RenderedWorldId;
  worldTitle: string;
  allowedAgeModes: readonly WorldEntryAgeMode[];
  allowedAudienceModes: readonly WorldRouteAudience[];
}>;

export const WORLD_ENTRY_MODE_DETAILS: ReadonlyArray<Readonly<{
  ageMode: WorldEntryAgeMode;
  audience: WorldRouteAudience;
  label: string;
  note: string;
}>> = [
  {
    ageMode: "under-13",
    audience: "child_with_grown_up",
    label: "Child + grown-up",
    note: "A grown-up manages this device session",
  },
  {
    ageMode: "13-17",
    audience: "teen",
    label: "Teen",
    note: "Authored, device-only learning",
  },
  {
    ageMode: "18-plus",
    audience: "adult",
    label: "Adult",
    note: "Authored, device-only learning",
  },
];

export function audienceForAgeMode(ageMode: WorldEntryAgeMode): WorldRouteAudience {
  const detail = WORLD_ENTRY_MODE_DETAILS.find((candidate) => candidate.ageMode === ageMode);
  if (!detail) throw new Error(`Unsupported World entry age mode: ${String(ageMode)}`);
  return detail.audience;
}

export function isRenderedWorldId(value: string): value is RenderedWorldId {
  return (RENDERED_WORLD_IDS as readonly string[]).includes(value);
}

export function isWorldRouteAudience(value: unknown): value is WorldRouteAudience {
  return typeof value === "string"
    && (WORLD_ROUTE_AUDIENCES as readonly string[]).includes(value);
}

export function isAudienceAllowed(
  policy: Pick<WorldEntryPolicy, "allowedAudienceModes">,
  audience: ForgeDeviceProfile["ageMode"],
): audience is WorldRouteAudience {
  return policy.allowedAudienceModes.includes(audience);
}

export function isProfileAllowedByAgePolicy(
  allowedAgeModes: readonly WorldEntryAgeMode[],
  audience: ForgeDeviceProfile["ageMode"],
): boolean {
  const detail = WORLD_ENTRY_MODE_DETAILS.find(
    (candidate) => candidate.audience === audience,
  );
  return detail ? allowedAgeModes.includes(detail.ageMode) : false;
}

/**
 * A persisted child-mode profile remains only a local policy preference. It
 * never satisfies the fresh, in-memory confirmation required to open one
 * exact child session or return.
 */
export function requiresFreshGrownUpConfirmation(
  allowedAgeModes: readonly WorldEntryAgeMode[],
  audience: ForgeDeviceProfile["ageMode"],
): boolean {
  return audience === "child_with_grown_up"
    && allowedAgeModes.includes("under-13");
}
