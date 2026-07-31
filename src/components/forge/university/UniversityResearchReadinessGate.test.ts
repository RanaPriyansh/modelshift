import { describe, expect, it, vi } from "vitest";

import { readUniversityResearchReadinessGate } from "@/app/internal/university-research-readiness/fixture-gate.server";

describe("university research-readiness route gate", () => {
  it("is unavailable by default and accepts only the exact server-owned token", () => {
    expect(readUniversityResearchReadinessGate({})).toEqual({
      enabled: false,
      status: "research-readiness-fixture-unavailable",
    });
    expect(readUniversityResearchReadinessGate({
      FORGE_UNIVERSITY_RESEARCH_READINESS_FIXTURE: "true",
    }).enabled).toBe(false);
    expect(readUniversityResearchReadinessGate({
      FORGE_UNIVERSITY_RESEARCH_READINESS_FIXTURE:
        "forge-university-research-readiness.v1 ",
    }).enabled).toBe(false);
    expect(readUniversityResearchReadinessGate({
      NEXT_PUBLIC_FORGE_UNIVERSITY_RESEARCH_READINESS_FIXTURE:
        "forge-university-research-readiness.v1",
    }).enabled).toBe(false);
    expect(readUniversityResearchReadinessGate({
      FORGE_UNIVERSITY_RESEARCH_READINESS_FIXTURE:
        "forge-university-research-readiness.v1",
    })).toEqual({
      enabled: true,
      status: "research-readiness-fixture-enabled",
    });
  });

  it("rejects inherited, accessor, and proxy environment values without executing them", () => {
    const inherited = Object.create({
      FORGE_UNIVERSITY_RESEARCH_READINESS_FIXTURE:
        "forge-university-research-readiness.v1",
    }) as Record<string, string | undefined>;
    const getter = vi.fn(() => "forge-university-research-readiness.v1");
    const accessor: Record<string, string | undefined> = {};
    Object.defineProperty(
      accessor,
      "FORGE_UNIVERSITY_RESEARCH_READINESS_FIXTURE",
      { enumerable: true, get: getter },
    );
    const trap = vi.fn(() => {
      throw new Error("proxy trap executed");
    });
    const proxy = new Proxy({
      FORGE_UNIVERSITY_RESEARCH_READINESS_FIXTURE:
        "forge-university-research-readiness.v1",
    }, {
      getOwnPropertyDescriptor: trap,
    });

    expect(readUniversityResearchReadinessGate(inherited).enabled).toBe(false);
    expect(readUniversityResearchReadinessGate(accessor).enabled).toBe(false);
    expect(readUniversityResearchReadinessGate(proxy).enabled).toBe(false);
    expect(getter).not.toHaveBeenCalled();
    expect(trap).not.toHaveBeenCalled();
  });
});
