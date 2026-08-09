import { describe, expect, it } from "vitest";

import {
  UNIVERSITY_TODAY_PRODUCTION_ARTIFACT_FORBIDDEN_MARKERS,
  UNIVERSITY_TODAY_SURFACE_LEXICAL_SET,
  assertNoUniversityTodayProductionArtifactLeaks,
  findUniversityTodayProductionArtifactLeaks,
} from "./university-today-public-artifact-boundary";

describe("university Today production artifact boundary", () => {
  it("rejects every server-only sample marker", () => {
    for (
      const marker of UNIVERSITY_TODAY_PRODUCTION_ARTIFACT_FORBIDDEN_MARKERS
    ) {
      expect(findUniversityTodayProductionArtifactLeaks([{
        path: ".next/server/chunks/university-today.js",
        contents: marker,
      }])).toEqual([{
        path: ".next/server/chunks/university-today.js",
        marker,
      }]);
    }
  });

  it("rejects the complete enabled surface across production artifacts", () => {
    const artifacts = UNIVERSITY_TODAY_SURFACE_LEXICAL_SET.map(
      (contents, index) => ({
        path: `.next/${index % 2 === 0 ? "static" : "server"}/today-${index}.js`,
        contents,
      }),
    );
    expect(findUniversityTodayProductionArtifactLeaks(artifacts)).toContainEqual({
      path: "<production-artifacts>",
      marker: "University Today server-only surface lexical set",
    });
  });

  it("allows incomplete lexical sets and the unavailable shell", () => {
    expect(findUniversityTodayProductionArtifactLeaks([{
      path: ".next/server/app/internal/university-today/page.js",
      contents: [
        ...UNIVERSITY_TODAY_SURFACE_LEXICAL_SET.slice(0, -1),
        "University Today is unavailable.",
      ].join("\n"),
    }])).toEqual([]);
    expect(findUniversityTodayProductionArtifactLeaks([{
      path: ".next/static/chunks/university-today.js",
      contents: "generic unavailable route shell",
    }])).toEqual([]);
  });

  it("fails the build boundary when a sample marker is found", () => {
    expect(() => assertNoUniversityTodayProductionArtifactLeaks([{
      path: ".next/server/chunks/university-today.js",
      marker: "forge-university-today.v1",
    }])).toThrow(
      "University Today sample data reached production build artifacts",
    );
  });
});
