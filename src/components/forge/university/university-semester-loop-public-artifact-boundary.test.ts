import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  UNIVERSITY_RESEARCH_CANDIDATE_PACK_P_SCENARIO_REFS,
  UNIVERSITY_RESEARCH_CANDIDATE_PACK_Q_SCENARIO_REFS,
  UNIVERSITY_RESEARCH_CANDIDATE_STATUS_CODES,
  UNIVERSITY_RESEARCH_CANDIDATE_SURFACE_LEXICAL_SET,
  UNIVERSITY_SEMESTER_LOOP_FIXTURE_LABELS,
  UNIVERSITY_SEMESTER_LOOP_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS,
  assertNoUniversitySemesterLoopPublicArtifactLeaks,
  findUniversitySemesterLoopPublicArtifactLeaks,
  scanUniversitySemesterLoopProductionPublicAssets,
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

  it("rejects the complete candidate status set without flagging one status", () => {
    expect(findUniversitySemesterLoopPublicArtifactLeaks([{
      path: "static/chunks/university-research-candidate.js",
      contents: UNIVERSITY_RESEARCH_CANDIDATE_STATUS_CODES.join(" | "),
    }])).toEqual([{
      path: "static/chunks/university-research-candidate.js",
      marker: "university research-candidate server-only status set",
    }]);
    expect(findUniversitySemesterLoopPublicArtifactLeaks([{
      path: "static/chunks/generic-path-state.js",
      contents: "path_complete",
    }])).toEqual([]);
  });

  it("rejects the complete candidate surface lexical set without broad copy matches", () => {
    expect(findUniversitySemesterLoopPublicArtifactLeaks([{
      path: "static/chunks/university-research-candidate.js",
      contents: UNIVERSITY_RESEARCH_CANDIDATE_SURFACE_LEXICAL_SET.join(" | "),
    }])).toEqual([{
      path: "static/chunks/university-research-candidate.js",
      marker:
        "university research-candidate server-only surface lexical set",
    }]);
    expect(findUniversitySemesterLoopPublicArtifactLeaks([{
      path: "static/chunks/generic-job.js",
      contents: "Current bounded job",
    }])).toEqual([]);
  });

  it.each([
    [
      "Pack P",
      UNIVERSITY_RESEARCH_CANDIDATE_PACK_P_SCENARIO_REFS,
      "university research-candidate server-only Pack P scenario set",
    ],
    [
      "Pack Q",
      UNIVERSITY_RESEARCH_CANDIDATE_PACK_Q_SCENARIO_REFS,
      "university research-candidate server-only Pack Q scenario set",
    ],
  ])("rejects the complete %s scenario-ref set", (_, scenarioRefs, marker) => {
    expect(findUniversitySemesterLoopPublicArtifactLeaks([{
      path: "static/chunks/university-research-candidate.js",
      contents: scenarioRefs.join(" | "),
    }])).toEqual([{
      path: "static/chunks/university-research-candidate.js",
      marker,
    }]);
    expect(findUniversitySemesterLoopPublicArtifactLeaks([{
      path: "static/chunks/university-research-candidate-partial.js",
      contents: scenarioRefs.slice(0, -1).join(" | "),
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

  it("fails closed without a completed production static directory", () => {
    const root = mkdtempSync(join(tmpdir(), "forge-semester-boundary-"));
    try {
      expect(
        () => scanUniversitySemesterLoopProductionPublicAssets(root),
      ).toThrow(
        "University semester-loop public-asset scan requires a completed production .next/static build.",
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails closed when the public static tree contains a symlink", () => {
    const root = mkdtempSync(join(tmpdir(), "forge-semester-boundary-"));
    const staticDirectory = join(root, ".next", "static");
    const externalFile = join(root, "external.js");
    try {
      mkdirSync(staticDirectory, { recursive: true });
      writeFileSync(externalFile, "ordinary public asset");
      symlinkSync(externalFile, join(staticDirectory, "linked.js"));
      expect(
        () => scanUniversitySemesterLoopProductionPublicAssets(root),
      ).toThrow(
        "University semester-loop public-asset scan rejected symlink",
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
