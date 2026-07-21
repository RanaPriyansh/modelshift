import type { PredictionChoice, TransferChoiceId } from "@/src/types/modelshift";

export const MYSTERY = {
  id: "mystery_force_cutoff" as const,
  title: "The engine is off. What happens next?",
  setup: "A cargo craft receives a one-second push in a region with no horizontal resistance. The scene freezes exactly when the engine switches off.",
  disclosure: "ModelShift may use AI to interpret your words. That interpretation can be wrong. Tested deterministic code produces the physics and checks answers.",
  predictions: [
    { id: "stops_immediately", label: "Stops immediately", compactLabel: "Stops", graphHint: "zero" },
    { id: "gradually_slows", label: "Gradually slows", compactLabel: "Slows", graphHint: "falling" },
    {
      id: "continues_constant_velocity",
      label: "Continues at constant velocity",
      compactLabel: "Keeps its velocity",
      graphHint: "constant",
    },
    { id: "speeds_up", label: "Speeds up", compactLabel: "Speeds up", graphHint: "rising" },
  ] satisfies PredictionChoice[],
};

export const TRANSFER = {
  id: "cargo_pod_force_graph" as const,
  title: "New cargo pod. Explain and prove.",
  setup: "The force-time graph shows a brief forward thrust followed by zero net force.",
  prompt: "Which velocity-time graph matches the pod after the thrust switches off?",
  choices: [
    {
      id: "returns_to_zero" as TransferChoiceId,
      label: "Velocity returns to zero",
      description: "The graph slopes down after the force ends.",
    },
    {
      id: "stays_constant_after_force" as TransferChoiceId,
      label: "Velocity stays constant",
      description: "The graph rises during the thrust, then becomes flat above zero.",
    },
    {
      id: "keeps_accelerating" as TransferChoiceId,
      label: "Velocity keeps increasing",
      description: "The graph keeps sloping upward after the force ends.",
    },
  ],
  correctChoiceId: "stays_constant_after_force" as TransferChoiceId,
};
