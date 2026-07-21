import { NextResponse } from "next/server";

import { interpretExplanation, interpretationRequestSchema, neutralFallback } from "../../../src/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;

  try {
    const originUrl = new URL(origin);
    const protocol = request.headers.get("x-forwarded-proto") ?? originUrl.protocol.replace(":", "");
    return originUrl.host === host && originUrl.protocol === `${protocol}:`;
  } catch {
    return false;
  }
}

function json(payload: ReturnType<typeof neutralFallback>, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json") || !sameOrigin(request)) {
    return json(neutralFallback("ambiguous_input"), 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(neutralFallback("ambiguous_input"), 400);
  }

  const parsed = interpretationRequestSchema.safeParse(body);
  if (!parsed.success) return json(neutralFallback("ambiguous_input"), 400);
  return json(await interpretExplanation(parsed.data));
}
