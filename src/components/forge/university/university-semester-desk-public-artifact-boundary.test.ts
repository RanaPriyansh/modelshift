import { describe, expect, it } from "vitest";

import {
  UNIVERSITY_SEMESTER_DESK_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS,
  UNIVERSITY_SEMESTER_DESK_SURFACE_LEXICAL_SET,
  assertNoUniversitySemesterDeskPublicArtifactLeaks,
  findUniversitySemesterDeskPublicArtifactLeaks,
} from "./university-semester-desk-public-artifact-boundary";

describe("university semester desk public artifact boundary", () => {
  it("rejects every unique server-only marker in a public asset", () => {
    for (
      const marker
      of UNIVERSITY_SEMESTER_DESK_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS
    ) {
      expect(findUniversitySemesterDeskPublicArtifactLeaks([{
        path: "static/chunks/semester-desk.js",
        contents: marker,
      }])).toEqual([{
        path: "static/chunks/semester-desk.js",
        marker,
      }]);
    }
    expect(findUniversitySemesterDeskPublicArtifactLeaks([{
      path: "static/chunks/public.js",
      contents: "University semester desk is unavailable.",
    }])).toEqual([]);
  });

  it("rejects the complete development surface lexical set only", () => {
    expect(findUniversitySemesterDeskPublicArtifactLeaks([{
      path: "static/chunks/semester-desk.js",
      contents: UNIVERSITY_SEMESTER_DESK_SURFACE_LEXICAL_SET.join(" "),
    }])).toEqual([{
      path: "static/chunks/semester-desk.js",
      marker: "university semester desk server-only surface lexical set",
    }]);
    expect(findUniversitySemesterDeskPublicArtifactLeaks([{
      path: "static/chunks/public.js",
      contents: UNIVERSITY_SEMESTER_DESK_SURFACE_LEXICAL_SET[0]!,
    }])).toEqual([]);
  });

  it("rejects the complete development lexical set split across chunks", () => {
    const assets = UNIVERSITY_SEMESTER_DESK_SURFACE_LEXICAL_SET.map(
      (contents, index) => ({
        path: `static/chunks/semester-desk-${index}.js`,
        contents,
      }),
    );

    expect(findUniversitySemesterDeskPublicArtifactLeaks(assets)).toEqual([
      {
        path: "<public-static-assets>",
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

    expect(findUniversitySemesterDeskPublicArtifactLeaks(assets)).toEqual([]);
  });

  it("fails the build boundary when any leak is found", () => {
    expect(() => assertNoUniversitySemesterDeskPublicArtifactLeaks([{
      path: ".next/static/chunks/semester-desk.js",
      marker: "forge-university-semester-desk.v1",
    }])).toThrow(
      "University semester desk fixture data reached public build assets",
    );
  });
});
