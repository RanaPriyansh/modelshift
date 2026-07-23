import { z } from "zod";

import { deepFreeze } from "./deep-freeze";
import { forgeEventDigestSchema } from "./events";

z.config({ jitless: true });

export const LOCAL_LEARNING_INTENT_CAPTURE_SCHEMA_VERSION = "local-learning-intent-capture.v1" as const;
export const LEARNING_INTENT_SCHEMA_VERSION = "learning-intent.v1" as const;

export const LEARNING_INTENT_ACCEPTED_USES = ["internal-map", "model-proposal", "external-discovery"] as const;
export const LEARNING_INTENT_ROUTE_PREFERENCES = [
  "overview",
  "demonstration",
  "text",
  "worked_example",
  "simulation",
  "practice",
  "project",
  "human",
] as const;
export const LEARNING_INTENT_ACCESS_TOKENS = [
  "captions",
  "transcript",
  "audio-description",
  "screen-reader",
  "keyboard-only",
  "reduced-motion",
  "low-vision",
  "low-bandwidth",
  "print-route",
] as const;

const timestampSchema = z.string().datetime({ offset: true });
const identifierSchema = z.string().trim().min(1).max(160).regex(/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/);
const intentIdSchema = z.string().trim().max(160).regex(/^learning-intent\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const receiptIdSchema = z.string().trim().max(160).regex(/^intent-receipt\.[a-z0-9]+(?:[.-][a-z0-9]+)*$/);

function unique<T extends z.ZodTypeAny>(item: T, minimum: number, maximum: number) {
  return z.array(item).min(minimum).max(maximum).superRefine((entries, context) => {
    const seen = new Set<unknown>();
    entries.forEach((entry, index) => {
      if (seen.has(entry)) context.addIssue({ code: "custom", path: [index], message: `Duplicate value: ${String(entry)}` });
      seen.add(entry);
    });
  });
}

/**
 * Raw learner language has intentionally separate storage semantics. No map,
 * model, discovery, reviewer, analytics, or export contract imports this type.
 */
export const localLearningIntentCaptureSchema = z.strictObject({
  schemaVersion: z.literal(LOCAL_LEARNING_INTENT_CAPTURE_SCHEMA_VERSION),
  intentId: intentIdSchema,
  learnerWords: z.string().trim().min(1).max(8_000),
  optionalPrivateNotes: z.string().trim().min(1).max(8_000).optional(),
  storage: z.discriminatedUnion("mode", [
    z.strictObject({ mode: z.literal("ephemeral-session") }),
    z.strictObject({
      mode: z.literal("learner-encrypted-device"),
      electionActionRef: identifierSchema,
      retentionUntil: timestampSchema,
    }),
  ]),
  createdAt: timestampSchema,
});

export type LocalLearningIntentCaptureV1 = z.infer<typeof localLearningIntentCaptureSchema>;

export const learningIntentSchema = z.strictObject({
  schemaVersion: z.literal(LEARNING_INTENT_SCHEMA_VERSION),
  intentId: intentIdSchema,
  sanitizedIntentDigest: forgeEventDigestSchema,
  intentSummary: z.string().trim().min(1).max(1_200),
  sanitizationPolicyRef: z.strictObject({
    id: identifierSchema,
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    digest: forgeEventDigestSchema,
  }),
  learnerPreviewReceipt: z.strictObject({
    receiptId: receiptIdSchema,
    acceptedDigest: forgeEventDigestSchema,
    acceptedUses: unique(z.enum(LEARNING_INTENT_ACCEPTED_USES), 1, LEARNING_INTENT_ACCEPTED_USES.length),
    acceptedAt: timestampSchema,
  }).superRefine((receipt, context) => {
    if (receipt.acceptedUses.includes("external-discovery") && !receipt.acceptedUses.includes("internal-map")) {
      context.addIssue({ code: "custom", path: ["acceptedUses"], message: "External discovery requires accepting the internal map use first." });
    }
  }),
  desiredAction: z.string().trim().min(1).max(1_200),
  practicalOutcome: z.string().trim().min(1).max(1_200).optional(),
  priorExperience: z.enum(["new", "some", "experienced", "unspecified"]).optional(),
  depth: z.enum(["orient", "working", "deep", "frontier"]),
  timeBudget: z.strictObject({
    minutesPerSession: z.number().int().min(1).max(1_440).optional(),
    sessions: z.number().int().min(1).max(10_000).optional(),
  }).optional(),
  routePreferences: unique(z.enum(LEARNING_INTENT_ROUTE_PREFERENCES), 1, LEARNING_INTENT_ROUTE_PREFERENCES.length),
  constraints: z.strictObject({
    /** Presentation only. It is never an entitlement or verified age assertion. */
    audience: z.literal("adult"),
    language: z.string().trim().min(2).max(32).regex(/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/),
    bandwidth: z.enum(["low", "standard"]).optional(),
    device: z.enum(["phone", "tablet", "desktop", "print"]).optional(),
    materialClasses: unique(z.enum(["none", "paper", "common-household", "computer", "specialist-reviewed", "unknown"]), 0, 6).optional(),
    accessTokens: unique(z.enum(LEARNING_INTENT_ACCESS_TOKENS), 0, LEARNING_INTENT_ACCESS_TOKENS.length).optional(),
  }),
  createdAt: timestampSchema,
}).superRefine((intent, context) => {
  if (intent.learnerPreviewReceipt.acceptedDigest !== intent.sanitizedIntentDigest) {
    context.addIssue({ code: "custom", path: ["learnerPreviewReceipt", "acceptedDigest"], message: "The learner receipt must accept this exact sanitized digest." });
  }
});

export type LearningIntentV1 = z.infer<typeof learningIntentSchema>;

/** Strict parse plus deep immutability for safe hand-off into pure compilers. */
export function parseLocalLearningIntentCapture(value: unknown): Readonly<LocalLearningIntentCaptureV1> {
  return deepFreeze(localLearningIntentCaptureSchema.parse(value));
}

/**
 * Parses only the approved, sanitized envelope. Callers must keep the raw
 * capture separate; this function has no parameter through which raw text can
 * accidentally flow into a map, model proposal, or discovery request.
 */
export function parseLearningIntent(value: unknown): Readonly<LearningIntentV1> {
  return deepFreeze(learningIntentSchema.parse(value));
}
