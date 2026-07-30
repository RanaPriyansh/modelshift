import { describe, expect, it } from "vitest";

import {
  UNIVERSITY_SOURCE_REVIEW_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS,
  assertNoUniversitySourceReviewPublicArtifactLeaks,
  findUniversitySourceReviewPublicArtifactLeaks,
} from "./university-source-review-public-artifact-boundary";

describe("university source-review public artifact boundary", () => {
  it("rejects every server-only sample marker in a public asset", () => {
    for (const marker of UNIVERSITY_SOURCE_REVIEW_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS) {
      expect(findUniversitySourceReviewPublicArtifactLeaks([{
        path: "static/chunks/university-review.js",
        contents: marker,
      }])).toEqual([{ path: "static/chunks/university-review.js", marker }]);
    }
    expect(findUniversitySourceReviewPublicArtifactLeaks([{
      path: "static/chunks/university-review.js",
      contents: "generic unavailable route shell",
    }])).toEqual([]);
  });

  it("fails the build boundary when a sample marker is found", () => {
    expect(() => assertNoUniversitySourceReviewPublicArtifactLeaks([{
      path: ".next/static/chunks/university-review.js",
      marker: "course.sample-cs102",
    }])).toThrow("Reviewed university source data reached public build assets");
  });
});
