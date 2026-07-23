import { NextResponse } from "next/server";

import {
  forgePlanRequestSchema,
  planForgeLearning,
  type ForgePlanRequest,
} from "../../../../src/lib/forge-planner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const MAX_FORGE_PLAN_REQUEST_BYTES = 4_096;

function sameOrigin(request: Request): boolean {
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

function responseHeaders() {
  return {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
}

function invalidRequest() {
  return NextResponse.json(
    {
      schemaVersion: "1.0",
      error: { code: "invalid_request", message: "The planning request is invalid." },
    },
    { status: 400, headers: responseHeaders() },
  );
}

async function readBoundedBody(request: Request): Promise<string | null> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_FORGE_PLAN_REQUEST_BYTES) return null;
  if (!request.body) return null;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_FORGE_PLAN_REQUEST_BYTES) {
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

type PlanRouteDependencies = {
  readonly plan: (input: ForgePlanRequest) => ReturnType<typeof planForgeLearning>;
};

const DEFAULT_DEPENDENCIES: PlanRouteDependencies = {
  plan: planForgeLearning,
};

export function createForgePlanPost(dependencies: PlanRouteDependencies = DEFAULT_DEPENDENCIES) {
  return async function POST(request: Request) {
    const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
    const mediaType = contentType.split(";", 1)[0]?.trim();
    if (mediaType !== "application/json" || !sameOrigin(request)) return invalidRequest();

    let text: string | null;
    try {
      text = await readBoundedBody(request);
    } catch {
      return invalidRequest();
    }
    if (text === null) return invalidRequest();

    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return invalidRequest();
    }

    const parsed = forgePlanRequestSchema.safeParse(body);
    if (!parsed.success) return invalidRequest();

    const contract = await dependencies.plan(parsed.data);
    return NextResponse.json(contract, {
      status: contract.contractKind === "refusal" ? 403 : 200,
      headers: responseHeaders(),
    });
  };
}

export const POST = createForgePlanPost();
