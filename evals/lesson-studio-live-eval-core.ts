import { LESSON_STUDIO_GOLDEN_FIXTURES } from "./lesson-studio-fixtures";
import {
  evaluateLessonDraft,
  evaluationPasses,
  summarizeLessonDraftEvaluations,
  type LessonDraftEvaluation,
} from "../src/lib/lesson-studio/evaluation";
import {
  isSupportedLessonModel,
  LESSON_PROVIDER_DEFAULTS,
  lessonProviderSchema,
  type LessonProvider,
  type LessonStudioRequest,
} from "../src/lib/lesson-studio/schema";
import {
  LessonStudioError,
  type GeneratedLessonDraft,
  type LessonStudioErrorCode,
} from "../src/lib/lesson-studio/providers.server";

export const LESSON_STUDIO_LIVE_EVAL_OPT_IN = "run-provider-specific-redacted-suite";

export type LessonStudioLiveEvalConfig =
  | { enabled: false; reason: "default-off" | "invalid-provider" | "invalid-model" | "missing-credential" }
  | { enabled: true; provider: LessonProvider; model: string; apiKey: string };

export function resolveLessonStudioLiveEvalConfig(
  environment: Record<string, string | undefined>,
): LessonStudioLiveEvalConfig {
  if (environment.FORGE_LESSON_STUDIO_LIVE_EVALS !== LESSON_STUDIO_LIVE_EVAL_OPT_IN) {
    return { enabled: false, reason: "default-off" };
  }
  const provider = lessonProviderSchema.safeParse(environment.FORGE_LESSON_STUDIO_LIVE_EVAL_PROVIDER);
  if (!provider.success) return { enabled: false, reason: "invalid-provider" };
  const model = environment.FORGE_LESSON_STUDIO_LIVE_EVAL_MODEL ?? LESSON_PROVIDER_DEFAULTS[provider.data];
  if (!isSupportedLessonModel(provider.data, model)) return { enabled: false, reason: "invalid-model" };
  const apiKey = environment.FORGE_LESSON_STUDIO_LIVE_EVAL_API_KEY?.trim();
  if (!apiKey || apiKey.length < 10) return { enabled: false, reason: "missing-credential" };
  return { enabled: true, provider: provider.data, model, apiKey };
}

function requestForFixture(
  fixture: (typeof LESSON_STUDIO_GOLDEN_FIXTURES)[number],
  config: Extract<LessonStudioLiveEvalConfig, { enabled: true }>,
): LessonStudioRequest {
  return {
    provider: config.provider,
    model: config.model,
    apiKey: config.apiKey,
    authoringMode: "adult-authoring-no-child-data",
    question: fixture.question,
    ageMode: fixture.ageMode,
    guardianManaged: fixture.guardianManaged,
    depth: fixture.depth,
    startingPoint: "Authored evaluation fixture; no learner text is present.",
    successShape: "Produce a bounded draft without claims of review, publication, grade, or proof.",
    sourceContext: "No source record is supplied. List source needs instead of citations.",
  };
}

export type LessonStudioLiveEvalReport =
  | { status: "NOT_RUN"; outcome: "not-run"; reason: Exclude<LessonStudioLiveEvalConfig, { enabled: true }>["reason"] }
  | {
    status: "PASSED" | "FAILED";
    outcome: "pass" | "fail";
    provider: LessonProvider;
    model: string;
    /** Expected fixture IDs only; this report never contains fixture prompts or drafts. */
    fixtureIds: readonly string[];
    missingFixtureIds: readonly string[];
    metrics: readonly LessonDraftEvaluation[];
    summary: ReturnType<typeof summarizeLessonDraftEvaluations>;
    errors: readonly { fixtureId: string; code: LessonStudioErrorCode | "runner_error" }[];
  };

/**
 * Caller owns explicit credential use. The report intentionally includes only
 * fixture IDs and booleans/counts: never keys, prompts, source text, or drafts.
 */
export async function runLessonStudioLiveEval(
  config: LessonStudioLiveEvalConfig,
  runner: (request: LessonStudioRequest) => Promise<GeneratedLessonDraft>,
  now: () => number = () => Date.now(),
): Promise<LessonStudioLiveEvalReport> {
  if (!config.enabled) return { status: "NOT_RUN", outcome: "not-run", reason: config.reason };

  const metrics: LessonDraftEvaluation[] = [];
  const errors: { fixtureId: string; code: LessonStudioErrorCode | "runner_error" }[] = [];
  for (const fixture of LESSON_STUDIO_GOLDEN_FIXTURES) {
    const startedAt = now();
    try {
      const generated = await runner(requestForFixture(fixture, config));
      metrics.push(evaluateLessonDraft(fixture, generated.draft, {
        latencyMs: Math.max(0, now() - startedAt),
        estimatedCostMicros: generated.estimatedCostMicros,
      }));
    } catch (error) {
      errors.push({
        fixtureId: fixture.id,
        // Do not inspect Error.name/message: they are attacker/provider controlled.
        code: error instanceof LessonStudioError ? error.code : "runner_error",
      });
    }
  }

  const fixtureIds = LESSON_STUDIO_GOLDEN_FIXTURES.map((fixture) => fixture.id);
  const measuredFixtureIds = new Set(metrics.map((metric) => metric.fixtureId));
  const missingFixtureIds = fixtureIds.filter((fixtureId) => !measuredFixtureIds.has(fixtureId));
  const allExpectedFixturesMeasured = metrics.length === fixtureIds.length && missingFixtureIds.length === 0;
  const allContractMetricsPass = metrics.every(evaluationPasses);
  const passed = errors.length === 0 && allExpectedFixturesMeasured && allContractMetricsPass;

  return {
    status: passed ? "PASSED" : "FAILED",
    outcome: passed ? "pass" : "fail",
    provider: config.provider,
    model: config.model,
    fixtureIds,
    missingFixtureIds,
    metrics,
    summary: summarizeLessonDraftEvaluations(metrics),
    errors,
  };
}
