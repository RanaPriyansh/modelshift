import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { containsAdversarialText, containsPrivateData, isRestrictedTopic } from "../../../../src/lib/forge-planner/safety";
import { readForgeCloudIdentity, type ForgeCloudIdentity } from "../../../../src/lib/forge-auth/session.server";
import {
  generateLessonDraft,
  LessonStudioError,
} from "../../../../src/lib/lesson-studio/providers.server";
import { compileLessonDraftPipeline } from "../../../../src/lib/lesson-studio/pipeline.server";
import {
  LESSON_STUDIO_BUDGETS,
  lessonStudioRequestSchema,
  lessonStudioResponseSchema,
} from "../../../../src/lib/lesson-studio/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const MAX_LESSON_STUDIO_REQUEST_BYTES = 24 * 1024;

const ERROR_MESSAGES = {
  bad_request: "The draft request is incomplete or invalid.",
  wrong_origin: "This endpoint accepts requests only from this FORGE site.",
  unsafe_topic: "FORGE cannot generate a lesson for that request.",
  adversarial_input: "The lesson request contains instructions FORGE cannot pass to a model.",
  private_data: "Remove personal or private data from this authoring material before trying again.",
  authoring_unavailable: "Studio provider requests are unavailable until active adult server-owned authority and required controls are approved.",
  missing_key: "Add a provider API key for this request.",
  request_budget_exceeded: "This request exceeds FORGE's fixed time, output, or estimated-cost budget.",
  provider_refusal: "The provider refused the draft request. The key was discarded.",
  rate_limited: "The provider rate-limited this request. The key was discarded; try later.",
  timeout: "The provider took too long. The key was discarded; try again.",
  malformed_provider_output: "The provider did not return a valid FORGE lesson draft.",
  provider_error: "The provider could not complete the draft. The key was discarded; try again later.",
} as const;

type ErrorCode = keyof typeof ERROR_MESSAGES;

function jsonHeaders(correlationId: string) {
  return {
    "Cache-Control": "no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    "X-FORGE-Correlation-Id": correlationId,
  };
}

function errorResponse(code: ErrorCode, status: number, correlationId: string) {
  return NextResponse.json(
    { schemaVersion: "1.0", correlationId, error: { code, message: ERROR_MESSAGES[code] } },
    { status, headers: jsonHeaders(correlationId) },
  );
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    const host = (request.headers.get("host") ?? requestUrl.host).trim().toLowerCase();
    if (!host || host.includes(",") || host.includes("/") || host.includes("\\")) return false;
    const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",", 1)[0]?.trim().toLowerCase();
    const protocol = forwardedProtocol === "http" || forwardedProtocol === "https"
      ? `${forwardedProtocol}:`
      : requestUrl.protocol;
    return originUrl.protocol === protocol && originUrl.host.toLowerCase() === host;
  } catch {
    return false;
  }
}

async function readBoundedBody(request: Request): Promise<string | null> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_LESSON_STUDIO_REQUEST_BYTES) return null;
  if (!request.body) return null;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_LESSON_STUDIO_REQUEST_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch {
    return null;
  }
}

type LessonDraftRouteDependencies = {
  readIdentity: () => Promise<ForgeCloudIdentity | null>;
  generate: typeof generateLessonDraft;
};

const DEFAULT_DEPENDENCIES: LessonDraftRouteDependencies = {
  readIdentity: readForgeCloudIdentity,
  generate: generateLessonDraft,
};

/**
 * The route body is deliberately inaccessible until server-owned active adult
 * identity succeeds. The literal authoring mode and all UI copy remain
 * declarations only, never authority.
 */
export function createLessonDraftPost(dependencies: LessonDraftRouteDependencies = DEFAULT_DEPENDENCIES) {
  return async function POST(request: Request) {
    const correlationId = randomUUID();
    if (!isSameOrigin(request)) return errorResponse("wrong_origin", 403, correlationId);
    if (!await dependencies.readIdentity()) return errorResponse("authoring_unavailable", 403, correlationId);
    const mediaType = request.headers.get("content-type")?.toLowerCase().split(";", 1)[0]?.trim();
    if (mediaType !== "application/json") {
      return errorResponse("bad_request", 415, correlationId);
    }

    let rawBody: string | null;
    try {
      rawBody = await readBoundedBody(request);
    } catch {
      return errorResponse("bad_request", 400, correlationId);
    }
    if (rawBody === null) return errorResponse("bad_request", 413, correlationId);

    let json: unknown;
    try {
      json = JSON.parse(rawBody);
    } catch {
      return errorResponse("bad_request", 400, correlationId);
    }

    const parsed = lessonStudioRequestSchema.safeParse(json);
    if (!parsed.success) return errorResponse("bad_request", 400, correlationId);
    const input = parsed.data;
    const forwardedAuthoringFields = [input.question, input.startingPoint, input.successShape, input.sourceContext];

    if (forwardedAuthoringFields.some(isRestrictedTopic)) return errorResponse("unsafe_topic", 403, correlationId);
    if (forwardedAuthoringFields.some(containsAdversarialText)) {
      return errorResponse("adversarial_input", 403, correlationId);
    }
    if (forwardedAuthoringFields.some(containsPrivateData)) return errorResponse("private_data", 403, correlationId);

    try {
      const generated = await dependencies.generate(input);
      const budget = LESSON_STUDIO_BUDGETS[input.depth];
      const response = lessonStudioResponseSchema.parse({
        schemaVersion: "1.0",
        draft: generated.draft,
        pipeline: compileLessonDraftPipeline(generated.draft),
        provenance: {
          provider: input.provider,
          model: generated.model,
          generatedAt: new Date().toISOString(),
          correlationId,
          sourceStatus: "unverified_draft",
          keyHandling: generated.keyHandling,
          budget: {
            timeoutMs: budget.timeoutMs,
            maxOutputTokens: generated.outputTokenBudget,
            maxEstimatedCostMicros: budget.maxEstimatedCostMicros,
            estimatedCostMicros: generated.estimatedCostMicros,
          },
        },
        claimBoundary: "AI-generated draft. Not a reviewed World, verified source record, grade, or proof of learning.",
      });
      return NextResponse.json(response, { status: 200, headers: jsonHeaders(correlationId) });
    } catch (error) {
      if (error instanceof LessonStudioError) {
        const status = error.code === "missing_key" ? 400
          : error.code === "provider_refusal" ? 422
            : error.code === "rate_limited" || error.code === "request_budget_exceeded" ? 429
              : error.code === "timeout" ? 504
                : 502;
        return errorResponse(error.code, status, correlationId);
      }
      return errorResponse("provider_error", 502, correlationId);
    }
  };
}

export const POST = createLessonDraftPost();
