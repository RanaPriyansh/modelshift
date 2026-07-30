import { describe, expect, it } from "vitest";

import { readUniversitySourceReviewGate } from "@/app/internal/university-source-review/fixture-gate.server";

describe("university source review route gate", () => {
  it("is unavailable by default and accepts only the exact server-owned fixture token", () => {
    expect(readUniversitySourceReviewGate({})).toEqual({
      enabled: false,
      status: "review-fixture-unavailable",
    });
    expect(readUniversitySourceReviewGate({
      FORGE_UNIVERSITY_SOURCE_REVIEW_FIXTURE: "true",
    }).enabled).toBe(false);
    expect(readUniversitySourceReviewGate({
      FORGE_UNIVERSITY_SOURCE_REVIEW_FIXTURE: "forge-university-source-review.v1 ",
    }).enabled).toBe(false);
    expect(readUniversitySourceReviewGate({
      NEXT_PUBLIC_FORGE_UNIVERSITY_SOURCE_REVIEW_FIXTURE: "forge-university-source-review.v1",
    }).enabled).toBe(false);
    expect(readUniversitySourceReviewGate({
      FORGE_UNIVERSITY_SOURCE_REVIEW_FIXTURE: "forge-university-source-review.v1",
    })).toEqual({
      enabled: true,
      status: "review-fixture-enabled",
    });
  });
});
