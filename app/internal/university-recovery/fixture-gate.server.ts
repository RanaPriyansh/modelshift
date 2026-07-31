import "server-only";

import { types as nodeUtilTypes } from "node:util";

const RECOVERY_FIXTURE_ENVIRONMENT_KEY = "FORGE_UNIVERSITY_RECOVERY_FIXTURE";
const RECOVERY_FIXTURE_TOKEN = "forge-university-recovery.v1";

export type UniversityRecoveryEnvironment = Readonly<Record<string, string | undefined>>;

export type UniversityRecoveryGate = Readonly<{
  enabled: boolean;
  status: "recovery-fixture-enabled" | "recovery-fixture-unavailable";
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
  const enabled = descriptor !== undefined
    && "value" in descriptor
    && descriptor.value === RECOVERY_FIXTURE_TOKEN;
  return Object.freeze({
    enabled,
    status: enabled ? "recovery-fixture-enabled" : "recovery-fixture-unavailable",
  });
}
