import "server-only";

import { types as nodeUtilTypes } from "node:util";

const POST_ATTEMPT_REPAIR_FIXTURE_ENVIRONMENT_KEY =
  "FORGE_UNIVERSITY_POST_ATTEMPT_REPAIR_FIXTURE";
const POST_ATTEMPT_REPAIR_FIXTURE_TOKEN =
  "forge-university-post-attempt-repair.v1";

export type UniversityPostAttemptRepairEnvironment = Readonly<
  Record<string, string | undefined>
>;

export type UniversityPostAttemptRepairGate =
  | Readonly<{
      enabled: true;
      status: "post-attempt-repair-fixture-enabled";
    }>
  | Readonly<{
      enabled: false;
      status: "post-attempt-repair-fixture-unavailable";
    }>;

/**
 * Admits one closed synthetic development fixture only. It establishes no
 * identity, session, receipt, repair, evidence, or production authority.
 */
export function readUniversityPostAttemptRepairGate(
  environment: UniversityPostAttemptRepairEnvironment = process.env,
): UniversityPostAttemptRepairGate {
  const descriptor = (
    typeof environment === "object"
    && environment !== null
    && !nodeUtilTypes.isProxy(environment)
  )
    ? Object.getOwnPropertyDescriptor(
        environment,
        POST_ATTEMPT_REPAIR_FIXTURE_ENVIRONMENT_KEY,
      )
    : undefined;
  const value = descriptor !== undefined && "value" in descriptor
    ? descriptor.value
    : undefined;
  return value === POST_ATTEMPT_REPAIR_FIXTURE_TOKEN
    ? Object.freeze({
        enabled: true,
        status: "post-attempt-repair-fixture-enabled",
      })
    : Object.freeze({
        enabled: false,
        status: "post-attempt-repair-fixture-unavailable",
      });
}
