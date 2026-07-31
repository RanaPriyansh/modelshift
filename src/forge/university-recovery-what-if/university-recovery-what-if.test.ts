import { describe, expect, it, vi } from "vitest";

import {
  universityRecoveryFixtureRequest,
} from "@/app/internal/university-recovery/recovery-fixture.server";
import { projectUniversityRecovery } from "@/src/forge/university-recovery";

import {
  projectUniversityRecoveryWhatIf,
  type UniversityRecoveryWhatIfRequestV1,
} from ".";

function request(
  availableMinutes: number,
  options: Parameters<typeof universityRecoveryFixtureRequest>[0] = {},
): UniversityRecoveryWhatIfRequestV1 {
  return {
    schemaVersion: "university-recovery-what-if-request.v1",
    recoveryRequest: universityRecoveryFixtureRequest(options),
    availableMinutes,
  };
}

describe("projectUniversityRecoveryWhatIf", () => {
  it.each([
    {
      availableMinutes: 240,
      workableMinutes: 210,
      status: "draft_ready",
      capacityState: "fits_declared_window",
      helpPrepared: false,
    },
    {
      availableMinutes: 130,
      workableMinutes: 100,
      status: "learner_choice_required",
      capacityState: "tight_declared_window",
      helpPrepared: false,
    },
    {
      availableMinutes: 100,
      workableMinutes: 70,
      status: "human_help_required",
      capacityState: "insufficient_declared_window",
      helpPrepared: true,
    },
  ] as const)(
    "recomputes the canonical $status preview from $availableMinutes available minutes",
    async ({
      availableMinutes,
      workableMinutes,
      status,
      capacityState,
      helpPrepared,
    }) => {
      const raw = universityRecoveryFixtureRequest();
      const projection = await projectUniversityRecoveryWhatIf(
        {
          schemaVersion: "university-recovery-what-if-request.v1",
          recoveryRequest: raw,
          availableMinutes,
        },
      );
      const canonical = await projectUniversityRecovery({
        ...raw,
        recoveryWindow: {
          ...raw.recoveryWindow,
          availableMinutes,
        },
      });

      expect(projection).toMatchObject({
        schemaVersion: "university-recovery-what-if-projection.v1",
        projectionClass:
          "development_only_transient_recovery_capacity_what_if",
        status,
        selection: { availableMinutes },
        recovery: {
          status,
          capacity: {
            state: capacityState,
            availableMinutes,
            protectedBufferMinutes: 30,
            workableMinutes,
            protectedEffortMinutesLow: 90,
            protectedEffortMinutesHigh: 120,
          },
        },
        issues: [],
      });
      expect(Boolean(projection.recovery?.humanHelpDraft)).toBe(helpPrepared);
      expect(projection.recovery).toEqual(canonical);
      expect(projection.recovery?.projectionDigest).toBe(
        canonical.projectionDigest,
      );
      expect(projection.projectionDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(projection.baseline?.lockedFieldsDigest).toMatch(
        /^sha256:[a-f0-9]{64}$/,
      );
      expect(projection.authority).toMatchObject({
        capacityDeclarationAuthority: "learner_fixture_only",
        protectedBufferChangeAllowed: false,
        courseworkChangeAllowed: false,
        deadlineChangeAllowed: false,
        effortChangeAllowed: false,
        dispositionChangeAllowed: false,
        recommendationAllowed: false,
        planApplicationAllowed: false,
        persistenceAllowed: false,
        messageSendAllowed: false,
        eventEmissionAllowed: false,
        externalSideEffectsAllowed: false,
      });
    },
  );

  it("makes the baseline selection exactly equal to direct canonical Recovery", async () => {
    const raw = universityRecoveryFixtureRequest();
    const [whatIf, canonical] = await Promise.all([
      projectUniversityRecoveryWhatIf({
        schemaVersion: "university-recovery-what-if-request.v1",
        recoveryRequest: raw,
        availableMinutes: raw.recoveryWindow.availableMinutes,
      }),
      projectUniversityRecovery(raw),
    ]);

    expect(whatIf.status).toBe("draft_ready");
    expect(whatIf.recovery).toEqual(canonical);
    expect(whatIf.recovery?.projectionDigest).toBe(
      canonical.projectionDigest,
    );
    expect(whatIf.baseline?.recoveryProjectionDigest).toBe(
      canonical.projectionDigest,
    );
  });

  it("keeps every field except available minutes locked", async () => {
    const first = await projectUniversityRecoveryWhatIf(request(240));
    const second = await projectUniversityRecoveryWhatIf(request(100));

    expect(second.baseline).toEqual(first.baseline);
    expect(second.baseline?.lockedFieldsDigest).toBe(
      first.baseline?.lockedFieldsDigest,
    );
    expect(second.recovery?.scope).toEqual(first.recovery?.scope);
    expect(second.recovery?.asOf).toBe(first.recovery?.asOf);
    expect(second.recovery?.termLabel).toBe(first.recovery?.termLabel);
    expect(second.recovery?.timeZone).toBe(first.recovery?.timeZone);
    expect(second.recovery?.sourceCourses).toEqual(
      first.recovery?.sourceCourses,
    );
    expect(second.recovery?.lanes.protectNow).toEqual(
      first.recovery?.lanes.protectNow,
    );
    expect(second.recovery?.lanes.outsideThisWindow).toEqual(
      first.recovery?.lanes.outsideThisWindow,
    );
  });

  it("does not mutate the caller's raw Recovery request", async () => {
    const raw = universityRecoveryFixtureRequest();
    const before = structuredClone(raw);

    await projectUniversityRecoveryWhatIf({
      schemaVersion: "university-recovery-what-if-request.v1",
      recoveryRequest: raw,
      availableMinutes: 100,
    });

    expect(raw).toEqual(before);
    expect(raw.recoveryWindow.availableMinutes).toBe(240);
    expect(raw.recoveryWindow.bufferMinutes).toBe(30);
  });

  it("withholds selection and capacity when the copied source needs review", async () => {
    const projection = await projectUniversityRecoveryWhatIf(
      request(240, { conflict: true }),
    );

    expect(projection).toMatchObject({
      status: "source_review_required",
      selection: null,
      recovery: {
        status: "source_review_required",
        capacity: null,
        lanes: {
          protectNow: [],
          decideOrAsk: [],
          outsideThisWindow: [],
        },
      },
      issues: [{ code: "source.review_required" }],
    });
    expect(projection.projectionDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("fails closed for invalid capacity instead of repairing the protected buffer", async () => {
    const projection = await projectUniversityRecoveryWhatIf(request(20));

    expect(projection).toMatchObject({
      status: "invalid",
      baseline: null,
      selection: null,
      recovery: null,
      issues: [{ code: "result.invalid", path: "availableMinutes" }],
      projectionDigest: null,
    });
  });

  it("accepts no supplied status, projection, command, or effect field", async () => {
    const projection = await projectUniversityRecoveryWhatIf({
      ...request(240),
      status: "draft_ready",
      projection: { status: "draft_ready" },
      apply: true,
      save: true,
      effect: "calendar.write",
    });

    expect(projection).toMatchObject({
      status: "invalid",
      issues: [{ code: "schema.invalid" }],
      projectionDigest: null,
    });
  });

  it("rejects hostile accessors and nested proxies without invoking them", async () => {
    const getter = vi.fn(() => "university-recovery-what-if-request.v1");
    const hostileGetter = {};
    Object.defineProperty(hostileGetter, "schemaVersion", {
      enumerable: true,
      get: getter,
    });
    const ownKeys = vi.fn(() => ["value"]);
    const getPrototypeOf = vi.fn(() => Object.prototype);
    const nestedProxy = new Proxy({ value: "not inspected" }, {
      ownKeys,
      getPrototypeOf,
    });

    const [accessor, proxy] = await Promise.all([
      projectUniversityRecoveryWhatIf(hostileGetter),
      projectUniversityRecoveryWhatIf({
        ...request(240),
        unexpected: nestedProxy,
      }),
    ]);

    expect(accessor).toMatchObject({
      status: "invalid",
      issues: [{ code: "schema.invalid" }],
    });
    expect(proxy).toMatchObject({
      status: "invalid",
      issues: [{ code: "schema.invalid" }],
    });
    expect(getter).not.toHaveBeenCalled();
    expect(ownKeys).not.toHaveBeenCalled();
    expect(getPrototypeOf).not.toHaveBeenCalled();
  });

  it("rejects exotic, cyclic, over-deep, oversized, nonfinite, and unsafe-number graphs", async () => {
    const valid = request(240);
    const exotic = Object.assign(Object.create({ inherited: true }), valid);
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    let deep: unknown = "leaf";
    for (let index = 0; index < 16; index += 1) deep = { value: deep };
    const oversized = Array.from({ length: 513 }, () => null);

    const results = await Promise.all([
      projectUniversityRecoveryWhatIf(exotic),
      projectUniversityRecoveryWhatIf({ ...valid, unexpected: cycle }),
      projectUniversityRecoveryWhatIf({ ...valid, unexpected: deep }),
      projectUniversityRecoveryWhatIf({ ...valid, unexpected: oversized }),
      projectUniversityRecoveryWhatIf({
        ...valid,
        availableMinutes: Number.POSITIVE_INFINITY,
      }),
      projectUniversityRecoveryWhatIf({
        ...valid,
        availableMinutes: Number.MAX_SAFE_INTEGER + 1,
      }),
    ]);

    for (const projection of results) {
      expect(projection).toMatchObject({
        status: "invalid",
        projectionDigest: null,
      });
      expect(projection.issues.length).toBeGreaterThan(0);
      expect(projection.issues.every((issue) => (
        issue.code === "schema.invalid"
      ))).toBe(true);
    }
  });

  it("is deterministic, deeply immutable, and performs no external effect", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    try {
      const [first, second] = await Promise.all([
        projectUniversityRecoveryWhatIf(request(130)),
        projectUniversityRecoveryWhatIf(request(130)),
      ]);

      expect(first).toEqual(second);
      expect(first.projectionDigest).toBe(second.projectionDigest);
      expect(Object.isFrozen(first)).toBe(true);
      expect(Object.isFrozen(first.authority)).toBe(true);
      expect(Object.isFrozen(first.baseline)).toBe(true);
      expect(Object.isFrozen(first.selection)).toBe(true);
      expect(Object.isFrozen(first.recovery)).toBe(true);
      expect(Object.isFrozen(first.recovery?.capacity)).toBe(true);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
