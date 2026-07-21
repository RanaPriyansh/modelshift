import { NextResponse } from "next/server";

import { containsAdversarialText, isRestrictedTopic } from "../../../../src/lib/forge-planner/safety";
import {
  generateLessonDraft,
  LessonStudioError,
} from "../../../../src/lib/lesson-studio/providers.server";
import {
  lessonStudioRequestSchema,
  lessonStudioResponseSchema,
} from "../../../../src/lib/lesson-studio/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const MAX_LESSON_STUDIO_REQUEST_BYTES = 24 * 1024;

const ERROR_MESSAGES = {
  bad_request: "The draft request is incomplete or invalid.",
  wrong_origin: "This endpoint accepts requests only from this FORGE site.",
  guardian_required: "A child session requires grown-up management.",
  unsafe_topic: "FORGE cannot generate a lesson for that request.",
  adversarial_input: "The lesson request contains instructions FORGE cannot pass to a model.",
  missing_key: "Add a provider API key for this request.",
  provider_rejected: "The provider rejected the request. Check the key, model, access, and credits.",
  provider_unavailable: "The provider is unavailable. The key was discarded; try again later.",
  invalid_provider_output: "The provider did not return a valid FORGE lesson draft.",
  timeout: "The provider took too long. The key was discarded; try again.",
} as const;

type ErrorCode = keyof typeof ERROR_MESSAGES;

function jsonHeaders() {
  return {
    "Cache-Control": "no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
  };
}

function errorResponse(code: ErrorCode, status: number) {
  return NextResponse.json(
    { schemaVersion: "1.0", error: { code, message: ERROR_MESSAGES[code] } },
    { status, headers: jsonHeaders() },
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

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return errorResponse("wrong_origin", 403);
  const mediaType = request.headers.get("content-type")?.toLowerCase().split(";", 1)[0]?.trim();
  if (mediaType !== "application/json") {
    return errorResponse("bad_request", 415);
  }

  let rawBody: string | null;
  try {
    rawBody = await readBoundedBody(request);
  } catch {
    return errorResponse("bad_request", 400);
  }
  if (rawBody === null) return errorResponse("bad_request", 413);

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return errorResponse("bad_request", 400);
  }

  const parsed = lessonStudioRequestSchema.safeParse(json);
  if (!parsed.success) return errorResponse("bad_request", 400);
  const input = parsed.data;

  if (input.ageMode === "child" && !input.guardianManaged) {
    return errorResponse("guardian_required", 403);
  }
  if (isRestrictedTopic(input.question)) return errorResponse("unsafe_topic", 403);
  if (
    [input.question, input.startingPoint, input.successShape, input.sourceContext]
      .filter(Boolean)
      .some(containsAdversarialText)
  ) {
    return errorResponse("adversarial_input", 403);
  }

  try {
    const generated = await generateLessonDraft(input);
    const response = lessonStudioResponseSchema.parse({
      schemaVersion: "1.0",
      draft: generated.draft,
      provenance: {
        provider: input.provider,
        model: generated.model,
        generatedAt: new Date().toISOString(),
        sourceStatus: "unverified_draft",
        keyHandling: generated.keyHandling,
      },
      claimBoundary: "AI-generated draft. Not a reviewed World, verified source record, grade, or proof of learning.",
    });
    return NextResponse.json(response, { status: 200, headers: jsonHeaders() });
  } catch (error) {
    if (error instanceof LessonStudioError) {
      const status = error.code === "missing_key" ? 400 : error.code === "provider_rejected" ? 422 : 502;
      return errorResponse(error.code, status);
    }
    return errorResponse("provider_unavailable", 502);
  }
}
