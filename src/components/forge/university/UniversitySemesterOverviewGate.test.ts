import { describe, expect, it } from "vitest";

import {
  readUniversitySemesterOverviewGate,
} from "@/app/internal/university-semester-overview/fixture-gate.server";

describe("university semester overview fixture gate", () => {
  it("fails closed unless the exact development token is an own data field", () => {
    expect(readUniversitySemesterOverviewGate({})).toEqual({
      enabled: false,
      status: "semester-overview-fixture-unavailable",
    });
    expect(readUniversitySemesterOverviewGate({
      FORGE_UNIVERSITY_SEMESTER_OVERVIEW_FIXTURE:
        "forge-university-semester-overview.v1",
    })).toEqual({
      enabled: true,
      status: "semester-overview-fixture-enabled",
    });
    expect(readUniversitySemesterOverviewGate({
      FORGE_UNIVERSITY_SEMESTER_OVERVIEW_FIXTURE:
        "forge-university-semester-overview.v1 ",
    }).enabled).toBe(false);
    expect(readUniversitySemesterOverviewGate({
      FORGE_UNIVERSITY_SEMESTER_OVERVIEW_FIXTURE:
        "FORGE-UNIVERSITY-SEMESTER-OVERVIEW.V1",
    }).enabled).toBe(false);
  });

  it("does not invoke hostile getters or proxy traps", () => {
    let getterCalls = 0;
    let ownKeyCalls = 0;
    const accessor: Record<string, string | undefined> = {};
    Object.defineProperty(
      accessor,
      "FORGE_UNIVERSITY_SEMESTER_OVERVIEW_FIXTURE",
      {
        enumerable: true,
        get() {
          getterCalls += 1;
          return "forge-university-semester-overview.v1";
        },
      },
    );
    const proxy = new Proxy({}, {
      ownKeys() {
        ownKeyCalls += 1;
        throw new Error("must not traverse proxy");
      },
    });

    expect(readUniversitySemesterOverviewGate(accessor).enabled).toBe(false);
    expect(readUniversitySemesterOverviewGate(proxy).enabled).toBe(false);
    expect(getterCalls).toBe(0);
    expect(ownKeyCalls).toBe(0);
  });

  it("ignores inherited authority", () => {
    const inherited = Object.create({
      FORGE_UNIVERSITY_SEMESTER_OVERVIEW_FIXTURE:
        "forge-university-semester-overview.v1",
    }) as Record<string, string | undefined>;
    expect(readUniversitySemesterOverviewGate(inherited).enabled).toBe(false);
  });
});
