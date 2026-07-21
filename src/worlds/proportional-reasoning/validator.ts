import { compareRationals, divide, equalRationals, multiply, rational } from "./arithmetic";
import { PROPORTIONAL_REASONING_CONTENT } from "./content";
import type {
  ExperimentView,
  InitialPredictionId,
  RatioProof,
  TransferChoiceId,
} from "./model";

const INITIAL_PREDICTION_IDS = new Set<InitialPredictionId>([
  "same_strength",
  "glass_a_stronger",
  "jug_b_stronger",
]);

const EXPERIMENT_VIEWS = new Set<ExperimentView>(["parts", "common_water", "table"]);

const TRANSFER_CHOICE_IDS = new Set<TransferChoiceId>(["18_km", "24_km", "32_km", "96_km"]);

const SCALE_FACTOR_PATTERN = /(?:\b4\s*(?:times|x|×)\b|four\s+times|times\s+four|multipl(?:y|ied|ication)|scal(?:e|ed|ing)|3\s*(?:to|→|->)\s*12)/i;
const RELATIONSHIP_PATTERN = /ratio|proportion|relationship|for\s+each|per\b|same\s+(?:rate|scale)/i;
const CALCULATION_PATTERN = /(?:12\s*(?:÷|\/|divided by)\s*3|8\s*(?:×|x|\*)\s*4|\b32\b)/i;

export function isInitialPredictionId(value: string): value is InitialPredictionId {
  return INITIAL_PREDICTION_IDS.has(value as InitialPredictionId);
}

export function isExperimentView(value: string): value is ExperimentView {
  return EXPERIMENT_VIEWS.has(value as ExperimentView);
}

export function isTransferChoiceId(value: string): value is TransferChoiceId {
  return TRANSFER_CHOICE_IDS.has(value as TransferChoiceId);
}

export function isValidConfidence(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 100;
}

export function isMeaningfulExplanation(value: string, minimumLength = 8): boolean {
  return value.trim().replace(/\s+/g, " ").length >= minimumLength;
}

export function validateReconstruction(value: string): boolean {
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length >= 20 && RELATIONSHIP_PATTERN.test(normalized);
}

export function exactMixtureComparison(): -1 | 0 | 1 {
  const [glass, jug] = PROPORTIONAL_REASONING_CONTENT.mixtures;
  return compareMixtureRatios(glass.concentrateParts, glass.waterParts, jug.concentrateParts, jug.waterParts);
}

export function compareMixtureRatios(
  leftConcentrate: number,
  leftWater: number,
  rightConcentrate: number,
  rightWater: number,
): -1 | 0 | 1 {
  const left = divide(rational(leftConcentrate), rational(leftWater));
  const right = divide(rational(rightConcentrate), rational(rightWater));
  return compareRationals(left, right);
}

export function correctInitialPredictionId(): InitialPredictionId {
  const comparison = exactMixtureComparison();
  return comparison === 0 ? "same_strength" : comparison > 0 ? "glass_a_stronger" : "jug_b_stronger";
}

export function solveTransferExactly(): ReturnType<typeof rational> {
  const { mapDistanceCm, realDistanceKm, targetMapDistanceCm } = PROPORTIONAL_REASONING_CONTENT.transfer;
  const scaleFactor = divide(targetMapDistanceCm, mapDistanceCm);
  return multiply(realDistanceKm, scaleFactor);
}

export function evaluateTransfer(
  choiceId: TransferChoiceId,
  explanation: string,
  confidence: number,
): RatioProof {
  const option = PROPORTIONAL_REASONING_CONTENT.transfer.options.find((candidate) => candidate.id === choiceId);
  if (!option) throw new Error("Unknown transfer choice.");
  if (!isValidConfidence(confidence)) throw new Error("Invalid transfer confidence.");

  const mechanismSignals: Array<"scale_factor" | "same_relationship" | "calculation"> = [];
  if (SCALE_FACTOR_PATTERN.test(explanation)) mechanismSignals.push("scale_factor");
  if (RELATIONSHIP_PATTERN.test(explanation)) mechanismSignals.push("same_relationship");
  if (CALCULATION_PATTERN.test(explanation)) mechanismSignals.push("calculation");

  return Object.freeze({
    choiceId,
    explanation: explanation.trim(),
    confidence,
    answerCorrect: equalRationals(option.distanceKm, solveTransferExactly()),
    mechanismSignals: Object.freeze(mechanismSignals),
    submittedWithoutSupport: true,
  });
}
