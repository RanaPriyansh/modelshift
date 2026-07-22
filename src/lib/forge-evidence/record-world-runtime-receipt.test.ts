import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createWorldRuntimeSession,
  dispatchWorldRuntimeCommand,
  LOCAL_RUNTIME_RECEIPT_LIMITATION,
  sourceCorroborationWorldRuntimeAdapter,
  type BoundedLocalWorldRuntimeReceipt,
  type CanonicalSupportEvent,
} from "../../forge/world-runtime";
import type { EvidenceLearningAction } from "../../worlds/ai-learning";
import { PROPORTIONAL_REASONING_WORLD } from "../../forge/worlds";
import { retainedRuntimeIdentityFor } from "../../forge/world-runtime/retained-runtime-binding";
import { createLocalStorageEvidenceLedgerAdapter } from "./local-storage";
import {
  projectRuntimeSupportAssistanceKind,
  recordWorldRuntimeReceipt,
  type WorldRuntimeReceiptRecording,
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

const PROPORTIONAL_PASS_INPUT = {
  choiceId: "32_km",
  explanation: "12 is four times 3, so the real distance scales from 8 to 32 by the same factor.",
  confidence: 85,
} as const;

function receipt(overrides: Partial<BoundedLocalWorldRuntimeReceipt> = {}): BoundedLocalWorldRuntimeReceipt {
  return {
    schemaVersion: "1.1.0",
    kind: "forge.runtime.bounded-local-attempt",
    attemptId: "attempt.receipt-projection",
    recordedAt: "2026-07-22T00:00:00.000Z",
    runtimeBindingDigest: retainedRuntimeIdentityFor(PROPORTIONAL_REASONING_WORLD)!.runtimeBindingDigest,
    packageIntegrityHash: retainedRuntimeIdentityFor(PROPORTIONAL_REASONING_WORLD)!.packageIntegrityHash,
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
      taskCode: "map_scale_transfer",
      taskFamilyId: "task-family.proportional-reasoning.map-scale-transfer.v1",
    },
    protocol: {
      version: "1.1.0",
      semanticTrace: CORE_TRACE,
      instructionalActionsRejectedDuringProof: [],
    },
    validator: {
      id: "validator.proportional-reasoning-transfer.v1",
      version: "1.0.0",
      code: "transfer.demonstrated",
      outcome: "pass",
      disposition: "demonstrated",
      criteria: ["answer:32_km", "mechanism-signals:scale_factor"],
    },
    cognitiveSupport: [
      {
        actionId: "action.proportional-reasoning.support.representation",
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
    remainsUntested: [...PROPORTIONAL_REASONING_WORLD.runtime!.evidence.remainsUntested],
    responseDigest: null,
    ...overrides,
  };
}

function recording(
  receivedReceipt: BoundedLocalWorldRuntimeReceipt = receipt(),
  validatorInput: unknown = PROPORTIONAL_PASS_INPUT,
): WorldRuntimeReceiptRecording {
  return { receipt: receivedReceipt, validatorInput };
}

function completedSourceCorroborationRecording(): WorldRuntimeReceiptRecording {
  let session = createWorldRuntimeSession(
    sourceCorroborationWorldRuntimeAdapter,
    "attempt.source-corroboration-projector",
  );
  const events: readonly EvidenceLearningAction[] = [
    { type: "SET_STANCE", stanceId: "depends" },
    { type: "SET_CONFIDENCE", confidence: 70 },
    { type: "SET_REASON", reason: "The role, access conditions, and later measurement probably change the result." },
    { type: "COMMIT_ENCOUNTER" },
    { type: "ACCEPT_TWO_READINGS" },
    { type: "COMMIT_TEST_PREDICTION", predictionId: "design-changes-effect" },
    { type: "REVIEW_EVIDENCE", evidenceId: "bastani-pnas" },
    { type: "REVIEW_EVIDENCE", evidenceId: "tutor-copilot" },
    { type: "CONTINUE_FROM_EVIDENCE" },
    { type: "SET_DIFFERENCE", differenceId: "delivery-role" },
    { type: "COMMIT_DIFFERENCE" },
    { type: "SET_READING_VERDICT", readingId: "performance-is-learning", verdict: "overreaches" },
    { type: "SET_READING_VERDICT", readingId: "design-changes-effect", verdict: "fits" },
    { type: "COMMIT_READINGS" },
    { type: "SET_BOUNDED_CLAIM", claimId: "conditions-shape-outcomes" },
    { type: "COMMIT_BOUNDED_CLAIM" },
    { type: "ACKNOWLEDGE_WITHDRAWAL" },
    { type: "SET_TRANSFER_CHOICE", choiceId: "bounded-measures" },
    { type: "SET_TRANSFER_OPEN_QUESTION", openQuestionId: "held-constant" },
    { type: "SUBMIT_TRANSFER" },
  ];

  for (const event of events) {
    const dispatched = dispatchWorldRuntimeCommand(sourceCorroborationWorldRuntimeAdapter, session, {
      kind: "domain",
      event,
    });
    if (!dispatched.accepted) throw new Error(`Source Corroboration fixture rejected: ${dispatched.reason}`);
    session = dispatched.session;
  }
  if (!session.receipt || !session.proof) throw new Error("Source Corroboration fixture did not emit a receipt.");
  return {
    receipt: session.receipt,
    validatorInput: sourceCorroborationWorldRuntimeAdapter.validatorInput(session.proof),
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("recordWorldRuntimeReceipt", () => {
  it("projects only the bounded receipt with deterministic attempt id and no return schedule", () => {
    const storage = new MemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });

    const first = recordWorldRuntimeReceipt(recording());
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
          { kind: "authored_representation", sourceId: "action.proportional-reasoning.support.representation" },
        ],
      }),
    ]);
    expect(JSON.stringify(persisted)).not.toMatch(/raw|prompt|explanation|confidence|gpt-5/i);

    const duplicate = recordWorldRuntimeReceipt(recording());
    expect(duplicate).toMatchObject({ ok: false, reason: "duplicate_entry" });
    expect(createEvidenceLedgerStore(createLocalStorageEvidenceLedgerAdapter({ storage })).read().ledger.entries).toHaveLength(1);
  });

  it("accepts one completed Source Corroboration receipt with its exact released identity and source tuple", () => {
    const storage = new MemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
    const completedRecording = completedSourceCorroborationRecording();
    const completedReceipt = completedRecording.receipt;

    expect(completedReceipt).toMatchObject({
      schemaVersion: "1.1.0",
      attemptId: "attempt.source-corroboration-projector",
      world: {
        id: "world.source-corroboration",
        version: "1.0.1",
        contentVersion: "1.0.0",
        capabilityId: "capability.ai-literacy.source-corroboration",
        proofClaimId: "proof.ai-literacy.independent-corroboration",
        taskFamilyId: "task-family.source-corroboration.cold-transfer.v1",
      },
      protocol: { version: "1.1.0", semanticTrace: CORE_TRACE_WITHOUT_SUPPORT },
      validator: {
        id: "validator.source-corroboration-transfer.v1",
        version: "1.0.0",
        outcome: "pass",
        disposition: "demonstrated",
      },
      cognitiveSupport: [],
      accessAccommodations: [],
      sourceProvenanceStatus: "incomplete",
    });
    expect(completedReceipt.sourceBindings).toEqual([
      {
        domainSourceRef: "source.bastani-pnas.genai-learning-2025",
        sourcePackageId: null,
        sourcePackageVersion: null,
        sourceItemId: "source.bastani-pnas.genai-learning-2025",
        sourceSnapshotDigest: null,
        locatorIds: [],
        claimIds: [],
        rightsRecordId: null,
        reviewDecisionIds: [],
        status: "legacy_metadata_only",
      },
      {
        domainSourceRef: "source.tutor-copilot.arxiv-2024",
        sourcePackageId: null,
        sourcePackageVersion: null,
        sourceItemId: "source.tutor-copilot.arxiv-2024",
        sourceSnapshotDigest: null,
        locatorIds: [],
        claimIds: [],
        rightsRecordId: null,
        reviewDecisionIds: [],
        status: "legacy_metadata_only",
      },
    ]);
    expect(JSON.stringify(completedReceipt)).not.toContain("The role, access conditions");

    expect(recordWorldRuntimeReceipt(completedRecording)).toMatchObject({ ok: true });
    const persisted = createEvidenceLedgerStore(createLocalStorageEvidenceLedgerAdapter({ storage })).read().ledger;
    expect(persisted.entries).toEqual([
      expect.objectContaining({
        id: "proof.attempt.source-corroboration-projector",
        capabilityId: "capability.ai-literacy.source-corroboration",
        source: { kind: "authored_activity", refId: "world.source-corroboration" },
        proof: expect.objectContaining({ outcome: "proved", assistanceAccess: "removed" }),
        assistance: [],
        returnSchedule: null,
      }),
    ]);
    expect(JSON.stringify(persisted)).not.toContain("The role, access conditions");
    expect(recordWorldRuntimeReceipt(completedRecording)).toMatchObject({ ok: false, reason: "duplicate_entry" });
    expect(createEvidenceLedgerStore(createLocalStorageEvidenceLedgerAdapter({ storage })).read().ledger.entries).toHaveLength(1);
  });

  it("projects a canonically revalidated failure without strengthening it", () => {
    const storage = new MemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
    const failInput = {
      choiceId: "24_km",
      explanation: "I used the same relationship idea, but selected 24 kilometres for this map.",
      confidence: 60,
    } as const;
    const result = recordWorldRuntimeReceipt(recording(receipt({
      attemptId: "attempt.receipt-not-demonstrated",
      validator: {
        id: "validator.proportional-reasoning-transfer.v1",
        version: "1.0.0",
        code: "transfer.not-demonstrated",
        outcome: "fail",
        disposition: "not_demonstrated",
        criteria: ["answer:24_km", "mechanism-signals:same_relationship"],
      },
    }), failInput));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.ledger.entries.at(-1)?.proof.outcome).toBe("not_proved");
  });

  it("rejects forged receipt shapes and raw identifier additions without appending", () => {
    const storage = new MemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
    const forged = {
      ...receipt(),
      rawResponse: "learner explanation or provider secret",
    } as unknown as BoundedLocalWorldRuntimeReceipt;
    expect(recordWorldRuntimeReceipt(recording(forged))).toMatchObject({ ok: false, reason: "invalid_runtime_receipt" });
    const rawIdentifier = receipt({
      attemptId: "attempt.raw-identifier",
      world: { ...receipt().world, id: "world.learner\nsecret" },
    });
    expect(recordWorldRuntimeReceipt(recording(rawIdentifier))).toMatchObject({ ok: false, reason: "invalid_runtime_receipt" });
    expect(createEvidenceLedgerStore(createLocalStorageEvidenceLedgerAdapter({ storage })).read().ledger.entries).toHaveLength(0);
  });

  it("rejects a structurally valid receipt whose package-owned limitation list was replaced", () => {
    const storage = new MemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
    const forgedLimitations = receipt({
      remainsUntested: ["Trust asserted by an adapter or provider."],
    });
    expect(recordWorldRuntimeReceipt(recording(forgedLimitations))).toMatchObject({ ok: false, reason: "invalid_runtime_receipt" });
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
      expect(recordWorldRuntimeReceipt(recording(forgedReceipt))).toMatchObject({
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
      expect(recordWorldRuntimeReceipt(recording(substitutedIdentity))).toMatchObject({
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

    expect(recordWorldRuntimeReceipt(recording(protectedStageSupport))).toMatchObject({
      ok: false,
      reason: "invalid_runtime_receipt",
    });
    expect(createEvidenceLedgerStore(createLocalStorageEvidenceLedgerAdapter({ storage })).read().ledger.entries).toHaveLength(0);
  });

  it("accepts governed support only once in its canonical pre-reconstruction trace slot", () => {
    const storage = new MemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
    expect(recordWorldRuntimeReceipt(recording(receipt({ attemptId: "attempt.valid-support-trace" })))).toMatchObject({ ok: true });

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
      expect(recordWorldRuntimeReceipt(recording(receipt({
        attemptId: `attempt.invalid-trace-${index}`,
        protocol: {
          ...receipt().protocol,
          semanticTrace,
        },
      })))).toMatchObject({ ok: false, reason: "invalid_runtime_receipt" });
    }
    expect(createEvidenceLedgerStore(createLocalStorageEvidenceLedgerAdapter({ storage })).read().ledger.entries).toHaveLength(1);
  });
});
