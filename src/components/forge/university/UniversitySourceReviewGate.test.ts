import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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

  it("keeps the client reconciler free of static Node-only imports", () => {
    const reconciler = readFileSync(
      resolve(process.cwd(), "src/forge/course-sources/reconcile.ts"),
      "utf8",
    );

    expect(reconciler).not.toMatch(/(?:from|import\()\s*["']node:/);
    expect(reconciler).toContain(
      'process.getBuiltinModule("node:util").types.isProxy',
    );
  });
});
