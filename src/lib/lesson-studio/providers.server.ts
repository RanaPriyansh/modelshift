import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import { buildLessonStudioInput, LESSON_STUDIO_INSTRUCTIONS } from "./prompt";
import {
  LESSON_PROVIDER_DEFAULTS,
  lessonDraftSchema,
  type LessonDraft,
  type LessonStudioRequest,
} from "./schema";

export const LESSON_STUDIO_TIMEOUT_MS = 30_000;

type FetchLike = typeof fetch;

export type LessonStudioOpenAIClient = {
  responses: {
    parse: (
      body: Parameters<OpenAI["responses"]["parse"]>[0],
      options?: { signal?: AbortSignal },
    ) => Promise<{ output_parsed?: unknown; output_text?: string }>;
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
  keyHandling: "request_only" | "deployment_managed";
};

export type LessonStudioErrorCode =
  | "missing_key"
  | "provider_rejected"
  | "provider_unavailable"
  | "invalid_provider_output"
  | "timeout";

export class LessonStudioError extends Error {
  constructor(public readonly code: LessonStudioErrorCode) {
    super(code);
    this.name = "LessonStudioError";
  }
}

function modelFor(request: LessonStudioRequest): string {
  return request.model || LESSON_PROVIDER_DEFAULTS[request.provider];
}

function structuredJsonSchema(): Record<string, unknown> {
  const schema = { ...(z.toJSONSchema(lessonDraftSchema) as Record<string, unknown>) };
  delete schema.$schema;
  return schema;
}

function parseDraft(value: unknown): LessonDraft {
  const parsed = lessonDraftSchema.safeParse(value);
  if (!parsed.success) throw new LessonStudioError("invalid_provider_output");
  return parsed.data;
}

function parseJsonText(value: unknown): LessonDraft {
  if (typeof value !== "string") throw new LessonStudioError("invalid_provider_output");
  try {
    return parseDraft(JSON.parse(value));
  } catch (error) {
    if (error instanceof LessonStudioError) throw error;
    throw new LessonStudioError("invalid_provider_output");
  }
}

async function readProviderJson(response: Response): Promise<unknown> {
  if (!response.ok) {
    if ([400, 401, 403, 404, 422].includes(response.status)) {
      throw new LessonStudioError("provider_rejected");
    }
    throw new LessonStudioError("provider_unavailable");
  }
  try {
    return await response.json();
  } catch {
    throw new LessonStudioError("invalid_provider_output");
  }
}

function requestKey(request: LessonStudioRequest): {
  apiKey: string;
  keyHandling: "request_only" | "deployment_managed";
} {
  if (request.apiKey) return { apiKey: request.apiKey, keyHandling: "request_only" };
  if (
    request.provider === "openai" &&
    process.env.FORGE_LESSON_STUDIO_OPENAI_ENABLED === "true" &&
    process.env.OPENAI_API_KEY
  ) {
    return { apiKey: process.env.OPENAI_API_KEY, keyHandling: "deployment_managed" };
  }
  throw new LessonStudioError("missing_key");
}

async function generateWithOpenAI(
  request: LessonStudioRequest,
  apiKey: string,
  signal: AbortSignal,
  clientOverride?: LessonStudioOpenAIClient,
): Promise<LessonDraft> {
  const client = clientOverride ?? new OpenAI({ apiKey });
  try {
    const response = await client.responses.parse(
      {
        model: modelFor(request),
        instructions: LESSON_STUDIO_INSTRUCTIONS,
        input: buildLessonStudioInput(request),
        text: { format: zodTextFormat(lessonDraftSchema, "forge_lesson_draft") },
        max_output_tokens: 4_500,
        store: false,
        ...(request.safetyIdentifier ? { safety_identifier: request.safetyIdentifier } : {}),
      },
      { signal },
    );
    if (response.output_parsed === undefined || response.output_parsed === null) {
      throw new LessonStudioError("invalid_provider_output");
    }
    return parseDraft(response.output_parsed);
  } catch (error) {
    if (error instanceof LessonStudioError) throw error;
    const status = typeof error === "object" && error !== null && "status" in error ? error.status : null;
    if ([400, 401, 403, 404, 422].includes(Number(status))) {
      throw new LessonStudioError("provider_rejected");
    }
    throw error;
  }
}

async function generateWithAnthropic(
  request: LessonStudioRequest,
  apiKey: string,
  signal: AbortSignal,
  fetchImpl: FetchLike,
): Promise<LessonDraft> {
  const response = await fetchImpl("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      model: modelFor(request),
      max_tokens: 4_500,
      system: LESSON_STUDIO_INSTRUCTIONS,
      messages: [{ role: "user", content: buildLessonStudioInput(request) }],
      output_config: {
        format: { type: "json_schema", schema: structuredJsonSchema() },
      },
    }),
    cache: "no-store",
    signal,
  });
  const payload = await readProviderJson(response);
  const envelope = z.object({
    stop_reason: z.string().nullable(),
    content: z.array(z.object({ type: z.string(), text: z.string().optional() })),
  }).safeParse(payload);
  if (!envelope.success || ["refusal", "max_tokens"].includes(envelope.data.stop_reason ?? "")) {
    throw new LessonStudioError("invalid_provider_output");
  }
  return parseJsonText(envelope.data.content.find((part) => part.type === "text")?.text);
}

async function generateWithGemini(
  request: LessonStudioRequest,
  apiKey: string,
  signal: AbortSignal,
  fetchImpl: FetchLike,
): Promise<LessonDraft> {
  const model = encodeURIComponent(modelFor(request));
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
          maxOutputTokens: 4_500,
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
  if (!envelope.success) throw new LessonStudioError("invalid_provider_output");
  const candidate = envelope.data.candidates[0];
  if (["SAFETY", "RECITATION", "BLOCKLIST", "PROHIBITED_CONTENT"].includes(candidate.finishReason ?? "")) {
    throw new LessonStudioError("provider_rejected");
  }
  return parseJsonText(candidate.content.parts.map((part) => part.text ?? "").join(""));
}

async function generateWithOpenRouter(
  request: LessonStudioRequest,
  apiKey: string,
  signal: AbortSignal,
  fetchImpl: FetchLike,
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
      model: modelFor(request),
      messages: [
        { role: "system", content: LESSON_STUDIO_INSTRUCTIONS },
        { role: "user", content: buildLessonStudioInput(request) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "forge_lesson_draft", strict: true, schema: structuredJsonSchema() },
      },
      max_tokens: 4_500,
    }),
    cache: "no-store",
    signal,
  });
  const payload = await readProviderJson(response);
  const envelope = z.object({
    choices: z.array(z.object({ message: z.object({ content: z.string() }) })).min(1),
  }).safeParse(payload);
  if (!envelope.success) throw new LessonStudioError("invalid_provider_output");
  return parseJsonText(envelope.data.choices[0].message.content);
}

export async function generateLessonDraft(
  request: LessonStudioRequest,
  options: GenerateLessonOptions = {},
): Promise<GeneratedLessonDraft> {
  const { apiKey, keyHandling } = requestKey(request);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? LESSON_STUDIO_TIMEOUT_MS);
  const fetchImpl = options.fetchImpl ?? fetch;

  try {
    let draft: LessonDraft;
    switch (request.provider) {
      case "openai":
        draft = await generateWithOpenAI(request, apiKey, controller.signal, options.openAIClient);
        break;
      case "anthropic":
        draft = await generateWithAnthropic(request, apiKey, controller.signal, fetchImpl);
        break;
      case "gemini":
        draft = await generateWithGemini(request, apiKey, controller.signal, fetchImpl);
        break;
      case "openrouter":
        draft = await generateWithOpenRouter(request, apiKey, controller.signal, fetchImpl);
        break;
    }
    return { draft, model: modelFor(request), keyHandling };
  } catch (error) {
    if (error instanceof LessonStudioError) throw error;
    if (error instanceof Error && error.name === "AbortError") throw new LessonStudioError("timeout");
    throw new LessonStudioError("provider_unavailable");
  } finally {
    clearTimeout(timeout);
  }
}
