import { describe, expect, it } from "vitest";

import {
  ADULT_PILOT_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS,
  findAdultPilotPublicArtifactLeaks,
  scanAdultPilotProductionPublicAssets,
} from "./adult-pilot-public-artifact-boundary";

describe("adult pilot public artifact boundary", () => {
  it("rejects every reviewed fixture identifier and instructional marker in a public asset", () => {
    for (const marker of ADULT_PILOT_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS) {
      expect(findAdultPilotPublicArtifactLeaks([{ path: "static/chunks/pilot.js", contents: marker }])).toEqual([
        { path: "static/chunks/pilot.js", marker },
      ]);
    }
    expect(findAdultPilotPublicArtifactLeaks([{ path: "static/chunks/pilot.js", contents: "generic unavailable route shell" }])).toEqual([]);
  });

  it.runIf(process.env.FORGE_VERIFY_PILOT_PUBLIC_ARTIFACTS === "1")("greps every emitted production public static asset", () => {
    expect(scanAdultPilotProductionPublicAssets()).toEqual([]);
  });
});
