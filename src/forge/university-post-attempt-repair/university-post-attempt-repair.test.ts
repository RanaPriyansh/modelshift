import { describe, expect, it, vi } from "vitest";

import {
  universityTodayFixtureRequest,
} from "@/app/internal/university-today/today-fixture.server";
import { canonicalJson, sha256Digest } from "@/src/forge/events";
import {
  createWorldRuntimeSession,
  dispatchWorldRuntimeCommand,
  proportionalReasoningWorldRuntimeAdapter,
  type BoundedLocalWorldRuntimeReceipt,
} from "@/src/forge/world-runtime";
import { SOURCE_CORROBORATION_WORLD } from "@/src/forge/worlds";
import type {
  RatioWorldEvent,
} from "@/src/worlds/proportional-reasoning";
import {
  verifyPublicWorldRuntimeReceiptAttestation,
} from "@/src/forge/world-runtime/runtime-core.public";

import {
  UNIVERSITY_POST_ATTEMPT_REPAIR_POLICY,
  createUniversityPostAttemptFixtureReceipt,
  projectUniversityPostAttemptRepair,
} from "./index.server";

function expectDeeplyFrozen(value: unknown): void {
  if (typeof value !== "object" || value === null) return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) expectDeeplyFrozen(child);
}

async function request(runtimeReceipt: unknown) {
  return {
    schemaVersion: "university-post-attempt-repair-request.v1" as const,
    todayRequest: await universityTodayFixtureRequest("ready"),
    worldPack: SOURCE_CORROBORATION_WORLD,
    runtimeReceipt,
  };
}

function attestedWrongWorldReceipt(): BoundedLocalWorldRuntimeReceipt {
  const events = [
    { type: "COMMIT_INITIAL", predictionId: "same_strength", confidence: 65 },
    {
      type: "COMMIT_EXPLANATION",
      explanation: "Both recipes leave one more cup of water than concentrate.",
    },
    { type: "COMMIT_TEST_PREDICTION", predictionId: "same_strength" },
    { type: "RUN_EXPERIMENT" },
    { type: "BEGIN_RECONSTRUCTION" },
    {
      type: "SUBMIT_RECONSTRUCTION",
      reconstruction:
        "A ratio stays proportional only when both quantities scale by the same factor.",
    },
    { type: "ACKNOWLEDGE_WITHDRAWAL" },
    {
      type: "SUBMIT_TRANSFER",
      choiceId: "32_km",
      explanation:
        "12 is four times 3, so I scale 8 km by the same factor to get 32 km.",
      confidence: 85,
    },
  ] as const satisfies readonly RatioWorldEvent[];
  let session = createWorldRuntimeSession(
    proportionalReasoningWorldRuntimeAdapter,
    "attempt.university-repair-wrong-world",
  );
  for (const event of events) {
    const result = dispatchWorldRuntimeCommand(
      proportionalReasoningWorldRuntimeAdapter,
      session,
      { kind: "domain", event },
    );
    if (!result.accepted) {
      throw new Error(`Wrong-World receipt failed at ${event.type}.`);
    }
    session = result.session;
  }
  if (!session.receipt) throw new Error("Wrong-World runtime produced no receipt.");
  return session.receipt;
}

describe("projectUniversityPostAttemptRepair", () => {
  it("turns one exact attested partial result into one bounded authored repair", async () => {
    const receipt = createUniversityPostAttemptFixtureReceipt(
      "bounded-measures",
      "color-choice",
    );
    const projection = await projectUniversityPostAttemptRepair(
      await request(receipt),
    );

    expect(verifyPublicWorldRuntimeReceiptAttestation(receipt)).toBe(true);
    expect(projection).toMatchObject({
      schemaVersion: "university-post-attempt-repair-projection.v1",
      status: "repair_ready",
      context: {
        binding: "server_paired_synthetic_not_receipt_bound",
        activityTitle: "Test one claim against two sources",
        worldTitle: "AI & learning",
        worldVersion: "1.0.1",
        taskLabel: "Two authored source-corroboration checks",
      },
      evidence: {
        checksTotal: 2,
        checksHeld: 1,
        countLabel: "1 of 2 authored checks",
        checks: [
          {
            id: "bounded_conclusion",
            state: "held_this_attempt",
          },
          {
            id: "unresolved_condition",
            state: "still_open",
          },
        ],
      },
      repair: {
        errorClass: "unresolved_condition",
        title: "Name the missing comparison.",
        answerExposing: false,
      },
      issues: [],
    });
    expect(projection.projectionDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(projection.context?.resultBoundary).toMatch(
      /server-paired synthetic course context; not bound into the receipt/i,
    );
    expect(projection.authority).toEqual({
      projectionClass:
        "fixture_only_authored_post_attempt_repair_brief",
      identityScopeAuthority: "caller_asserted_fixture_only",
      courseSourceAuthority:
        "learner_connected_copy_not_institutional_truth",
      receiptAuthority: "exact_process_local_runtime_attestation",
      receiptContextBinding: "not_established",
      repairSelectionAuthority: "fixed_internal_authored_research_mapping",
      modelUsed: false,
      retrievalUsed: false,
      answerGenerationAllowed: false,
      diagnosisAllowed: false,
      masteryClaimAllowed: false,
      gradeAllowed: false,
      capabilityClaimAllowed: false,
      personalizedRecommendationAllowed: false,
      assignmentAllowed: false,
      pathMutationAllowed: false,
      sessionStartAllowed: false,
      retryStartAllowed: false,
      proofStartAllowed: false,
      persistenceAllowed: false,
      eventEmissionAllowed: false,
      evidenceUpgradeAllowed: false,
      messagingAllowed: false,
      schedulingAllowed: false,
      providerCallAllowed: false,
      externalSideEffectsAllowed: false,
    });

    const serialized = JSON.stringify(projection);
    expect(serialized).not.toContain("choice:bounded-measures");
    expect(serialized).not.toContain("open-question:color-choice");
    expect(serialized).not.toContain("attempt.university-repair");
    expect(serialized).not.toContain(receipt.recordedAt);
    expect(serialized).not.toContain(receipt.runtimeBindingDigest);
    expect(serialized).not.toContain(receipt.packageIntegrityHash);
    expect(serialized).not.toContain(
      "The access design and later measurement",
    );
    expectDeeplyFrozen(projection);
  });

  it("keeps an exact pass distinct without selecting repair or claiming retention", async () => {
    const projection = await projectUniversityPostAttemptRepair(
      await request(createUniversityPostAttemptFixtureReceipt(
        "bounded-measures",
        "held-constant",
      )),
    );

    expect(projection).toMatchObject({
      status: "not_applicable",
      evidence: {
        checksTotal: 2,
        checksHeld: 2,
        countLabel: "2 of 2 authored checks",
      },
      repair: null,
      issues: [],
    });
    expect(projection.message).toMatch(
      /Delayed retention and broader capability remain untested/i,
    );
    expect(JSON.stringify(projection)).not.toMatch(/mastered|mastery achieved/i);
  });

  it("stops on an exact attested fail with no fixed authored mapping", async () => {
    const receipt = createUniversityPostAttemptFixtureReceipt(
      "always-harms",
      "reader-preference",
    );
    const projection = await projectUniversityPostAttemptRepair(
      await request(receipt),
    );

    expect(verifyPublicWorldRuntimeReceiptAttestation(receipt)).toBe(true);
    expect(projection).toMatchObject({
      status: "repair_mapping_missing",
      evidence: {
        checksTotal: 2,
        checksHeld: 0,
        checks: [],
      },
      repair: null,
      issues: [{
        code: "repair.mapping_missing",
      }],
    });
    expect(projection.message).toMatch(/will not invent one/i);
  });

  it("keeps an attested alternate partial result visibly unmapped", async () => {
    const receipt = createUniversityPostAttemptFixtureReceipt(
      "always-harms",
      "held-constant",
    );
    expect(verifyPublicWorldRuntimeReceiptAttestation(receipt)).toBe(true);
    expect(receipt.validator).toMatchObject({
      code: "transfer.partial",
      outcome: "fail",
      disposition: "not_demonstrated",
      criteria: [
        "choice:always-harms",
        "open-question:held-constant",
      ],
    });

    expect(await projectUniversityPostAttemptRepair(
      await request(receipt),
    )).toMatchObject({
      status: "repair_mapping_missing",
      repair: null,
      issues: [{ code: "repair.mapping_missing" }],
    });
  });

  it("rejects a genuine attested receipt from another canonical World", async () => {
    const receipt = attestedWrongWorldReceipt();
    expect(verifyPublicWorldRuntimeReceiptAttestation(receipt)).toBe(true);
    expect(receipt.world.id).toBe("world.proportional-reasoning");

    expect(await projectUniversityPostAttemptRepair(
      await request(receipt),
    )).toMatchObject({
      status: "invalid",
      context: null,
      evidence: null,
      repair: null,
      issues: [{ code: "binding.mismatch" }],
    });
  });

  it("rejects a reconstructed or edited receipt even when its shape matches", async () => {
    const receipt = createUniversityPostAttemptFixtureReceipt(
      "bounded-measures",
      "color-choice",
    );
    const reconstructed = structuredClone(receipt);
    const edited = structuredClone(receipt);
    (edited as unknown as {
      validator: { criteria: string[] };
    }).validator.criteria = [
      "choice:bounded-measures",
      "open-question:held-constant",
    ];

    expect(verifyPublicWorldRuntimeReceiptAttestation(reconstructed)).toBe(false);
    expect((await projectUniversityPostAttemptRepair(
      await request(reconstructed),
    )).issues).toEqual([expect.objectContaining({
      code: "receipt.unattested",
    })]);
    expect((await projectUniversityPostAttemptRepair(
      await request(edited),
    )).issues).toEqual([expect.objectContaining({
      code: "receipt.unattested",
    })]);
  });

  it("rejects hostile and revoked receipt proxies without executing traps", async () => {
    const get = vi.fn(() => {
      throw new Error("receipt get trap must not execute");
    });
    const getPrototypeOf = vi.fn(() => {
      throw new Error("receipt prototype trap must not execute");
    });
    const ownKeys = vi.fn(() => {
      throw new Error("receipt ownKeys trap must not execute");
    });
    const getOwnPropertyDescriptor = vi.fn(() => {
      throw new Error("receipt descriptor trap must not execute");
    });
    const hostile = new Proxy({}, {
      get,
      getPrototypeOf,
      ownKeys,
      getOwnPropertyDescriptor,
    });
    const revoked = Proxy.revocable({}, {});
    revoked.revoke();

    for (const runtimeReceipt of [hostile, revoked.proxy]) {
      expect(await projectUniversityPostAttemptRepair(
        await request(runtimeReceipt),
      )).toMatchObject({
        status: "invalid",
        issues: [{ code: "receipt.unattested" }],
      });
    }
    expect(get).not.toHaveBeenCalled();
    expect(getPrototypeOf).not.toHaveBeenCalled();
    expect(ownKeys).not.toHaveBeenCalled();
    expect(getOwnPropertyDescriptor).not.toHaveBeenCalled();
  });

  it("requires the exact canonical World object and a ready protected-study input", async () => {
    const receipt = createUniversityPostAttemptFixtureReceipt(
      "bounded-measures",
      "color-choice",
    );
    const clonedWorld = structuredClone(SOURCE_CORROBORATION_WORLD);
    const cloned = await request(receipt);
    const sourceBlocked = await request(receipt);
    cloned.worldPack = clonedWorld;
    sourceBlocked.todayRequest = await universityTodayFixtureRequest(
      "source-review",
    );

    expect(await projectUniversityPostAttemptRepair(cloned)).toMatchObject({
      status: "invalid",
      issues: [{ code: "request.invalid" }],
    });
    expect(
      await projectUniversityPostAttemptRepair(sourceBlocked),
    ).toMatchObject({
      status: "invalid",
      issues: [{ code: "protected_study.not_ready" }],
    });
  });

  it("keeps a valid alternate synthetic context explicitly unbound from the receipt", async () => {
    const receipt = createUniversityPostAttemptFixtureReceipt(
      "bounded-measures",
      "color-choice",
    );
    const alternate = await request(receipt);
    const baseToday = alternate.todayRequest as Awaited<
      ReturnType<typeof universityTodayFixtureRequest>
    >;
    alternate.todayRequest = {
      ...baseToday,
      context: {
        ...baseToday.context,
        termLabel: "Spring 2027",
        courseLabel: "HIST204: Comparative evidence",
      },
    };

    const projection = await projectUniversityPostAttemptRepair(alternate);
    expect(projection).toMatchObject({
      status: "repair_ready",
      authority: { receiptContextBinding: "not_established" },
      context: {
        binding: "server_paired_synthetic_not_receipt_bound",
        termLabel: "Spring 2027",
        courseLabel: "HIST204: Comparative evidence",
      },
    });
    expect(JSON.stringify(projection)).not.toMatch(
      /receipt-bound learner|exact learner session|learner continuity/i,
    );
  });

  it("rejects missing receipts and exact-key violations before exposing evidence", async () => {
    const base = await request(null);
    expect(await projectUniversityPostAttemptRepair(base)).toMatchObject({
      status: "invalid",
      context: null,
      evidence: null,
      repair: null,
      issues: [{ code: "receipt.unattested" }],
      projectionDigest: null,
    });
    expect(await projectUniversityPostAttemptRepair({
      ...base,
      status: "repair_ready",
    })).toMatchObject({
      status: "invalid",
      issues: [{ code: "request.invalid" }],
    });
    expect(await projectUniversityPostAttemptRepair([])).toMatchObject({
      status: "invalid",
      issues: [{ code: "request.invalid" }],
    });
  });

  it("does not execute outer accessors or proxy traps", async () => {
    const getter = vi.fn(() => "university-post-attempt-repair-request.v1");
    const accessor = {};
    Object.defineProperty(accessor, "schemaVersion", {
      enumerable: true,
      get: getter,
    });
    Object.defineProperty(accessor, "todayRequest", {
      enumerable: true,
      value: await universityTodayFixtureRequest("ready"),
    });
    Object.defineProperty(accessor, "worldPack", {
      enumerable: true,
      value: SOURCE_CORROBORATION_WORLD,
    });
    Object.defineProperty(accessor, "runtimeReceipt", {
      enumerable: true,
      value: null,
    });

    const ownKeys = vi.fn(() => [
      "schemaVersion",
      "todayRequest",
      "worldPack",
      "runtimeReceipt",
    ]);
    const proxy = new Proxy({}, { ownKeys });

    expect(await projectUniversityPostAttemptRepair(accessor)).toMatchObject({
      status: "invalid",
      issues: [{ code: "request.invalid" }],
    });
    expect(await projectUniversityPostAttemptRepair(proxy)).toMatchObject({
      status: "invalid",
      issues: [{ code: "request.invalid" }],
    });
    expect(getter).not.toHaveBeenCalled();
    expect(ownKeys).not.toHaveBeenCalled();
  });

  it("rejects nested object and array proxies without executing traps", async () => {
    const receipt = createUniversityPostAttemptFixtureReceipt(
      "bounded-measures",
      "color-choice",
    );
    const baseToday = await universityTodayFixtureRequest("ready");
    const objectTrap = vi.fn(() => Object.prototype);
    const arrayTrap = vi.fn(() => Array.prototype);
    const nestedObjectProxy = new Proxy({}, {
      getPrototypeOf: objectTrap,
    });
    const nestedArrayProxy = new Proxy([...baseToday.activityStates], {
      getPrototypeOf: arrayTrap,
    });
    const objectRequest = await request(receipt);
    const arrayRequest = await request(receipt);
    objectRequest.todayRequest = {
      ...baseToday,
      context: {
        ...baseToday.context,
        studyWindow: nestedObjectProxy as unknown as
          typeof baseToday.context.studyWindow,
      },
    };
    arrayRequest.todayRequest = {
      ...baseToday,
      activityStates: nestedArrayProxy,
    };

    expect(await projectUniversityPostAttemptRepair(
      objectRequest,
    )).toMatchObject({
      status: "invalid",
      issues: [{ code: "request.invalid" }],
    });
    expect(await projectUniversityPostAttemptRepair(
      arrayRequest,
    )).toMatchObject({
      status: "invalid",
      issues: [{ code: "request.invalid" }],
    });
    expect(objectTrap).not.toHaveBeenCalled();
    expect(arrayTrap).not.toHaveBeenCalled();
  });

  it("rejects oversized nested Today input before protected-study validation", async () => {
    const receipt = createUniversityPostAttemptFixtureReceipt(
      "bounded-measures",
      "color-choice",
    );
    const stringRequest = await request(receipt);
    const aggregateRequest = await request(receipt);
    const baseToday = await universityTodayFixtureRequest("ready");
    stringRequest.todayRequest = {
      oversizedText: "x".repeat(4_194_304),
      ...baseToday,
    } as typeof stringRequest.todayRequest;
    aggregateRequest.todayRequest = {
      oversizedAggregate: Array.from(
        { length: 129 },
        () => "x".repeat(4_096),
      ),
      ...baseToday,
    } as typeof aggregateRequest.todayRequest;

    const [stringResult, byteResult] = await Promise.all([
      projectUniversityPostAttemptRepair(stringRequest),
      projectUniversityPostAttemptRepair(aggregateRequest),
    ]);

    expect(stringResult).toMatchObject({
      status: "invalid",
      projectionDigest: null,
      issues: [{ code: "request.invalid" }],
    });
    expect(byteResult).toMatchObject({
      status: "invalid",
      projectionDigest: null,
      issues: [{ code: "request.invalid" }],
    });
  });

  it("authenticates the receipt before traversing nested Today input", async () => {
    const baseToday = await universityTodayFixtureRequest("ready");
    const trap = vi.fn(() => Object.prototype);
    const nestedProxy = new Proxy({}, {
      getPrototypeOf: trap,
    });
    const invalidReceiptRequest = await request(null);
    invalidReceiptRequest.todayRequest = {
      ...baseToday,
      context: {
        ...baseToday.context,
        studyWindow: nestedProxy as unknown as
          typeof baseToday.context.studyWindow,
      },
    };

    expect(await projectUniversityPostAttemptRepair(
      invalidReceiptRequest,
    )).toMatchObject({
      status: "invalid",
      issues: [{ code: "receipt.unattested" }],
    });
    expect(trap).not.toHaveBeenCalled();
  });

  it("rejects symbols and exotic prototypes at the outer boundary", async () => {
    const receipt = createUniversityPostAttemptFixtureReceipt(
      "bounded-measures",
      "color-choice",
    );
    const symbolBacked = await request(receipt);
    Object.defineProperty(symbolBacked, Symbol("hidden"), {
      enumerable: false,
      value: "hidden",
    });
    const exotic = Object.assign(
      Object.create({ inherited: true }),
      await request(receipt),
    );

    expect(await projectUniversityPostAttemptRepair(symbolBacked)).toMatchObject({
      status: "invalid",
      issues: [{ code: "request.invalid" }],
    });
    expect(await projectUniversityPostAttemptRepair(exotic)).toMatchObject({
      status: "invalid",
      issues: [{ code: "request.invalid" }],
    });
  });

  it("keeps the semantic projection deterministic across distinct exact receipts", async () => {
    const first = await projectUniversityPostAttemptRepair(
      await request(createUniversityPostAttemptFixtureReceipt(
        "bounded-measures",
        "color-choice",
      )),
    );
    const second = await projectUniversityPostAttemptRepair(
      await request(createUniversityPostAttemptFixtureReceipt(
        "bounded-measures",
        "color-choice",
      )),
    );

    expect(second).toEqual(first);
    expect(second.projectionDigest).toBe(first.projectionDigest);
  });

  it("binds the authored policy to the current retained runtime and package bytes", async () => {
    const [runtimeBindingDigest, packageIntegrityHash] = await Promise.all([
      sha256Digest(canonicalJson(SOURCE_CORROBORATION_WORLD.runtime)),
      sha256Digest(canonicalJson(SOURCE_CORROBORATION_WORLD)),
    ]);

    expect(UNIVERSITY_POST_ATTEMPT_REPAIR_POLICY.world).toMatchObject({
      runtimeBindingDigest,
      packageIntegrityHash,
    });
    expect(Object.isFrozen(UNIVERSITY_POST_ATTEMPT_REPAIR_POLICY)).toBe(true);
  });
});
