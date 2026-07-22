import "server-only";

import { isForgeCloudAuthAuthorityEnabled } from "./cloud-authority";

export interface ForgeCloudAuthConfig {
  readonly enabled: true;
  readonly url: string;
  readonly publishableKey: string;
}

export function readForgeCloudAuthConfig(_environment: Readonly<Record<string, string | undefined>> = process.env): ForgeCloudAuthConfig | null {
  // Cloud sign-in is structurally disabled until the approved CAPTCHA and durable,
  // distributed abuse-control integration exists. Environment-looking values are
  // intentionally not evidence and cannot enable sessions or cloud persistence.
  if (!isForgeCloudAuthAuthorityEnabled(_environment)) return null;
  void _environment;
  return null;
}

export function isForgeCloudAuthConfigured(environment: Readonly<Record<string, string | undefined>> = process.env): boolean {
  return isForgeCloudAuthAuthorityEnabled(environment);
}

export function forgeAuthCookieOptions() {
  return {
    path: "/",
    sameSite: "lax" as const,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };
}
