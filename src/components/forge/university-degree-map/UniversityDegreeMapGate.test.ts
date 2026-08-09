import { describe, expect, it, vi } from "vitest";

import {
  readUniversityDegreeMapGate,
} from "@/app/internal/university-degree-map/fixture-gate.server";

describe("university degree-map fixture gate", () => {
  it("accepts only the exact own server token", () => {
    expect(readUniversityDegreeMapGate({}).enabled).toBe(false);
    expect(readUniversityDegreeMapGate({
      FORGE_UNIVERSITY_DEGREE_MAP_FIXTURE:
        "forge-university-degree-map.v1",
    })).toEqual({
      enabled: true,
      status: "degree-map-fixture-enabled",
    });
    expect(readUniversityDegreeMapGate({
      FORGE_UNIVERSITY_DEGREE_MAP_FIXTURE:
        "forge-university-degree-map.v1 ",
    }).enabled).toBe(false);
    expect(readUniversityDegreeMapGate({
      NEXT_PUBLIC_FORGE_UNIVERSITY_DEGREE_MAP_FIXTURE:
        "forge-university-degree-map.v1",
    }).enabled).toBe(false);

    const inherited = Object.create({
      FORGE_UNIVERSITY_DEGREE_MAP_FIXTURE:
        "forge-university-degree-map.v1",
    }) as Record<string, string | undefined>;
    expect(readUniversityDegreeMapGate(inherited).enabled).toBe(false);
  });

  it("does not invoke accessors or proxy traps", () => {
    const getter = vi.fn(() => "forge-university-degree-map.v1");
    const accessor = {};
    Object.defineProperty(accessor, "FORGE_UNIVERSITY_DEGREE_MAP_FIXTURE", {
      enumerable: true,
      get: getter,
    });
    const ownKeys = vi.fn(() => ["FORGE_UNIVERSITY_DEGREE_MAP_FIXTURE"]);
    const proxy = new Proxy({}, { ownKeys });

    expect(readUniversityDegreeMapGate(
      accessor as Record<string, string | undefined>,
    ).enabled).toBe(false);
    expect(readUniversityDegreeMapGate(proxy).enabled).toBe(false);
    expect(getter).not.toHaveBeenCalled();
    expect(ownKeys).not.toHaveBeenCalled();
  });
});
