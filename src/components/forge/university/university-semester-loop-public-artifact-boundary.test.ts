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
  UNIVERSITY_SEMESTER_SANDBOX_SURFACE_LEXICAL_SET,
  UNIVERSITY_SEMESTER_LOOP_FIXTURE_LABELS,
  UNIVERSITY_SEMESTER_LOOP_PRODUCTION_ARTIFACT_FORBIDDEN_MARKERS,
  UNIVERSITY_SEMESTER_LOOP_PUBLIC_ONLY_FORBIDDEN_MARKERS,
  assertNoUniversitySemesterLoopProductionArtifactLeaks,
  findUniversitySemesterLoopProductionArtifactLeaks,
  scanUniversitySemesterLoopProductionArtifacts,
} from "./university-semester-loop-public-artifact-boundary";

describe("university semester-loop production artifact boundary", () => {
  it("rejects every exact server-only identity", () => {
    for (
      const marker of
      UNIVERSITY_SEMESTER_LOOP_PRODUCTION_ARTIFACT_FORBIDDEN_MARKERS
    ) {
      expect(findUniversitySemesterLoopProductionArtifactLeaks([{
        path: ".next/server/chunks/university-semester-loop.js",
        contents: marker,
      }])).toEqual([{
        path: ".next/server/chunks/university-semester-loop.js",
        marker,
      }]);
    }
  });

  it("keeps route and gate names public-only", () => {
    for (const marker of UNIVERSITY_SEMESTER_LOOP_PUBLIC_ONLY_FORBIDDEN_MARKERS) {
      expect(findUniversitySemesterLoopProductionArtifactLeaks([{
        path: ".next/static/chunks/university-semester-loop.js",
        contents: marker,
      }])).toEqual([{
        path: ".next/static/chunks/university-semester-loop.js",
        marker,
      }]);
      expect(findUniversitySemesterLoopProductionArtifactLeaks([{
        path: ".next/server/app/internal/university-semester-loop/page.js",
        contents: marker,
      }])).toEqual([]);
    }
  });

  it("rejects the complete fixture-label set without flagging ordinary labels", () => {
    expect(findUniversitySemesterLoopProductionArtifactLeaks([{
      path: "static/chunks/university-semester-loop.js",
      contents: UNIVERSITY_SEMESTER_LOOP_FIXTURE_LABELS.join(" | "),
    }])).toEqual([{
      path: "static/chunks/university-semester-loop.js",
      marker: "university semester-loop server-only scenario label set",
    }]);
    expect(findUniversitySemesterLoopProductionArtifactLeaks([{
      path: "static/chunks/generic-ready-state.js",
      contents: "Ready for review. Path complete.",
    }])).toEqual([]);
  });

  it("rejects the complete candidate status set without flagging one status", () => {
    expect(findUniversitySemesterLoopProductionArtifactLeaks([{
      path: "static/chunks/university-research-candidate.js",
      contents: UNIVERSITY_RESEARCH_CANDIDATE_STATUS_CODES.join(" | "),
    }])).toEqual([{
      path: "static/chunks/university-research-candidate.js",
      marker: "university research-candidate server-only status set",
    }]);
    expect(findUniversitySemesterLoopProductionArtifactLeaks([{
      path: "static/chunks/generic-path-state.js",
      contents: "path_complete",
    }])).toEqual([]);
  });

  it("rejects the complete candidate surface lexical set without broad copy matches", () => {
    expect(findUniversitySemesterLoopProductionArtifactLeaks([{
      path: "static/chunks/university-research-candidate.js",
      contents: UNIVERSITY_RESEARCH_CANDIDATE_SURFACE_LEXICAL_SET.join(" | "),
    }])).toEqual([{
      path: "static/chunks/university-research-candidate.js",
      marker:
        "university research-candidate server-only surface lexical set",
    }]);
    expect(findUniversitySemesterLoopProductionArtifactLeaks([{
      path: "static/chunks/generic-job.js",
      contents: "Current bounded job",
    }])).toEqual([]);
  });

  it("rejects a complete surface set split across production artifacts", () => {
    const artifacts = UNIVERSITY_RESEARCH_CANDIDATE_SURFACE_LEXICAL_SET.map(
      (contents, index) => ({
        path: `.next/${index % 2 === 0
          ? "static"
          : "server"}/research-candidate-${index}.js`,
        contents,
      }),
    );
    expect(findUniversitySemesterLoopProductionArtifactLeaks(artifacts))
      .toEqual([{
        path: "<production-artifacts>",
        marker:
          "university research-candidate server-only surface lexical set",
      }]);
  });

  it("rejects the complete semester-sandbox lexical set without broad copy matches", () => {
    expect(findUniversitySemesterLoopProductionArtifactLeaks([{
      path: "static/chunks/university-semester-sandbox.js",
      contents: UNIVERSITY_SEMESTER_SANDBOX_SURFACE_LEXICAL_SET.join(" | "),
    }])).toEqual([{
      path: "static/chunks/university-semester-sandbox.js",
      marker: "university semester-sandbox server-only surface lexical set",
    }]);
    expect(findUniversitySemesterLoopProductionArtifactLeaks([{
      path: "static/chunks/generic-source-review.js",
      contents: "Does this copied value belong here?",
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
    expect(findUniversitySemesterLoopProductionArtifactLeaks([{
      path: "static/chunks/university-research-candidate.js",
      contents: scenarioRefs.join(" | "),
    }])).toEqual([{
      path: "static/chunks/university-research-candidate.js",
      marker,
    }]);
    expect(findUniversitySemesterLoopProductionArtifactLeaks([{
      path: "static/chunks/university-research-candidate-partial.js",
      contents: scenarioRefs.slice(0, -1).join(" | "),
    }])).toEqual([]);
  });

  it("fails the build boundary when a semester-loop marker is found", () => {
    expect(() => assertNoUniversitySemesterLoopProductionArtifactLeaks([{
      path: ".next/server/chunks/university-semester-loop.js",
      marker: "forge-university-semester-loop.v1",
    }])).toThrow(
      "University semester-loop sample data reached production build artifacts",
    );
  });

  it("fails closed without a completed production static directory", () => {
    const root = mkdtempSync(join(tmpdir(), "forge-semester-boundary-"));
    try {
      expect(
        () => scanUniversitySemesterLoopProductionArtifacts(root),
      ).toThrow(
        "University semester-loop artifact scan requires a completed production .next build.",
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails closed when a production artifact tree contains a symlink", () => {
    const root = mkdtempSync(join(tmpdir(), "forge-semester-boundary-"));
    const staticDirectory = join(root, ".next", "static");
    const serverDirectory = join(root, ".next", "server");
    const externalFile = join(root, "external.js");
    try {
      mkdirSync(staticDirectory, { recursive: true });
      mkdirSync(serverDirectory, { recursive: true });
      writeFileSync(externalFile, "ordinary public asset");
      symlinkSync(externalFile, join(staticDirectory, "linked.js"));
      expect(
        () => scanUniversitySemesterLoopProductionArtifacts(root),
      ).toThrow(
        "University semester-loop artifact scan rejected symlink",
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
