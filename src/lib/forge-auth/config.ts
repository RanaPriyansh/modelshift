import "server-only";

export interface ForgeCloudAuthConfig {
  readonly enabled: true;
  readonly url: string;
  readonly publishableKey: string;
}

export function readForgeCloudAuthConfig(): ForgeCloudAuthConfig | null {
  // Cloud sign-in is structurally disabled: no environment assertion, browser
  // checkbox, or process-local limiter can stand in for a consumed CAPTCHA and
  // durable, distributed abuse-control integration. A separately authorized
  // integration must replace this boundary with executable evidence.
  return null;
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
