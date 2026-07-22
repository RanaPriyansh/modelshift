export type RatioAudience = "child_with_grown_up" | "teen" | "adult";

export type RatioStage =
  | "MYSTERY"
  | "EXPLAIN"
  | "COMPILER"
  | "EXPERIMENT"
  | "RECONSTRUCT"
  | "WITHDRAWAL"
  | "COLD_TRANSFER"
  | "EVIDENCE";

export type InitialPredictionId = "same_strength" | "glass_a_stronger" | "jug_b_stronger";

/**
 * This is a second, explicit commitment made after the two authored readings
 * are visible. It is intentionally separate from the learner's initial taste
 * prediction: the runtime must not invent a separating-test prediction.
 */
export type SeparatingTestPredictionId = "same_strength" | "jug_b_stronger";

export type ExperimentView = "parts" | "common_water" | "table";

export type TransferChoiceId = "18_km" | "24_km" | "32_km" | "96_km";

export interface Rational {
  readonly numerator: number;
  readonly denominator: number;
}

export interface Mixture {
  readonly id: "glass_a" | "jug_b";
  readonly name: string;
  readonly concentrateParts: number;
  readonly waterParts: number;
  readonly vesselLabel: string;
}

export interface InitialPredictionOption {
  readonly id: InitialPredictionId;
  readonly label: string;
}

export interface PlausibleReading {
  readonly id: "additive_gap" | "multiplicative_ratio";
  readonly label: string;
  readonly summary: string;
  readonly prediction: string;
}

export interface AuthoredCue {
  readonly level: 1 | 2 | 3;
  readonly label: string;
  readonly text: string;
}

export interface TransferOption {
  readonly id: TransferChoiceId;
  readonly label: string;
  readonly distanceKm: Rational;
}

export interface RatioContent {
  readonly title: string;
  readonly capabilityClaim: string;
  readonly mixtures: readonly [Mixture, Mixture];
  readonly initialPrompt: string;
  readonly initialOptions: readonly InitialPredictionOption[];
  readonly readings: readonly [PlausibleReading, PlausibleReading];
  readonly disagreement: string;
  readonly separatingTest: string;
  readonly cues: readonly [AuthoredCue, AuthoredCue, AuthoredCue];
  readonly reconstructionPrompt: string;
  readonly transfer: {
    readonly prompt: string;
    readonly mapDistanceCm: Rational;
    readonly realDistanceKm: Rational;
    readonly targetMapDistanceCm: Rational;
    readonly options: readonly TransferOption[];
  };
  readonly returnProof: {
    readonly afterDays: number;
    readonly description: string;
  };
}

export interface RatioProof {
  readonly choiceId: TransferChoiceId;
  readonly explanation: string;
  readonly confidence: number;
  readonly answerCorrect: boolean;
  readonly mechanismSignals: readonly RatioMechanismSignal[];
  readonly submittedWithoutSupport: true;
}

export type RatioMechanismSignal = "scale_factor" | "same_relationship" | "calculation";

export interface RatioWorldState {
  readonly stage: RatioStage;
  readonly initialPredictionId: InitialPredictionId | null;
  readonly initialConfidence: number | null;
  readonly initialExplanation: string;
  readonly testPredictionId: SeparatingTestPredictionId | null;
  readonly experimentRun: boolean;
  readonly experimentView: ExperimentView;
  readonly supportUsed: readonly (1 | 2 | 3)[];
  readonly reconstruction: string;
  readonly transferSubmitted: boolean;
  readonly proof: RatioProof | null;
}

export interface RatioEvidenceRecord {
  readonly capabilityId: "capability.proportional-reasoning.compare-and-scale";
  readonly before: {
    readonly predictionId: InitialPredictionId;
    readonly confidence: number;
    readonly explanation: string;
  };
  readonly separatingTest: {
    readonly predictionId: SeparatingTestPredictionId;
    readonly exactComparison: "2/3 < 5/6";
    readonly commonWaterComparison: "4/6 < 5/6";
    readonly observed: boolean;
  };
  readonly assistance: {
    readonly levelsUsed: readonly (1 | 2 | 3)[];
    readonly wasAvailableDuringProof: false;
  };
  readonly independentTransfer: {
    readonly choiceId: TransferChoiceId;
    readonly answerCorrect: boolean;
    readonly explanationProvided: boolean;
    readonly mechanismSignals: readonly ("scale_factor" | "same_relationship" | "calculation")[];
    readonly relationshipMechanismDemonstrated: boolean;
    readonly confidence: number;
  };
  readonly demonstrated: string;
  readonly notYetTested: readonly string[];
  readonly returnProof: {
    readonly scheduled: boolean;
    readonly afterDays: number;
  };
}

export type RatioWorldEvent =
  | { readonly type: "COMMIT_INITIAL"; readonly predictionId: InitialPredictionId; readonly confidence: number }
  | { readonly type: "COMMIT_EXPLANATION"; readonly explanation: string }
  | { readonly type: "COMMIT_TEST_PREDICTION"; readonly predictionId: SeparatingTestPredictionId }
  | { readonly type: "RUN_EXPERIMENT" }
  | { readonly type: "SET_EXPERIMENT_VIEW"; readonly view: ExperimentView }
  | { readonly type: "REQUEST_SUPPORT" }
  | { readonly type: "BEGIN_RECONSTRUCTION" }
  | { readonly type: "SUBMIT_RECONSTRUCTION"; readonly reconstruction: string }
  | { readonly type: "ACKNOWLEDGE_WITHDRAWAL" }
  | {
      readonly type: "SUBMIT_TRANSFER";
      readonly choiceId: TransferChoiceId;
      readonly explanation: string;
      readonly confidence: number;
    }
  | { readonly type: "RESET" };

export type RatioTransitionRejection =
  | "invalid_event_for_stage"
  | "invalid_prediction"
  | "invalid_test_prediction"
  | "invalid_confidence"
  | "explanation_too_short"
  | "experiment_must_run_first"
  | "invalid_experiment_view"
  | "support_ceiling_reached"
  | "reconstruction_not_ready"
  | "invalid_transfer_choice"
  | "transfer_already_submitted";

export type RatioTransitionResult =
  | { readonly accepted: true; readonly state: RatioWorldState }
  | { readonly accepted: false; readonly state: RatioWorldState; readonly reason: RatioTransitionRejection };
