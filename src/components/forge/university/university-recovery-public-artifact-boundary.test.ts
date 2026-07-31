import { describe, expect, it } from "vitest";

import {
  UNIVERSITY_RECOVERY_PRODUCTION_ARTIFACT_FORBIDDEN_MARKERS,
  UNIVERSITY_RECOVERY_WHAT_IF_SURFACE_LEXICAL_SET,
  assertNoUniversityRecoveryProductionArtifactLeaks,
  findUniversityRecoveryProductionArtifactLeaks,
} from "./university-recovery-public-artifact-boundary";

describe("university recovery production artifact boundary", () => {
  it("rejects every server-only sample marker", () => {
    for (
      const marker of UNIVERSITY_RECOVERY_PRODUCTION_ARTIFACT_FORBIDDEN_MARKERS
    ) {
      expect(findUniversityRecoveryProductionArtifactLeaks([{
        path: ".next/server/chunks/university-recovery.js",
        contents: marker,
      }])).toEqual([{
        path: ".next/server/chunks/university-recovery.js",
        marker,
      }]);
    }
    expect(findUniversityRecoveryProductionArtifactLeaks([{
      path: ".next/static/chunks/university-recovery.js",
      contents: "generic unavailable route shell",
    }])).toEqual([]);
  });

  it("fails the build boundary when a sample marker is found", () => {
    expect(() => assertNoUniversityRecoveryProductionArtifactLeaks([{
      path: ".next/server/chunks/university-recovery.js",
      marker: "forge-university-recovery.v1",
    }])).toThrow(
      "University recovery sample data reached production build artifacts",
    );
  });

  it("rejects the complete what-if surface lexical set without broad copy matches", () => {
    expect(findUniversityRecoveryProductionArtifactLeaks([{
      path: ".next/server/chunks/university-recovery-what-if.js",
      contents: UNIVERSITY_RECOVERY_WHAT_IF_SURFACE_LEXICAL_SET.join(" "),
    }])).toEqual([{
      path: ".next/server/chunks/university-recovery-what-if.js",
      marker: "university recovery what-if server-only surface lexical set",
    }]);
    expect(findUniversityRecoveryProductionArtifactLeaks([{
      path: ".next/static/chunks/public-recovery-copy.js",
      contents: UNIVERSITY_RECOVERY_WHAT_IF_SURFACE_LEXICAL_SET[0]!,
    }])).toEqual([]);
  });

  it("rejects the complete what-if surface split across artifacts", () => {
    const artifacts = UNIVERSITY_RECOVERY_WHAT_IF_SURFACE_LEXICAL_SET.map(
      (contents, index) => ({
        path: `.next/${index % 2 === 0
          ? "static"
          : "server"}/recovery-${index}.js`,
        contents,
      }),
    );
    expect(findUniversityRecoveryProductionArtifactLeaks(artifacts)).toEqual([
      {
        path: "<production-artifacts>",
        marker: "university recovery what-if server-only surface lexical set",
      },
    ]);
  });
});
