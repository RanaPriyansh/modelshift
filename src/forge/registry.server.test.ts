import { afterEach, describe, expect, it, vi } from "vitest";

import type { DeterministicValidator, LearningWorldPack } from "./contracts";
import {
  createTrustedWorldRegistry,
  TrustedWorldRegistryError,
  trustedWorldRegistry,
} from "./registry.server";
import {
  BUILT_IN_DETERMINISTIC_VALIDATORS,
  BUILT_IN_WORLD_PACKS,
  FORCE_AND_MOTION_VALIDATOR_ID,
  FORCE_AND_MOTION_WORLD,
  SOURCE_CORROBORATION_WORLD,
} from "./worlds";

afterEach(() => {
  vi.unstubAllGlobals();
});

function expectRegistryCode(operation: () => unknown, code: string): void {
  try {
    operation();
    throw new Error("Expected registry operation to fail.");
  } catch (error) {
    expect(error).toBeInstanceOf(TrustedWorldRegistryError);
    expect((error as TrustedWorldRegistryError).code).toBe(code);
  }
}

describe("TrustedWorldRegistry", () => {
  it("lists only truthful available worlds by default", () => {
    expect(trustedWorldRegistry.list().map((manifest) => manifest.id)).toEqual([
      "world.force-and-motion",
      "world.proportional-reasoning",
      "world.source-corroboration",
    ]);
    expect(trustedWorldRegistry.list({ includeUnavailable: true }).map((manifest) => manifest.id)).toEqual([
      "world.force-and-motion",
      "world.proportional-reasoning",
      "world.source-corroboration",
    ]);
  });

  it("filters manifests by age, depth, tier, and kind", () => {
    expect(trustedWorldRegistry.list({ includeUnavailable: true, ageMode: "18-plus" })).toHaveLength(3);
    expect(trustedWorldRegistry.list({ includeUnavailable: true, ageMode: "under-13" })).toHaveLength(1);
    expect(trustedWorldRegistry.list({ includeUnavailable: true, depthMode: "advanced" })).toHaveLength(1);
    expect(trustedWorldRegistry.list({ evidenceTier: "verified" })).toHaveLength(2);
    expect(trustedWorldRegistry.list({ includeUnavailable: true, kind: "evidence" })).toHaveLength(1);
  });

  it("resolves only released, available routes", () => {
    expect(trustedWorldRegistry.resolveAvailableRoute("/learn/force-and-motion")?.manifest.id).toBe("world.force-and-motion");
    expect(trustedWorldRegistry.resolveAvailableRoute("/learn/ai-and-learning")?.manifest.id).toBe(
      "world.source-corroboration",
    );
    expect(trustedWorldRegistry.resolveAvailableRoute("/learn/proportional-reasoning")?.manifest.id).toBe(
      "world.proportional-reasoning",
    );
  });

  it("exposes immutable trusted snapshots", () => {
    const pack = trustedWorldRegistry.getPack("world.force-and-motion");
    expect(Object.isFrozen(pack)).toBe(true);
    expect(Object.isFrozen(pack?.manifest)).toBe(true);
    expect(Object.isFrozen(pack?.capabilities)).toBe(true);
    expect(Object.isFrozen(trustedWorldRegistry.list())).toBe(true);
  });

  it("runs the executable force-and-motion validator", () => {
    expect(
      trustedWorldRegistry.runDeterministicValidator("world.force-and-motion", {
        taskId: "cargo_pod_force_graph",
        selectedAnswer: "stays_constant_after_force",
      }),
    ).toMatchObject({ passed: true, score: 1, code: "transfer.demonstrated" });

    expect(
      trustedWorldRegistry.runDeterministicValidator("world.force-and-motion", {
        taskId: "cargo_pod_force_graph",
        selectedAnswer: "returns_to_zero",
      }),
    ).toMatchObject({ passed: false, score: 0, code: "transfer.not-demonstrated" });

    expect(trustedWorldRegistry.runDeterministicValidator("world.force-and-motion", { invalid: true })).toMatchObject({
      passed: false,
      code: "invalid.transfer-input",
    });
  });

  it("runs the source-corroboration validator and fails closed for unknown worlds", () => {
    expect(
      trustedWorldRegistry.runDeterministicValidator("world.source-corroboration", {
        choiceId: "bounded-measures",
        openQuestionId: "held-constant",
      }),
    ).toMatchObject({ passed: true, score: 1, code: "transfer.held" });

    expectRegistryCode(
      () => trustedWorldRegistry.runDeterministicValidator("world.unknown", {}),
      "registry.world-not-found",
    );
  });

  it("runs the exact proportional-reasoning validator", () => {
    expect(
      trustedWorldRegistry.runDeterministicValidator("world.proportional-reasoning", {
        choiceId: "32_km",
        explanation: "12 is four times 3, so 8 times 4 is 32.",
        confidence: 80,
      }),
    ).toMatchObject({ passed: true, score: 1, code: "transfer.demonstrated" });

    expect(
      trustedWorldRegistry.runDeterministicValidator("world.proportional-reasoning", {
        choiceId: "24_km",
        explanation: "I used the same relationship.",
        confidence: 80,
      }),
    ).toMatchObject({ passed: false, score: 0, code: "transfer.not-demonstrated" });
  });

  it("rejects duplicate world IDs and routes", () => {
    expectRegistryCode(
      () => createTrustedWorldRegistry({ packs: [FORCE_AND_MOTION_WORLD, FORCE_AND_MOTION_WORLD], validators: BUILT_IN_DETERMINISTIC_VALIDATORS }),
      "registry.duplicate-world-id",
    );

    const duplicateRoute = structuredClone(SOURCE_CORROBORATION_WORLD) as LearningWorldPack;
    duplicateRoute.manifest.route = "/learn/force-and-motion";
    expectRegistryCode(
      () => createTrustedWorldRegistry({ packs: [FORCE_AND_MOTION_WORLD, duplicateRoute], validators: BUILT_IN_DETERMINISTIC_VALIDATORS }),
      "registry.duplicate-route",
    );
  });

  it("rejects missing, duplicate, and undeclared runtime validator bindings", () => {
    expectRegistryCode(
      () => createTrustedWorldRegistry({ packs: BUILT_IN_WORLD_PACKS, validators: [] }),
      "registry.validator-binding-missing",
    );
    expectRegistryCode(
      () =>
        createTrustedWorldRegistry({
          packs: BUILT_IN_WORLD_PACKS,
          validators: [BUILT_IN_DETERMINISTIC_VALIDATORS[0], BUILT_IN_DETERMINISTIC_VALIDATORS[0]],
        }),
      "registry.duplicate-validator-id",
    );

    const undeclared: DeterministicValidator = {
      id: "validator.undeclared.v1",
      validate: () => ({ passed: true, score: 1, code: "test.passed", evidence: [] }),
    };
    expectRegistryCode(
      () => createTrustedWorldRegistry({ packs: BUILT_IN_WORLD_PACKS, validators: [...BUILT_IN_DETERMINISTIC_VALIDATORS, undeclared] }),
      "registry.validator-definition-missing",
    );
  });

  it("rejects invalid output from a deterministic validator", () => {
    const invalidOutputValidator: DeterministicValidator = {
      id: FORCE_AND_MOTION_VALIDATOR_ID,
      validate: () => ({ passed: true, score: 2, code: "invalid.score", evidence: [] }),
    };
    const registry = createTrustedWorldRegistry({
      packs: BUILT_IN_WORLD_PACKS,
      validators: [invalidOutputValidator, ...BUILT_IN_DETERMINISTIC_VALIDATORS.slice(1)],
    });
    expectRegistryCode(
      () =>
        registry.runDeterministicValidator("world.force-and-motion", {
          taskId: "cargo_pod_force_graph",
          selectedAnswer: "stays_constant_after_force",
        }),
      "registry.validator-output-invalid",
    );
  });

  it("rejects registry construction in a browser runtime", () => {
    vi.stubGlobal("window", {});
    expectRegistryCode(
      () => createTrustedWorldRegistry({ packs: BUILT_IN_WORLD_PACKS, validators: BUILT_IN_DETERMINISTIC_VALIDATORS }),
      "registry.browser-runtime",
    );
  });
});
