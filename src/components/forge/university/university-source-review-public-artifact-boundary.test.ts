import { describe, expect, it } from "vitest";

import {
  UNIVERSITY_SOURCE_REVIEW_PRODUCTION_ARTIFACT_FORBIDDEN_MARKERS,
  UNIVERSITY_SOURCE_REVIEW_SURFACE_LEXICAL_SET,
  assertNoUniversitySourceReviewProductionArtifactLeaks,
  findUniversitySourceReviewProductionArtifactLeaks,
} from "./university-source-review-public-artifact-boundary";

describe("university source-review production artifact boundary", () => {
  it("rejects every server-only sample marker", () => {
    for (
      const marker of
      UNIVERSITY_SOURCE_REVIEW_PRODUCTION_ARTIFACT_FORBIDDEN_MARKERS
    ) {
      expect(findUniversitySourceReviewProductionArtifactLeaks([{
        path: ".next/server/chunks/university-review.js",
        contents: marker,
      }])).toEqual([{
        path: ".next/server/chunks/university-review.js",
        marker,
      }]);
    }
  });

  it("rejects the complete enabled surface across production artifacts", () => {
    const artifacts = UNIVERSITY_SOURCE_REVIEW_SURFACE_LEXICAL_SET.map(
      (contents, index) => ({
        path: `.next/${index % 2 === 0 ? "static" : "server"}/review-${index}.js`,
        contents,
      }),
    );
    expect(findUniversitySourceReviewProductionArtifactLeaks(artifacts))
      .toContainEqual({
        path: "<production-artifacts>",
        marker: "University source-review server-only surface lexical set",
      });
  });

  it("allows incomplete lexical sets and the unavailable shell", () => {
    expect(findUniversitySourceReviewProductionArtifactLeaks([{
      path: ".next/server/app/internal/university-source-review/page.js",
      contents: [
        ...UNIVERSITY_SOURCE_REVIEW_SURFACE_LEXICAL_SET.slice(0, -1),
        "Course source review is unavailable.",
      ].join("\n"),
    }])).toEqual([]);
    expect(findUniversitySourceReviewProductionArtifactLeaks([{
      path: ".next/static/chunks/university-review.js",
      contents: "generic unavailable route shell",
    }])).toEqual([]);
  });

  it("fails the build boundary when a sample marker is found", () => {
    expect(() => assertNoUniversitySourceReviewProductionArtifactLeaks([{
      path: ".next/server/chunks/university-review.js",
      marker: "course.sample-cs102",
    }])).toThrow(
      "Reviewed university source data reached production build artifacts",
    );
  });
});
