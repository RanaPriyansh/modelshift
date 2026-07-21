import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import type { ValidatedInterpretation } from "../../types/modelshift";

import { neutralFallback } from "./fallback";
import { buildInterpretationInput, INTERPRETATION_INSTRUCTIONS, isAdversarialExplanation } from "./prompt";
import { interpretationSchema, type InterpretRequestInput } from "./schema";
import { validateInterpretation } from "./validation";

const INTERPRETATION_TIMEOUT_MS = 6_000;

type ParsedResponsesClient = {
  responses: {
    parse: (body: Parameters<OpenAI["responses"]["parse"]>[0], options?: { signal?: AbortSignal }) => Promise<{ output_parsed?: unknown; output_text?: string }>;
  };
};

export type InterpretOptions = {
  client?: ParsedResponsesClient;
  apiKey?: string | undefined;
  model?: string | undefined;
  disabled?: boolean;
};

function fallbackForError(error: unknown): ValidatedInterpretation {
  if (error instanceof Error && error.name === "AbortError") return neutralFallback("timeout");
  const status = typeof error === "object" && error !== null && "status" in error ? error.status : undefined;
  if (status === 400 || status === 401 || status === 403 || status === 422) return neutralFallback("refusal");
  return neutralFallback("api_error");
}

/**
 * Server-side model boundary. The result is always a frozen ValidatedInterpretation,
 * including all unavailable-model paths.
 */
export async function interpretExplanation(
  request: InterpretRequestInput,
  options: InterpretOptions = {},
): Promise<ValidatedInterpretation> {
  if (options.disabled || process.env.OPENAI_INTERPRETATION_DISABLED === "true") return neutralFallback("disabled");
  if (isAdversarialExplanation(request.explanation)) return neutralFallback("ambiguous_input");

  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey && !options.client) return neutralFallback("missing_key");

  const client = options.client ?? new OpenAI({ apiKey });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), INTERPRETATION_TIMEOUT_MS);

  try {
    // Current OpenAI SDK 6.48.0 Responses Structured Outputs API. No tools or streaming.
    const response = await client.responses.parse(
      {
        model: options.model ?? process.env.OPENAI_MODEL ?? "gpt-5.6-sol",
        instructions: INTERPRETATION_INSTRUCTIONS,
        input: buildInterpretationInput(request),
        text: { format: zodTextFormat(interpretationSchema, "modelshift_interpretation") },
        max_output_tokens: 500,
        store: false,
      },
      { signal: controller.signal },
    );

    if (response.output_parsed === undefined || response.output_parsed === null) return neutralFallback("refusal");
    const validation = validateInterpretation(response.output_parsed, request.explanation);
    return validation.ok ? validation.value : neutralFallback(validation.reason);
  } catch (error) {
    return fallbackForError(error);
  } finally {
    clearTimeout(timeout);
  }
}

export { INTERPRETATION_TIMEOUT_MS };
