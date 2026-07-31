import { describe, expect, it } from "vitest";

import {
  UNIVERSITY_SEMESTER_DESK_PRODUCTION_ARTIFACT_FORBIDDEN_MARKERS,
  UNIVERSITY_SEMESTER_DESK_SURFACE_LEXICAL_SET,
  assertNoUniversitySemesterDeskProductionArtifactLeaks,
  findUniversitySemesterDeskProductionArtifactLeaks,
} from "./university-semester-desk-public-artifact-boundary";

describe("university semester desk production artifact boundary", () => {
  it("rejects every unique server-only marker", () => {
    for (
      const marker
      of UNIVERSITY_SEMESTER_DESK_PRODUCTION_ARTIFACT_FORBIDDEN_MARKERS
    ) {
      expect(findUniversitySemesterDeskProductionArtifactLeaks([{
        path: ".next/server/chunks/semester-desk.js",
        contents: marker,
      }])).toEqual([{
        path: ".next/server/chunks/semester-desk.js",
        marker,
      }]);
    }
    expect(findUniversitySemesterDeskProductionArtifactLeaks([{
      path: ".next/static/chunks/public.js",
      contents: "University semester desk is unavailable.",
    }])).toEqual([]);
  });

  it("rejects the complete development surface lexical set only", () => {
    expect(findUniversitySemesterDeskProductionArtifactLeaks([{
      path: ".next/server/chunks/semester-desk.js",
      contents: UNIVERSITY_SEMESTER_DESK_SURFACE_LEXICAL_SET.join(" "),
    }])).toEqual([{
      path: ".next/server/chunks/semester-desk.js",
      marker: "university semester desk server-only surface lexical set",
    }]);
    expect(findUniversitySemesterDeskProductionArtifactLeaks([{
      path: ".next/static/chunks/public.js",
      contents: UNIVERSITY_SEMESTER_DESK_SURFACE_LEXICAL_SET[0]!,
    }])).toEqual([]);
  });

  it("rejects the complete development lexical set split across chunks", () => {
    const assets = UNIVERSITY_SEMESTER_DESK_SURFACE_LEXICAL_SET.map(
      (contents, index) => ({
        path: `.next/${index % 2 === 0
          ? "static"
          : "server"}/semester-desk-${index}.js`,
        contents,
      }),
    );

    expect(findUniversitySemesterDeskProductionArtifactLeaks(assets)).toEqual([
      {
        path: "<production-artifacts>",
        marker: "university semester desk server-only surface lexical set",
      },
    ]);
  });

  it("does not reject an incomplete lexical set split across chunks", () => {
    const assets = UNIVERSITY_SEMESTER_DESK_SURFACE_LEXICAL_SET
      .slice(0, -1)
      .map((contents, index) => ({
        path: `static/chunks/public-${index}.js`,
        contents,
      }));

    expect(findUniversitySemesterDeskProductionArtifactLeaks(assets))
      .toEqual([]);
  });

  it("fails the build boundary when any leak is found", () => {
    expect(() => assertNoUniversitySemesterDeskProductionArtifactLeaks([{
      path: ".next/server/chunks/semester-desk.js",
      marker: "forge-university-semester-desk.v1",
    }])).toThrow(
      "University semester desk fixture data reached production build artifacts",
    );
  });
});
