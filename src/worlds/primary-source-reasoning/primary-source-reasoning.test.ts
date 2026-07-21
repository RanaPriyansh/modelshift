import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import provenance from "../../../public/worlds/primary-source-reasoning/provenance.json";
import {
  EVIDENCE_CATEGORIES,
  PHILADELPHIA_CATALOG,
  PRIMARY_SOURCE_CONTENT,
  PRIMARY_SOURCE_VALIDATOR_ID,
  TRANSFER_STATEMENTS,
  WASHINGTON_CATALOG,
  WORKED_STATEMENTS,
  correctTransferAssignments,
  createInitialPrimarySourceState,
  derivePrimarySourceEvidence,
  transitionPrimarySourceWorld,
  validatePrimarySourceTransfer,
  type EvidenceCategory,
  type PrimarySourceWorldEvent,
  type PrimarySourceWorldState,
  type TransferStatementId,
} from "./index";

function advance(
  state: PrimarySourceWorldState,
  event: PrimarySourceWorldEvent,
): PrimarySourceWorldState {
  const result = transitionPrimarySourceWorld(state, event);
  expect(result.accepted, result.accepted ? undefined : result.reason).toBe(true);
  return result.state;
}

function advanceToTest(): PrimarySourceWorldState {
  let state = createInitialPrimarySourceState();
  state = advance(state, {
    type: "COMMIT_INITIAL",
    choiceId: "purpose_claim",
    confidence: 85,
  });
  state = advance(state, {
    type: "COMMIT_EXPLANATION",
    explanation: "The prominent storefront makes the advertising purpose seem likely to me.",
  });
  state = advance(state, {
    type: "ACCEPT_INTERPRETATIONS",
    response: "accepted",
  });
  return advance(state, { type: "OPEN_CATALOG" });
}

function classifyWorkedCorrectly(state: PrimarySourceWorldState): PrimarySourceWorldState {
  let next = state;
  for (const statement of WORKED_STATEMENTS) {
    next = advance(next, {
      type: "SET_WORKED_ASSIGNMENT",
      statementId: statement.id,
      category: statement.correctCategory,
    });
  }
  return next;
}

function advanceToTransfer({ support = false }: { support?: boolean } = {}): PrimarySourceWorldState {
  let state = advanceToTest();
  if (support) state = advance(state, { type: "REQUEST_SUPPORT" });
  state = classifyWorkedCorrectly(state);
  state = advance(state, { type: "SUBMIT_WORKED_TEST" });
  state = advance(state, {
    type: "SUBMIT_RECONSTRUCTION",
    choiceId: "layers_bound_claims",
    reconstruction:
      "I should keep what I see, what the catalog records, and what I infer as separate evidence layers.",
  });
  return advance(state, { type: "ACKNOWLEDGE_WITHDRAWAL" });
}

describe("primary-source content and provenance", () => {
  it("uses two different LOC records without turning rights advisories into licenses", () => {
    expect(PRIMARY_SOURCE_CONTENT.mystery.sourceId).toBe("loc.90706156");
    expect(PRIMARY_SOURCE_CONTENT.transfer.sourceId).toBe("loc.2017716911");
    expect(PHILADELPHIA_CATALOG).toMatchObject({
      title: "Street scene, Philadelphia, Pa.",
      creator: "B.W. Kilburn Company.",
      rightsAdvisory: "No known restrictions on publication.",
    });
    expect(WASHINGTON_CATALOG).toMatchObject({
      title: "Street scene, Washington, D.C.",
      creator: "Vachon, John, 1914-1975, photographer",
    });
    expect(provenance.policy).toContain("not represented as licenses");
  });

  it("pins the exact bytes of both self-hosted LOC service JPEGs", () => {
    for (const asset of provenance.assets) {
      const bytes = readFileSync(
        join(process.cwd(), "public/worlds/primary-source-reasoning", asset.file),
      );
      expect(bytes.byteLength).toBe(asset.bytes);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(asset.sha256);
    }
  });

  it("defines exactly one authored statement for each evidence category in both sets", () => {
    expect(WORKED_STATEMENTS).toHaveLength(4);
    expect(TRANSFER_STATEMENTS).toHaveLength(4);
    expect(new Set(WORKED_STATEMENTS.map((statement) => statement.correctCategory))).toEqual(
      new Set(EVIDENCE_CATEGORIES),
    );
    expect(new Set(TRANSFER_STATEMENTS.map((statement) => statement.correctCategory))).toEqual(
      new Set(EVIDENCE_CATEGORIES),
    );
  });
});

describe("deterministic transfer validator", () => {
  it("accepts the one exact four-category assignment and makes a bounded claim", () => {
    const result = validatePrimarySourceTransfer({
      taskId: "loc.washington-street-1937.transfer",
      assignments: correctTransferAssignments(),
    });
    expect(result).toMatchObject({
      validatorId: PRIMARY_SOURCE_VALIDATOR_ID,
      valid: true,
      passed: true,
      score: 1,
      correctCount: 4,
      code: "transfer.demonstrated",
    });
    expect(result.evidence).toContain("On this unfamiliar photograph");
    expect(result.evidence.toLowerCase()).not.toContain("master");
  });

  it("exhaustively produces one pass across all 256 complete assignment combinations", () => {
    const statementIds = TRANSFER_STATEMENTS.map((statement) => statement.id);
    let completeInputs = 0;
    let passes = 0;

    for (const first of EVIDENCE_CATEGORIES) {
      for (const second of EVIDENCE_CATEGORIES) {
        for (const third of EVIDENCE_CATEGORIES) {
          for (const fourth of EVIDENCE_CATEGORIES) {
            const categories = [first, second, third, fourth];
            const assignments = Object.fromEntries(
              statementIds.map((id, index) => [id, categories[index]]),
            ) as Record<TransferStatementId, EvidenceCategory>;
            const result = validatePrimarySourceTransfer({
              taskId: "loc.washington-street-1937.transfer",
              assignments,
            });
            completeInputs += 1;
            if (result.passed) passes += 1;
            expect(result.score).toBe(result.correctCount / 4);
          }
        }
      }
    }

    expect(completeInputs).toBe(256);
    expect(passes).toBe(1);
  });

  it("rejects missing, extra, and wrong-task payloads instead of guessing", () => {
    expect(validatePrimarySourceTransfer({}).code).toBe("transfer.invalid");
    expect(
      validatePrimarySourceTransfer({
        taskId: "wrong-task",
        assignments: correctTransferAssignments(),
      }).valid,
    ).toBe(false);
    expect(
      validatePrimarySourceTransfer({
        taskId: "loc.washington-street-1937.transfer",
        assignments: correctTransferAssignments(),
        prose: "Please count this anyway",
      }).valid,
    ).toBe(false);
  });
});

describe("primary-source World transition policy", () => {
  it("starts with the mystery and no catalog, support, or proof data", () => {
    expect(createInitialPrimarySourceState()).toEqual({
      stage: "MYSTERY",
      initialChoiceId: null,
      confidence: null,
      initialExplanation: "",
      explanationSampleUsed: false,
      interpretationResponse: null,
      compilerCorrection: "",
      catalogOpened: false,
      workedAssignments: {},
      workedTestPassed: false,
      workedTestAttempts: 0,
      supportUsed: [],
      reconstructionChoiceId: null,
      reconstructionText: "",
      transferAssignments: {},
      transferConfidence: null,
      transferExplanation: "",
      transferSubmitted: false,
      transferEvaluation: null,
      proof: null,
    });
  });

  it("fails closed for out-of-order events and invalid commitments", () => {
    const initial = createInitialPrimarySourceState();
    expect(transitionPrimarySourceWorld(initial, { type: "OPEN_CATALOG" })).toEqual({
      accepted: false,
      reason: "invalid_event_for_stage",
      state: initial,
    });
    expect(
      transitionPrimarySourceWorld(initial, {
        type: "COMMIT_INITIAL",
        choiceId: "visible_detail",
        confidence: 101,
      }),
    ).toMatchObject({ accepted: false, reason: "invalid_confidence", state: initial });
  });

  it("does not reveal the compiler until the learner explains their commitment", () => {
    let state = createInitialPrimarySourceState();
    state = advance(state, {
      type: "COMMIT_INITIAL",
      choiceId: "catalog_detail",
      confidence: 70,
    });
    expect(state.stage).toBe("EXPLAIN");
    expect(
      transitionPrimarySourceWorld(state, {
        type: "COMMIT_EXPLANATION",
        explanation: "too short",
      }),
    ).toMatchObject({ accepted: false, reason: "explanation_too_short" });
    state = advance(state, {
      type: "COMMIT_EXPLANATION",
      explanation: "The company name could perhaps be read somewhere in the photograph.",
    });
    expect(state.stage).toBe("COMPILER");
  });

  it("requires the catalog and an exact four-way separation before reconstruction", () => {
    let state = createInitialPrimarySourceState();
    state = advance(state, {
      type: "COMMIT_INITIAL",
      choiceId: "visible_detail",
      confidence: 55,
    });
    state = advance(state, {
      type: "COMMIT_EXPLANATION",
      explanation: "These details can be independently checked by another viewer in the image.",
    });
    state = advance(state, {
      type: "ACCEPT_INTERPRETATIONS",
      response: "accepted",
    });
    expect(transitionPrimarySourceWorld(state, { type: "SUBMIT_WORKED_TEST" })).toMatchObject({
      accepted: false,
      reason: "catalog_must_open_first",
    });
    state = advance(state, { type: "OPEN_CATALOG" });
    expect(transitionPrimarySourceWorld(state, { type: "SUBMIT_WORKED_TEST" })).toMatchObject({
      accepted: false,
      reason: "classification_incomplete",
    });

    for (const statement of WORKED_STATEMENTS) {
      state = advance(state, {
        type: "SET_WORKED_ASSIGNMENT",
        statementId: statement.id,
        category: "observation",
      });
    }
    const retry = transitionPrimarySourceWorld(state, { type: "SUBMIT_WORKED_TEST" });
    expect(retry).toMatchObject({
      accepted: false,
      reason: "classification_mismatch",
      state: { stage: "TEST", workedTestAttempts: 1 },
    });
  });

  it("reveals governed support one level at a time and rejects it after withdrawal", () => {
    let state = advanceToTest();
    state = advance(state, { type: "REQUEST_SUPPORT" });
    state = advance(state, { type: "REQUEST_SUPPORT" });
    state = advance(state, { type: "REQUEST_SUPPORT" });
    expect(state.supportUsed).toEqual([1, 2, 3]);
    expect(transitionPrimarySourceWorld(state, { type: "REQUEST_SUPPORT" })).toMatchObject({
      accepted: false,
      reason: "support_ceiling_reached",
    });

    const transfer = advanceToTransfer({ support: true });
    expect(transfer.stage).toBe("COLD_TRANSFER");
    expect(transitionPrimarySourceWorld(transfer, { type: "REQUEST_SUPPORT" })).toMatchObject({
      accepted: false,
      reason: "invalid_event_for_stage",
    });
  });

  it("locks the one-shot transfer and derives evidence without raw learner prose", () => {
    let state = advanceToTransfer({ support: true });
    const correct = correctTransferAssignments();
    for (const statement of TRANSFER_STATEMENTS) {
      state = advance(state, {
        type: "SET_TRANSFER_ASSIGNMENT",
        statementId: statement.id,
        category: correct[statement.id],
      });
    }
    state = advance(state, {
      type: "SUBMIT_TRANSFER",
      confidence: 80,
      explanation:
        "I separated what is visible from what the catalog records and what still needs interpretation.",
    });
    expect(state.stage).toBe("RESULT");
    expect(state.transferEvaluation).toMatchObject({ passed: true, correctCount: 4 });
    expect(
      transitionPrimarySourceWorld(state, {
        type: "SUBMIT_TRANSFER",
        confidence: 80,
        explanation: "This is a second submission that should remain locked.",
      }),
    ).toMatchObject({ accepted: false, reason: "transfer_already_submitted" });
    expect(
      transitionPrimarySourceWorld(state, { type: "SET_TRANSFER_ASSIGNMENT", statementId: "washington-visible-detail", category: "inference" }),
    ).toMatchObject({ accepted: false, reason: "invalid_event_for_stage" });

    const evidence = derivePrimarySourceEvidence(state);
    expect(evidence).toMatchObject({
      worldId: "world.primary-source-reasoning",
      capabilityId: "capability.historical-literacy.observation-inference",
      proofClaimId: "proof.primary-source-reasoning.independent-transfer",
      validatorId: "validator.primary-source-reasoning-transfer.v1",
      assistance: {
        explanationSampleUsed: false,
        levelsUsed: [1],
        wasAvailableDuringProof: false,
      },
      independentTransfer: { passed: true, correctCount: 4, score: 1, confidence: 80 },
    });
    expect(JSON.stringify(evidence)).not.toContain(state.initialExplanation);
    expect(evidence?.notYetTested.join(" ").toLowerCase()).toContain("retained");
  });

  it("resets all learner and evidence state", () => {
    expect(
      advance(advanceToTransfer({ support: true }), { type: "RESET" }),
    ).toEqual(createInitialPrimarySourceState());
  });
});
