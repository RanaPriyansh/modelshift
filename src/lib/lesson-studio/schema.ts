import { z } from "zod";

z.config({ jitless: true });

export const lessonProviderSchema = z.enum(["openai", "anthropic", "gemini", "openrouter"]);
export type LessonProvider = z.infer<typeof lessonProviderSchema>;

export const lessonStudioRequestSchema = z.strictObject({
  provider: lessonProviderSchema,
  model: z.string().trim().min(1).max(120).regex(/^[A-Za-z0-9._:/-]+$/),
  apiKey: z.string().trim().min(10).max(512).optional(),
  question: z.string().trim().min(3).max(300),
  ageMode: z.enum(["child", "teen", "adult"]),
  guardianManaged: z.boolean(),
  depth: z.enum(["quick", "standard", "deep"]),
  startingPoint: z.string().trim().max(300),
  successShape: z.string().trim().max(300),
  sourceContext: z.string().trim().max(3_000),
  safetyIdentifier: z.string().uuid().optional(),
});

export type LessonStudioRequest = z.infer<typeof lessonStudioRequestSchema>;

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
  sourceNeeds: z.array(sourceNeedSchema).min(1).max(6),
  safetyNotes: z.array(z.string().min(5).max(240)).min(1).max(5),
  draftLimitations: z.array(z.string().min(5).max(260)).min(2).max(5),
});

export type LessonDraft = z.infer<typeof lessonDraftSchema>;

export const lessonStudioResponseSchema = z.strictObject({
  schemaVersion: z.literal("1.0"),
  draft: lessonDraftSchema,
  provenance: z.strictObject({
    provider: lessonProviderSchema,
    model: z.string().min(1).max(120),
    generatedAt: z.string().datetime({ offset: true }),
    sourceStatus: z.literal("unverified_draft"),
    keyHandling: z.enum(["request_only", "deployment_managed"]),
  }),
  claimBoundary: z.literal(
    "AI-generated draft. Not a reviewed World, verified source record, grade, or proof of learning.",
  ),
});

export type LessonStudioResponse = z.infer<typeof lessonStudioResponseSchema>;

export const LESSON_PROVIDER_DEFAULTS: Readonly<Record<LessonProvider, string>> = {
  openai: "gpt-5.6-sol",
  anthropic: "claude-sonnet-5",
  gemini: "gemini-3.6-flash",
  openrouter: "openai/gpt-5.6-sol",
};
