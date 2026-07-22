import { z } from "zod";

z.config({ jitless: true });

export const lessonProviderSchema = z.enum(["openai", "anthropic", "gemini", "openrouter"]);
export type LessonProvider = z.infer<typeof lessonProviderSchema>;

type LessonProviderCapability = {
  readonly label: string;
  readonly defaultModel: string;
  readonly models: readonly {
    readonly id: string;
    /** Conservative policy ceiling, expressed in microdollars per million tokens. */
    readonly inputMicrosPerMillionTokens: number;
    readonly outputMicrosPerMillionTokens: number;
  }[];
  readonly structuredOutput: "responses-zod" | "json-schema";
  readonly requestOnlyKey: true;
};

/**
 * This is a deliberate policy allowlist, not provider discovery. Provider model
 * catalogs can change without silently gaining authority in an authoring flow.
 */
export const LESSON_PROVIDER_CAPABILITIES = {
  openai: {
    label: "OpenAI",
    defaultModel: "gpt-5.6-sol",
    models: [
      { id: "gpt-5.6-sol", inputMicrosPerMillionTokens: 5_000_000, outputMicrosPerMillionTokens: 30_000_000 },
      { id: "gpt-5.6-terra", inputMicrosPerMillionTokens: 2_500_000, outputMicrosPerMillionTokens: 15_000_000 },
      { id: "gpt-5.6-luna", inputMicrosPerMillionTokens: 1_000_000, outputMicrosPerMillionTokens: 6_000_000 },
    ],
    structuredOutput: "responses-zod",
    requestOnlyKey: true,
  },
  anthropic: {
    label: "Anthropic",
    defaultModel: "claude-sonnet-5",
    models: [
      { id: "claude-sonnet-5", inputMicrosPerMillionTokens: 3_000_000, outputMicrosPerMillionTokens: 15_000_000 },
    ],
    structuredOutput: "json-schema",
    requestOnlyKey: true,
  },
  gemini: {
    label: "Google Gemini",
    defaultModel: "gemini-3.6-flash",
    models: [
      { id: "gemini-3.6-flash", inputMicrosPerMillionTokens: 1_500_000, outputMicrosPerMillionTokens: 7_500_000 },
    ],
    structuredOutput: "json-schema",
    requestOnlyKey: true,
  },
  openrouter: {
    label: "OpenRouter",
    defaultModel: "openai/gpt-5.6-sol",
    models: [
      // OpenRouter pricing/routing can vary. This ceiling intentionally exceeds
      // the direct provider price so a request remains bounded before dispatch.
      { id: "openai/gpt-5.6-sol", inputMicrosPerMillionTokens: 6_000_000, outputMicrosPerMillionTokens: 36_000_000 },
    ],
    structuredOutput: "json-schema",
    requestOnlyKey: true,
  },
} as const satisfies Readonly<Record<LessonProvider, LessonProviderCapability>>;

export const LESSON_PROVIDER_DEFAULTS: Readonly<Record<LessonProvider, string>> = {
  openai: LESSON_PROVIDER_CAPABILITIES.openai.defaultModel,
  anthropic: LESSON_PROVIDER_CAPABILITIES.anthropic.defaultModel,
  gemini: LESSON_PROVIDER_CAPABILITIES.gemini.defaultModel,
  openrouter: LESSON_PROVIDER_CAPABILITIES.openrouter.defaultModel,
};

export function isSupportedLessonModel(provider: LessonProvider, model: string): boolean {
  return LESSON_PROVIDER_CAPABILITIES[provider].models.some((candidate) => candidate.id === model);
}

export function lessonModelCapability(provider: LessonProvider, model: string) {
  return LESSON_PROVIDER_CAPABILITIES[provider].models.find((candidate) => candidate.id === model) ?? null;
}

export const LESSON_STUDIO_BUDGETS = {
  quick: { timeoutMs: 15_000, maxOutputTokens: 1_200, maxEstimatedCostMicros: 80_000 },
  standard: { timeoutMs: 25_000, maxOutputTokens: 2_400, maxEstimatedCostMicros: 140_000 },
  deep: { timeoutMs: 30_000, maxOutputTokens: 3_600, maxEstimatedCostMicros: 190_000 },
} as const;

export type LessonStudioBudget = (typeof LESSON_STUDIO_BUDGETS)[keyof typeof LESSON_STUDIO_BUDGETS];

const lessonStudioRequestBaseSchema = z.strictObject({
  provider: lessonProviderSchema,
  model: z.string().trim().min(1).max(120).regex(/^[A-Za-z0-9._:/-]+$/),
  /** A request-only key is cleared by the caller and is never eligible for server fallback. */
  apiKey: z.string().trim().min(10).max(512).optional(),
  /** This is an authoring declaration, not identity, age, guardian, or consent authority. */
  authoringMode: z.literal("adult-authoring-no-child-data"),
  question: z.string().trim().min(3).max(300),
  /** Target audience metadata only; it is never the author or learner's verified age. */
  ageMode: z.enum(["child", "teen", "adult"]),
  guardianManaged: z.boolean(),
  depth: z.enum(["quick", "standard", "deep"]),
  startingPoint: z.string().trim().max(300),
  successShape: z.string().trim().max(300),
  sourceContext: z.string().trim().max(3_000),
});

export const lessonStudioRequestSchema = lessonStudioRequestBaseSchema.superRefine((value, context) => {
  if (!isSupportedLessonModel(value.provider, value.model)) {
    context.addIssue({
      code: "custom",
      path: ["model"],
      message: "The selected model is not approved for this fixed provider adapter.",
    });
  }
  if (value.ageMode === "child" && !value.guardianManaged) {
    context.addIssue({
      code: "custom",
      path: ["guardianManaged"],
      message: "Child-targeted drafts must declare grown-up-managed use.",
    });
  }
});

export type LessonStudioRequest = z.infer<typeof lessonStudioRequestSchema>;

export function estimateLessonRequestCostMicros(request: LessonStudioRequest): number {
  const model = lessonModelCapability(request.provider, request.model);
  if (!model) return Number.POSITIVE_INFINITY;
  const estimatedInputTokens = Math.ceil(
    (1_600 + request.question.length + request.startingPoint.length + request.successShape.length + request.sourceContext.length) / 4,
  );
  const budget = LESSON_STUDIO_BUDGETS[request.depth];
  return Math.ceil(
    (estimatedInputTokens * model.inputMicrosPerMillionTokens + budget.maxOutputTokens * model.outputMicrosPerMillionTokens) / 1_000_000,
  );
}

const plausibleReadingSchema = z.strictObject({
  label: z.string().min(2).max(80),
  prediction: z.string().min(8).max(280),
});

const explanationSectionSchema = z.strictObject({
  heading: z.string().min(2).max(100),
  explanation: z.string().min(20).max(1_200),
  checkQuestion: z.string().min(8).max(240),
});

const sourceNeedSchema = z.strictObject({
  claim: z.string().min(8).max(320),
  sourceType: z.string().min(3).max(160),
});

export const lessonDraftSchema = z.strictObject({
  schemaVersion: z.literal("1.0"),
  title: z.string().min(3).max(100),
  learnerGoal: z.string().min(10).max(240),
  phenomenon: z.strictObject({
    opening: z.string().min(15).max(500),
    question: z.string().min(5).max(240),
  }),
  commitmentPrompt: z.string().min(8).max(240),
  plausibleReadings: z.array(plausibleReadingSchema).min(2).max(2),
  separatingTest: z.strictObject({
    setup: z.string().min(15).max(700),
    whyItSeparates: z.string().min(15).max(500),
  }),
  explanationSections: z.array(explanationSectionSchema).min(2).max(5),
  reconstructionPrompt: z.string().min(8).max(260),
  coldTransfer: z.strictObject({
    prompt: z.string().min(15).max(500),
    successEvidence: z.string().min(15).max(360),
    remainsUntested: z.string().min(15).max(360),
  }),
  /** These are unresolved review requirements, never source records or citations. */
  sourceNeeds: z.array(sourceNeedSchema).min(1).max(6),
  safetyNotes: z.array(z.string().min(5).max(240)).min(1).max(5),
  draftLimitations: z.array(z.string().min(5).max(260)).min(2).max(5),
});

export type LessonDraft = z.infer<typeof lessonDraftSchema>;

export const immutableVersionRefSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);
export type ImmutableVersionRef = z.infer<typeof immutableVersionRefSchema>;

const lessonCritiqueSchema = z.strictObject({
  versionRef: immutableVersionRefSchema,
  status: z.literal("needs-human-review"),
  findings: z.array(z.strictObject({
    id: z.string().regex(/^critique\.[a-z0-9-]+$/),
    category: z.enum(["factual", "pedagogy", "access", "proof", "safety"]),
    message: z.string().min(10).max(320),
  })).min(1).max(12),
});

const lessonSourcePlanSchema = z.strictObject({
  versionRef: immutableVersionRefSchema,
  status: z.literal("source-needed"),
  items: z.array(z.strictObject({
    id: z.string().regex(/^source-need-[a-f0-9]{12}$/),
    claim: z.string().min(8).max(320),
    requiredSourceType: z.string().min(3).max(160),
    disposition: z.literal("unresolved"),
  })).min(1).max(6),
});

export const lessonDraftPipelineSchema = z.strictObject({
  generation: z.strictObject({
    versionRef: immutableVersionRefSchema,
    draft: lessonDraftSchema,
  }),
  critique: lessonCritiqueSchema,
  sourcePlan: lessonSourcePlanSchema,
  revision: z.strictObject({
    versionRef: immutableVersionRefSchema,
    basedOnDraftVersionRef: immutableVersionRefSchema,
    status: z.literal("unreviewed"),
    appliedCritiqueIds: z.array(z.string().regex(/^critique\.[a-z0-9-]+$/)).max(12),
    draft: lessonDraftSchema,
  }),
});

export type LessonDraftPipeline = z.infer<typeof lessonDraftPipelineSchema>;

export const lessonStudioResponseSchema = z.strictObject({
  schemaVersion: z.literal("1.0"),
  draft: lessonDraftSchema,
  pipeline: lessonDraftPipelineSchema,
  provenance: z.strictObject({
    provider: lessonProviderSchema,
    model: z.string().min(1).max(120),
    generatedAt: z.string().datetime({ offset: true }),
    correlationId: z.string().uuid(),
    sourceStatus: z.literal("unverified_draft"),
    keyHandling: z.literal("request_only"),
    budget: z.strictObject({
      timeoutMs: z.number().int().positive(),
      maxOutputTokens: z.number().int().positive(),
      maxEstimatedCostMicros: z.number().int().positive(),
      estimatedCostMicros: z.number().int().nonnegative(),
    }),
  }),
  claimBoundary: z.literal(
    "AI-generated draft. Not a reviewed World, verified source record, grade, or proof of learning.",
  ),
});

export type LessonStudioResponse = z.infer<typeof lessonStudioResponseSchema>;
