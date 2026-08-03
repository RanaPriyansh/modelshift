import { NextResponse, type NextRequest } from "next/server";

import { refreshForgeAuth } from "@/src/lib/forge-auth/proxy";
import { createRequestNonce, forgeContentSecurityPolicy } from "@/src/lib/forge-auth/security-headers";
import { classifyForgeReleaseRoute } from "@/src/operations/forge-release-route-policy";

const RETIRED_ROUTE_DOCUMENT = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Page not found — FORGE</title>
    <style>
      :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #edf0e8; color: #14241a; }
      * { box-sizing: border-box; }
      body { min-width: 320px; min-height: 100dvh; margin: 0; }
      main { display: grid; min-height: 100dvh; place-items: center; padding: clamp(24px, 6vw, 72px); }
      section { width: min(680px, 100%); border-top: 3px solid #173c29; padding-top: clamp(28px, 5vw, 52px); }
      p { max-width: 38rem; margin: 0; color: #52645a; font-size: 1.05rem; line-height: 1.6; }
      .mark { margin-bottom: 14px; color: #173c29; font-size: .78rem; font-weight: 850; letter-spacing: .12em; }
      h1 { max-width: 12ch; margin: 0 0 22px; color: #173c29; font-size: clamp(2.75rem, 8vw, 5.2rem); letter-spacing: -.065em; line-height: .9; }
      nav { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 30px; }
      a { display: inline-flex; min-height: 48px; align-items: center; justify-content: center; border: 1px solid #123eae; background: #123eae; color: #fff; padding: 10px 18px; font-weight: 800; text-decoration: none; }
      a + a { border-color: #173c29; background: transparent; color: #173c29; }
      a:focus-visible { outline: 3px solid #123eae; outline-offset: 4px; }
      @media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; } }
    </style>
  </head>
  <body>
    <main id="forge-not-found" tabindex="-1">
      <section aria-labelledby="forge-not-found-title">
        <p class="mark">FORGE</p>
        <h1 id="forge-not-found-title">We could not find that page.</h1>
        <p>This FORGE page is not available. Open your Semester Desk or return to the FORGE home page.</p>
        <nav aria-label="Page recovery">
          <a href="/app">Open your Semester Desk</a>
          <a href="/">FORGE home</a>
        </nav>
      </section>
    </main>
  </body>
</html>`;

function retiredRouteResponse(request: NextRequest, contentSecurityPolicy: string) {
  return new NextResponse(request.method === "HEAD" ? null : RETIRED_ROUTE_DOCUMENT, {
    status: 404,
    headers: {
      "Cache-Control": "no-store",
      "Content-Security-Policy": contentSecurityPolicy,
      "Content-Type": "text/html; charset=utf-8",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Strict-Transport-Security": "max-age=31536000",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

// Next.js identifies this compound-extension proxy only through an anonymous default export.
// eslint-disable-next-line import/no-anonymous-default-export
export default async function(request: NextRequest) {
  const route = classifyForgeReleaseRoute(request.method, request.nextUrl.pathname);
  if (!route.allowed) {
    const nonce = createRequestNonce();
    return retiredRouteResponse(
      request,
      forgeContentSecurityPolicy(nonce, process.env.NODE_ENV !== "production"),
    );
  }

  if (route.kind === "framework") return NextResponse.next();

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
  matcher: ["/:path*"],
};
