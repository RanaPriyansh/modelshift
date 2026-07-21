import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { forgeAuthCookieOptions, readForgeCloudAuthConfig } from "./config";

function nextResponse(requestHeaders: Headers) {
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export async function refreshForgeAuth(request: NextRequest, requestHeaders = new Headers(request.headers)) {
  const config = readForgeCloudAuthConfig();
  if (!config) return nextResponse(requestHeaders);

  let response = nextResponse(requestHeaders);
  const supabase = createServerClient(config.url, config.publishableKey, {
    cookieOptions: forgeAuthCookieOptions(),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, requiredHeaders) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = nextResponse(requestHeaders);
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [name, value] of Object.entries(requiredHeaders)) response.headers.set(name, value);
      },
    },
  });

  // Keep this immediately after client construction. Supabase uses it to
  // validate and refresh the cookie-backed identity before Server Components.
  await supabase.auth.getClaims();
  return response;
}
