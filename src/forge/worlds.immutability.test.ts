import { describe, expect, it } from "vitest";

import type { RatioWorldEvent } from "../worlds/proportional-reasoning";
import {
  createWorldRuntimeSession,
  dispatchWorldRuntimeCommand,
  proportionalReasoningWorldRuntimeAdapter,
} from "./world-runtime";
import {
  BUILT_IN_DETERMINISTIC_VALIDATORS,
  BUILT_IN_SOURCE_IDS,
  BUILT_IN_WORLD_IDS,
  BUILT_IN_WORLD_PACKS,
  BUILT_IN_WORLD_ROUTES,
  PROPORTIONAL_REASONING_WORLD,
  PUBLIC_SOURCE_IDS,
  PUBLIC_WORLD_CATALOG,
  PUBLIC_WORLD_IDS,
  PUBLIC_WORLD_PACKS,
  PUBLIC_WORLD_ROUTES,
} from "./worlds";
import {
  ARGUMENT_EVIDENCE_WORLD,
  INTERNAL_BUILT_IN_DETERMINISTIC_VALIDATORS,
  INTERNAL_BUILT_IN_SOURCE_IDS,
  INTERNAL_BUILT_IN_WORLD_IDS,
  INTERNAL_BUILT_IN_WORLD_PACKS,
  INTERNAL_BUILT_IN_WORLD_ROUTES,
} from "./worlds.internal";

function expectReachableGraphFrozen(
  value: unknown,
  path: string,
  seen = new WeakSet<object>(),
): void {
  if (value === null || (typeof value !== "object" && typeof value !== "function")) return;

  const objectValue = value as object;
  if (seen.has(objectValue)) return;
  seen.add(objectValue);
  expect(Object.isFrozen(objectValue), `${path} must be frozen`).toBe(true);

  for (const key of Reflect.ownKeys(objectValue)) {
    const descriptor = Object.getOwnPropertyDescriptor(objectValue, key);
    if (descriptor && "value" in descriptor) {
      expectReachableGraphFrozen(descriptor.value, `${path}.${String(key)}`, seen);
    }
  }
}

function completedProportionalReceipt() {
  let session = createWorldRuntimeSession(
    proportionalReasoningWorldRuntimeAdapter,
    "attempt.canonical-pack-deep-freeze",
  );
  const events: readonly RatioWorldEvent[] = [
    { type: "COMMIT_INITIAL", predictionId: "same_strength", confidence: 65 },
    { type: "COMMIT_EXPLANATION", explanation: "Both recipes leave one more cup of water than concentrate." },
    { type: "COMMIT_TEST_PREDICTION", predictionId: "same_strength" },
    { type: "RUN_EXPERIMENT" },
    { type: "REQUEST_SUPPORT" },
    { type: "BEGIN_RECONSTRUCTION" },
    { type: "SUBMIT_RECONSTRUCTION", reconstruction: "A relationship stays proportional when both quantities scale by the same factor." },
    { type: "ACKNOWLEDGE_WITHDRAWAL" },
    {
      type: "SUBMIT_TRANSFER",
      choiceId: "32_km",
      explanation: "12 is four times 3, so the real distance scales from 8 to 32 by the same factor.",
      confidence: 85,
    },
  ];

  for (const event of events) {
    const dispatched = dispatchWorldRuntimeCommand(proportionalReasoningWorldRuntimeAdapter, session, {
      kind: "domain",
      event,
    });
    if (!dispatched.accepted) throw new Error(`Proportional fixture rejected: ${dispatched.reason}`);
    session = dispatched.session;
  }
  if (!session.receipt) throw new Error("Proportional fixture did not emit a receipt.");
  return session.receipt;
}

describe("canonical World pack immutability", () => {
  it("deep-freezes every public and retained-internal pack plus exported catalog arrays", () => {
    const roots = {
      BUILT_IN_WORLD_PACKS,
      BUILT_IN_WORLD_IDS,
      BUILT_IN_WORLD_ROUTES,
      BUILT_IN_SOURCE_IDS,
      PUBLIC_WORLD_PACKS,
      PUBLIC_WORLD_IDS,
      PUBLIC_WORLD_ROUTES,
      PUBLIC_SOURCE_IDS,
      PUBLIC_WORLD_CATALOG,
      BUILT_IN_DETERMINISTIC_VALIDATORS,
      ARGUMENT_EVIDENCE_WORLD,
      INTERNAL_BUILT_IN_WORLD_PACKS,
      INTERNAL_BUILT_IN_WORLD_IDS,
      INTERNAL_BUILT_IN_WORLD_ROUTES,
      INTERNAL_BUILT_IN_SOURCE_IDS,
      INTERNAL_BUILT_IN_DETERMINISTIC_VALIDATORS,
    };

    for (const [name, root] of Object.entries(roots)) {
      expectReachableGraphFrozen(root, name);
    }
  });

  it("rejects canonical fact mutation before a session and emits the exact retained identity", () => {
    const pack = PROPORTIONAL_REASONING_WORLD;
    const source = pack.manifest.sources[0]!;
    const validator = pack.deterministicValidators[0]!;
    const proofClaim = pack.proofClaims[0]!;
    const remainsUntested = pack.runtime.evidence.remainsUntested;
    const sourceBinding = pack.runtime.sourceBindings[0]!;

    expect(Reflect.set(pack.runtime.proof, "taskCode", "forged_task")).toBe(false);
    expect(Reflect.set(pack.release, "contentVersion", "9.9.9")).toBe(false);
    expect(Reflect.set(remainsUntested, 0, "forged limitation")).toBe(false);
    expect(Reflect.set(source, "id", "source.forged")).toBe(false);
    expect(Reflect.set(validator, "id", "validator.forged")).toBe(false);
    expect(Reflect.set(proofClaim, "statement", "Forged proof claim.")).toBe(false);
    expect(() => (sourceBinding.claimIds as string[]).push("claim.forged")).toThrow(TypeError);
    expect(Reflect.set(PUBLIC_WORLD_PACKS, 0, ARGUMENT_EVIDENCE_WORLD)).toBe(false);
    expect(Reflect.set(PUBLIC_WORLD_CATALOG[0]!, "id", "world.forged")).toBe(false);

    expect(pack.runtime.proof.taskCode).toBe("map_scale_transfer");
    expect(pack.release.contentVersion).toBe("1.0.0");
    expect(remainsUntested[0]).toBe("Delayed retention after assistance has faded");
    expect(source.id).toBe("source.openstax.ratios-and-rate");
    expect(validator.id).toBe("validator.proportional-reasoning-transfer.v1");
    expect(proofClaim.statement).toBe(
      "On an unfamiliar map scale, the learner independently selects the exact proportional distance and submits a relationship explanation after all conceptual support is removed.",
    );
    expect(sourceBinding.claimIds).toEqual([]);
    expect(PUBLIC_WORLD_PACKS[0]?.manifest.id).toBe("world.force-and-motion");
    expect(PUBLIC_WORLD_CATALOG[0]?.id).toBe("world.force-and-motion");

    const receipt = completedProportionalReceipt();
    expect(receipt).toMatchObject({
      runtimeBindingDigest: "sha256:b2f134f91ee9cd71750e19c8b440751bcf93415aec10a254e1b0ac491e8840c1",
      packageIntegrityHash: "sha256:b8430668c5b061415aa5ec24bb8e62ae4a4e4c95a808c7a65b04e3ff78a8a353",
      world: {
        id: "world.proportional-reasoning",
        version: "1.0.2",
        contentVersion: "1.0.0",
        capabilityId: "capability.proportional-reasoning.compare-and-scale",
        proofClaimId: "proof.proportional-reasoning.independent-transfer",
        taskCode: "map_scale_transfer",
        taskFamilyId: "task-family.proportional-reasoning.map-scale-transfer.v1",
      },
      validator: {
        id: "validator.proportional-reasoning-transfer.v1",
        version: "1.0.0",
        outcome: "pass",
        disposition: "demonstrated",
      },
    });
    expect(receipt.remainsUntested).toEqual([
      "Delayed retention after assistance has faded",
      "Transfer across a wider range of proportional and non-proportional situations",
      "Independent setup when no answer choices are provided",
    ]);
    expect(receipt.sourceBindings).toEqual([
      expect.objectContaining({
        domainSourceRef: "legacy.openstax.ratios-and-rate",
        sourceItemId: "source.openstax.ratios-and-rate",
        claimIds: [],
        status: "legacy_metadata_only",
      }),
    ]);
  });
});
