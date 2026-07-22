import { describe, expect, it } from "vitest";

import {
  AUDIENCE_COPY,
  PROPORTIONAL_REASONING_CONTENT,
  compareMixtureRatios,
  compareRationals,
  correctInitialPredictionId,
  createInitialRatioWorldState,
  deriveRatioEvidence,
  divide,
  equalRationals,
  evaluateTransfer,
  exactMixtureComparison,
  formatRational,
  greatestCommonDivisor,
  multiply,
  rational,
  solveTransferExactly,
  transitionRatioWorld,
  isIndependentProportionalTransferDemonstrated,
  validateReconstruction,
  type RatioWorldEvent,
  type RatioWorldState,
} from "./index";

function advance(state: RatioWorldState, event: RatioWorldEvent): RatioWorldState {
  const result = transitionRatioWorld(state, event);
  expect(result.accepted, result.accepted ? undefined : result.reason).toBe(true);
  return result.state;
}

function stateAtExperiment(): RatioWorldState {
  let state = createInitialRatioWorldState();
  state = advance(state, { type: "COMMIT_INITIAL", predictionId: "same_strength", confidence: 65 });
  state = advance(state, { type: "COMMIT_EXPLANATION", explanation: "Both have one extra cup of water." });
  return advance(state, { type: "COMMIT_TEST_PREDICTION", predictionId: "same_strength" });
}

function stateAtTransfer({ support = false }: { support?: boolean } = {}): RatioWorldState {
  let state = stateAtExperiment();
  state = advance(state, { type: "RUN_EXPERIMENT" });
  if (support) state = advance(state, { type: "REQUEST_SUPPORT" });
  state = advance(state, { type: "BEGIN_RECONSTRUCTION" });
  state = advance(state, {
    type: "SUBMIT_RECONSTRUCTION",
    reconstruction: "A ratio stays proportional when both quantities scale by the same factor.",
  });
  return advance(state, { type: "ACKNOWLEDGE_WITHDRAWAL" });
}

describe("exact proportional arithmetic", () => {
  it("normalizes signs and common factors without decimal rounding", () => {
    expect(greatestCommonDivisor(18, -24)).toBe(6);
    expect(rational(8, 12)).toEqual({ numerator: 2, denominator: 3 });
    expect(rational(8, -12)).toEqual({ numerator: -2, denominator: 3 });
    expect(formatRational(rational(32))).toBe("32");
    expect(formatRational(rational(4, 6))).toBe("2/3");
  });

  it("multiplies, divides, compares, and equates rationals exactly", () => {
    expect(multiply(rational(2, 3), rational(3, 5))).toEqual(rational(2, 5));
    expect(divide(rational(5, 6), rational(2, 3))).toEqual(rational(5, 4));
    expect(compareRationals(rational(4, 6), rational(5, 6))).toBe(-1);
    expect(equalRationals(rational(4, 6), rational(2, 3))).toBe(true);
    expect(() => rational(1, 0)).toThrow(/must not be zero/);
    expect(() => divide(rational(1), rational(0))).toThrow(/divide by zero/);
  });

  it("derives the authored mystery and transfer answers from the quantities", () => {
    expect(exactMixtureComparison()).toBe(-1);
    expect(compareMixtureRatios(2, 3, 4, 6)).toBe(0);
    expect(correctInitialPredictionId()).toBe("jug_b_stronger");
    expect(solveTransferExactly()).toEqual(rational(32));
  });
});

describe("authored content and validators", () => {
  it("exposes exactly two plausible readings that disagree on the separating case", () => {
    expect(PROPORTIONAL_REASONING_CONTENT.readings).toHaveLength(2);
    expect(PROPORTIONAL_REASONING_CONTENT.readings.map((reading) => reading.prediction)).toEqual([
      "The drinks should taste equally strong.",
      "Jug B should taste stronger.",
    ]);
    expect(PROPORTIONAL_REASONING_CONTENT.separatingTest).toContain("6 cups of water");
  });

  it("changes invitation copy by audience without changing quantities or standard", () => {
    expect(new Set(Object.values(AUDIENCE_COPY).map((copy) => copy.welcome)).size).toBe(3);
    expect(PROPORTIONAL_REASONING_CONTENT.mixtures).toEqual([
      expect.objectContaining({ concentrateParts: 2, waterParts: 3 }),
      expect.objectContaining({ concentrateParts: 5, waterParts: 6 }),
    ]);
    expect(PROPORTIONAL_REASONING_CONTENT.capabilityClaim).toContain("across representations");
  });

  it("requires an actual proportional relationship in reconstruction", () => {
    expect(validateReconstruction("I looked at it and I think the large one wins.")).toBe(false);
    expect(validateReconstruction("The ratio stays the same only when both quantities scale by one factor.")).toBe(true);
  });

  it("scores the transfer choice by exact arithmetic and reports mechanism signals separately", () => {
    const strong = evaluateTransfer("32_km", "12 divided by 3 is 4, so multiply the 8 km by four.", 80);
    expect(strong).toMatchObject({ answerCorrect: true, submittedWithoutSupport: true });
    expect(strong.mechanismSignals).toEqual(expect.arrayContaining(["scale_factor", "calculation"]));
    expect(isIndependentProportionalTransferDemonstrated(strong)).toBe(true);

    const lucky = evaluateTransfer("32_km", "I picked this answer from the list.", 25);
    expect(lucky.answerCorrect).toBe(true);
    expect(lucky.mechanismSignals).toEqual([]);
    expect(isIndependentProportionalTransferDemonstrated(lucky)).toBe(false);

    expect(evaluateTransfer("24_km", "The relationship gives twenty four.", 70).answerCorrect).toBe(false);
  });
});

describe("proportional world transition policy", () => {
  it("starts before help with no learner claims or proof data", () => {
    expect(createInitialRatioWorldState()).toEqual({
      stage: "MYSTERY",
      initialPredictionId: null,
      initialConfidence: null,
      initialExplanation: "",
      testPredictionId: null,
      experimentRun: false,
      experimentView: "parts",
      supportUsed: [],
      reconstruction: "",
      transferSubmitted: false,
      proof: null,
    });
  });

  it("fails closed for out-of-order events and leaves state unchanged", () => {
    const initial = createInitialRatioWorldState();
    const result = transitionRatioWorld(initial, { type: "REQUEST_SUPPORT" });
    expect(result).toEqual({ accepted: false, reason: "invalid_event_for_stage", state: initial });
    expect(transitionRatioWorld(initial, { type: "COMMIT_INITIAL", predictionId: "same_strength", confidence: 101 })).toMatchObject({
      accepted: false,
      reason: "invalid_confidence",
    });
  });

  it("requires initial and separating-test commitments before the exact comparison", () => {
    let state = createInitialRatioWorldState();
    state = advance(state, { type: "COMMIT_INITIAL", predictionId: "jug_b_stronger", confidence: 40 });
    expect(state.stage).toBe("EXPLAIN");
    expect(transitionRatioWorld(state, { type: "COMMIT_EXPLANATION", explanation: "short" })).toMatchObject({
      accepted: false,
      reason: "explanation_too_short",
    });
    state = advance(state, { type: "COMMIT_EXPLANATION", explanation: "The jug has more concentrate in it." });
    expect(state.stage).toBe("COMPILER");
    expect(transitionRatioWorld(state, { type: "RUN_EXPERIMENT" })).toMatchObject({
      accepted: false,
      reason: "invalid_event_for_stage",
    });
    state = advance(state, { type: "COMMIT_TEST_PREDICTION", predictionId: "jug_b_stronger" });
    expect(state).toMatchObject({ stage: "EXPERIMENT", testPredictionId: "jug_b_stronger" });
  });

  it("will not open reconstruction until the exact comparison has run", () => {
    const state = stateAtExperiment();
    expect(transitionRatioWorld(state, { type: "BEGIN_RECONSTRUCTION" })).toMatchObject({
      accepted: false,
      reason: "experiment_must_run_first",
    });
    expect(transitionRatioWorld(state, { type: "SET_EXPERIMENT_VIEW", view: "table" })).toMatchObject({
      accepted: false,
      reason: "experiment_must_run_first",
    });
    expect(transitionRatioWorld(state, { type: "REQUEST_SUPPORT" })).toMatchObject({
      accepted: false,
      reason: "experiment_must_run_first",
    });
    const run = advance(state, { type: "RUN_EXPERIMENT" });
    expect(run).toMatchObject({ experimentRun: true, experimentView: "common_water" });
    expect(advance(run, { type: "SET_EXPERIMENT_VIEW", view: "table" }).experimentView).toBe("table");
  });

  it("reveals authored support one level at a time and enforces the ceiling", () => {
    let state = stateAtExperiment();
    state = advance(state, { type: "RUN_EXPERIMENT" });
    state = advance(state, { type: "REQUEST_SUPPORT" });
    state = advance(state, { type: "REQUEST_SUPPORT" });
    state = advance(state, { type: "REQUEST_SUPPORT" });
    expect(state.supportUsed).toEqual([1, 2, 3]);
    expect(transitionRatioWorld(state, { type: "REQUEST_SUPPORT" })).toMatchObject({
      accepted: false,
      reason: "support_ceiling_reached",
    });
  });

  it("structurally rejects every support request after withdrawal", () => {
    const transfer = stateAtTransfer({ support: true });
    expect(transfer.stage).toBe("COLD_TRANSFER");
    expect(transitionRatioWorld(transfer, { type: "REQUEST_SUPPORT" })).toMatchObject({
      accepted: false,
      reason: "invalid_event_for_stage",
    });
  });

  it("runs the full flow, locks the transfer, and derives bounded evidence", () => {
    let state = stateAtTransfer({ support: true });
    state = advance(state, {
      type: "SUBMIT_TRANSFER",
      choiceId: "32_km",
      explanation: "The map length is four times larger, so the real 8 km is scaled by four too.",
      confidence: 85,
    });
    expect(state.stage).toBe("EVIDENCE");
    expect(transitionRatioWorld(state, {
      type: "SUBMIT_TRANSFER",
      choiceId: "18_km",
      explanation: "I changed my response.",
      confidence: 20,
    })).toMatchObject({ accepted: false, reason: "transfer_already_submitted" });

    expect(deriveRatioEvidence(state)).toMatchObject({
      capabilityId: "capability.proportional-reasoning.compare-and-scale",
      before: { predictionId: "same_strength", confidence: 65 },
      separatingTest: { predictionId: "same_strength", exactComparison: "2/3 < 5/6", commonWaterComparison: "4/6 < 5/6", observed: true },
      assistance: { levelsUsed: [1], wasAvailableDuringProof: false },
      independentTransfer: { choiceId: "32_km", answerCorrect: true, relationshipMechanismDemonstrated: true, confidence: 85 },
      returnProof: { scheduled: false, afterDays: 3 },
    });
  });

  it("does not overclaim when a correct choice lacks mechanism evidence", () => {
    let state = stateAtTransfer();
    state = advance(state, {
      type: "SUBMIT_TRANSFER",
      choiceId: "32_km",
      explanation: "I picked this answer from the four choices.",
      confidence: 30,
    });
    const evidence = deriveRatioEvidence(state);
    expect(evidence?.independentTransfer.answerCorrect).toBe(true);
    expect(evidence?.independentTransfer.relationshipMechanismDemonstrated).toBe(false);
    expect(evidence?.demonstrated).toContain("did not yet show");
    expect(evidence?.notYetTested).toContain("Delayed retention after assistance has faded");
  });

  it("resets every recorded field from any completed state", () => {
    let state = stateAtTransfer();
    state = advance(state, {
      type: "SUBMIT_TRANSFER",
      choiceId: "24_km",
      explanation: "I treated the change as an addition instead of a scale.",
      confidence: 60,
    });
    expect(advance(state, { type: "RESET" })).toEqual(createInitialRatioWorldState());
  });
});
