import { describe, expect, it, vi } from "vitest";

import { readUniversitySemesterLoopGate } from "@/app/internal/university-semester-loop/fixture-gate.server";

describe("university semester-loop route gate", () => {
  it("is unavailable by default and accepts only the exact server-owned token", () => {
    expect(readUniversitySemesterLoopGate({})).toEqual({
      enabled: false,
      status: "semester-loop-fixture-unavailable",
      mode: null,
      packId: null,
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
      mode: "legacy",
      packId: null,
    });
    expect(readUniversitySemesterLoopGate({
      FORGE_UNIVERSITY_SEMESTER_LOOP_FIXTURE:
        "forge-university-research-candidate.pack-p.v1",
    })).toEqual({
      enabled: true,
      status: "semester-loop-research-candidate-enabled",
      mode: "research_candidate",
      packId: "pack-p",
    });
    expect(readUniversitySemesterLoopGate({
      FORGE_UNIVERSITY_SEMESTER_LOOP_FIXTURE:
        "forge-university-research-candidate.pack-q.v1",
    })).toEqual({
      enabled: true,
      status: "semester-loop-research-candidate-enabled",
      mode: "research_candidate",
      packId: "pack-q",
    });
  });

  it("rejects proxies without invoking their traps", () => {
    const get = vi.fn(() => {
      throw new Error("proxy get must not run");
    });
    const getOwnPropertyDescriptor = vi.fn(() => {
      throw new Error("proxy descriptor trap must not run");
    });
    const environment = new Proxy(
      {
        FORGE_UNIVERSITY_SEMESTER_LOOP_FIXTURE:
          "forge-university-research-candidate.pack-p.v1",
      },
      { get, getOwnPropertyDescriptor },
    );

    expect(readUniversitySemesterLoopGate(environment)).toEqual({
      enabled: false,
      status: "semester-loop-fixture-unavailable",
      mode: null,
      packId: null,
    });
    expect(get).not.toHaveBeenCalled();
    expect(getOwnPropertyDescriptor).not.toHaveBeenCalled();
  });

  it("rejects accessor and inherited values without reading them", () => {
    const getter = vi.fn(() => {
      throw new Error("accessor must not run");
    });
    const accessorEnvironment: Record<string, string | undefined> = {};
    Object.defineProperty(
      accessorEnvironment,
      "FORGE_UNIVERSITY_SEMESTER_LOOP_FIXTURE",
      { configurable: true, enumerable: true, get: getter },
    );
    const inheritedEnvironment = Object.create({
      FORGE_UNIVERSITY_SEMESTER_LOOP_FIXTURE:
        "forge-university-research-candidate.pack-q.v1",
    }) as Record<string, string | undefined>;

    expect(readUniversitySemesterLoopGate(accessorEnvironment)).toEqual({
      enabled: false,
      status: "semester-loop-fixture-unavailable",
      mode: null,
      packId: null,
    });
    expect(readUniversitySemesterLoopGate(inheritedEnvironment)).toEqual({
      enabled: false,
      status: "semester-loop-fixture-unavailable",
      mode: null,
      packId: null,
    });
    expect(getter).not.toHaveBeenCalled();
  });
});
