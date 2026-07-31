import { describe, expect, it } from "vitest";

import {
  readUniversitySemesterDeskGate,
} from "@/app/internal/university-semester-desk/fixture-gate.server";

describe("university semester desk fixture gate", () => {
  it("fails closed unless the exact development token is an own data field", () => {
    expect(readUniversitySemesterDeskGate({})).toEqual({
      enabled: false,
      status: "semester-desk-fixture-unavailable",
    });
    expect(readUniversitySemesterDeskGate({
      FORGE_UNIVERSITY_SEMESTER_DESK_FIXTURE:
        "forge-university-semester-desk.v1",
    })).toEqual({
      enabled: true,
      status: "semester-desk-fixture-enabled",
    });
    expect(readUniversitySemesterDeskGate({
      FORGE_UNIVERSITY_SEMESTER_DESK_FIXTURE:
        "forge-university-semester-desk.v1 ",
    }).enabled).toBe(false);
    expect(readUniversitySemesterDeskGate({
      FORGE_UNIVERSITY_SEMESTER_DESK_FIXTURE:
        "FORGE-UNIVERSITY-SEMESTER-DESK.V1",
    }).enabled).toBe(false);
  });

  it("does not invoke hostile getters or proxy traps", () => {
    let getterCalls = 0;
    let ownKeyCalls = 0;
    let descriptorCalls = 0;
    const accessor: Record<string, string | undefined> = {};
    Object.defineProperty(
      accessor,
      "FORGE_UNIVERSITY_SEMESTER_DESK_FIXTURE",
      {
        enumerable: true,
        get() {
          getterCalls += 1;
          return "forge-university-semester-desk.v1";
        },
      },
    );
    const proxy = new Proxy({}, {
      getOwnPropertyDescriptor() {
        descriptorCalls += 1;
        throw new Error("must not inspect proxy descriptors");
      },
      ownKeys() {
        ownKeyCalls += 1;
        throw new Error("must not traverse proxy");
      },
    });

    expect(readUniversitySemesterDeskGate(accessor).enabled).toBe(false);
    expect(readUniversitySemesterDeskGate(proxy).enabled).toBe(false);
    expect(getterCalls).toBe(0);
    expect(ownKeyCalls).toBe(0);
    expect(descriptorCalls).toBe(0);
  });

  it("ignores inherited authority", () => {
    const inherited = Object.create({
      FORGE_UNIVERSITY_SEMESTER_DESK_FIXTURE:
        "forge-university-semester-desk.v1",
    }) as Record<string, string | undefined>;
    expect(readUniversitySemesterDeskGate(inherited).enabled).toBe(false);
  });
});
