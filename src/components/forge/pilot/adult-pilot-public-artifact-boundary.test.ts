import { describe, expect, it } from "vitest";

import {
  ADULT_PILOT_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS,
  assertNoAdultPilotPublicArtifactLeaks,
  findAdultPilotPublicArtifactLeaks,
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

  it("fails the ordinary build boundary when any reviewed fixture marker is found", () => {
    expect(() => assertNoAdultPilotPublicArtifactLeaks([
      { path: ".next/static/chunks/pilot.js", marker: "reading.fixture.equal-quantities" },
    ])).toThrow("Reviewed adult-pilot fixture data reached public build assets");
  });
});
