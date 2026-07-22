import "server-only";

import { z } from "zod";

// This module is imported by the request proxy. Keep Zod from using its
// Function-constructor fast path so the nonce CSP stays meaningful.
z.config({ jitless: true });

const httpsUrlSchema = z.string().url().refine((value) => value.startsWith("https://"), {
  message: "FORGE cloud auth requires HTTPS.",
});

function isPrivilegedSupabaseKey(value: string): boolean {
  if (value.startsWith("sb_secret_")) return true;
  const payload = value.split(".")[1];
  if (!payload) return false;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { role?: unknown };
    return decoded.role === "service_role" || decoded.role === "supabase_admin";
  } catch {
    return false;
  }
}

const authEnvironmentSchema = z.strictObject({
  enabled: z.literal("true"),
  url: httpsUrlSchema,
  publishableKey: z.string().min(20).max(512).refine((value) => !isPrivilegedSupabaseKey(value)),
  abuseControls: z.literal("reviewed"),
  liveIntegration: z.literal("two_account_isolation_verified"),
});

export interface ForgeCloudAuthConfig {
  readonly enabled: true;
  readonly url: string;
  readonly publishableKey: string;
}

export function readForgeCloudAuthConfig(): ForgeCloudAuthConfig | null {
  const parsed = authEnvironmentSchema.safeParse({
    enabled: process.env.FORGE_CLOUD_ACCOUNTS_ENABLED,
    url: process.env.FORGE_SUPABASE_URL,
    publishableKey: process.env.FORGE_SUPABASE_PUBLISHABLE_KEY,
    abuseControls: process.env.FORGE_CLOUD_AUTH_ABUSE_CONTROLS,
    liveIntegration: process.env.FORGE_CLOUD_AUTH_LIVE_INTEGRATION,
  });

  if (!parsed.success) return null;
  return {
    enabled: true,
    url: parsed.data.url,
    publishableKey: parsed.data.publishableKey,
  };
}

export function isForgeCloudAuthConfigured(): boolean {
  return readForgeCloudAuthConfig() !== null;
}

export function forgeAuthCookieOptions() {
  return {
    path: "/",
    sameSite: "lax" as const,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };
}
