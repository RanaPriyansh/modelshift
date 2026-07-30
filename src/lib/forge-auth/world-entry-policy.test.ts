import { describe, expect, it } from "vitest";

import {
  isProfileAllowedByAgePolicy,
  requiresFreshGrownUpConfirmation,
} from "./world-entry-policy";

describe("World entry profile policy", () => {
  it("maps each local audience to the exact released age policy", () => {
    expect(isProfileAllowedByAgePolicy(["under-13"], "child_with_grown_up")).toBe(true);
    expect(isProfileAllowedByAgePolicy(["13-17"], "teen")).toBe(true);
    expect(isProfileAllowedByAgePolicy(["18-plus"], "adult")).toBe(true);
    expect(isProfileAllowedByAgePolicy(["13-17", "18-plus"], "child_with_grown_up")).toBe(false);
  });

  it("requires a fresh confirmation only for an allowed child policy", () => {
    expect(requiresFreshGrownUpConfirmation(
      ["under-13", "13-17", "18-plus"],
      "child_with_grown_up",
    )).toBe(true);
    expect(requiresFreshGrownUpConfirmation(["13-17", "18-plus"], "teen")).toBe(false);
    expect(requiresFreshGrownUpConfirmation(["18-plus"], "adult")).toBe(false);
  });
});
