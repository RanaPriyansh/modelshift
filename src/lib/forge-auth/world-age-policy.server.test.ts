import { describe, expect, it } from "vitest";

import { resolveChildCapableWorldRouteAccess } from "./world-age-policy.server";

describe("child-capable World route policy", () => {
  it("fails closed instead of defaulting a direct route to teen", () => {
    expect(resolveChildCapableWorldRouteAccess({})).toEqual({ status: "age_selection_required" });
    expect(resolveChildCapableWorldRouteAccess({ audience: "unexpected" })).toEqual({ status: "age_selection_required" });
  });

  it("requires an explicit managed-session transition before rendering child Worlds", () => {
    expect(resolveChildCapableWorldRouteAccess({ audience: "child_with_grown_up" })).toEqual({
      status: "guardian_confirmation_required",
    });
    expect(resolveChildCapableWorldRouteAccess({ audience: "child_with_grown_up", guardianManaged: "false" })).toEqual({
      status: "guardian_confirmation_required",
    });
    expect(resolveChildCapableWorldRouteAccess({ audience: "child_with_grown_up", guardianManaged: "true" })).toEqual({
      status: "allowed",
      audience: "child_with_grown_up",
    });
  });

  it("does not infer child status from a local device profile or query omission", () => {
    expect(resolveChildCapableWorldRouteAccess({ audience: "teen" })).toEqual({ status: "allowed", audience: "teen" });
    expect(resolveChildCapableWorldRouteAccess({ audience: "adult" })).toEqual({ status: "allowed", audience: "adult" });
  });
});
