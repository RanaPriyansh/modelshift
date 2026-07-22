import { describe, expect, it } from "vitest";

import { TRANSFER } from "../../content/scenarios";
import type { LearningEvent } from "../../domain/learning";
import type { EvidenceLearningAction } from "../../worlds/ai-learning";
import type { PrimarySourceWorldEvent } from "../../worlds/primary-source-reasoning";
import type { RatioWorldEvent } from "../../worlds/proportional-reasoning";
import { ForgeEventJournal } from "../event-journal";
import { canonicalJson, sealForgeEvent, sha256Digest } from "../events";
import { BUILT_IN_WORLD_PACKS } from "../worlds";
import type { WorldRuntimeAdapter } from "./protocol";
import { compileWorldRuntimeReceiptToAdr001 } from "./adr001-event-compiler";
import { forceAndMotionWorldRuntimeAdapter } from "./force-and-motion";
import { primarySourceWorldRuntimeAdapter } from "./primary-source";
import { proportionalReasoningWorldRuntimeAdapter } from "./proportional-reasoning";
import { createWorldRuntimeSession, dispatchWorldRuntimeCommand } from "./runtime";
import { sourceCorroborationWorldRuntimeAdapter } from "./source-corroboration";

interface CompletedFixtureRun {
  readonly receipt: NonNullable<ReturnType<typeof createWorldRuntimeSession>["receipt"]>;
  readonly validatorInput: unknown;
}

interface CompilerFixture {
  readonly name: string;
  readonly rawLearnerProse: string;
  complete(kind: "pass" | "fail", attemptId: string): CompletedFixtureRun;
  completeWithRepeatedAccess(attemptId: string): CompletedFixtureRun;
  malformed(): void;
  reset(): { readonly completedAttemptId: string; readonly resetAttemptId: string };
}

interface FixtureDefinition<State, Event, Proof> {
  readonly name: string;
  readonly adapter: WorldRuntimeAdapter<State, Event, Proof>;
  readonly toProof: readonly Event[];
  readonly pass: readonly Event[];
  readonly fail: readonly Event[];
  readonly malformed: Event;
  readonly reset: Event;
  readonly accessAccommodationId: string;
  readonly rawLearnerProse: string;
}

function defineFixture<State, Event, Proof>(definition: FixtureDefinition<State, Event, Proof>): CompilerFixture {
  const run = (events: readonly Event[], attemptId: string) => {
    let session = createWorldRuntimeSession(definition.adapter, attemptId);
    for (const event of events) {
      const result = dispatchWorldRuntimeCommand(definition.adapter, session, { kind: "domain", event });
      expect(result.accepted, `${definition.name} runtime event was rejected`).toBe(true);
      if (!result.accepted) throw new Error(result.reason);
      session = result.session;
    }
    if (!session.receipt || !session.proof) throw new Error(`${definition.name} did not emit a receipt and proof.`);
    return {
      receipt: session.receipt,
      validatorInput: definition.adapter.validatorInput(session.proof),
      session,
    };
  };

  return {
    name: definition.name,
    rawLearnerProse: definition.rawLearnerProse,
    complete(kind, attemptId) {
      const completed = run([...definition.toProof, ...(kind === "pass" ? definition.pass : definition.fail)], attemptId);
      return { receipt: completed.receipt, validatorInput: completed.validatorInput };
    },
    completeWithRepeatedAccess(attemptId) {
      let session = createWorldRuntimeSession(definition.adapter, attemptId);
      for (const event of definition.toProof) {
        const result = dispatchWorldRuntimeCommand(definition.adapter, session, { kind: "domain", event });
        if (!result.accepted) throw new Error(result.reason);
        session = result.session;
      }
      for (let count = 0; count < 2; count += 1) {
        const access = dispatchWorldRuntimeCommand(definition.adapter, session, {
          kind: "access_accommodation",
          accommodationId: definition.accessAccommodationId,
        });
        if (!access.accepted) throw new Error(access.reason);
        session = access.session;
      }
      for (const event of definition.pass) {
        const result = dispatchWorldRuntimeCommand(definition.adapter, session, { kind: "domain", event });
        if (!result.accepted) throw new Error(result.reason);
        session = result.session;
      }
      if (!session.receipt || !session.proof) throw new Error(`${definition.name} did not emit an accessed receipt and proof.`);
      return { receipt: session.receipt, validatorInput: definition.adapter.validatorInput(session.proof) };
    },
    malformed() {
      let session = createWorldRuntimeSession(definition.adapter, `attempt.compiler-${definition.name.toLowerCase().replaceAll(" ", "-")}-malformed`);
      for (const event of definition.toProof) {
        const result = dispatchWorldRuntimeCommand(definition.adapter, session, { kind: "domain", event });
        if (!result.accepted) throw new Error(result.reason);
        session = result.session;
      }
      const rejected = dispatchWorldRuntimeCommand(definition.adapter, session, { kind: "domain", event: definition.malformed });
      expect(rejected).toMatchObject({ accepted: false, session: { phase: "proof", receipt: null } });
    },
    reset() {
      const completed = run([...definition.toProof, ...definition.pass], `attempt.compiler-${definition.name.toLowerCase().replaceAll(" ", "-")}-reset`);
      const reset = dispatchWorldRuntimeCommand(definition.adapter, completed.session, { kind: "domain", event: definition.reset });
      expect(reset).toMatchObject({ accepted: true, session: { receipt: null, proof: null, semanticTrace: ["encounter"] } });
      if (!reset.accepted) throw new Error(reset.reason);
      return { completedAttemptId: completed.session.attemptId, resetAttemptId: reset.session.attemptId };
    },
  };
}

const primaryWorkedAssignments = [
  ["philadelphia-visible-detail", "observation"],
  ["philadelphia-catalog-fact", "catalog_fact"],
  ["philadelphia-purpose-inference", "inference"],
  ["philadelphia-open-question", "open_question"],
] as const;

function primaryTransfer(
  categories: readonly ["observation" | "catalog_fact" | "inference" | "open_question", "observation" | "catalog_fact" | "inference" | "open_question", "observation" | "catalog_fact" | "inference" | "open_question", "observation" | "catalog_fact" | "inference" | "open_question"],
): readonly PrimarySourceWorldEvent[] {
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

const fixtures: readonly CompilerFixture[] = [
  defineFixture({
    name: "Force and Motion",
    adapter: forceAndMotionWorldRuntimeAdapter,
    toProof: [
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
    ] satisfies readonly LearningEvent[],
    pass: [{ type: "SUBMIT_TRANSFER", choiceId: TRANSFER.correctChoiceId, explanation: "The velocity stays flat after the force returns to zero." }],
    fail: [{ type: "SUBMIT_TRANSFER", choiceId: "returns_to_zero", explanation: "I think the velocity returns to zero as soon as the force ends." }],
    malformed: { type: "SUBMIT_TRANSFER", explanation: "There is no selected answer in this malformed attempt." },
    reset: { type: "RESET" },
    accessAccommodationId: "access.force-and-motion.text-alternative",
    rawLearnerProse: "A continuing push seems to set the object's speed.",
  }),
  defineFixture({
    name: "Proportional Reasoning",
    adapter: proportionalReasoningWorldRuntimeAdapter,
    toProof: [
      { type: "COMMIT_INITIAL", predictionId: "same_strength", confidence: 65 },
      { type: "COMMIT_EXPLANATION", explanation: "Both recipes leave one more cup of water than concentrate." },
      { type: "COMMIT_TEST_PREDICTION", predictionId: "same_strength" },
      { type: "RUN_EXPERIMENT" },
      { type: "BEGIN_RECONSTRUCTION" },
      { type: "SUBMIT_RECONSTRUCTION", reconstruction: "A relationship stays proportional when both quantities scale by the same factor." },
      { type: "ACKNOWLEDGE_WITHDRAWAL" },
    ] satisfies readonly RatioWorldEvent[],
    pass: [{ type: "SUBMIT_TRANSFER", choiceId: "32_km", explanation: "12 is four times 3, so the real distance scales from 8 to 32 by the same factor.", confidence: 85 }],
    fail: [{ type: "SUBMIT_TRANSFER", choiceId: "24_km", explanation: "I used the same relationship idea, but selected 24 kilometres for this map.", confidence: 60 }],
    malformed: { type: "SUBMIT_TRANSFER", choiceId: "32_km", explanation: "short", confidence: 80 },
    reset: { type: "RESET" },
    accessAccommodationId: "access.proportional-reasoning.text-alternatives",
    rawLearnerProse: "Both recipes leave one more cup of water than concentrate.",
  }),
  defineFixture({
    name: "Source Corroboration",
    adapter: sourceCorroborationWorldRuntimeAdapter,
    toProof: [
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
    ] satisfies readonly EvidenceLearningAction[],
    pass: [
      { type: "SET_TRANSFER_CHOICE", choiceId: "bounded-measures" },
      { type: "SET_TRANSFER_OPEN_QUESTION", openQuestionId: "held-constant" },
      { type: "SUBMIT_TRANSFER" },
    ],
    fail: [
      { type: "SET_TRANSFER_CHOICE", choiceId: "always-harms" },
      { type: "SET_TRANSFER_OPEN_QUESTION", openQuestionId: "reader-preference" },
      { type: "SUBMIT_TRANSFER" },
    ],
    malformed: { type: "SUBMIT_TRANSFER" },
    reset: { type: "RESET" },
    accessAccommodationId: "access.source-corroboration.text-alternatives",
    rawLearnerProse: "The access design and later measurement probably change the result.",
  }),
  defineFixture({
    name: "Primary Source Reasoning",
    adapter: primarySourceWorldRuntimeAdapter,
    toProof: [
      { type: "COMMIT_INITIAL", choiceId: "visible_detail", confidence: 70 },
      { type: "COMMIT_EXPLANATION", explanation: "A reader should separate visible detail from catalog fact and historical inference." },
      { type: "ACCEPT_INTERPRETATIONS", response: "accepted" },
      { type: "COMMIT_TEST_PREDICTION", predictionId: "catalog_distinguishes_evidence_layers" },
      { type: "OPEN_CATALOG" },
      ...primaryWorkedAssignments.map(([statementId, category]) => ({ type: "SET_WORKED_ASSIGNMENT" as const, statementId, category })),
      { type: "SUBMIT_WORKED_TEST" },
      { type: "SUBMIT_RECONSTRUCTION", choiceId: "layers_bound_claims", reconstruction: "I will keep each claim inside the evidence layer that can establish it." },
      { type: "ACKNOWLEDGE_WITHDRAWAL" },
    ] satisfies readonly PrimarySourceWorldEvent[],
    pass: primaryTransfer(["observation", "catalog_fact", "inference", "open_question"]),
    fail: primaryTransfer(["observation", "observation", "observation", "observation"]),
    malformed: { type: "SUBMIT_TRANSFER", confidence: 82, explanation: "This malformed submission has no transfer classifications to validate." },
    reset: { type: "RESET" },
    accessAccommodationId: "access.primary-source.text-alternatives",
    rawLearnerProse: "A reader should separate visible detail from catalog fact and historical inference.",
  }),
];

describe.each(fixtures)("$name ADR-001 event compiler", (fixture) => {
  it("compiles pass and fail receipts into one deterministic, replayed v2 chain without raw prose", async () => {
    const passed = fixture.complete("pass", `attempt.compiler-${fixture.name.toLowerCase().replaceAll(" ", "-")}-pass`);
    const failed = fixture.complete("fail", `attempt.compiler-${fixture.name.toLowerCase().replaceAll(" ", "-")}-fail`);
    const first = await compileWorldRuntimeReceiptToAdr001(passed);
    const retry = await compileWorldRuntimeReceiptToAdr001(passed);
    const failedResult = await compileWorldRuntimeReceiptToAdr001(failed);

    expect(first).toMatchObject({ ok: true, projection: { status: "completed", evidence: { disposition: "demonstrated" } } });
    expect(retry).toEqual(first);
    expect(failedResult).toMatchObject({ ok: true, projection: { status: "completed", evidence: { disposition: "not_demonstrated" } } });
    if (!first.ok || !failedResult.ok) return;

    expect(first.events.map((event) => event.event_type)).toEqual([
      "world_run.started",
      ...passed.receipt.cognitiveSupport.map(() => "assistance.recorded"),
      "proof.submitted",
      "evidence.recorded",
      "world_run.completed",
    ]);
    expect(first.events.at(-1)?.aggregate.version).toBe(first.events.length);
    expect(first.events.every((event) => event.schema_version === 2 && event.integrity_hash.startsWith("sha256:"))).toBe(true);
    expect(first.events.every((event) => event.correlation_id === first.events[0]?.correlation_id)).toBe(true);
    expect(first.events.find((event) => event.event_type === "proof.submitted")?.payload.proof_nonce_digest).toBeNull();
    expect(first.events.find((event) => event.event_type === "evidence.recorded")?.payload.proof_authority).toBe("honour_based");
    expect(first.events.find((event) => event.event_type === "evidence.recorded")?.payload.remains_untested).toEqual(
      expect.arrayContaining(["durability.not-established", "source-provenance.incomplete"]),
    );
    expect(JSON.stringify(first.events)).not.toContain(fixture.rawLearnerProse);
    expect(JSON.stringify(first.events)).not.toContain("raw_learner_text");

    const journal = new ForgeEventJournal();
    for (const event of first.events) await expect(journal.append(event)).resolves.toMatchObject({ accepted: true, disposition: "appended" });
    for (const event of first.events) await expect(journal.append(event)).resolves.toMatchObject({ accepted: true, disposition: "duplicate" });

    const repeatedAccess = fixture.completeWithRepeatedAccess(`attempt.compiler-${fixture.name.toLowerCase().replaceAll(" ", "-")}-access`);
    const accessed = await compileWorldRuntimeReceiptToAdr001(repeatedAccess);
    expect(repeatedAccess.receipt.accessAccommodations).toHaveLength(1);
    expect(accessed).toMatchObject({ ok: true });
    if (accessed.ok) {
      expect(accessed.events.find((event) => event.event_type === "proof.submitted")?.payload.access_accommodations).toHaveLength(1);
    }
  });

  it("refuses malformed, raw-prose, source-inflated, and validator-forged receipts and preserves reset boundaries", async () => {
    fixture.malformed();
    await expect(compileWorldRuntimeReceiptToAdr001({ receipt: null, validatorInput: {} })).resolves.toMatchObject({
      ok: false,
      code: "malformed_receipt",
    });

    const passed = fixture.complete("pass", `attempt.compiler-${fixture.name.toLowerCase().replaceAll(" ", "-")}-guard`);
    await expect(compileWorldRuntimeReceiptToAdr001({
      receipt: { ...passed.receipt, rawLearnerText: fixture.rawLearnerProse },
      validatorInput: passed.validatorInput,
    })).resolves.toMatchObject({ ok: false, code: "malformed_receipt" });
    await expect(compileWorldRuntimeReceiptToAdr001({
      receipt: {
        ...passed.receipt,
        cognitiveSupport: [{
          actionId: `action.${passed.receipt.world.id.slice("world.".length)}.support`,
          stage: "cold_transfer",
          source: "authored",
          tier: "cue",
          policyId: "policy.compiler.contamination-fixture.v1",
          providerId: null,
          modelId: null,
          fallbackReason: null,
        }],
      },
      validatorInput: passed.validatorInput,
    })).resolves.toMatchObject({ ok: false, code: "malformed_receipt" });
    await expect(compileWorldRuntimeReceiptToAdr001({
      receipt: {
        ...passed.receipt,
        sourceBindings: passed.receipt.sourceBindings.map((binding, index) =>
          index === 0 ? { ...binding, sourceItemId: "source.forged-inflation" } : binding,
        ),
      },
      validatorInput: passed.validatorInput,
    })).resolves.toMatchObject({ ok: false, code: "source_identity_mismatch" });

    const failed = fixture.complete("fail", `attempt.compiler-${fixture.name.toLowerCase().replaceAll(" ", "-")}-forged`);
    await expect(compileWorldRuntimeReceiptToAdr001({
      receipt: { ...failed.receipt, validator: { ...failed.receipt.validator, outcome: "pass", disposition: "demonstrated" } },
      validatorInput: failed.validatorInput,
    })).resolves.toMatchObject({ ok: false, code: "validator_outcome_mismatch" });
    await expect(compileWorldRuntimeReceiptToAdr001({
      receipt: { ...failed.receipt, validator: { ...failed.receipt.validator, code: "transfer.forged" } },
      validatorInput: failed.validatorInput,
    })).resolves.toMatchObject({ ok: false, code: "validator_result_mismatch" });
    await expect(compileWorldRuntimeReceiptToAdr001({
      receipt: {
        ...failed.receipt,
        validator: { ...failed.receipt.validator, criteria: [...failed.receipt.validator.criteria].reverse() },
      },
      validatorInput: failed.validatorInput,
    })).resolves.toMatchObject({ ok: false, code: "validator_result_mismatch" });

    const releasedRuntime = BUILT_IN_WORLD_PACKS.find((pack) => pack.manifest.id === passed.receipt.world.id)?.runtime;
    if (!releasedRuntime) throw new Error(`${fixture.name} released runtime binding missing.`);
    expect(passed.receipt.remainsUntested).toEqual(releasedRuntime.evidence.remainsUntested);
    await expect(compileWorldRuntimeReceiptToAdr001({
      receipt: { ...passed.receipt, remainsUntested: [fixture.rawLearnerProse] },
      validatorInput: passed.validatorInput,
    })).resolves.toMatchObject({ ok: false, code: "remains_untested_mismatch" });
    await expect(compileWorldRuntimeReceiptToAdr001({
      receipt: { ...passed.receipt, remainsUntested: ["provider.raw-output: model response asserted a learner result"] },
      validatorInput: passed.validatorInput,
    })).resolves.toMatchObject({ ok: false, code: "remains_untested_mismatch" });
    await expect(compileWorldRuntimeReceiptToAdr001({
      receipt: { ...passed.receipt, remainsUntested: [] },
      validatorInput: passed.validatorInput,
    })).resolves.toMatchObject({ ok: false, code: "remains_untested_mismatch" });
    await expect(compileWorldRuntimeReceiptToAdr001({
      receipt: { ...passed.receipt, remainsUntested: "not-an-array" },
      validatorInput: passed.validatorInput,
    })).resolves.toMatchObject({ ok: false, code: "remains_untested_mismatch" });
    await expect(compileWorldRuntimeReceiptToAdr001({
      receipt: { ...passed.receipt, remainsUntested: Array.from({ length: 17 }, (_value, index) => `bounded-limit-${index + 1}`) },
      validatorInput: passed.validatorInput,
    })).resolves.toMatchObject({ ok: false, code: "remains_untested_mismatch" });
    await expect(compileWorldRuntimeReceiptToAdr001({
      receipt: { ...passed.receipt, remainsUntested: ["x".repeat(241)] },
      validatorInput: passed.validatorInput,
    })).resolves.toMatchObject({ ok: false, code: "remains_untested_mismatch" });
    const withoutLimitation = Object.fromEntries(
      Object.entries(passed.receipt).filter(([key]) => key !== "remainsUntested"),
    );
    await expect(compileWorldRuntimeReceiptToAdr001({
      receipt: withoutLimitation,
      validatorInput: passed.validatorInput,
    })).resolves.toMatchObject({ ok: false, code: "remains_untested_mismatch" });
    await expect(compileWorldRuntimeReceiptToAdr001({
      receipt: {
        ...passed.receipt,
        remainsUntested: [...passed.receipt.remainsUntested, "Trust asserted by a provider."],
      },
      validatorInput: passed.validatorInput,
    })).resolves.toMatchObject({ ok: false, code: "remains_untested_mismatch" });
    await expect(compileWorldRuntimeReceiptToAdr001({
      receipt: { ...passed.receipt, remainsUntested: [...passed.receipt.remainsUntested].reverse() },
      validatorInput: passed.validatorInput,
    })).resolves.toMatchObject({ ok: false, code: "remains_untested_mismatch" });
    await expect(compileWorldRuntimeReceiptToAdr001({
      receipt: { ...passed.receipt, runtimeBindingDigest: `sha256:${"0".repeat(64)}` },
      validatorInput: passed.validatorInput,
    })).resolves.toMatchObject({ ok: false, code: "runtime_binding_digest_mismatch" });
    await expect(compileWorldRuntimeReceiptToAdr001({
      receipt: { ...passed.receipt, packageIntegrityHash: `sha256:${"0".repeat(64)}` },
      validatorInput: passed.validatorInput,
    })).resolves.toMatchObject({ ok: false, code: "package_integrity_hash_mismatch" });
    await expect(compileWorldRuntimeReceiptToAdr001({
      receipt: {},
      validatorInput: passed.validatorInput,
    })).resolves.toMatchObject({ ok: false, code: "malformed_receipt" });
    await expect(compileWorldRuntimeReceiptToAdr001({
      receipt: { ...passed.receipt, kind: "forge.runtime.not-a-bounded-local-attempt" },
      validatorInput: passed.validatorInput,
    })).resolves.toMatchObject({ ok: false, code: "malformed_receipt" });
    await expect(compileWorldRuntimeReceiptToAdr001({
      receipt: { ...passed.receipt, schemaVersion: "9.9.9" },
      validatorInput: passed.validatorInput,
    })).resolves.toMatchObject({ ok: false, code: "malformed_receipt" });

    const reset = fixture.reset();
    expect(reset.resetAttemptId).not.toBe(reset.completedAttemptId);
    const afterReset = fixture.complete("pass", `attempt.compiler-${fixture.name.toLowerCase().replaceAll(" ", "-")}-after-reset`);
    const beforeReset = await compileWorldRuntimeReceiptToAdr001(passed);
    const afterResetResult = await compileWorldRuntimeReceiptToAdr001(afterReset);
    expect(beforeReset).toMatchObject({ ok: true });
    expect(afterResetResult).toMatchObject({ ok: true });
    if (!beforeReset.ok || !afterResetResult.ok) return;
    expect(afterResetResult.events[0]?.aggregate.id).not.toBe(beforeReset.events[0]?.aggregate.id);
  });
});

describe("ADR-001 compiler mixed-version replay refusal", () => {
  it("does not allow a version-1 append after a compiler-produced version-2 chain", async () => {
    const run = fixtures[0]!.complete("pass", "attempt.compiler-mixed-version");
    const compiled = await compileWorldRuntimeReceiptToAdr001(run);
    if (!compiled.ok) throw new Error(compiled.message);
    const journal = new ForgeEventJournal();
    for (const event of compiled.events) await journal.append(event);
    const legacy = await sealForgeEvent({
      event_id: "70000000-0000-4000-8000-000000000001",
      event_type: "world_run.started",
      schema_version: 1,
      aggregate: { type: "world_run", id: "run.legacy.compiler-fixture", version: 1 },
      actor: { type: "learner", id: "device.legacy.compiler-fixture" },
      authority: { policy_version: "policy.legacy.compiler.1", consent_grant_ids: [] },
      occurred_at: "2026-07-22T12:00:00.000Z",
      recorded_at: "2026-07-22T12:00:00.000Z",
      correlation_id: "correlation.legacy.compiler-fixture",
      causation_id: null,
      idempotency_key: "idempotency.legacy.compiler.started",
      payload: {
        world_id: "world.force-and-motion",
        world_version: "1.0.1",
        content_version: "1.0.0",
        capability_id: "capability.force-motion.net-force-velocity",
        proof_claim_id: "proof.force-motion.independent-transfer",
        validator_id: "validator.force-motion-transfer.v1",
        validator_version: "1.0.0",
        package_integrity_hash: `sha256:${"a".repeat(64)}`,
        assistance_mode: "closed",
        source_ids: ["source.openstax.newtons-first-law"],
        proof_authority: "honour_based",
      },
    });
    await expect(journal.append(legacy)).resolves.toMatchObject({ accepted: false, reason: "schema_version_mismatch" });
  });
});

describe("ADR-001 compiler receipt commitments", () => {
  it("uses the exact released task code seed, not result code or task family", async () => {
    const force = fixtures.find((fixture) => fixture.name === "Force and Motion");
    if (!force) throw new Error("Force fixture missing.");
    const passed = await compileWorldRuntimeReceiptToAdr001(force.complete("pass", "attempt.compiler-task-code-pass"));
    const failed = await compileWorldRuntimeReceiptToAdr001(force.complete("fail", "attempt.compiler-task-code-fail"));
    if (!passed.ok || !failed.ok) throw new Error("Expected both canonical Force receipts to compile.");
    const expectedDigest = await sha256Digest(canonicalJson({
      validatorId: "validator.force-motion-transfer.v1",
      validatorVersion: "1.0.0",
      taskCode: "cargo_pod_force_graph",
    }));
    const expectedTaskId = `task.${expectedDigest.slice("sha256:".length, "sha256:".length + 32)}`;
    const taskIdFor = (events: readonly { readonly event_type: string; readonly payload: unknown }[]) => {
      const started = events.find((event) => event.event_type === "world_run.started");
      if (!started || typeof started.payload !== "object" || started.payload === null || !("task_id" in started.payload)) {
        throw new Error("Compiler start event missing task ID.");
      }
      return (started.payload as { readonly task_id: string }).task_id;
    };
    expect(taskIdFor(passed.events)).toBe(expectedTaskId);
    expect(taskIdFor(failed.events)).toBe(expectedTaskId);
    expect(taskIdFor(passed.events)).not.toBe("task-family.force-motion.cargo-pod-cold-transfer.v1");
  });

  it("keeps one released local attempt identity stable across contradictory canonical outcomes", async () => {
    const force = fixtures.find((fixture) => fixture.name === "Force and Motion");
    if (!force) throw new Error("Force fixture missing.");
    const attemptId = "attempt.compiler-stable-identity";
    const passed = await compileWorldRuntimeReceiptToAdr001(force.complete("pass", attemptId));
    const failed = await compileWorldRuntimeReceiptToAdr001(force.complete("fail", attemptId));
    const anotherAttempt = await compileWorldRuntimeReceiptToAdr001(force.complete("pass", "attempt.compiler-stable-identity-other"));
    if (!passed.ok || !failed.ok || !anotherAttempt.ok) throw new Error("Expected canonical Force receipts to compile.");

    const taskIdFor = (events: readonly { readonly event_type: string; readonly payload: unknown }[]) => {
      const started = events.find((event) => event.event_type === "world_run.started");
      if (!started || typeof started.payload !== "object" || started.payload === null || !("task_id" in started.payload)) {
        throw new Error("Compiler start event missing task ID.");
      }
      return (started.payload as { readonly task_id: string }).task_id;
    };
    expect(passed.events[0]?.aggregate.id).toBe(failed.events[0]?.aggregate.id);
    expect(passed.events[0]?.correlation_id).toBe(failed.events[0]?.correlation_id);
    expect(taskIdFor(passed.events)).toBe(taskIdFor(failed.events));
    expect(passed.events.map((event) => event.event_id)).toEqual(failed.events.map((event) => event.event_id));
    expect(passed.events.map((event) => event.idempotency_key)).toEqual(failed.events.map((event) => event.idempotency_key));
    const supportIds = (events: readonly { readonly event_type: string; readonly payload: unknown }[]) => events
      .filter((event) => event.event_type === "assistance.recorded")
      .map((event) => (event.payload as { readonly support_id: string }).support_id);
    const evidenceIds = (events: readonly { readonly event_type: string; readonly payload: unknown }[]) => events
      .filter((event) => event.event_type === "evidence.recorded")
      .map((event) => (event.payload as { readonly evidence_id: string }).evidence_id);
    expect(supportIds(passed.events)).toEqual(supportIds(failed.events));
    expect(evidenceIds(passed.events)).toEqual(evidenceIds(failed.events));
    expect(passed.events).not.toEqual(failed.events);
    expect(passed.events.map((event) => event.integrity_hash)).not.toEqual(failed.events.map((event) => event.integrity_hash));
    expect(anotherAttempt.events[0]?.aggregate.id).not.toBe(passed.events[0]?.aggregate.id);
    expect(anotherAttempt.events[0]?.correlation_id).not.toBe(passed.events[0]?.correlation_id);

    const journal = new ForgeEventJournal();
    for (const event of passed.events) await expect(journal.append(event)).resolves.toMatchObject({ accepted: true, disposition: "appended" });
    const contradictoryAppend = [];
    for (const event of failed.events) contradictoryAppend.push(await journal.append(event));
    expect(contradictoryAppend).toEqual(expect.arrayContaining([
      expect.objectContaining({ accepted: false }),
    ]));
    expect(journal.size).toBe(passed.events.length);
  });

  it("accepts catalog-valid pre-proof model provenance without strengthening a forged support or result", async () => {
    const force = fixtures.find((fixture) => fixture.name === "Force and Motion");
    if (!force) throw new Error("Force fixture missing.");
    const completed = force.complete("pass", "attempt.compiler-model-provenance");
    const catalogValidModelReceipt = {
      ...completed.receipt,
      cognitiveSupport: [{
        actionId: "action.force-and-motion.interpretation.model",
        stage: "interpret_two_readings" as const,
        source: "model" as const,
        tier: "representation" as const,
        policyId: "policy.force-and-motion.interpretation.v1",
        providerId: "openai",
        modelId: "byok-reviewed-model",
        fallbackReason: null,
      }],
    };
    const compiled = await compileWorldRuntimeReceiptToAdr001({
      receipt: catalogValidModelReceipt,
      validatorInput: completed.validatorInput,
    });
    expect(compiled).toMatchObject({ ok: true, projection: { evidence: { disposition: "demonstrated" } } });
    if (!compiled.ok) return;
    const assistance = compiled.events.find((event) => event.event_type === "assistance.recorded");
    expect(assistance?.payload).toMatchObject({
      provider_id: "openai",
      model_id: "byok-reviewed-model",
      fallback_reason: null,
    });
  });

  it("rejects forged support cardinality, order, source-runtime support, access stage, and release identities", async () => {
    const force = fixtures.find((fixture) => fixture.name === "Force and Motion");
    const source = fixtures.find((fixture) => fixture.name === "Source Corroboration");
    if (!force || !source) throw new Error("Required fixture missing.");
    const forceRun = force.complete("pass", "attempt.compiler-adversarial-support");
    const fallback = forceRun.receipt.cognitiveSupport[0]!;
    const governed = {
      actionId: "action.force-and-motion.support.attention",
      stage: "governed_support" as const,
      source: "authored" as const,
      tier: "attention" as const,
      policyId: "policy.force-and-motion.interpretation.v1",
      providerId: null,
      modelId: null,
      fallbackReason: null,
    };
    const traceWithSupport = [
      "encounter", "commit_model", "interpret_two_readings", "name_disagreement", "commit_test_prediction",
      "run_separating_experience", "governed_support", "reconstruct", "withdraw_instructional_ai", "cold_transfer", "bounded_result",
    ] as const;
    await expect(compileWorldRuntimeReceiptToAdr001({
      receipt: { ...forceRun.receipt, cognitiveSupport: [fallback, fallback] },
      validatorInput: forceRun.validatorInput,
    })).resolves.toMatchObject({ ok: false, code: "support_identity_mismatch" });
    await expect(compileWorldRuntimeReceiptToAdr001({
      receipt: {
        ...forceRun.receipt,
        protocol: { ...forceRun.receipt.protocol, semanticTrace: traceWithSupport },
        cognitiveSupport: [governed, fallback],
      },
      validatorInput: forceRun.validatorInput,
    })).resolves.toMatchObject({ ok: false, code: "support_identity_mismatch" });
    await expect(compileWorldRuntimeReceiptToAdr001({
      receipt: {
        ...forceRun.receipt,
        accessAccommodations: [{
          accommodationId: "access.force-and-motion.text-alternative",
          stage: "return_or_apply",
          kind: "text_alternative",
          modality: "textual",
          representation: "text_description",
          constructPreservation: "preserves_construct",
          answerChanging: false,
          policyVersion: "1.0.0",
          nonvisualAlternative: true,
        }],
      },
      validatorInput: forceRun.validatorInput,
    })).resolves.toMatchObject({ ok: false, code: "access_identity_mismatch" });
    await expect(compileWorldRuntimeReceiptToAdr001({
      receipt: { ...forceRun.receipt, runtimeBindingDigest: `sha256:${"0".repeat(64)}` },
      validatorInput: forceRun.validatorInput,
    })).resolves.toMatchObject({ ok: false, code: "runtime_binding_digest_mismatch" });
    await expect(compileWorldRuntimeReceiptToAdr001({
      receipt: { ...forceRun.receipt, packageIntegrityHash: `sha256:${"0".repeat(64)}` },
      validatorInput: forceRun.validatorInput,
    })).resolves.toMatchObject({ ok: false, code: "package_integrity_hash_mismatch" });

    const sourceRun = source.complete("pass", "attempt.compiler-source-support-forgery");
    await expect(compileWorldRuntimeReceiptToAdr001({
      receipt: {
        ...sourceRun.receipt,
        cognitiveSupport: [{
          actionId: "action.source-corroboration.support",
          stage: "governed_support",
          source: "authored",
          tier: "cue",
          policyId: "policy.source-corroboration.authored-support.v1",
          providerId: null,
          modelId: null,
          fallbackReason: null,
        }],
      },
      validatorInput: sourceRun.validatorInput,
    })).resolves.toMatchObject({ ok: false, code: "support_identity_mismatch" });
  });
});
