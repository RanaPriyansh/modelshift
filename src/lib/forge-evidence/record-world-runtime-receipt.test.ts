import { afterEach, describe, expect, it, vi } from "vitest";

import {
  LOCAL_RUNTIME_RECEIPT_LIMITATION,
  type BoundedLocalWorldRuntimeReceipt,
  type CanonicalSupportEvent,
} from "../../forge/world-runtime";
import { createLocalStorageEvidenceLedgerAdapter } from "./local-storage";
import {
  projectRuntimeSupportAssistanceKind,
  recordWorldRuntimeReceipt,
} from "./record-world-runtime-receipt";
import { createEvidenceLedgerStore } from "./store";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

const CORE_TRACE = [
  "encounter", "commit_model", "interpret_two_readings", "name_disagreement", "commit_test_prediction",
  "run_separating_experience", "governed_support", "reconstruct", "withdraw_instructional_ai", "cold_transfer", "bounded_result",
] as const;
const CORE_TRACE_WITHOUT_SUPPORT = [
  "encounter", "commit_model", "interpret_two_readings", "name_disagreement", "commit_test_prediction",
  "run_separating_experience", "reconstruct", "withdraw_instructional_ai", "cold_transfer", "bounded_result",
] as const;

function receipt(overrides: Partial<BoundedLocalWorldRuntimeReceipt> = {}): BoundedLocalWorldRuntimeReceipt {
  return {
    schemaVersion: "1.0.2",
    kind: "forge.runtime.bounded-local-attempt",
    attemptId: "attempt.receipt-projection",
    recordedAt: "2026-07-22T00:00:00.000Z",
    authority: {
      proofAuthority: "honour_based",
      persistence: "not_persisted",
      isDurable: false,
      limitation: LOCAL_RUNTIME_RECEIPT_LIMITATION,
    },
    world: {
      id: "world.proportional-reasoning",
      version: "1.0.2",
      contentVersion: "1.0.0",
      capabilityId: "capability.proportional-reasoning.compare-and-scale",
      proofClaimId: "proof.proportional-reasoning.independent-transfer",
      taskFamilyId: "task-family.proportional-reasoning.map-scale-transfer.v1",
    },
    protocol: {
      version: "1.0.2",
      semanticTrace: CORE_TRACE,
      instructionalActionsRejectedDuringProof: [],
    },
    validator: {
      id: "validator.proportional-reasoning-transfer.v1",
      version: "1.0.0",
      outcome: "pass",
      disposition: "demonstrated",
      criteria: ["answer:32_km"],
    },
    cognitiveSupport: [
      {
        actionId: "action.proportional-reasoning.support",
        stage: "governed_support",
        source: "authored",
        tier: "representation",
        policyId: "policy.proportional-reasoning.authored-support.v1",
        providerId: null,
        modelId: null,
        fallbackReason: null,
      },
    ],
    accessAccommodations: [],
    sourceBindings: [
      {
        domainSourceRef: "legacy.openstax.ratios-and-rate",
        sourcePackageId: null,
        sourcePackageVersion: null,
        sourceItemId: "source.openstax.ratios-and-rate",
        sourceSnapshotDigest: null,
        locatorIds: [],
        claimIds: [],
        rightsRecordId: null,
        reviewDecisionIds: [],
        status: "legacy_metadata_only",
      },
    ],
    sourceProvenanceStatus: "incomplete",
    remainsUntested: ["delayed-retention"],
    responseDigest: null,
    ...overrides,
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("recordWorldRuntimeReceipt", () => {
  it("projects only the bounded receipt with deterministic attempt id and no return schedule", () => {
    const storage = new MemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });

    const first = recordWorldRuntimeReceipt(receipt());
    expect(first.ok).toBe(true);
    const persisted = createEvidenceLedgerStore(createLocalStorageEvidenceLedgerAdapter({ storage })).read().ledger;
    expect(persisted.entries).toEqual([
      expect.objectContaining({
        id: "proof.attempt.receipt-projection",
        capabilityId: "capability.proportional-reasoning.compare-and-scale",
        source: { kind: "authored_activity", refId: "world.proportional-reasoning" },
        proof: expect.objectContaining({ outcome: "proved", assistanceAccess: "removed" }),
        returnSchedule: null,
        assistance: [
          { kind: "authored_representation", sourceId: "action.proportional-reasoning.support" },
        ],
      }),
    ]);
    expect(JSON.stringify(persisted)).not.toMatch(/raw|prompt|explanation|confidence|gpt-5/i);

    const duplicate = recordWorldRuntimeReceipt(receipt());
    expect(duplicate).toMatchObject({ ok: false, reason: "duplicate_entry" });
    expect(createEvidenceLedgerStore(createLocalStorageEvidenceLedgerAdapter({ storage })).read().ledger.entries).toHaveLength(1);
  });

  it("bounds every non-demonstrated disposition to a non-strengthened local outcome", () => {
    const storage = new MemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
    const cases = [
      ["not_demonstrated", "fail", "not_proved"],
      ["not_evaluated", "not_scored", "open_question"],
      ["open_question", "inconclusive", "open_question"],
    ] as const;
    for (const [disposition, outcome, expected] of cases) {
      const result = recordWorldRuntimeReceipt(receipt({
        attemptId: `attempt.receipt-${disposition}`,
        validator: {
          id: "validator.proportional-reasoning-transfer.v1",
          version: "1.0.0",
          outcome,
          disposition,
          criteria: [],
        },
      }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.ledger.entries.at(-1)?.proof.outcome).toBe(expected);
    }
  });

  it("rejects forged receipt shapes and raw identifier additions without appending", () => {
    const storage = new MemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
    const forged = {
      ...receipt(),
      rawResponse: "learner explanation or provider secret",
    } as unknown as BoundedLocalWorldRuntimeReceipt;
    expect(recordWorldRuntimeReceipt(forged)).toMatchObject({ ok: false, reason: "invalid_runtime_receipt" });
    const rawIdentifier = receipt({
      attemptId: "attempt.raw-identifier",
      world: { ...receipt().world, id: "world.learner\nsecret" },
    });
    expect(recordWorldRuntimeReceipt(rawIdentifier)).toMatchObject({ ok: false, reason: "invalid_runtime_receipt" });
    expect(createEvidenceLedgerStore(createLocalStorageEvidenceLedgerAdapter({ storage })).read().ledger.entries).toHaveLength(0);
  });

  it("rejects structurally valid unknown and mixed released-World identities", () => {
    const storage = new MemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
    const forgedReceipts = [
      receipt({ world: { ...receipt().world, id: "world.fabricated" } }),
      receipt({ world: { ...receipt().world, version: "9.9.9" } }),
      receipt({ world: { ...receipt().world, contentVersion: "9.9.9" } }),
      receipt({ world: { ...receipt().world, capabilityId: "capability.force-motion.zero-net-force" } }),
      receipt({ world: { ...receipt().world, proofClaimId: "proof.force-motion.independent-transfer" } }),
      receipt({ world: { ...receipt().world, taskFamilyId: "task-family.fabricated.v1" } }),
      receipt({
        validator: {
          ...receipt().validator,
          id: "validator.force-motion-transfer.v1",
        },
      }),
      receipt({ validator: { ...receipt().validator, version: "9.9.9" } }),
    ];

    for (const forgedReceipt of forgedReceipts) {
      expect(recordWorldRuntimeReceipt(forgedReceipt)).toMatchObject({
        ok: false,
        reason: "invalid_runtime_receipt",
      });
    }
    expect(createEvidenceLedgerStore(createLocalStorageEvidenceLedgerAdapter({ storage })).read().ledger.entries).toHaveLength(0);
  });

  it("rejects a known World with substituted source or support identities", () => {
    const storage = new MemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
    const canonicalSupport = receipt().cognitiveSupport[0]!;
    const substitutedIdentities = [
      receipt({
        sourceBindings: [{
          ...receipt().sourceBindings[0]!,
          domainSourceRef: "legacy.fabricated-source",
          sourceItemId: "source.fabricated",
        }],
      }),
      receipt({
        cognitiveSupport: [{
          ...canonicalSupport,
          actionId: "action.proportional-reasoning.fabricated-support",
        }],
      }),
      receipt({
        cognitiveSupport: [{
          ...canonicalSupport,
          policyId: "policy.proportional-reasoning.fabricated-support.v1",
        }],
      }),
      receipt({
        cognitiveSupport: [{
          ...canonicalSupport,
          source: "model",
          providerId: "provider.reviewed",
          modelId: "model.reviewed",
        }],
      }),
    ];

    for (const substitutedIdentity of substitutedIdentities) {
      expect(recordWorldRuntimeReceipt(substitutedIdentity)).toMatchObject({
        ok: false,
        reason: "invalid_runtime_receipt",
      });
    }
    expect(createEvidenceLedgerStore(createLocalStorageEvidenceLedgerAdapter({ storage })).read().ledger.entries).toHaveLength(0);
  });

  it("maps bounded model support provenance without treating it as an accepted Ratio receipt", () => {
    const modelSupport: CanonicalSupportEvent = {
      actionId: "action.future-bounded-world.support",
      stage: "governed_support",
      source: "model",
      tier: "cue",
      policyId: "policy.future-bounded-world.support.v1",
      providerId: "provider.reviewed",
      modelId: "model.reviewed",
      fallbackReason: null,
    };

    expect(projectRuntimeSupportAssistanceKind(modelSupport)).toBe("model_interpretation");
  });

  it.each([
    "withdraw_instructional_ai",
    "cold_transfer",
    "bounded_result",
    "return_or_apply",
  ] as const)("rejects cognitive support recorded at protected stage %s", (stage) => {
    const storage = new MemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
    const protectedStageSupport = receipt({
      cognitiveSupport: [{ ...receipt().cognitiveSupport[0]!, stage }],
    });

    expect(recordWorldRuntimeReceipt(protectedStageSupport)).toMatchObject({
      ok: false,
      reason: "invalid_runtime_receipt",
    });
    expect(createEvidenceLedgerStore(createLocalStorageEvidenceLedgerAdapter({ storage })).read().ledger.entries).toHaveLength(0);
  });

  it("accepts governed support only once in its canonical pre-reconstruction trace slot", () => {
    const storage = new MemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
    expect(recordWorldRuntimeReceipt(receipt({ attemptId: "attempt.valid-support-trace" }))).toMatchObject({ ok: true });

    const adversarialTraces = [
      // Support after proof starts.
      [
        ...CORE_TRACE_WITHOUT_SUPPORT.slice(0, -1),
        "governed_support",
        "bounded_result",
      ],
      // Duplicate optional support at its otherwise valid location.
      [
        ...CORE_TRACE_WITHOUT_SUPPORT.slice(0, 6),
        "governed_support",
        "governed_support",
        ...CORE_TRACE_WITHOUT_SUPPORT.slice(6),
      ],
      // Support before the separating experience.
      [
        ...CORE_TRACE_WITHOUT_SUPPORT.slice(0, 5),
        "governed_support",
        ...CORE_TRACE_WITHOUT_SUPPORT.slice(5),
      ],
      // Return before bounded_result.
      [
        ...CORE_TRACE_WITHOUT_SUPPORT.slice(0, -1),
        "return_or_apply",
        "bounded_result",
      ],
      // Even post-result return is absent from an immutable attempt receipt.
      [...CORE_TRACE_WITHOUT_SUPPORT, "return_or_apply"],
      // Required core stages are unique as well as ordered.
      ["encounter", ...CORE_TRACE_WITHOUT_SUPPORT],
    ] as const;

    for (const [index, semanticTrace] of adversarialTraces.entries()) {
      expect(recordWorldRuntimeReceipt(receipt({
        attemptId: `attempt.invalid-trace-${index}`,
        protocol: {
          ...receipt().protocol,
          semanticTrace,
        },
      }))).toMatchObject({ ok: false, reason: "invalid_runtime_receipt" });
    }
    expect(createEvidenceLedgerStore(createLocalStorageEvidenceLedgerAdapter({ storage })).read().ledger.entries).toHaveLength(1);
  });
});
