import fixture from "../../../tests/fixtures/lesson-draft-response.json";
import { describe, expect, it } from "vitest";

import { LESSON_STUDIO_GOLDEN_FIXTURES } from "@/evals/lesson-studio-fixtures";

import {
  evaluateLessonDraft,
  evaluationPasses,
  summarizeLessonDraftEvaluations,
} from "./evaluation";
import { lessonDraftSchema } from "./schema";

const historicalFixture = LESSON_STUDIO_GOLDEN_FIXTURES[0];
const draft = lessonDraftSchema.parse(fixture.draft);

describe("lesson-studio offline evaluation contract", () => {
  it("contains authored fixtures across domains and target ages", () => {
    expect(new Set(LESSON_STUDIO_GOLDEN_FIXTURES.map((item) => item.domain))).toEqual(
      new Set(["history", "physics", "mathematics", "health"]),
    );
    expect(new Set(LESSON_STUDIO_GOLDEN_FIXTURES.map((item) => item.ageMode))).toEqual(
      new Set(["child", "teen", "adult"]),
    );
  });

  it("measures draft-contract metrics without treating them as truth or proof grading", () => {
    const result = evaluateLessonDraft(historicalFixture, draft, { latencyMs: 2_100, estimatedCostMicros: 80_000 });
    expect(evaluationPasses(result)).toBe(true);
    expect(summarizeLessonDraftEvaluations([result])).toMatchObject({
      interpretations: { passed: 1, total: 1 },
      answerLeakageAbsent: { passed: 1, total: 1 },
      costWithinBudget: { passed: 1, total: 1 },
    });
  });

  it("flags answer leakage, missing source needs, and budget failures independently", () => {
    const leakyDraft = lessonDraftSchema.parse({
      ...draft,
      coldTransfer: { ...draft.coldTransfer, prompt: "On this unfamiliar photograph, observation, catalog fact, inference is the answer." },
      sourceNeeds: [{ claim: "A broad claim", sourceType: "Unspecified document" }],
    });
    const result = evaluateLessonDraft(historicalFixture, leakyDraft, { latencyMs: 30_001, estimatedCostMicros: 140_001 });
    expect(result.answerLeakageAbsent).toBe(false);
    expect(result.sourceNeedCompleteness).toBe(false);
    expect(result.latencyWithinBudget).toBe(false);
    expect(result.costWithinBudget).toBe(false);
  });
});
