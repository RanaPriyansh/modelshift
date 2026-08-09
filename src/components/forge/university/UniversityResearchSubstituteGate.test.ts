import { describe, expect, it, vi } from "vitest";

import { readUniversityResearchSubstituteGate } from "@/app/internal/university-research-substitute/fixture-gate.server";

describe("university research substitute route gate", () => {
  it("is unavailable by default and selects only one exact server-owned pack token", () => {
    expect(readUniversityResearchSubstituteGate({})).toEqual({
      enabled: false,
      status: "research-substitute-fixture-unavailable",
      packId: null,
    });
    expect(readUniversityResearchSubstituteGate({
      FORGE_UNIVERSITY_RESEARCH_SUBSTITUTE_FIXTURE:
        "forge-university-research-substitute.pack-p.v1",
    })).toEqual({
      enabled: true,
      status: "research-substitute-fixture-enabled",
      packId: "pack-p",
    });
    expect(readUniversityResearchSubstituteGate({
      FORGE_UNIVERSITY_RESEARCH_SUBSTITUTE_FIXTURE:
        "forge-university-research-substitute.pack-q.v1",
    })).toEqual({
      enabled: true,
      status: "research-substitute-fixture-enabled",
      packId: "pack-q",
    });
  });

  it("rejects near tokens, public variables, accessors, and proxies without invoking them", () => {
    expect(readUniversityResearchSubstituteGate({
      FORGE_UNIVERSITY_RESEARCH_SUBSTITUTE_FIXTURE: "true",
    }).enabled).toBe(false);
    expect(readUniversityResearchSubstituteGate({
      FORGE_UNIVERSITY_RESEARCH_SUBSTITUTE_FIXTURE:
        "forge-university-research-substitute.pack-p.v1 ",
    }).enabled).toBe(false);
    expect(readUniversityResearchSubstituteGate({
      NEXT_PUBLIC_FORGE_UNIVERSITY_RESEARCH_SUBSTITUTE_FIXTURE:
        "forge-university-research-substitute.pack-p.v1",
    }).enabled).toBe(false);

    const getter = vi.fn(() => (
      "forge-university-research-substitute.pack-p.v1"
    ));
    const accessor = {};
    Object.defineProperty(
      accessor,
      "FORGE_UNIVERSITY_RESEARCH_SUBSTITUTE_FIXTURE",
      { enumerable: true, get: getter },
    );
    expect(readUniversityResearchSubstituteGate(accessor).enabled).toBe(false);
    expect(getter).not.toHaveBeenCalled();

    const ownKeys = vi.fn((): never => {
      throw new Error("must not execute");
    });
    const proxy = new Proxy({}, {
      ownKeys() {
        return ownKeys();
      },
    });
    expect(readUniversityResearchSubstituteGate(proxy).enabled).toBe(false);
    expect(ownKeys).not.toHaveBeenCalled();
  });
});
