import { describe, expect, it } from "vitest";

import { readUniversitySemesterLoopGate } from "@/app/internal/university-semester-loop/fixture-gate.server";

describe("university semester-loop route gate", () => {
  it("is unavailable by default and accepts only the exact server-owned token", () => {
    expect(readUniversitySemesterLoopGate({})).toEqual({
      enabled: false,
      status: "semester-loop-fixture-unavailable",
    });
    expect(readUniversitySemesterLoopGate({
      FORGE_UNIVERSITY_SEMESTER_LOOP_FIXTURE: "true",
    }).enabled).toBe(false);
    expect(readUniversitySemesterLoopGate({
      FORGE_UNIVERSITY_SEMESTER_LOOP_FIXTURE:
        "forge-university-semester-loop.v1 ",
    }).enabled).toBe(false);
    expect(readUniversitySemesterLoopGate({
      NEXT_PUBLIC_FORGE_UNIVERSITY_SEMESTER_LOOP_FIXTURE:
        "forge-university-semester-loop.v1",
    }).enabled).toBe(false);
    expect(readUniversitySemesterLoopGate({
      FORGE_UNIVERSITY_SEMESTER_LOOP_FIXTURE:
        "forge-university-semester-loop.v1",
    })).toEqual({
      enabled: true,
      status: "semester-loop-fixture-enabled",
    });
  });
});
