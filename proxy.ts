import type { NextRequest } from "next/server";

import { refreshForgeAuth } from "@/src/lib/forge-auth/proxy";
import { createRequestNonce, forgeContentSecurityPolicy } from "@/src/lib/forge-auth/security-headers";

export async function proxy(request: NextRequest) {
  const nonce = createRequestNonce();
  const contentSecurityPolicy = forgeContentSecurityPolicy(nonce, process.env.NODE_ENV !== "production");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const response = await refreshForgeAuth(request, requestHeaders);
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
