import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { TRANSFER } from "../../content/scenarios";
import type { LearningEvent } from "../../domain/learning";
import { recordWorldRuntimeReceipt } from "../../lib/forge-evidence";
import type { EvidenceLearningAction } from "../../worlds/ai-learning";
import type { PrimarySourceWorldEvent } from "../../worlds/primary-source-reasoning";
import type { RatioWorldEvent } from "../../worlds/proportional-reasoning";
import { runtimeBindingDigest } from "../../../scripts/ops/release-digests";
import { BUILT_IN_WORLD_PACKS } from "../worlds";
import type { WorldRuntimeActionKind, WorldRuntimeStage } from "../contracts";
import {
  isBoundedLocalWorldRuntimeReceipt,
  type BoundedLocalWorldRuntimeReceipt,
  type CanonicalSupportEvent,
  type RuntimeCommand,
  type WorldRuntimeAdapter,
} from "./protocol";
import { forceAndMotionWorldRuntimeAdapter } from "./force-and-motion";
import { primarySourceWorldRuntimeAdapter } from "./primary-source";
import { proportionalReasoningWorldRuntimeAdapter } from "./proportional-reasoning";
import { createWorldRuntimeSession, dispatchWorldRuntimeCommand } from "./runtime";
import { sourceCorroborationWorldRuntimeAdapter } from "./source-corroboration";

const EXACT_RECEIPT_TRACE = [
  "encounter",
  "commit_model",
  "interpret_two_readings",
  "name_disagreement",
  "commit_test_prediction",
  "run_separating_experience",
  "reconstruct",
  "withdraw_instructional_ai",
  "cold_transfer",
  "bounded_result",
] as const satisfies readonly WorldRuntimeStage[];

const REQUIRED_PROOF_LOCK = [
  "instructional_support",
  "model_action",
  "experience_replay",
] as const satisfies readonly WorldRuntimeActionKind[];

interface TerminalObservation {
  readonly domainState: unknown;
  readonly runtimeState: unknown;
  readonly phase: string;
  readonly semanticTrace: readonly WorldRuntimeStage[];
  readonly receipt: BoundedLocalWorldRuntimeReceipt | null;
  readonly attemptId: string;
}

interface MalformedObservation {
  readonly accepted: boolean;
  readonly reason: string | null;
  readonly phase: string;
  readonly semanticTrace: readonly WorldRuntimeStage[];
  readonly receipt: BoundedLocalWorldRuntimeReceipt | null;
}

interface ProofProtectionObservation {
  readonly phase: string;
  readonly supportReason: string | null;
  readonly modelReason: string | null;
  readonly replayReason: string | null;
  readonly accessAccepted: boolean;
  readonly cognitiveSupportBefore: number;
  readonly cognitiveSupportAfter: number;
  readonly accessCountBefore: number;
  readonly accessCountAfter: number;
  readonly proofBlockedActions: readonly WorldRuntimeActionKind[];
}

interface ResetObservation {
  readonly completedAttemptId: string;
  readonly resetAttemptId: string;
  readonly phase: string;
  readonly semanticTrace: readonly WorldRuntimeStage[];
  readonly receipt: BoundedLocalWorldRuntimeReceipt | null;
  readonly proof: unknown;
}

interface ConformanceFixture {
  readonly name: string;
  readonly worldId: string;
  readonly rawLearnerProse: readonly string[];
  readonly expectedSourceRefs: readonly string[];
  readonly expectedSourceItemIds: readonly string[];
  readonly expectedCognitiveSupport: readonly CanonicalSupportEvent[];
  readonly instructionalSupportStructurallyAbsent: boolean;
  readonly pack: WorldRuntimeAdapter<never, never, never>["pack"];
  runTerminal(kind: "pass" | "fail", attemptId?: string): TerminalObservation;
  runMalformed(): MalformedObservation;
  inspectProofProtection(): ProofProtectionObservation;
  resetCompletedAttempt(): ResetObservation;
}

interface FixtureDefinition<State, Event, Proof> {
  readonly name: string;
  readonly adapter: WorldRuntimeAdapter<State, Event, Proof>;
  readonly toProof: readonly Event[];
  readonly passSubmission: readonly Event[];
  readonly failSubmission: readonly Event[];
  readonly malformedSubmission: Event;
  readonly resetEvent: Event;
  readonly accessAccommodationId: string;
  readonly modelActionId: string;
  readonly replayActionId: string;
  readonly instructionalSupportEvent?: Event;
  readonly rawLearnerProse: readonly string[];
  readonly expectedCognitiveSupport: readonly CanonicalSupportEvent[];
}

function defineFixture<State, Event, Proof>(definition: FixtureDefinition<State, Event, Proof>): ConformanceFixture {
  const runEvents = (events: readonly Event[], attemptId?: string): TerminalObservation => {
    let runtime = createWorldRuntimeSession(definition.adapter, attemptId);
    let domainState = definition.adapter.createInitialState();
    for (const event of events) {
      const domain = definition.adapter.reduce(domainState, event);
      expect(domain.accepted, domain.accepted ? undefined : domain.reason).toBe(true);
      if (!domain.accepted) throw new Error(`${definition.name} domain fixture rejected: ${domain.reason}`);
      domainState = domain.state;

      const dispatched = dispatchWorldRuntimeCommand(definition.adapter, runtime, { kind: "domain", event });
      expect(dispatched.accepted, dispatched.accepted ? undefined : dispatched.reason).toBe(true);
      if (!dispatched.accepted) throw new Error(`${definition.name} runtime fixture rejected: ${dispatched.reason}`);
      runtime = dispatched.session;
      expect(runtime.state).toEqual(domainState);
    }
    return {
      domainState,
      runtimeState: runtime.state,
      phase: runtime.phase,
      semanticTrace: runtime.semanticTrace,
      receipt: runtime.receipt,
      attemptId: runtime.attemptId,
    };
  };

  const runToProof = () => {
    let runtime = createWorldRuntimeSession(definition.adapter);
    for (const event of definition.toProof) {
      const dispatched = dispatchWorldRuntimeCommand(definition.adapter, runtime, { kind: "domain", event });
      if (!dispatched.accepted) throw new Error(`${definition.name} proof fixture rejected: ${dispatched.reason}`);
      runtime = dispatched.session;
    }
    expect(runtime.phase).toBe("proof");
    return runtime;
  };

  return {
    name: definition.name,
    worldId: definition.adapter.pack.manifest.id,
    rawLearnerProse: definition.rawLearnerProse,
    expectedSourceRefs: definition.adapter.pack.runtime.sourceBindings.map((binding) => binding.domainSourceRef),
    expectedSourceItemIds: definition.adapter.pack.runtime.sourceBindings.map((binding) => binding.sourceItemId),
    expectedCognitiveSupport: definition.expectedCognitiveSupport,
    instructionalSupportStructurallyAbsent: definition.instructionalSupportEvent === undefined,
    pack: definition.adapter.pack as WorldRuntimeAdapter<never, never, never>["pack"],
    runTerminal(kind, attemptId) {
      return runEvents([
        ...definition.toProof,
        ...(kind === "pass" ? definition.passSubmission : definition.failSubmission),
      ], attemptId);
    },
    runMalformed() {
      const runtime = runToProof();
      const rejected = dispatchWorldRuntimeCommand(definition.adapter, runtime, {
        kind: "domain",
        event: definition.malformedSubmission,
      });
      return {
        accepted: rejected.accepted,
        reason: rejected.accepted ? null : rejected.reason,
        phase: rejected.session.phase,
        semanticTrace: rejected.session.semanticTrace,
        receipt: rejected.session.receipt,
      };
    },
    inspectProofProtection() {
      let runtime = runToProof();
      const cognitiveSupportBefore = runtime.cognitiveSupport.length;
      const accessCountBefore = runtime.accessAccommodations.length;

      let supportReason: string | null = null;
      if (definition.instructionalSupportEvent !== undefined) {
        const support = dispatchWorldRuntimeCommand(definition.adapter, runtime, {
          kind: "domain",
          event: definition.instructionalSupportEvent,
        });
        supportReason = support.accepted ? null : support.reason;
        runtime = support.session;
      }

      const protectedCommands: readonly RuntimeCommand<Event>[] = [
        { kind: "model_action", actionId: definition.modelActionId },
        { kind: "experience_replay", actionId: definition.replayActionId },
      ];
      const protectedReasons: Array<string | null> = [];
      for (const command of protectedCommands) {
        const rejected = dispatchWorldRuntimeCommand(definition.adapter, runtime, command);
        protectedReasons.push(rejected.accepted ? null : rejected.reason);
        runtime = rejected.session;
      }

      const access = dispatchWorldRuntimeCommand(definition.adapter, runtime, {
        kind: "access_accommodation",
        accommodationId: definition.accessAccommodationId,
      });
      if (access.accepted) runtime = access.session;

      return {
        phase: runtime.phase,
        supportReason,
        modelReason: protectedReasons[0] ?? null,
        replayReason: protectedReasons[1] ?? null,
        accessAccepted: access.accepted,
        cognitiveSupportBefore,
        cognitiveSupportAfter: runtime.cognitiveSupport.length,
        accessCountBefore,
        accessCountAfter: runtime.accessAccommodations.length,
        proofBlockedActions: runtime.proofBlockedActions,
      };
    },
    resetCompletedAttempt() {
      const completed = runEvents([...definition.toProof, ...definition.passSubmission]);
      let runtime = createWorldRuntimeSession(definition.adapter, completed.attemptId);
      for (const event of [...definition.toProof, ...definition.passSubmission]) {
        const dispatched = dispatchWorldRuntimeCommand(definition.adapter, runtime, { kind: "domain", event });
        if (!dispatched.accepted) throw new Error(`${definition.name} reset fixture rejected: ${dispatched.reason}`);
        runtime = dispatched.session;
      }
      const reset = dispatchWorldRuntimeCommand(definition.adapter, runtime, {
        kind: "domain",
        event: definition.resetEvent,
      });
      if (!reset.accepted) throw new Error(`${definition.name} reset rejected: ${reset.reason}`);
      return {
        completedAttemptId: completed.attemptId,
        resetAttemptId: reset.session.attemptId,
        phase: reset.session.phase,
        semanticTrace: reset.session.semanticTrace,
        receipt: reset.session.receipt,
        proof: reset.session.proof,
      };
    },
  };
}

const PRIMARY_WORKED_ASSIGNMENTS = [
  ["philadelphia-visible-detail", "observation"],
  ["philadelphia-catalog-fact", "catalog_fact"],
  ["philadelphia-purpose-inference", "inference"],
  ["philadelphia-open-question", "open_question"],
] as const;

const primaryToProof: readonly PrimarySourceWorldEvent[] = [
  { type: "COMMIT_INITIAL", choiceId: "visible_detail", confidence: 70 },
  { type: "COMMIT_EXPLANATION", explanation: "A reader should separate visible detail from catalog fact and historical inference." },
  { type: "ACCEPT_INTERPRETATIONS", response: "accepted" },
  { type: "COMMIT_TEST_PREDICTION", predictionId: "catalog_distinguishes_evidence_layers" },
  { type: "OPEN_CATALOG" },
  ...PRIMARY_WORKED_ASSIGNMENTS.map(([statementId, category]) => ({ type: "SET_WORKED_ASSIGNMENT" as const, statementId, category })),
  { type: "SUBMIT_WORKED_TEST" },
  {
    type: "SUBMIT_RECONSTRUCTION",
    choiceId: "layers_bound_claims",
    reconstruction: "I will keep each claim inside the evidence layer that can establish it.",
  },
  { type: "ACKNOWLEDGE_WITHDRAWAL" },
];

function primaryTransfer(categories: readonly ["observation" | "catalog_fact" | "inference" | "open_question", "observation" | "catalog_fact" | "inference" | "open_question", "observation" | "catalog_fact" | "inference" | "open_question", "observation" | "catalog_fact" | "inference" | "open_question"]): readonly PrimarySourceWorldEvent[] {
  const ids = [
    "washington-visible-detail",
    "washington-catalog-fact",
    "washington-relationship-inference",
    "washington-open-question",
  ] as const;
  return [
    ...ids.map((statementId, index) => ({ type: "SET_TRANSFER_ASSIGNMENT" as const, statementId, category: categories[index]! })),
    {
      type: "SUBMIT_TRANSFER",
      confidence: 82,
      explanation: "The photograph, catalog record, inference, and open question have different evidence limits.",
    },
  ];
}

const forceToProof: readonly LearningEvent[] = [
  { type: "START" },
  { type: "COMMIT_PREDICTION", predictionId: "gradually_slows", confidence: 65 },
  { type: "COMMIT_EXPLANATION", explanation: "A continuing push seems to set the object's speed." },
  { type: "INTERPRETATION_FAILED", reason: "timeout" },
  { type: "COMMIT_PROBE_PREDICTION", predictionId: "friction_changes_velocity" },
  { type: "RUN_EXPERIMENT" },
  { type: "OBSERVE_EXPERIMENT" },
  { type: "SUBMIT_REFLECTION", reflection: "The brief push stops changing velocity after the force ends." },
  { type: "SUBMIT_RECONSTRUCTION", reconstruction: "Net force changes acceleration, while zero net force leaves velocity constant." },
  { type: "CONTINUE_TO_COLD_TRANSFER" },
];

const ratioToProof: readonly RatioWorldEvent[] = [
  { type: "COMMIT_INITIAL", predictionId: "same_strength", confidence: 65 },
  { type: "COMMIT_EXPLANATION", explanation: "Both recipes leave one more cup of water than concentrate." },
  { type: "COMMIT_TEST_PREDICTION", predictionId: "same_strength" },
  { type: "RUN_EXPERIMENT" },
  { type: "BEGIN_RECONSTRUCTION" },
  { type: "SUBMIT_RECONSTRUCTION", reconstruction: "A relationship stays proportional when both quantities scale by the same factor." },
  { type: "ACKNOWLEDGE_WITHDRAWAL" },
];

const sourceToProof: readonly EvidenceLearningAction[] = [
  { type: "SET_STANCE", stanceId: "depends" },
  { type: "SET_CONFIDENCE", confidence: 70 },
  { type: "SET_REASON", reason: "The access design and later measurement probably change the result." },
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
];

const FIXTURES: readonly ConformanceFixture[] = [
  defineFixture({
    name: "Force and Motion",
    adapter: forceAndMotionWorldRuntimeAdapter,
    toProof: forceToProof,
    passSubmission: [{
      type: "SUBMIT_TRANSFER",
      choiceId: TRANSFER.correctChoiceId,
      explanation: "The velocity stays flat after the force returns to zero.",
    }],
    failSubmission: [{
      type: "SUBMIT_TRANSFER",
      choiceId: "returns_to_zero",
      explanation: "I think the velocity returns to zero as soon as the force ends.",
    }],
    malformedSubmission: { type: "SUBMIT_TRANSFER", explanation: "There is no selected answer in this malformed attempt." },
    resetEvent: { type: "RESET" },
    accessAccommodationId: "access.force-and-motion.text-alternative",
    modelActionId: "action.force-and-motion.model",
    replayActionId: "action.force-and-motion.replay",
    instructionalSupportEvent: { type: "CONSUME_SUPPORT", level: 1 },
    rawLearnerProse: [
      "A continuing push seems to set the object's speed.",
      "The velocity stays flat after the force returns to zero.",
    ],
    expectedCognitiveSupport: [{
      actionId: "action.force-and-motion.interpretation",
      stage: "interpret_two_readings",
      source: "authored",
      tier: "representation",
      policyId: "policy.force-and-motion.interpretation.v1",
      providerId: null,
      modelId: null,
      fallbackReason: "timeout",
    }],
  }),
  defineFixture({
    name: "Proportional Reasoning",
    adapter: proportionalReasoningWorldRuntimeAdapter,
    toProof: ratioToProof,
    passSubmission: [{
      type: "SUBMIT_TRANSFER",
      choiceId: "32_km",
      explanation: "12 is four times 3, so the real distance scales from 8 to 32 by the same factor.",
      confidence: 85,
    }],
    failSubmission: [{
      type: "SUBMIT_TRANSFER",
      choiceId: "24_km",
      explanation: "I used the same relationship idea, but selected 24 kilometres for this map.",
      confidence: 60,
    }],
    malformedSubmission: { type: "SUBMIT_TRANSFER", choiceId: "32_km", explanation: "short", confidence: 80 },
    resetEvent: { type: "RESET" },
    accessAccommodationId: "access.proportional-reasoning.text-alternatives",
    modelActionId: "action.proportional-reasoning.model",
    replayActionId: "action.proportional-reasoning.replay",
    instructionalSupportEvent: { type: "REQUEST_SUPPORT" },
    rawLearnerProse: [
      "Both recipes leave one more cup of water than concentrate.",
      "12 is four times 3, so the real distance scales from 8 to 32 by the same factor.",
    ],
    expectedCognitiveSupport: [],
  }),
  defineFixture({
    name: "Source Corroboration",
    adapter: sourceCorroborationWorldRuntimeAdapter,
    toProof: sourceToProof,
    passSubmission: [
      { type: "SET_TRANSFER_CHOICE", choiceId: "bounded-measures" },
      { type: "SET_TRANSFER_OPEN_QUESTION", openQuestionId: "held-constant" },
      { type: "SUBMIT_TRANSFER" },
    ],
    failSubmission: [
      { type: "SET_TRANSFER_CHOICE", choiceId: "always-harms" },
      { type: "SET_TRANSFER_OPEN_QUESTION", openQuestionId: "reader-preference" },
      { type: "SUBMIT_TRANSFER" },
    ],
    malformedSubmission: { type: "SUBMIT_TRANSFER" },
    resetEvent: { type: "RESET" },
    accessAccommodationId: "access.source-corroboration.text-alternatives",
    modelActionId: "action.source-corroboration.model",
    replayActionId: "action.source-corroboration.replay",
    rawLearnerProse: ["The access design and later measurement probably change the result."],
    expectedCognitiveSupport: [],
  }),
  defineFixture({
    name: "Primary Source Reasoning",
    adapter: primarySourceWorldRuntimeAdapter,
    toProof: primaryToProof,
    passSubmission: primaryTransfer(["observation", "catalog_fact", "inference", "open_question"]),
    failSubmission: primaryTransfer(["observation", "observation", "observation", "observation"]),
    malformedSubmission: {
      type: "SUBMIT_TRANSFER",
      confidence: 82,
      explanation: "This malformed submission has no transfer classifications to validate.",
    },
    resetEvent: { type: "RESET" },
    accessAccommodationId: "access.primary-source.text-alternatives",
    modelActionId: "action.primary-source.model",
    replayActionId: "action.primary-source.replay",
    instructionalSupportEvent: { type: "REQUEST_SUPPORT" },
    rawLearnerProse: [
      "A reader should separate visible detail from catalog fact and historical inference.",
      "The photograph, catalog record, inference, and open question have different evidence limits.",
    ],
    expectedCognitiveSupport: [],
  }),
];

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

  snapshot(): string {
    return JSON.stringify([...this.values.entries()]);
  }
}

afterEach(() => vi.unstubAllGlobals());

describe.each(FIXTURES)("$name shared-runtime conformance", (fixture) => {
  it("preserves reducer authority and emits the exact canonical trace for pass and fail", () => {
    const passed = fixture.runTerminal("pass");
    const failed = fixture.runTerminal("fail");

    expect(passed.runtimeState).toEqual(passed.domainState);
    expect(failed.runtimeState).toEqual(failed.domainState);
    expect(passed.phase).toBe("bounded_result");
    expect(failed.phase).toBe("bounded_result");
    expect(passed.semanticTrace).toEqual(EXACT_RECEIPT_TRACE);
    expect(failed.semanticTrace).toEqual(EXACT_RECEIPT_TRACE);
    expect(passed.receipt?.protocol.semanticTrace).toEqual(EXACT_RECEIPT_TRACE);
    expect(failed.receipt?.protocol.semanticTrace).toEqual(EXACT_RECEIPT_TRACE);
    expect(passed.receipt?.validator).toMatchObject({ outcome: "pass", disposition: "demonstrated" });
    expect(failed.receipt?.validator).toMatchObject({ outcome: "fail", disposition: "not_demonstrated" });
  });

  it("rejects malformed terminal input without a receipt", () => {
    const malformed = fixture.runMalformed();
    expect(malformed).toMatchObject({
      accepted: false,
      phase: "proof",
      receipt: null,
    });
    expect(malformed.semanticTrace).toEqual(EXACT_RECEIPT_TRACE.slice(0, -1));
  });

  it("locks cognitive/model/replay operations while preserving access as a separate proof event", () => {
    expect(fixture.pack.runtime.proof.blockedActionKinds).toEqual(REQUIRED_PROOF_LOCK);
    const protection = fixture.inspectProofProtection();
    expect(protection.phase).toBe("proof");
    if (fixture.instructionalSupportStructurallyAbsent) {
      expect(fixture.pack.runtime.actions).toEqual(expect.arrayContaining([
        expect.objectContaining({ kind: "instructional_support" }),
      ]));
      expect(protection.supportReason).toBeNull();
    } else {
      expect(protection.supportReason).toBe("proof_action_blocked");
    }
    expect(protection.modelReason).toBe("proof_action_blocked");
    expect(protection.replayReason).toBe("proof_action_blocked");
    expect(protection.accessAccepted).toBe(true);
    expect(protection.cognitiveSupportAfter).toBe(protection.cognitiveSupportBefore);
    expect(protection.accessCountAfter).toBe(protection.accessCountBefore + 1);
    expect(protection.proofBlockedActions).toEqual(expect.arrayContaining(
      fixture.instructionalSupportStructurallyAbsent
        ? ["model_action", "experience_replay"]
        : [...REQUIRED_PROOF_LOCK],
    ));
  });

  it("emits exact local identity/source metadata without raw learner prose and resets to a fresh attempt", () => {
    const completed = fixture.runTerminal("pass");
    const receipt = completed.receipt;
    const proofClaim = fixture.pack.proofClaims.find((claim) => claim.id === fixture.pack.runtime.proof.proofClaimId);
    expect(receipt).not.toBeNull();
    expect(proofClaim).toBeDefined();
    expect(isBoundedLocalWorldRuntimeReceipt(receipt)).toBe(true);
    expect(receipt).toMatchObject({
      schemaVersion: "1.0.2",
      world: {
        id: fixture.pack.manifest.id,
        version: fixture.pack.manifest.version,
        contentVersion: fixture.pack.release.contentVersion,
        capabilityId: proofClaim?.capabilityId,
        proofClaimId: fixture.pack.runtime.proof.proofClaimId,
        taskFamilyId: fixture.pack.runtime.proof.taskFamilyId,
      },
      protocol: { version: fixture.pack.runtime.protocolVersion },
      validator: { id: fixture.pack.runtime.proof.validatorId, version: "1.0.0" },
      authority: { proofAuthority: "honour_based", persistence: "not_persisted", isDurable: false },
      sourceProvenanceStatus: "incomplete",
      responseDigest: null,
    });
    expect(receipt?.sourceBindings.map((binding) => binding.domainSourceRef)).toEqual(fixture.expectedSourceRefs);
    expect(receipt?.sourceBindings.map((binding) => binding.sourceItemId)).toEqual(fixture.expectedSourceItemIds);
    expect(receipt?.sourceBindings.every((binding) => binding.status === "legacy_metadata_only")).toBe(true);
    expect(receipt?.cognitiveSupport).toEqual(fixture.expectedCognitiveSupport);
    expect(receipt?.remainsUntested.length).toBeGreaterThan(0);
    const serialized = JSON.stringify(receipt);
    for (const prose of fixture.rawLearnerProse) expect(serialized).not.toContain(prose);

    const reset = fixture.resetCompletedAttempt();
    expect(reset.resetAttemptId).not.toBe(reset.completedAttemptId);
    expect(reset).toMatchObject({
      phase: "learning",
      semanticTrace: ["encounter"],
      receipt: null,
      proof: null,
    });
  });
});

describe("all released runtime World receipt projection and release identity", () => {
  it("accepts each canonical receipt once and rejects its deterministic duplicate", () => {
    const storage = new MemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });

    for (const [index, fixture] of FIXTURES.entries()) {
      const receipt = fixture.runTerminal("pass", `attempt.conformance-${index}-${fixture.worldId.replaceAll(".", "-")}`).receipt;
      if (!receipt) throw new Error(`${fixture.name} did not emit a receipt.`);
      expect(recordWorldRuntimeReceipt(receipt)).toMatchObject({ ok: true });
      expect(recordWorldRuntimeReceipt(receipt)).toMatchObject({ ok: false, reason: "duplicate_entry" });
    }
    const persistedLedgerJson = storage.snapshot();
    for (const fixture of FIXTURES) {
      for (const prose of fixture.rawLearnerProse) expect(persistedLedgerJson).not.toContain(prose);
    }
  });

  it("binds every conformance fixture to the exact retained manifest version, route, and runtime digest", () => {
    const retained = JSON.parse(readFileSync(
      resolve(process.cwd(), "scripts/ops/content-package-manifest.json"),
      "utf8",
    )) as {
      readonly packages: readonly {
        readonly id: string;
        readonly version: string;
        readonly route: string;
        readonly runtime_binding_digest?: string;
      }[];
    };
    const releasedRuntimePacks = BUILT_IN_WORLD_PACKS.filter(
      (pack) => pack.release.status === "released" && "runtime" in pack,
    );

    expect(FIXTURES.map((fixture) => fixture.worldId).sort()).toEqual(
      releasedRuntimePacks.map((pack) => pack.manifest.id).sort(),
    );
    for (const fixture of FIXTURES) {
      const retainedEntry = retained.packages.find((entry) => entry.id === fixture.worldId);
      expect(retainedEntry).toEqual({
        id: fixture.pack.manifest.id,
        version: fixture.pack.manifest.version,
        route: fixture.pack.manifest.route,
        runtime_binding_digest: runtimeBindingDigest(fixture.pack.runtime),
      });
    }
  });
});
