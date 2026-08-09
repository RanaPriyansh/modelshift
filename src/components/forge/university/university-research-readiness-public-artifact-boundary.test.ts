import { describe, expect, it } from "vitest";

import {
  UNIVERSITY_RESEARCH_READINESS_FIXTURE_LABELS,
  UNIVERSITY_RESEARCH_READINESS_PRODUCTION_ARTIFACT_FORBIDDEN_MARKERS,
  UNIVERSITY_RESEARCH_READINESS_PUBLIC_ONLY_FORBIDDEN_MARKERS,
  assertNoUniversityResearchReadinessProductionArtifactLeaks,
  findUniversityResearchReadinessProductionArtifactLeaks,
} from "./university-research-readiness-public-artifact-boundary";

describe("university research-readiness production artifact boundary", () => {
  it("rejects every exact server-only identity", () => {
    for (
      const marker of
      UNIVERSITY_RESEARCH_READINESS_PRODUCTION_ARTIFACT_FORBIDDEN_MARKERS
    ) {
      expect(findUniversityResearchReadinessProductionArtifactLeaks([{
        path: ".next/server/chunks/university-research-readiness.js",
        contents: marker,
      }])).toEqual([{
        path: ".next/server/chunks/university-research-readiness.js",
        marker,
      }]);
    }
  });

  it("keeps route and gate names public-only", () => {
    for (
      const marker of UNIVERSITY_RESEARCH_READINESS_PUBLIC_ONLY_FORBIDDEN_MARKERS
    ) {
      expect(findUniversityResearchReadinessProductionArtifactLeaks([{
        path: ".next/static/chunks/university-research-readiness.js",
        contents: marker,
      }])).toEqual([{
        path: ".next/static/chunks/university-research-readiness.js",
        marker,
      }]);
      expect(findUniversityResearchReadinessProductionArtifactLeaks([{
        path: ".next/server/app/internal/university-research-readiness/page.js",
        contents: marker,
      }])).toEqual([]);
    }
  });

  it("rejects the complete fixture-label set without flagging ordinary labels", () => {
    expect(findUniversityResearchReadinessProductionArtifactLeaks([{
      path: ".next/server/chunks/university-research-readiness.js",
      contents: UNIVERSITY_RESEARCH_READINESS_FIXTURE_LABELS.join(" | "),
    }])).toEqual([{
      path: ".next/server/chunks/university-research-readiness.js",
      marker: "university research-readiness server-only scenario label set",
    }]);
    expect(findUniversityResearchReadinessProductionArtifactLeaks([{
      path: ".next/static/chunks/generic-research-language.js",
      contents: "Missing approval. Review the operator gap.",
    }])).toEqual([]);
  });

  it("fails the build boundary when a research-readiness marker is found", () => {
    expect(() => assertNoUniversityResearchReadinessProductionArtifactLeaks([{
      path: ".next/server/chunks/university-research-readiness.js",
      marker: "forge-university-research-readiness.v1",
    }])).toThrow(
      "University research-readiness sample data reached production build artifacts",
    );
  });
});
