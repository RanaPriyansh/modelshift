import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const createServerClient = vi.hoisted(() => vi.fn());

vi.mock("@supabase/ssr", () => ({ createServerClient }));

import {
  forgeAuthCookieOptions,
  readForgeCloudAuthConfig,
} from "./config";
import { refreshForgeAuth } from "./proxy";
import { forgeContentSecurityPolicy } from "./security-headers";

function configureCloudAuth(key = "sb_publishable_test_key_1234567890") {
  vi.stubEnv("FORGE_CLOUD_ACCOUNTS_ENABLED", "true");
  vi.stubEnv("FORGE_SUPABASE_URL", "https://forge-test.supabase.co");
  vi.stubEnv("FORGE_SUPABASE_PUBLISHABLE_KEY", key);
  vi.stubEnv("FORGE_CLOUD_AUTH_ABUSE_CONTROLS", "reviewed");
  vi.stubEnv("FORGE_CLOUD_AUTH_LIVE_INTEGRATION", "two_account_isolation_verified");
}

afterEach(() => {
  createServerClient.mockReset();
  vi.unstubAllEnvs();
});

describe("FORGE auth security boundary", () => {
  it("fails closed until the production abuse and live-isolation gates are recorded", () => {
    configureCloudAuth();
    vi.stubEnv("FORGE_CLOUD_AUTH_ABUSE_CONTROLS", "");
    expect(readForgeCloudAuthConfig()).toBeNull();

    configureCloudAuth();
    vi.stubEnv("FORGE_CLOUD_AUTH_LIVE_INTEGRATION", "not-a-live-test");
    expect(readForgeCloudAuthConfig()).toBeNull();
  });

  it("rejects secret and service-role keys from the public client configuration", () => {
    configureCloudAuth("sb_secret_test_key_123456789012345");
    expect(readForgeCloudAuthConfig()).toBeNull();

    const servicePayload = Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url");
    configureCloudAuth(`header.${servicePayload}.signature-long-enough`);
    expect(readForgeCloudAuthConfig()).toBeNull();

    configureCloudAuth();
    expect(readForgeCloudAuthConfig()).toMatchObject({
      url: "https://forge-test.supabase.co",
      publishableKey: "sb_publishable_test_key_1234567890",
    });
  });

  it("uses server-only session-cookie attributes", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(forgeAuthCookieOptions()).toEqual({
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure: true,
    });
  });

  it("preserves every anti-cache header supplied with refreshed auth cookies", async () => {
    configureCloudAuth();
    createServerClient.mockImplementation((_url, _key, options) => ({
      auth: {
        getClaims: async () => {
          options.cookies.setAll(
            [{ name: "sb-session", value: "opaque-token", options: { path: "/", httpOnly: true } }],
            {
              "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
              Expires: "0",
              Pragma: "no-cache",
            },
          );
          return { data: { claims: { sub: "user" } }, error: null };
        },
      },
    }));

    const request = new NextRequest("https://forge.example/account");
    const response = await refreshForgeAuth(request, new Headers({ "x-nonce": "testnonce" }));

    expect(response.headers.get("cache-control")).toBe("private, no-cache, no-store, must-revalidate, max-age=0");
    expect(response.headers.get("expires")).toBe("0");
    expect(response.headers.get("pragma")).toBe("no-cache");
    expect(response.headers.get("set-cookie")).toContain("sb-session=opaque-token");
    expect(createServerClient.mock.calls[0]?.[2]?.cookieOptions).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
  });

  it("uses a request nonce and never permits arbitrary inline script", () => {
    const production = forgeContentSecurityPolicy("noncevalue", false);
    expect(production).toContain("script-src 'self' 'nonce-noncevalue' 'strict-dynamic'");
    expect(production).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(production).not.toContain("'unsafe-eval'");

    const development = forgeContentSecurityPolicy("noncevalue", true);
    expect(development).toContain("'unsafe-eval'");
  });
});
