import { describe, expect, it } from "vitest";

import {
  UNIVERSITY_RECOVERY_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS,
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
});
