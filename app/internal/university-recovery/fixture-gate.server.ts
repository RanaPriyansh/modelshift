import "server-only";

import { types as nodeUtilTypes } from "node:util";

const RECOVERY_FIXTURE_ENVIRONMENT_KEY = "FORGE_UNIVERSITY_RECOVERY_FIXTURE";
const RECOVERY_FIXTURE_TOKENS = Object.freeze({
  "forge-university-recovery.v1": "legacy" as const,
  "forge-university-recovery-what-if.v1": "capacity_what_if" as const,
});

export type UniversityRecoveryEnvironment = Readonly<Record<string, string | undefined>>;

export type UniversityRecoveryGate =
  | Readonly<{
      enabled: true;
      status: "recovery-fixture-enabled";
      mode: "legacy";
    }>
  | Readonly<{
      enabled: true;
      status: "recovery-what-if-enabled";
      mode: "capacity_what_if";
    }>
  | Readonly<{
      enabled: false;
      status: "recovery-fixture-unavailable";
      mode: null;
    }>;

/**
 * This exact server-owned switch admits synthetic recovery projections only.
 * It establishes no learner, course, institutional, persistence, or message
 * authority.
 */
export function readUniversityRecoveryGate(
  environment: UniversityRecoveryEnvironment = process.env,
): UniversityRecoveryGate {
  const descriptor = (
    typeof environment === "object"
    && environment !== null
    && !nodeUtilTypes.isProxy(environment)
  )
    ? Object.getOwnPropertyDescriptor(
        environment,
        RECOVERY_FIXTURE_ENVIRONMENT_KEY,
      )
    : undefined;
  const value = descriptor !== undefined
    && "value" in descriptor
    ? descriptor.value
    : undefined;
  const mode = typeof value === "string"
    && Object.hasOwn(RECOVERY_FIXTURE_TOKENS, value)
    ? RECOVERY_FIXTURE_TOKENS[
        value as keyof typeof RECOVERY_FIXTURE_TOKENS
      ]
    : undefined;
  if (mode === "legacy") {
    return Object.freeze({
      enabled: true,
      status: "recovery-fixture-enabled",
      mode,
    });
  }
  if (mode === "capacity_what_if") {
    return Object.freeze({
      enabled: true,
      status: "recovery-what-if-enabled",
      mode,
    });
  }
  return Object.freeze({
    enabled: false,
    status: "recovery-fixture-unavailable",
    mode: null,
  });
}
