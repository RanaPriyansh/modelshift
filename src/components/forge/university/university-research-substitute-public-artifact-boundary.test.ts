import { describe, expect, it } from "vitest";

import {
  UNIVERSITY_RESEARCH_SUBSTITUTE_ORDINAL_LABELS,
  UNIVERSITY_RESEARCH_SUBSTITUTE_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS,
  assertNoUniversityResearchSubstitutePublicArtifactLeaks,
  findUniversityResearchSubstitutePublicArtifactLeaks,
} from "./university-research-substitute-public-artifact-boundary";

describe("university research-substitute public artifact boundary", () => {
  it("rejects every exact server-only identity in a public asset", () => {
    for (
      const marker of
      UNIVERSITY_RESEARCH_SUBSTITUTE_PUBLIC_ARTIFACT_FORBIDDEN_MARKERS
    ) {
      expect(findUniversityResearchSubstitutePublicArtifactLeaks([{
        path: "static/chunks/university-research-substitute.js",
        contents: marker,
      }])).toEqual([{
        path: "static/chunks/university-research-substitute.js",
        marker,
      }]);
    }
  });

  it("rejects the complete ordinal set without flagging one ordinary label", () => {
    expect(findUniversityResearchSubstitutePublicArtifactLeaks([{
      path: "static/chunks/university-research-substitute.js",
      contents: UNIVERSITY_RESEARCH_SUBSTITUTE_ORDINAL_LABELS.join(" | "),
    }])).toEqual([{
      path: "static/chunks/university-research-substitute.js",
      marker: "university research substitute server-only ordinal label set",
    }]);
    expect(findUniversityResearchSubstitutePublicArtifactLeaks([{
      path: "static/chunks/generic-example.js",
      contents: "Example 1",
    }])).toEqual([]);
  });

  it("fails the build boundary when a substitute marker is found", () => {
    expect(() => assertNoUniversityResearchSubstitutePublicArtifactLeaks([{
      path: ".next/static/chunks/university-research-substitute.js",
      marker: "university-research-surface-packet.v1",
    }])).toThrow(
      "University research-substitute data reached public build assets",
    );
  });
});
