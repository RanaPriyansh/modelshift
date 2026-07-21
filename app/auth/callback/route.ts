import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/src/lib/supabase/server";

const ALLOWED_DESTINATIONS = new Set(["/account", "/account/activate", "/evidence"]);

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requestedNext = url.searchParams.get("next") ?? "/account/activate";
  const destination = ALLOWED_DESTINATIONS.has(requestedNext) ? requestedNext : "/account/activate";
  const supabase = await createClient();

  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(destination, url.origin));
  }

  return NextResponse.redirect(new URL("/login?notice=link_failed", url.origin));
}
