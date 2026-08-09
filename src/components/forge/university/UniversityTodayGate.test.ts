import { describe, expect, it } from "vitest";

import { readUniversityTodayGate } from "@/app/internal/university-today/fixture-gate.server";

describe("university Today route gate", () => {
  it("is unavailable by default and accepts only the exact server-owned fixture token", () => {
    expect(readUniversityTodayGate({})).toEqual({
      enabled: false,
      status: "today-fixture-unavailable",
    });
    expect(readUniversityTodayGate({
      FORGE_UNIVERSITY_TODAY_FIXTURE: "true",
    }).enabled).toBe(false);
    expect(readUniversityTodayGate({
      FORGE_UNIVERSITY_TODAY_FIXTURE: "forge-university-today.v1 ",
    }).enabled).toBe(false);
    expect(readUniversityTodayGate({
      NEXT_PUBLIC_FORGE_UNIVERSITY_TODAY_FIXTURE: "forge-university-today.v1",
    }).enabled).toBe(false);
    expect(readUniversityTodayGate({
      FORGE_UNIVERSITY_TODAY_FIXTURE: "forge-university-today.v1",
    })).toEqual({
      enabled: true,
      status: "today-fixture-enabled",
    });
  });
});
