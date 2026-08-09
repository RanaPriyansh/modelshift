import { describe, expect, it } from "vitest";

import {
  UNIVERSITY_PROTECTED_STUDY_PRODUCTION_ARTIFACT_FORBIDDEN_MARKERS,
  UNIVERSITY_PROTECTED_STUDY_SURFACE_LEXICAL_SET,
  assertNoUniversityProtectedStudyProductionArtifactLeaks,
  findUniversityProtectedStudyProductionArtifactLeaks,
} from "./university-protected-study-public-artifact-boundary";

describe("university protected-study production artifact boundary", () => {
  it("rejects every server-only sample marker", () => {
    for (
      const marker of
      UNIVERSITY_PROTECTED_STUDY_PRODUCTION_ARTIFACT_FORBIDDEN_MARKERS
    ) {
      expect(findUniversityProtectedStudyProductionArtifactLeaks([{
        path: ".next/server/chunks/university-protected-study.js",
        contents: marker,
      }])).toEqual([{
        path: ".next/server/chunks/university-protected-study.js",
        marker,
      }]);
    }
  });

  it("rejects the complete enabled surface across production artifacts", () => {
    const artifacts = UNIVERSITY_PROTECTED_STUDY_SURFACE_LEXICAL_SET.map(
      (contents, index) => ({
        path: `.next/${index % 2 === 0
          ? "static"
          : "server"}/protected-${index}.js`,
        contents,
      }),
    );
    expect(findUniversityProtectedStudyProductionArtifactLeaks(artifacts))
      .toContainEqual({
        path: "<production-artifacts>",
        marker: "University protected-study server-only surface lexical set",
      });
  });

  it("allows incomplete lexical sets and the unavailable shell", () => {
    expect(findUniversityProtectedStudyProductionArtifactLeaks([{
      path: ".next/server/app/internal/university-protected-study/page.js",
      contents: [
        ...UNIVERSITY_PROTECTED_STUDY_SURFACE_LEXICAL_SET.slice(0, -1),
        "No protected-study research state is available.",
      ].join("\n"),
    }])).toEqual([]);
    expect(findUniversityProtectedStudyProductionArtifactLeaks([{
      path: ".next/static/chunks/university-protected-study.js",
      contents: "generic unavailable route shell",
    }])).toEqual([]);
  });

  it("fails the build boundary when a sample marker is found", () => {
    expect(() => assertNoUniversityProtectedStudyProductionArtifactLeaks([{
      path: ".next/server/chunks/university-protected-study.js",
      marker: "forge-university-protected-study.v1",
    }])).toThrow(
      "University protected-study sample data reached production build artifacts",
    );
  });
});
