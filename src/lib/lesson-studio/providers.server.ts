import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import { buildLessonStudioInput, LESSON_STUDIO_INSTRUCTIONS } from "./prompt";
import {
  estimateLessonRequestCostMicros,
  LESSON_STUDIO_BUDGETS,
  lessonDraftSchema,
  type LessonDraft,
  type LessonStudioRequest,
} from "./schema";

type FetchLike = typeof fetch;

export type LessonStudioOpenAIClient = {
  responses: {
    parse: (
      body: Parameters<OpenAI["responses"]["parse"]>[0],
      options?: { signal?: AbortSignal },
    ) => Promise<{
      output_parsed?: unknown;
      output_text?: string;
      /** Responses API output items, including message.content refusal parts. */
      output?: unknown[];
      status?: string;
      incomplete_details?: { reason?: string | null } | null;
    }>;
  };
};

export type GenerateLessonOptions = {
  fetchImpl?: FetchLike;
  openAIClient?: LessonStudioOpenAIClient;
  timeoutMs?: number;
};

export type GeneratedLessonDraft = {
  draft: LessonDraft;
  model: string;
  keyHandling: "request_only";
  estimatedCostMicros: number;
  outputTokenBudget: number;
};

export type LessonStudioErrorCode =
  | "missing_key"
  | "request_budget_exceeded"
  | "provider_refusal"
  | "rate_limited"
  | "timeout"
  | "malformed_provider_output"
  | "provider_error";

export class LessonStudioError extends Error {
  constructor(public readonly code: LessonStudioErrorCode) {
    super(code);
    this.name = "LessonStudioError";
  }
}

function structuredJsonSchema(): Record<string, unknown> {
  const schema = { ...(z.toJSONSchema(lessonDraftSchema) as Record<string, unknown>) };
  delete schema.$schema;
  return schema;
}

function parseDraft(value: unknown): LessonDraft {
  const parsed = lessonDraftSchema.safeParse(value);
  if (!parsed.success) throw new LessonStudioError("malformed_provider_output");
  return parsed.data;
}

function parseJsonText(value: unknown): LessonDraft {
  if (typeof value !== "string") throw new LessonStudioError("malformed_provider_output");
  try {
    return parseDraft(JSON.parse(value));
  } catch (error) {
    if (error instanceof LessonStudioError) throw error;
    throw new LessonStudioError("malformed_provider_output");
  }
}

function errorForHttpStatus(status: number): LessonStudioError {
  if (status === 429) return new LessonStudioError("rate_limited");
  if (status === 408 || status === 504) return new LessonStudioError("timeout");
  return new LessonStudioError("provider_error");
}

async function readProviderJson(response: Response): Promise<unknown> {
  if (!response.ok) throw errorForHttpStatus(response.status);
  try {
    return await response.json();
  } catch {
    throw new LessonStudioError("malformed_provider_output");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The Responses API places refusal parts inside output message.content. Scan
 * only the documented top-level output/message-content shape with hard bounds;
 * never recursively walk arbitrary provider data.
 */
function hasOpenAIRefusal(response: { output?: unknown[] }): boolean {
  if (!Array.isArray(response.output)) return false;
  return response.output.slice(0, 32).some((item) => {
    if (!isRecord(item)) return false;
    if (item.type === "refusal" && typeof item.refusal === "string") return true;
    if (item.type !== "message" || !Array.isArray(item.content)) return false;
    return item.content.slice(0, 64).some((part) => (
      isRecord(part) && part.type === "refusal" && typeof part.refusal === "string"
    ));
  });
}

function isOpenAIOutputBudgetExhausted(response: { status?: string; incomplete_details?: { reason?: string | null } | null }): boolean {
  return response.status === "incomplete"
    && (response.incomplete_details?.reason === "max_output_tokens" || response.incomplete_details?.reason === "max_tokens");
}

function classifyThrownProviderError(error: unknown): LessonStudioError | null {
  if (error instanceof LessonStudioError) return error;
  if (error instanceof Error && error.name === "AbortError") return new LessonStudioError("timeout");
  const status = typeof error === "object" && error !== null && "status" in error ? Number(error.status) : Number.NaN;
  if (Number.isInteger(status)) return errorForHttpStatus(status);
  return null;
}

async function generateWithOpenAI(
  request: LessonStudioRequest,
  apiKey: string,
  signal: AbortSignal,
  maxOutputTokens: number,
  clientOverride?: LessonStudioOpenAIClient,
): Promise<LessonDraft> {
  const client = clientOverride ?? new OpenAI({ apiKey });
  try {
    const response = await client.responses.parse(
      {
        model: request.model,
        instructions: LESSON_STUDIO_INSTRUCTIONS,
        input: buildLessonStudioInput(request),
        text: { format: zodTextFormat(lessonDraftSchema, "forge_lesson_draft") },
        max_output_tokens: maxOutputTokens,
        store: false,
      },
      { signal },
    );
    if (hasOpenAIRefusal(response)) throw new LessonStudioError("provider_refusal");
    if (isOpenAIOutputBudgetExhausted(response)) throw new LessonStudioError("request_budget_exceeded");
    if (response.output_parsed === undefined || response.output_parsed === null) {
      throw new LessonStudioError("malformed_provider_output");
    }
    return parseDraft(response.output_parsed);
  } catch (error) {
    throw classifyThrownProviderError(error) ?? new LessonStudioError("provider_error");
  }
}

async function generateWithAnthropic(
  request: LessonStudioRequest,
  apiKey: string,
  signal: AbortSignal,
  fetchImpl: FetchLike,
  maxOutputTokens: number,
): Promise<LessonDraft> {
  const response = await fetchImpl("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      model: request.model,
      max_tokens: maxOutputTokens,
      system: LESSON_STUDIO_INSTRUCTIONS,
      messages: [{ role: "user", content: buildLessonStudioInput(request) }],
      output_config: { format: { type: "json_schema", schema: structuredJsonSchema() } },
    }),
    cache: "no-store",
    signal,
  });
  const payload = await readProviderJson(response);
  const envelope = z.object({
    stop_reason: z.string().nullable(),
    content: z.array(z.object({ type: z.string(), text: z.string().optional() })),
  }).safeParse(payload);
  if (!envelope.success) throw new LessonStudioError("malformed_provider_output");
  if (envelope.data.stop_reason === "refusal") throw new LessonStudioError("provider_refusal");
  if (envelope.data.stop_reason === "max_tokens") throw new LessonStudioError("request_budget_exceeded");
  return parseJsonText(envelope.data.content.find((part) => part.type === "text")?.text);
}

async function generateWithGemini(
  request: LessonStudioRequest,
  apiKey: string,
  signal: AbortSignal,
  fetchImpl: FetchLike,
  maxOutputTokens: number,
): Promise<LessonDraft> {
  const model = encodeURIComponent(request.model);
  const response = await fetchImpl(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: LESSON_STUDIO_INSTRUCTIONS }] },
        contents: [{ role: "user", parts: [{ text: buildLessonStudioInput(request) }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: structuredJsonSchema(),
          maxOutputTokens: maxOutputTokens,
        },
      }),
      cache: "no-store",
      signal,
    },
  );
  const payload = await readProviderJson(response);
  const envelope = z.object({
    candidates: z.array(z.object({
      finishReason: z.string().optional(),
      content: z.object({ parts: z.array(z.object({ text: z.string().optional() })) }),
    })).min(1),
  }).safeParse(payload);
  if (!envelope.success) throw new LessonStudioError("malformed_provider_output");
  const candidate = envelope.data.candidates[0];
  if (["SAFETY", "RECITATION", "BLOCKLIST", "PROHIBITED_CONTENT"].includes(candidate.finishReason ?? "")) {
    throw new LessonStudioError("provider_refusal");
  }
  if (candidate.finishReason === "MAX_TOKENS") throw new LessonStudioError("request_budget_exceeded");
  return parseJsonText(candidate.content.parts.map((part) => part.text ?? "").join(""));
}

async function generateWithOpenRouter(
  request: LessonStudioRequest,
  apiKey: string,
  signal: AbortSignal,
  fetchImpl: FetchLike,
  maxOutputTokens: number,
): Promise<LessonDraft> {
  const response = await fetchImpl("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://modelshift.vercel.app",
      "X-Title": "FORGE Lesson Studio",
    },
    body: JSON.stringify({
      model: request.model,
      messages: [
        { role: "system", content: LESSON_STUDIO_INSTRUCTIONS },
        { role: "user", content: buildLessonStudioInput(request) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "forge_lesson_draft", strict: true, schema: structuredJsonSchema() },
      },
      max_tokens: maxOutputTokens,
    }),
    cache: "no-store",
    signal,
  });
  const payload = await readProviderJson(response);
  const envelope = z.object({
    choices: z.array(z.object({ message: z.object({ content: z.string().nullable().optional(), refusal: z.string().optional() }), finish_reason: z.string().optional() })).min(1),
  }).safeParse(payload);
  if (!envelope.success) throw new LessonStudioError("malformed_provider_output");
  const choice = envelope.data.choices[0];
  if (choice.message.refusal || choice.finish_reason === "content_filter") throw new LessonStudioError("provider_refusal");
  if (choice.finish_reason === "length") throw new LessonStudioError("request_budget_exceeded");
  return parseJsonText(choice.message.content);
}

export async function generateLessonDraft(
  request: LessonStudioRequest,
  options: GenerateLessonOptions = {},
): Promise<GeneratedLessonDraft> {
  const estimatedCostMicros = estimateLessonRequestCostMicros(request);
  const budget = LESSON_STUDIO_BUDGETS[request.depth];
  if (estimatedCostMicros > budget.maxEstimatedCostMicros) {
    throw new LessonStudioError("request_budget_exceeded");
  }

  const apiKey = request.apiKey;
  if (!apiKey) throw new LessonStudioError("missing_key");
  const controller = new AbortController();
  const timeoutMs = Math.min(options.timeoutMs ?? budget.timeoutMs, budget.timeoutMs);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const fetchImpl = options.fetchImpl ?? fetch;

  try {
    let draft: LessonDraft;
    switch (request.provider) {
      case "openai":
        draft = await generateWithOpenAI(request, apiKey, controller.signal, budget.maxOutputTokens, options.openAIClient);
        break;
      case "anthropic":
        draft = await generateWithAnthropic(request, apiKey, controller.signal, fetchImpl, budget.maxOutputTokens);
        break;
      case "gemini":
        draft = await generateWithGemini(request, apiKey, controller.signal, fetchImpl, budget.maxOutputTokens);
        break;
      case "openrouter":
        draft = await generateWithOpenRouter(request, apiKey, controller.signal, fetchImpl, budget.maxOutputTokens);
        break;
    }
    return {
      draft,
      model: request.model,
      keyHandling: "request_only",
      estimatedCostMicros,
      outputTokenBudget: budget.maxOutputTokens,
    };
  } catch (error) {
    throw classifyThrownProviderError(error) ?? new LessonStudioError("provider_error");
  } finally {
    clearTimeout(timeout);
  }
}
