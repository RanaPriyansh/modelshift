import { describe, expect, it } from "vitest";

import {
  UNIVERSITY_SEMESTER_OVERVIEW_PRODUCTION_ARTIFACT_FORBIDDEN_MARKERS,
  UNIVERSITY_SEMESTER_OVERVIEW_SURFACE_LEXICAL_SET,
  assertNoUniversitySemesterOverviewProductionArtifactLeaks,
  findUniversitySemesterOverviewProductionArtifactLeaks,
} from "./university-semester-overview-public-artifact-boundary";

describe("university semester overview production artifact boundary", () => {
  it("rejects every unique server-only marker", () => {
    for (
      const marker
      of UNIVERSITY_SEMESTER_OVERVIEW_PRODUCTION_ARTIFACT_FORBIDDEN_MARKERS
    ) {
      expect(findUniversitySemesterOverviewProductionArtifactLeaks([{
        path: ".next/server/chunks/semester-overview.js",
        contents: marker,
      }])).toEqual([{
        path: ".next/server/chunks/semester-overview.js",
        marker,
      }]);
    }
    expect(findUniversitySemesterOverviewProductionArtifactLeaks([{
      path: ".next/static/chunks/public.js",
      contents: "University semester overview is unavailable.",
    }])).toEqual([]);
  });

  it("rejects the complete development surface lexical set only", () => {
    expect(findUniversitySemesterOverviewProductionArtifactLeaks([{
      path: ".next/server/chunks/semester-overview.js",
      contents: UNIVERSITY_SEMESTER_OVERVIEW_SURFACE_LEXICAL_SET.join(" "),
    }])).toEqual([{
      path: ".next/server/chunks/semester-overview.js",
      marker: "university semester overview server-only surface lexical set",
    }]);
    expect(findUniversitySemesterOverviewProductionArtifactLeaks([{
      path: ".next/static/chunks/public.js",
      contents: UNIVERSITY_SEMESTER_OVERVIEW_SURFACE_LEXICAL_SET[0]!,
    }])).toEqual([]);
  });

  it("rejects the complete development lexical set split across chunks", () => {
    const assets = UNIVERSITY_SEMESTER_OVERVIEW_SURFACE_LEXICAL_SET.map(
      (contents, index) => ({
        path: `.next/${index % 2 === 0
          ? "static"
          : "server"}/semester-overview-${index}.js`,
        contents,
      }),
    );

    expect(findUniversitySemesterOverviewProductionArtifactLeaks(assets))
      .toEqual([
      {
        path: "<production-artifacts>",
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

    expect(findUniversitySemesterOverviewProductionArtifactLeaks(assets))
      .toEqual([]);
  });

  it("fails the build boundary when any leak is found", () => {
    expect(() => assertNoUniversitySemesterOverviewProductionArtifactLeaks([{
      path: ".next/server/chunks/semester-overview.js",
      marker: "forge-university-semester-overview.v1",
    }])).toThrow(
      "University semester overview fixture data reached production build artifacts",
    );
  });
});
