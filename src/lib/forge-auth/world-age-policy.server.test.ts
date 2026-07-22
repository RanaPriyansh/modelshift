import { describe, expect, it } from "vitest";

import { resolveChildCapableWorldRouteAccess } from "./world-age-policy.server";

describe("child-capable World route policy", () => {
  it("requires a device-profile gate for every direct route", () => {
    expect(resolveChildCapableWorldRouteAccess({})).toEqual({
      status: "device_profile_required",
      suggestedAudience: null,
    });
    expect(resolveChildCapableWorldRouteAccess({ audience: "unexpected" })).toEqual({
      status: "device_profile_required",
      suggestedAudience: null,
    });
  });

  it("treats audience and guardian query values as hints, never route authority", () => {
    expect(resolveChildCapableWorldRouteAccess({ audience: "teen" })).toEqual({
      status: "device_profile_required",
      suggestedAudience: "teen",
    });
    expect(resolveChildCapableWorldRouteAccess({ audience: "adult" })).toEqual({
      status: "device_profile_required",
      suggestedAudience: "adult",
    });
    expect(resolveChildCapableWorldRouteAccess({ audience: "child_with_grown_up", guardianManaged: "true" })).toEqual({
      status: "device_profile_required",
      suggestedAudience: "child_with_grown_up",
    });
  });
});
