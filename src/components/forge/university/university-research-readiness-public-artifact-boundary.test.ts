import { describe, expect, it } from "vitest";

import {
  UNIVERSITY_RESEARCH_READINESS_FIXTURE_LABELS,
  UNIVERSITY_RESEARCH_READINESS_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS,
  assertNoUniversityResearchReadinessPublicArtifactLeaks,
  findUniversityResearchReadinessPublicArtifactLeaks,
} from "./university-research-readiness-public-artifact-boundary";

describe("university research-readiness public artifact boundary", () => {
  it("rejects every exact server-only identity in a public asset", () => {
    for (
      const marker of
      UNIVERSITY_RESEARCH_READINESS_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS
    ) {
      expect(findUniversityResearchReadinessPublicArtifactLeaks([{
        path: "static/chunks/university-research-readiness.js",
        contents: marker,
      }])).toEqual([{
        path: "static/chunks/university-research-readiness.js",
        marker,
      }]);
    }
  });

  it("rejects the complete fixture-label set without flagging ordinary labels", () => {
    expect(findUniversityResearchReadinessPublicArtifactLeaks([{
      path: "static/chunks/university-research-readiness.js",
      contents: UNIVERSITY_RESEARCH_READINESS_FIXTURE_LABELS.join(" | "),
    }])).toEqual([{
      path: "static/chunks/university-research-readiness.js",
      marker: "university research-readiness server-only scenario label set",
    }]);
    expect(findUniversityResearchReadinessPublicArtifactLeaks([{
      path: "static/chunks/generic-research-language.js",
      contents: "Missing approval. Review the operator gap.",
    }])).toEqual([]);
  });

  it("fails the build boundary when a research-readiness marker is found", () => {
    expect(() => assertNoUniversityResearchReadinessPublicArtifactLeaks([{
      path: ".next/static/chunks/university-research-readiness.js",
      marker: "forge-university-research-readiness.v1",
    }])).toThrow(
      "University research-readiness sample data reached public build assets",
    );
  });
});
