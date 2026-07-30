import { describe, expect, it } from "vitest";

import {
  UNIVERSITY_PROTECTED_STUDY_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS,
  assertNoUniversityProtectedStudyPublicArtifactLeaks,
  findUniversityProtectedStudyPublicArtifactLeaks,
} from "./university-protected-study-public-artifact-boundary";

describe("university protected-study public artifact boundary", () => {
  it("rejects every server-only sample marker in a public asset", () => {
    for (
      const marker of
      UNIVERSITY_PROTECTED_STUDY_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS
    ) {
      expect(findUniversityProtectedStudyPublicArtifactLeaks([{
        path: "static/chunks/university-protected-study.js",
        contents: marker,
      }])).toEqual([{
        path: "static/chunks/university-protected-study.js",
        marker,
      }]);
    }
    expect(findUniversityProtectedStudyPublicArtifactLeaks([{
      path: "static/chunks/university-protected-study.js",
      contents: "generic unavailable route shell",
    }])).toEqual([]);
  });

  it("fails the build boundary when a sample marker is found", () => {
    expect(() => assertNoUniversityProtectedStudyPublicArtifactLeaks([{
      path: ".next/static/chunks/university-protected-study.js",
      marker: "forge-university-protected-study.v1",
    }])).toThrow(
      "University protected-study sample data reached public build assets",
    );
  });
});
