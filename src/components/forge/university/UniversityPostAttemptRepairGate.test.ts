import { describe, expect, it, vi } from "vitest";

import {
  readUniversityPostAttemptRepairGate,
} from "@/app/internal/university-post-attempt-repair/fixture-gate.server";

describe("university post-attempt repair route gate", () => {
  it("is unavailable by default and accepts only the exact server token", () => {
    expect(readUniversityPostAttemptRepairGate({})).toEqual({
      enabled: false,
      status: "post-attempt-repair-fixture-unavailable",
    });
    expect(readUniversityPostAttemptRepairGate({
      FORGE_UNIVERSITY_POST_ATTEMPT_REPAIR_FIXTURE: "true",
    }).enabled).toBe(false);
    expect(readUniversityPostAttemptRepairGate({
      FORGE_UNIVERSITY_POST_ATTEMPT_REPAIR_FIXTURE:
        "forge-university-post-attempt-repair.v1 ",
    }).enabled).toBe(false);
    expect(readUniversityPostAttemptRepairGate({
      NEXT_PUBLIC_FORGE_UNIVERSITY_POST_ATTEMPT_REPAIR_FIXTURE:
        "forge-university-post-attempt-repair.v1",
    }).enabled).toBe(false);
    expect(readUniversityPostAttemptRepairGate({
      FORGE_UNIVERSITY_POST_ATTEMPT_REPAIR_FIXTURE:
        "forge-university-post-attempt-repair.v1",
    })).toEqual({
      enabled: true,
      status: "post-attempt-repair-fixture-enabled",
    });
  });

  it("fails closed for inherited values, accessors, and proxies", () => {
    const inherited = Object.create({
      FORGE_UNIVERSITY_POST_ATTEMPT_REPAIR_FIXTURE:
        "forge-university-post-attempt-repair.v1",
    }) as Record<string, string | undefined>;
    const getter = vi.fn(
      () => "forge-university-post-attempt-repair.v1",
    );
    const accessor = {};
    Object.defineProperty(
      accessor,
      "FORGE_UNIVERSITY_POST_ATTEMPT_REPAIR_FIXTURE",
      {
        enumerable: true,
        get: getter,
      },
    );
    const ownKeys = vi.fn(() => [
      "FORGE_UNIVERSITY_POST_ATTEMPT_REPAIR_FIXTURE",
    ]);
    const proxy = new Proxy({
      FORGE_UNIVERSITY_POST_ATTEMPT_REPAIR_FIXTURE:
        "forge-university-post-attempt-repair.v1",
    }, { ownKeys });

    expect(readUniversityPostAttemptRepairGate(inherited).enabled).toBe(false);
    expect(readUniversityPostAttemptRepairGate(
      accessor as Record<string, string | undefined>,
    ).enabled).toBe(false);
    expect(readUniversityPostAttemptRepairGate(proxy).enabled).toBe(false);
    expect(getter).not.toHaveBeenCalled();
    expect(ownKeys).not.toHaveBeenCalled();
  });
});
