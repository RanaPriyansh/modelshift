import { describe, expect, it } from "vitest";

import {
  readUniversityLearningMapGate,
} from "@/app/internal/university-learning-map/fixture-gate.server";

describe("university learning-map fixture gate", () => {
  it("accepts only the exact own development token", () => {
    expect(readUniversityLearningMapGate({}).enabled).toBe(false);
    expect(readUniversityLearningMapGate({
      FORGE_UNIVERSITY_LEARNING_MAP_FIXTURE:
        "forge-university-learning-map.v1",
    })).toEqual({
      enabled: true,
      status: "learning-map-fixture-enabled",
    });
    expect(readUniversityLearningMapGate({
      FORGE_UNIVERSITY_LEARNING_MAP_FIXTURE:
        "forge-university-learning-map.v1 ",
    }).enabled).toBe(false);
    expect(readUniversityLearningMapGate({
      FORGE_UNIVERSITY_LEARNING_MAP_FIXTURE:
        "FORGE-UNIVERSITY-LEARNING-MAP.V1",
    }).enabled).toBe(false);
    expect(readUniversityLearningMapGate(Object.create({
      FORGE_UNIVERSITY_LEARNING_MAP_FIXTURE:
        "forge-university-learning-map.v1",
    }) as Record<string, string | undefined>).enabled).toBe(false);
  });

  it("does not invoke hostile getters or proxy traps", () => {
    let getterCalls = 0;
    let ownKeyCalls = 0;
    const accessor: Record<string, string | undefined> = {};
    Object.defineProperty(
      accessor,
      "FORGE_UNIVERSITY_LEARNING_MAP_FIXTURE",
      {
        enumerable: true,
        get() {
          getterCalls += 1;
          return "forge-university-learning-map.v1";
        },
      },
    );
    const proxy = new Proxy({}, {
      ownKeys() {
        ownKeyCalls += 1;
        throw new Error("must not traverse proxy");
      },
    });

    expect(readUniversityLearningMapGate(accessor).enabled).toBe(false);
    expect(readUniversityLearningMapGate(proxy).enabled).toBe(false);
    expect(getterCalls).toBe(0);
    expect(ownKeyCalls).toBe(0);
  });
});
