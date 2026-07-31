import { describe, expect, it } from "vitest";

import {
  UNIVERSITY_POST_ATTEMPT_REPAIR_PRODUCTION_ARTIFACT_FORBIDDEN_MARKERS,
  UNIVERSITY_POST_ATTEMPT_REPAIR_SURFACE_LEXICAL_SET,
  assertNoUniversityPostAttemptRepairProductionArtifactLeaks,
  findUniversityPostAttemptRepairProductionArtifactLeaks,
} from "./university-post-attempt-repair-public-artifact-boundary";

describe("university post-attempt repair production artifact boundary", () => {
  it("rejects every unique server-only marker", () => {
    for (
      const marker
      of UNIVERSITY_POST_ATTEMPT_REPAIR_PRODUCTION_ARTIFACT_FORBIDDEN_MARKERS
    ) {
      expect(findUniversityPostAttemptRepairProductionArtifactLeaks([{
        path: ".next/server/chunks/post-attempt-repair.js",
        contents: marker,
      }])).toEqual([{
        path: ".next/server/chunks/post-attempt-repair.js",
        marker,
      }]);
    }
    expect(findUniversityPostAttemptRepairProductionArtifactLeaks([{
      path: ".next/static/chunks/public.js",
      contents: "Post-attempt repair is unavailable.",
    }])).toEqual([]);
  });

  it("rejects the complete development surface lexical set only", () => {
    expect(findUniversityPostAttemptRepairProductionArtifactLeaks([{
      path: ".next/server/chunks/post-attempt-repair.js",
      contents:
        UNIVERSITY_POST_ATTEMPT_REPAIR_SURFACE_LEXICAL_SET.join(" "),
    }])).toEqual([{
      path: ".next/server/chunks/post-attempt-repair.js",
      marker:
        "university post-attempt repair server-only surface lexical set",
    }]);
    expect(findUniversityPostAttemptRepairProductionArtifactLeaks([{
      path: ".next/static/chunks/public.js",
      contents:
        UNIVERSITY_POST_ATTEMPT_REPAIR_SURFACE_LEXICAL_SET[0]!,
    }])).toEqual([]);
  });

  it("rejects the complete development lexical set split across chunks", () => {
    const assets = UNIVERSITY_POST_ATTEMPT_REPAIR_SURFACE_LEXICAL_SET.map(
      (contents, index) => ({
        path: `.next/${index % 2 === 0
          ? "static"
          : "server"}/post-attempt-repair-${index}.js`,
        contents,
      }),
    );

    expect(findUniversityPostAttemptRepairProductionArtifactLeaks(assets))
      .toEqual([
      {
        path: "<production-artifacts>",
        marker:
          "university post-attempt repair server-only surface lexical set",
      },
    ]);
  });

  it("does not reject an incomplete lexical set split across chunks", () => {
    const assets = UNIVERSITY_POST_ATTEMPT_REPAIR_SURFACE_LEXICAL_SET
      .slice(0, -1)
      .map((contents, index) => ({
        path: `static/chunks/public-${index}.js`,
        contents,
      }));

    expect(findUniversityPostAttemptRepairProductionArtifactLeaks(assets))
      .toEqual([]);
  });

  it("fails the build boundary when any leak is found", () => {
    expect(() => assertNoUniversityPostAttemptRepairProductionArtifactLeaks([{
      path: ".next/server/chunks/post-attempt-repair.js",
      marker: "forge-university-post-attempt-repair.v1",
    }])).toThrow(
      "University post-attempt repair fixture data reached production build artifacts",
    );
  });
});
