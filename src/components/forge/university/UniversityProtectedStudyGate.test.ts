import { describe, expect, it } from "vitest";

import { readUniversityProtectedStudyGate } from "@/app/internal/university-protected-study/fixture-gate.server";

describe("university protected-study route gate", () => {
  it("is unavailable by default and accepts only the exact server-owned token", () => {
    expect(readUniversityProtectedStudyGate({})).toEqual({
      enabled: false,
      status: "protected-study-fixture-unavailable",
    });
    expect(readUniversityProtectedStudyGate({
      FORGE_UNIVERSITY_PROTECTED_STUDY_FIXTURE: "true",
    }).enabled).toBe(false);
    expect(readUniversityProtectedStudyGate({
      FORGE_UNIVERSITY_PROTECTED_STUDY_FIXTURE:
        "forge-university-protected-study.v1 ",
    }).enabled).toBe(false);
    expect(readUniversityProtectedStudyGate({
      NEXT_PUBLIC_FORGE_UNIVERSITY_PROTECTED_STUDY_FIXTURE:
        "forge-university-protected-study.v1",
    }).enabled).toBe(false);
    expect(readUniversityProtectedStudyGate({
      FORGE_UNIVERSITY_PROTECTED_STUDY_FIXTURE:
        "forge-university-protected-study.v1",
    })).toEqual({
      enabled: true,
      status: "protected-study-fixture-enabled",
    });
  });
});
