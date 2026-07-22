import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const createServerClient = vi.hoisted(() => vi.fn());

vi.mock("@supabase/ssr", () => ({ createServerClient }));

import {
  forgeAuthCookieOptions,
  isForgeCloudAuthConfigured,
  readForgeCloudAuthConfig,
} from "./config";
import { refreshForgeAuth } from "./proxy";
import { forgeContentSecurityPolicy } from "./security-headers";

function configureRetiredCloudEnvironment(key = "sb_publishable_test_key_1234567890") {
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
  it("keeps cloud auth structurally disabled even when retired release-token values are supplied", () => {
    configureRetiredCloudEnvironment();
    expect(readForgeCloudAuthConfig()).toBeNull();

    configureRetiredCloudEnvironment("sb_secret_test_key_123456789012345");
    expect(readForgeCloudAuthConfig()).toBeNull();
  });

  it("keeps the deterministic release-health environment argument fail-closed", () => {
    const completeLookingSupabaseEnvironment = {
      FORGE_CLOUD_ACCOUNTS_ENABLED: "true",
      FORGE_SUPABASE_URL: "https://forge-release.supabase.co",
      FORGE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_complete_1234567890",
      FORGE_CLOUD_AUTH_ABUSE_CONTROLS: "reviewed",
      FORGE_CLOUD_AUTH_LIVE_INTEGRATION: "two_account_isolation_verified",
    } as const;

    expect(readForgeCloudAuthConfig(completeLookingSupabaseEnvironment)).toBeNull();
    expect(isForgeCloudAuthConfigured(completeLookingSupabaseEnvironment)).toBe(false);
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

  it("does not instantiate a cloud client from retired environment values", async () => {
    configureRetiredCloudEnvironment();
    const request = new NextRequest("https://forge.example/account");
    const response = await refreshForgeAuth(request, new Headers({ "x-nonce": "testnonce" }));

    expect(response.status).toBe(200);
    expect(createServerClient).not.toHaveBeenCalled();
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
