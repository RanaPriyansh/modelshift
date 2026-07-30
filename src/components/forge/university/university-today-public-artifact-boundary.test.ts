import { describe, expect, it } from "vitest";

import {
  UNIVERSITY_TODAY_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS,
  assertNoUniversityTodayPublicArtifactLeaks,
  findUniversityTodayPublicArtifactLeaks,
} from "./university-today-public-artifact-boundary";

describe("university Today public artifact boundary", () => {
  it("rejects every server-only sample marker in a public asset", () => {
    for (const marker of UNIVERSITY_TODAY_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS) {
      expect(findUniversityTodayPublicArtifactLeaks([{
        path: "static/chunks/university-today.js",
        contents: marker,
      }])).toEqual([{ path: "static/chunks/university-today.js", marker }]);
    }
    expect(findUniversityTodayPublicArtifactLeaks([{
      path: "static/chunks/university-today.js",
      contents: "generic unavailable route shell",
    }])).toEqual([]);
  });

  it("fails the build boundary when a sample marker is found", () => {
    expect(() => assertNoUniversityTodayPublicArtifactLeaks([{
      path: ".next/static/chunks/university-today.js",
      marker: "forge-university-today.v1",
    }])).toThrow("University Today sample data reached public build assets");
  });
});
