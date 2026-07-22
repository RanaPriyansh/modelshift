import "server-only";

export type WorldRouteAudience = "child_with_grown_up" | "teen" | "adult";

export type WorldAgeRouteAccess = {
  status: "device_profile_required";
  suggestedAudience: WorldRouteAudience | null;
};

/**
 * Search parameters are untrusted routing hints, never an age or guardian
 * authorization boundary. The route always hands control to the browser-local
 * v1 device-profile gate before rendering a child-capable World.
 */
export function resolveChildCapableWorldRouteAccess(searchParams: {
  audience?: string;
  guardianManaged?: string;
}): WorldAgeRouteAccess {
  const suggestedAudience = isWorldRouteAudience(searchParams.audience)
    ? searchParams.audience
    : null;
  return { status: "device_profile_required", suggestedAudience };
}

function isWorldRouteAudience(value: string | undefined): value is WorldRouteAudience {
  return value === "child_with_grown_up" || value === "teen" || value === "adult";
}
