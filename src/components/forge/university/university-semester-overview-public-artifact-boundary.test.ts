import { describe, expect, it } from "vitest";

import {
  UNIVERSITY_SEMESTER_OVERVIEW_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS,
  UNIVERSITY_SEMESTER_OVERVIEW_SURFACE_LEXICAL_SET,
  assertNoUniversitySemesterOverviewPublicArtifactLeaks,
  findUniversitySemesterOverviewPublicArtifactLeaks,
} from "./university-semester-overview-public-artifact-boundary";

describe("university semester overview public artifact boundary", () => {
  it("rejects every unique server-only marker in a public asset", () => {
    for (
      const marker
      of UNIVERSITY_SEMESTER_OVERVIEW_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS
    ) {
      expect(findUniversitySemesterOverviewPublicArtifactLeaks([{
        path: "static/chunks/semester-overview.js",
        contents: marker,
      }])).toEqual([{
        path: "static/chunks/semester-overview.js",
        marker,
      }]);
    }
    expect(findUniversitySemesterOverviewPublicArtifactLeaks([{
      path: "static/chunks/public.js",
      contents: "University semester overview is unavailable.",
    }])).toEqual([]);
  });

  it("rejects the complete development surface lexical set only", () => {
    expect(findUniversitySemesterOverviewPublicArtifactLeaks([{
      path: "static/chunks/semester-overview.js",
      contents: UNIVERSITY_SEMESTER_OVERVIEW_SURFACE_LEXICAL_SET.join(" "),
    }])).toEqual([{
      path: "static/chunks/semester-overview.js",
      marker: "university semester overview server-only surface lexical set",
    }]);
    expect(findUniversitySemesterOverviewPublicArtifactLeaks([{
      path: "static/chunks/public.js",
      contents: UNIVERSITY_SEMESTER_OVERVIEW_SURFACE_LEXICAL_SET[0]!,
    }])).toEqual([]);
  });

  it("rejects the complete development lexical set split across chunks", () => {
    const assets = UNIVERSITY_SEMESTER_OVERVIEW_SURFACE_LEXICAL_SET.map(
      (contents, index) => ({
        path: `static/chunks/semester-overview-${index}.js`,
        contents,
      }),
    );

    expect(findUniversitySemesterOverviewPublicArtifactLeaks(assets)).toEqual([
      {
        path: "<public-static-assets>",
        marker:
          "university semester overview server-only surface lexical set",
      },
    ]);
  });

  it("does not reject an incomplete lexical set split across chunks", () => {
    const assets = UNIVERSITY_SEMESTER_OVERVIEW_SURFACE_LEXICAL_SET
      .slice(0, -1)
      .map((contents, index) => ({
        path: `static/chunks/public-${index}.js`,
        contents,
      }));

    expect(findUniversitySemesterOverviewPublicArtifactLeaks(assets))
      .toEqual([]);
  });

  it("fails the build boundary when any leak is found", () => {
    expect(() => assertNoUniversitySemesterOverviewPublicArtifactLeaks([{
      path: ".next/static/chunks/semester-overview.js",
      marker: "forge-university-semester-overview.v1",
    }])).toThrow(
      "University semester overview fixture data reached public build assets",
    );
  });
});
