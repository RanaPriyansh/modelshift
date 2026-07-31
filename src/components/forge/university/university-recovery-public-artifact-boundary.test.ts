import { describe, expect, it } from "vitest";

import {
  UNIVERSITY_RECOVERY_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS,
  UNIVERSITY_RECOVERY_WHAT_IF_SURFACE_LEXICAL_SET,
  assertNoUniversityRecoveryPublicArtifactLeaks,
  findUniversityRecoveryPublicArtifactLeaks,
} from "./university-recovery-public-artifact-boundary";

describe("university recovery public artifact boundary", () => {
  it("rejects every server-only sample marker in a public asset", () => {
    for (const marker of UNIVERSITY_RECOVERY_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS) {
      expect(findUniversityRecoveryPublicArtifactLeaks([{
        path: "static/chunks/university-recovery.js",
        contents: marker,
      }])).toEqual([{ path: "static/chunks/university-recovery.js", marker }]);
    }
    expect(findUniversityRecoveryPublicArtifactLeaks([{
      path: "static/chunks/university-recovery.js",
      contents: "generic unavailable route shell",
    }])).toEqual([]);
  });

  it("fails the build boundary when a sample marker is found", () => {
    expect(() => assertNoUniversityRecoveryPublicArtifactLeaks([{
      path: ".next/static/chunks/university-recovery.js",
      marker: "forge-university-recovery.v1",
    }])).toThrow("University recovery sample data reached public build assets");
  });

  it("rejects the complete what-if surface lexical set without broad copy matches", () => {
    expect(findUniversityRecoveryPublicArtifactLeaks([{
      path: "static/chunks/university-recovery-what-if.js",
      contents: UNIVERSITY_RECOVERY_WHAT_IF_SURFACE_LEXICAL_SET.join(" "),
    }])).toEqual([{
      path: "static/chunks/university-recovery-what-if.js",
      marker: "university recovery what-if server-only surface lexical set",
    }]);
    expect(findUniversityRecoveryPublicArtifactLeaks([{
      path: "static/chunks/public-recovery-copy.js",
      contents: UNIVERSITY_RECOVERY_WHAT_IF_SURFACE_LEXICAL_SET[0]!,
    }])).toEqual([]);
  });
});
