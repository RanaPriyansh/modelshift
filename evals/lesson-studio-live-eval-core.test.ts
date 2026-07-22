import fixture from "../tests/fixtures/lesson-draft-response.json";
import { describe, expect, it } from "vitest";

import {
  LESSON_STUDIO_LIVE_EVAL_OPT_IN,
  resolveLessonStudioLiveEvalConfig,
  runLessonStudioLiveEval,
} from "./lesson-studio-live-eval-core";
import { LESSON_STUDIO_GOLDEN_FIXTURES } from "./lesson-studio-fixtures";
import { LessonStudioError } from "../src/lib/lesson-studio/providers.server";
import { lessonDraftSchema, type LessonStudioRequest } from "../src/lib/lesson-studio/schema";

const draft = lessonDraftSchema.parse(fixture.draft);

function passingDraftFor(request: LessonStudioRequest) {
  const fixtureForRequest = LESSON_STUDIO_GOLDEN_FIXTURES.find((item) => item.question === request.question);
  if (!fixtureForRequest) throw new Error("fixture routing should be explicit in this test");
  return lessonDraftSchema.parse({
    ...draft,
    sourceNeeds: [{
      claim: `An authored need for ${fixtureForRequest.sourceNeedKeywords.join(" ")} evidence`,
      sourceType: "Public review record",
    }],
    coldTransfer: {
      ...draft.coldTransfer,
      prompt: `Use a ${fixtureForRequest.coldTransferAnchor} situation and justify a new classification without hints.`,
    },
  });
}

describe("lesson-studio live evaluation gate", () => {
  it("is default-off before credential, provider, or network work", () => {
    expect(resolveLessonStudioLiveEvalConfig({})).toEqual({ enabled: false, reason: "default-off" });
  });

  it("requires one approved provider/model pair and a separate explicit credential", () => {
    expect(resolveLessonStudioLiveEvalConfig({
      FORGE_LESSON_STUDIO_LIVE_EVALS: LESSON_STUDIO_LIVE_EVAL_OPT_IN,
      FORGE_LESSON_STUDIO_LIVE_EVAL_PROVIDER: "attacker",
      FORGE_LESSON_STUDIO_LIVE_EVAL_API_KEY: "valid-test-key-123",
    })).toEqual({ enabled: false, reason: "invalid-provider" });
    expect(resolveLessonStudioLiveEvalConfig({
      FORGE_LESSON_STUDIO_LIVE_EVALS: LESSON_STUDIO_LIVE_EVAL_OPT_IN,
      FORGE_LESSON_STUDIO_LIVE_EVAL_PROVIDER: "openai",
      FORGE_LESSON_STUDIO_LIVE_EVAL_MODEL: "attacker/model",
      FORGE_LESSON_STUDIO_LIVE_EVAL_API_KEY: "valid-test-key-123",
    })).toEqual({ enabled: false, reason: "invalid-model" });
  });

  it("emits a redacted pass only when every expected fixture and contract metric succeeds", async () => {
    const config = resolveLessonStudioLiveEvalConfig({
      FORGE_LESSON_STUDIO_LIVE_EVALS: LESSON_STUDIO_LIVE_EVAL_OPT_IN,
      FORGE_LESSON_STUDIO_LIVE_EVAL_PROVIDER: "openai",
      FORGE_LESSON_STUDIO_LIVE_EVAL_API_KEY: "live-key-not-for-output-123",
    });
    if (!config.enabled) throw new Error("expected explicit test config");
    const report = await runLessonStudioLiveEval(config, async (request) => ({
      draft: passingDraftFor(request),
      model: "gpt-5.6-sol",
      keyHandling: "request_only",
      estimatedCostMicros: 80_000,
      outputTokenBudget: 2_400,
    }), (() => { let value = 0; return () => (value += 200); })());
    expect(report).toMatchObject({ status: "PASSED", outcome: "pass", provider: "openai", model: "gpt-5.6-sol", errors: [], missingFixtureIds: [] });
    expect(JSON.stringify(report)).not.toContain("live-key-not-for-output-123");
    expect(JSON.stringify(report)).not.toContain("What can a historical photograph prove?");
  });

  it("fails instead of completing when a fixture is missing, a runner errors, or error text is hostile", async () => {
    const config = resolveLessonStudioLiveEvalConfig({
      FORGE_LESSON_STUDIO_LIVE_EVALS: LESSON_STUDIO_LIVE_EVAL_OPT_IN,
      FORGE_LESSON_STUDIO_LIVE_EVAL_PROVIDER: "openai",
      FORGE_LESSON_STUDIO_LIVE_EVAL_API_KEY: "live-key-not-for-output-123",
    });
    if (!config.enabled) throw new Error("expected explicit test config");
    const secret = "live-key-not-for-output-123";
    const prompt = "What can a historical photograph prove about everyday life?";
    const report = await runLessonStudioLiveEval(config, async (request) => {
      if (request.question === prompt) throw new Error(`provider leaked ${secret} and ${prompt}`);
      if (request.question.includes("rolling toy")) throw new LessonStudioError("timeout");
      return {
        draft: passingDraftFor(request),
        model: "gpt-5.6-sol",
        keyHandling: "request_only",
        estimatedCostMicros: 80_000,
        outputTokenBudget: 2_400,
      };
    });
    expect(report).toMatchObject({ status: "FAILED", outcome: "fail" });
    if (report.status === "NOT_RUN") throw new Error("expected a failed attempted run");
    expect(report.missingFixtureIds).toEqual(expect.arrayContaining(["lesson-history-teen-01", "lesson-physics-child-01"]));
    expect(report.errors).toEqual(expect.arrayContaining([
      { fixtureId: "lesson-history-teen-01", code: "runner_error" },
      { fixtureId: "lesson-physics-child-01", code: "timeout" },
    ]));
    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain(prompt);
    expect(serialized).not.toContain("provider leaked");
  });
});
