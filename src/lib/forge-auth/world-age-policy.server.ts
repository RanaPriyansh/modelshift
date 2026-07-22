import "server-only";

export type WorldRouteAudience = "child_with_grown_up" | "teen" | "adult";

export type WorldAgeRouteAccess =
  | { status: "age_selection_required" }
  | { status: "guardian_confirmation_required" }
  | { status: "allowed"; audience: WorldRouteAudience };

/**
 * Server-rendered route policy for Worlds that offer an under-13 path. This
 * makes an absent or forged child query fail closed before a World is rendered.
 * The value remains a local session declaration, not verified age or guardian
 * authority; verified relationships are explicitly out of scope until D-05.
 */
export function resolveChildCapableWorldRouteAccess(searchParams: {
  audience?: string;
  guardianManaged?: string;
}): WorldAgeRouteAccess {
  switch (searchParams.audience) {
    case "teen":
    case "adult":
      return { status: "allowed", audience: searchParams.audience };
    case "child_with_grown_up":
      return searchParams.guardianManaged === "true"
        ? { status: "allowed", audience: "child_with_grown_up" }
        : { status: "guardian_confirmation_required" };
    default:
      return { status: "age_selection_required" };
  }
}
