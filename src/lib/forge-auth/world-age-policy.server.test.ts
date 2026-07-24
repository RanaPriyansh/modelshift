import { describe, expect, it } from "vitest";

import { trustedWorldRegistry } from "@/src/forge/registry.server";

import { resolveWorldRouteAccess } from "./world-age-policy.server";

const RELEASED_ROUTES = [
  {
    route: "/learn/force-and-motion",
    ageModes: ["13-17", "18-plus"],
    audienceModes: ["teen", "adult"],
  },
  {
    route: "/learn/ai-and-learning",
    ageModes: ["13-17", "18-plus"],
    audienceModes: ["teen", "adult"],
  },
  {
    route: "/learn/proportional-reasoning",
    ageModes: ["under-13", "13-17", "18-plus"],
    audienceModes: ["child_with_grown_up", "teen", "adult"],
  },
  {
    route: "/learn/primary-source-reasoning",
    ageModes: ["under-13", "13-17", "18-plus"],
    audienceModes: ["child_with_grown_up", "teen", "adult"],
  },
] as const;

describe("registry-owned World route entry policy", () => {
  it.each(RELEASED_ROUTES)(
    "derives the exact eligible device choices for $route from its released manifest",
    ({ route, ageModes, audienceModes }) => {
      const manifest = trustedWorldRegistry.resolveAvailableRoute(route)?.manifest;
      const access = resolveWorldRouteAccess(route, {});

      expect(manifest?.ageModes).toEqual(ageModes);
      expect(access).toMatchObject({
        status: "device_profile_required",
        suggestedAudience: null,
        policy: {
          worldId: manifest?.id,
          worldTitle: manifest?.title,
          allowedAgeModes: ageModes,
          allowedAudienceModes: audienceModes,
        },
      });
      expect(access.policy.allowedAgeModes).toEqual(manifest?.ageModes);
    },
  );

  it("accepts only an eligible audience query as a preselection hint", () => {
    expect(resolveWorldRouteAccess("/learn/force-and-motion", { audience: "teen" }).suggestedAudience).toBe("teen");
    expect(resolveWorldRouteAccess("/learn/force-and-motion", { audience: "adult" }).suggestedAudience).toBe("adult");
    expect(resolveWorldRouteAccess("/learn/force-and-motion", {
      audience: "child_with_grown_up",
      guardianManaged: "true",
    }).suggestedAudience).toBeNull();
    expect(resolveWorldRouteAccess("/learn/proportional-reasoning", {
      audience: "child_with_grown_up",
      guardianManaged: "true",
    }).suggestedAudience).toBe("child_with_grown_up");
  });

  it("rejects malformed query shapes and routes without a released rendered World", () => {
    expect(resolveWorldRouteAccess("/learn/force-and-motion", {
      audience: ["teen", "adult"],
    }).suggestedAudience).toBeNull();
    expect(() => resolveWorldRouteAccess("/learn/not-a-world", {})).toThrow(
      "No released rendered World is registered",
    );
  });
});
