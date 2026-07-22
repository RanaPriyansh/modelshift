import fixture from "../tests/fixtures/lesson-draft-response.json";
import { describe, expect, it } from "vitest";

import {
  LESSON_STUDIO_LIVE_EVAL_OPT_IN,
  resolveLessonStudioLiveEvalConfig,
  runLessonStudioLiveEval,
} from "./lesson-studio-live-eval-core";
import { lessonDraftSchema } from "../src/lib/lesson-studio/schema";

const draft = lessonDraftSchema.parse(fixture.draft);

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

  it("emits a redacted report when a caller explicitly supplies a gated runner", async () => {
    const config = resolveLessonStudioLiveEvalConfig({
      FORGE_LESSON_STUDIO_LIVE_EVALS: LESSON_STUDIO_LIVE_EVAL_OPT_IN,
      FORGE_LESSON_STUDIO_LIVE_EVAL_PROVIDER: "openai",
      FORGE_LESSON_STUDIO_LIVE_EVAL_API_KEY: "live-key-not-for-output-123",
    });
    if (!config.enabled) throw new Error("expected explicit test config");
    const report = await runLessonStudioLiveEval(config, async () => ({
      draft,
      model: "gpt-5.6-sol",
      keyHandling: "request_only",
      estimatedCostMicros: 80_000,
      outputTokenBudget: 2_400,
    }), (() => { let value = 0; return () => (value += 200); })());
    expect(report).toMatchObject({ status: "COMPLETED", provider: "openai", model: "gpt-5.6-sol" });
    expect(JSON.stringify(report)).not.toContain("live-key-not-for-output-123");
    expect(JSON.stringify(report)).not.toContain("What can a historical photograph prove?");
  });
});
