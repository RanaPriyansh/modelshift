import "server-only";

import { trustedWorldRegistry } from "@/src/forge/registry.server";

import {
  audienceForAgeMode,
  isRenderedWorldId,
  isWorldRouteAudience,
  type WorldEntryAgeMode,
  type WorldEntryPolicy,
  type WorldRouteAudience,
} from "./world-entry-policy";

export type WorldEntrySearchParams = Readonly<{
  audience?: string | readonly string[];
  guardianManaged?: string | readonly string[];
}>;

export type WorldAgeRouteAccess = {
  status: "device_profile_required";
  suggestedAudience: WorldRouteAudience | null;
  policy: WorldEntryPolicy;
};

/**
 * Search parameters are untrusted routing hints, never an age or guardian
 * authorization boundary. The server derives eligible choices from the
 * released registry package and always hands control to the browser-local v1
 * device-profile gate before rendering any World.
 */
export function resolveWorldRouteAccess(
  route: string,
  searchParams: WorldEntrySearchParams,
): WorldAgeRouteAccess {
  const pack = trustedWorldRegistry.resolveAvailableRoute(route);
  if (!pack || !isRenderedWorldId(pack.manifest.id)) {
    throw new Error(`No released rendered World is registered for route: ${route}`);
  }

  const allowedAgeModes = pack.manifest.ageModes as readonly WorldEntryAgeMode[];
  if (allowedAgeModes.includes("under-13") && !pack.manifest.safety.guardianManaged) {
    throw new Error(`Under-13 World ${pack.manifest.id} is missing guardian-managed safety policy.`);
  }

  const allowedAudienceModes = allowedAgeModes.map(audienceForAgeMode);
  const requestedAudience = searchParams.audience;
  const suggestedAudience = isWorldRouteAudience(requestedAudience)
    && allowedAudienceModes.includes(requestedAudience)
    ? requestedAudience
    : null;

  return {
    status: "device_profile_required",
    suggestedAudience,
    policy: {
      worldId: pack.manifest.id,
      worldTitle: pack.manifest.title,
      allowedAgeModes,
      allowedAudienceModes,
    },
  };
}
