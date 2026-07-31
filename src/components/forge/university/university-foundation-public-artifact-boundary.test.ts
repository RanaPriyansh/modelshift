import { describe, expect, it } from "vitest";

import {
  UNIVERSITY_FOUNDATION_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS,
  UNIVERSITY_FOUNDATION_SURFACE_LEXICAL_SETS,
  assertNoUniversityFoundationPublicArtifactLeaks,
  findUniversityFoundationPublicArtifactLeaks,
} from "./university-foundation-public-artifact-boundary";

describe("university foundation production artifact boundary", () => {
  it("rejects every server-only marker", () => {
    for (
      const [surface, markers]
      of Object.entries(UNIVERSITY_FOUNDATION_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS)
    ) {
      for (const marker of markers) {
        expect(findUniversityFoundationPublicArtifactLeaks([{
          path: ".next/server/app/internal/chunk.js",
          contents: marker,
        }])).toContainEqual({
          surface,
          path: ".next/server/app/internal/chunk.js",
          marker,
        });
      }
    }
  });

  it("rejects each complete surface lexical set across artifacts", () => {
    for (
      const [surface, lexicalSet]
      of Object.entries(UNIVERSITY_FOUNDATION_SURFACE_LEXICAL_SETS)
    ) {
      const artifacts = lexicalSet.map((contents, index) => ({
        path: `.next/static/chunks/${surface}-${index}.js`,
        contents,
      }));
      expect(findUniversityFoundationPublicArtifactLeaks(artifacts)).toContainEqual({
        surface,
        path: "<production-artifacts>",
        marker: `university ${surface === "commandCenter"
          ? "command center"
          : surface === "degreeMap"
          ? "degree map"
          : "learning map"} server-only surface lexical set`,
      });
    }
  });

  it("does not reject incomplete lexical sets or unavailable shells", () => {
    const artifacts = Object.entries(
      UNIVERSITY_FOUNDATION_SURFACE_LEXICAL_SETS,
    ).flatMap(([surface, lexicalSet]) => (
      lexicalSet.slice(0, -1).map((contents, index) => ({
        path: `.next/static/chunks/${surface}-public-${index}.js`,
        contents,
      }))
    ));
    artifacts.push({
      path: ".next/server/app/internal/unavailable.js",
      contents:
        "University workspace map is unavailable. Degree map is unavailable. University learning map is unavailable.",
    });

    expect(findUniversityFoundationPublicArtifactLeaks(artifacts)).toEqual([]);
  });

  it("fails the build boundary when a leak exists", () => {
    expect(() => assertNoUniversityFoundationPublicArtifactLeaks([{
      surface: "degreeMap",
      path: ".next/server/app/internal/degree-map.js",
      marker: "forge-university-degree-map.v1",
    }])).toThrow(
      "University foundation fixture data reached production build artifacts",
    );
  });
});
