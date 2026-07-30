import { describe, expect, it } from "vitest";

import {
  UNIVERSITY_SEMESTER_LOOP_FIXTURE_LABELS,
  UNIVERSITY_SEMESTER_LOOP_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS,
  assertNoUniversitySemesterLoopPublicArtifactLeaks,
  findUniversitySemesterLoopPublicArtifactLeaks,
} from "./university-semester-loop-public-artifact-boundary";

describe("university semester-loop public artifact boundary", () => {
  it("rejects every exact server-only identity in a public asset", () => {
    for (
      const marker of
      UNIVERSITY_SEMESTER_LOOP_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS
    ) {
      expect(findUniversitySemesterLoopPublicArtifactLeaks([{
        path: "static/chunks/university-semester-loop.js",
        contents: marker,
      }])).toEqual([{
        path: "static/chunks/university-semester-loop.js",
        marker,
      }]);
    }
  });

  it("rejects the complete fixture-label set without flagging ordinary labels", () => {
    expect(findUniversitySemesterLoopPublicArtifactLeaks([{
      path: "static/chunks/university-semester-loop.js",
      contents: UNIVERSITY_SEMESTER_LOOP_FIXTURE_LABELS.join(" | "),
    }])).toEqual([{
      path: "static/chunks/university-semester-loop.js",
      marker: "university semester-loop server-only scenario label set",
    }]);
    expect(findUniversitySemesterLoopPublicArtifactLeaks([{
      path: "static/chunks/generic-ready-state.js",
      contents: "Ready for review. Path complete.",
    }])).toEqual([]);
  });

  it("fails the build boundary when a semester-loop marker is found", () => {
    expect(() => assertNoUniversitySemesterLoopPublicArtifactLeaks([{
      path: ".next/static/chunks/university-semester-loop.js",
      marker: "forge-university-semester-loop.v1",
    }])).toThrow(
      "University semester-loop sample data reached public build assets",
    );
  });
});
