import { describe, expect, it } from "vitest";

import {
  readUniversityCommandCenterGate,
} from "@/app/internal/university-command-center/fixture-gate.server";

describe("university command-center fixture gate", () => {
  it("admits only the exact own data-property token", () => {
    expect(readUniversityCommandCenterGate({}).enabled).toBe(false);
    expect(readUniversityCommandCenterGate({
      FORGE_UNIVERSITY_COMMAND_CENTER_FIXTURE:
        "forge-university-command-center.v1",
    }).enabled).toBe(true);
    expect(readUniversityCommandCenterGate({
      FORGE_UNIVERSITY_COMMAND_CENTER_FIXTURE:
        "forge-university-command-center.v1 ",
    }).enabled).toBe(false);

    const inherited = Object.create({
      FORGE_UNIVERSITY_COMMAND_CENTER_FIXTURE:
        "forge-university-command-center.v1",
    }) as Record<string, string | undefined>;
    expect(readUniversityCommandCenterGate(inherited).enabled).toBe(false);
  });

  it("does not invoke accessors or inspect proxies", () => {
    let getterCalls = 0;
    const accessor: Record<string, string | undefined> = {};
    Object.defineProperty(
      accessor,
      "FORGE_UNIVERSITY_COMMAND_CENTER_FIXTURE",
      {
        get() {
          getterCalls += 1;
          return "forge-university-command-center.v1";
        },
      },
    );
    const proxy = new Proxy({}, {
      getOwnPropertyDescriptor() {
        throw new Error("must not inspect proxy");
      },
    });

    expect(readUniversityCommandCenterGate(accessor).enabled).toBe(false);
    expect(readUniversityCommandCenterGate(proxy).enabled).toBe(false);
    expect(getterCalls).toBe(0);
  });
});
