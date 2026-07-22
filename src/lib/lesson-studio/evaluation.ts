import type { LessonStudioGoldenFixture } from "@/evals/lesson-studio-fixtures";

import { LESSON_STUDIO_BUDGETS, type LessonDraft } from "./schema";

export type LessonDraftEvaluation = {
  fixtureId: string;
  interpretations: boolean;
  disagreement: boolean;
  separatingTest: boolean;
  sourceNeedCompleteness: boolean;
  answerLeakageAbsent: boolean;
  coldTransferValidity: boolean;
  safety: boolean;
  latencyWithinBudget: boolean;
  costWithinBudget: boolean;
};

function normalized(value: string): string {
  return value.toLocaleLowerCase().replace(/\s+/g, " ").trim();
}

function containsEvery(text: string, tokens: readonly string[]): boolean {
  const normalizedText = normalized(text);
  return tokens.every((token) => normalizedText.includes(normalized(token)));
}

/**
 * This measures declared draft-contract behavior, not factual truth, learning,
 * retention, or educational efficacy. Human review remains the truth boundary.
 */
export function evaluateLessonDraft(
  fixture: LessonStudioGoldenFixture,
  draft: LessonDraft,
  telemetry: { latencyMs: number; estimatedCostMicros: number },
): LessonDraftEvaluation {
  const readings = draft.plausibleReadings;
  const sourceText = draft.sourceNeeds.map((need) => `${need.claim} ${need.sourceType}`).join(" ");
  const coldTransfer = normalized(draft.coldTransfer.prompt);
  const budget = LESSON_STUDIO_BUDGETS[fixture.depth];

  return {
    fixtureId: fixture.id,
    interpretations: readings.length === 2 && readings.every((reading) => reading.label.trim().length > 0 && reading.prediction.trim().length > 0),
    disagreement: readings.length === 2 && normalized(readings[0].prediction) !== normalized(readings[1].prediction),
    separatingTest: draft.separatingTest.setup.trim().length >= 15 && draft.separatingTest.whyItSeparates.trim().length >= 15,
    sourceNeedCompleteness: containsEvery(sourceText, fixture.sourceNeedKeywords),
    answerLeakageAbsent: fixture.forbiddenColdTransferFragments.every((fragment) => !coldTransfer.includes(normalized(fragment))),
    coldTransferValidity: coldTransfer.includes(normalized(fixture.coldTransferAnchor)) && !coldTransfer.includes("hint:"),
    safety: fixture.ageMode !== "child" || fixture.guardianManaged
      ? !normalized([...draft.safetyNotes, ...draft.draftLimitations].join(" ")).includes("unsupervised open-web")
      : false,
    latencyWithinBudget: telemetry.latencyMs >= 0 && telemetry.latencyMs <= budget.timeoutMs,
    costWithinBudget: telemetry.estimatedCostMicros >= 0 && telemetry.estimatedCostMicros <= budget.maxEstimatedCostMicros,
  };
}

export function evaluationPasses(result: LessonDraftEvaluation): boolean {
  return Object.entries(result)
    .filter(([key]) => key !== "fixtureId")
    .every(([, value]) => value === true);
}

export function summarizeLessonDraftEvaluations(results: readonly LessonDraftEvaluation[]) {
  const metrics = [
    "interpretations",
    "disagreement",
    "separatingTest",
    "sourceNeedCompleteness",
    "answerLeakageAbsent",
    "coldTransferValidity",
    "safety",
    "latencyWithinBudget",
    "costWithinBudget",
  ] as const;
  return Object.fromEntries(metrics.map((metric) => [
    metric,
    { passed: results.filter((result) => result[metric]).length, total: results.length },
  ]));
}
