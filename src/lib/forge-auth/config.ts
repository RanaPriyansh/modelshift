import "server-only";

export interface ForgeCloudAuthConfig {
  readonly enabled: true;
  readonly url: string;
  readonly publishableKey: string;
}

export type ForgeCloudAuthEnvironment = Readonly<Record<string, string | undefined>>;

export function readForgeCloudAuthConfig(
  _environment: ForgeCloudAuthEnvironment = process.env,
): ForgeCloudAuthConfig | null {
  void _environment;
  // Cloud sign-in is structurally disabled: no environment assertion, browser
  // checkbox, or process-local limiter can stand in for a consumed CAPTCHA and
  // durable, distributed abuse-control integration. The optional read-only
  // environment argument exists only for deterministic release-health tests;
  // it is deliberately neither parsed nor an authorization input. A separately
  // authorized integration must replace this boundary with executable evidence.
  return null;
}

export function isForgeCloudAuthConfigured(
  environment?: ForgeCloudAuthEnvironment,
): boolean {
  return readForgeCloudAuthConfig(environment) !== null;
}

export function forgeAuthCookieOptions() {
  return {
    path: "/",
    sameSite: "lax" as const,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };
}
