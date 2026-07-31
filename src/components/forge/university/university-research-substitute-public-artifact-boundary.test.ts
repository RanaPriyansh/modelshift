import { describe, expect, it } from "vitest";

import {
  UNIVERSITY_RESEARCH_SUBSTITUTE_ORDINAL_LABELS,
  UNIVERSITY_RESEARCH_SUBSTITUTE_PRODUCTION_ARTIFACT_FORBIDDEN_MARKERS,
  UNIVERSITY_RESEARCH_SUBSTITUTE_PUBLIC_ONLY_FORBIDDEN_MARKERS,
  assertNoUniversityResearchSubstituteProductionArtifactLeaks,
  findUniversityResearchSubstituteProductionArtifactLeaks,
} from "./university-research-substitute-public-artifact-boundary";

describe("university research-substitute production artifact boundary", () => {
  it("rejects every exact server-only identity", () => {
    for (
      const marker of
      UNIVERSITY_RESEARCH_SUBSTITUTE_PRODUCTION_ARTIFACT_FORBIDDEN_MARKERS
    ) {
      expect(findUniversityResearchSubstituteProductionArtifactLeaks([{
        path: ".next/server/chunks/university-research-substitute.js",
        contents: marker,
      }])).toEqual([{
        path: ".next/server/chunks/university-research-substitute.js",
        marker,
      }]);
    }
  });

  it("keeps route and gate names public-only", () => {
    for (
      const marker of UNIVERSITY_RESEARCH_SUBSTITUTE_PUBLIC_ONLY_FORBIDDEN_MARKERS
    ) {
      expect(findUniversityResearchSubstituteProductionArtifactLeaks([{
        path: ".next/static/chunks/university-research-substitute.js",
        contents: marker,
      }])).toEqual([{
        path: ".next/static/chunks/university-research-substitute.js",
        marker,
      }]);
      expect(findUniversityResearchSubstituteProductionArtifactLeaks([{
        path: ".next/server/app/internal/university-research-substitute/page.js",
        contents: marker,
      }])).toEqual([]);
    }
  });

  it("rejects the complete ordinal set without flagging one ordinary label", () => {
    expect(findUniversityResearchSubstituteProductionArtifactLeaks([{
      path: ".next/server/chunks/university-research-substitute.js",
      contents: UNIVERSITY_RESEARCH_SUBSTITUTE_ORDINAL_LABELS.join(" | "),
    }])).toEqual([{
      path: ".next/server/chunks/university-research-substitute.js",
      marker: "university research substitute server-only ordinal label set",
    }]);
    expect(findUniversityResearchSubstituteProductionArtifactLeaks([{
      path: ".next/static/chunks/generic-example.js",
      contents: "Example 1",
    }])).toEqual([]);
  });

  it("fails the build boundary when a substitute marker is found", () => {
    expect(() => assertNoUniversityResearchSubstituteProductionArtifactLeaks([{
      path: ".next/server/chunks/university-research-substitute.js",
      marker: "university-research-surface-packet.v1",
    }])).toThrow(
      "University research-substitute data reached production build artifacts",
    );
  });
});
