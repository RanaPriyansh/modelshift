import { describe, expect, it } from "vitest";

import { readAdultPilotReviewGate } from "@/app/pilot/fixture-gate.server";

describe("adult pilot review route gate", () => {
  it("is unavailable by default and accepts only the exact server-owned review fixture flag", () => {
    expect(readAdultPilotReviewGate({})).toEqual({ enabled: false, status: "review-fixture-unavailable" });
    expect(readAdultPilotReviewGate({ FORGE_ADULT_PILOT_REVIEW_FIXTURE: "true" })).toEqual({ enabled: false, status: "review-fixture-unavailable" });
    expect(readAdultPilotReviewGate({ FORGE_ADULT_PILOT_REVIEW_FIXTURE: "forge-reviewed-adult-pilot-route.v1 " })).toEqual({ enabled: false, status: "review-fixture-unavailable" });
    expect(readAdultPilotReviewGate({ NEXT_PUBLIC_FORGE_ADULT_PILOT_REVIEW_FIXTURE: "forge-reviewed-adult-pilot-route.v1" })).toEqual({ enabled: false, status: "review-fixture-unavailable" });
    expect(readAdultPilotReviewGate({ FORGE_ADULT_PILOT_REVIEW_FIXTURE: "forge-reviewed-adult-pilot-route.v1" })).toEqual({ enabled: true, status: "review-fixture-enabled" });
  });
});
