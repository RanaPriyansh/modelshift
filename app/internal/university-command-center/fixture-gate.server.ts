import "server-only";

import { types as nodeUtilTypes } from "node:util";

const FIXTURE_ENVIRONMENT_KEY =
  "FORGE_UNIVERSITY_COMMAND_CENTER_FIXTURE";
const FIXTURE_TOKEN =
  "forge-university-command-center.v1";

export type UniversityCommandCenterEnvironment = Readonly<
  Record<string, string | undefined>
>;

export type UniversityCommandCenterGate =
  | Readonly<{ enabled: true; status: "command-center-fixture-enabled" }>
  | Readonly<{ enabled: false; status: "command-center-fixture-unavailable" }>;

export function readUniversityCommandCenterGate(
  environment: UniversityCommandCenterEnvironment = process.env,
): UniversityCommandCenterGate {
  const descriptor = (
    typeof environment === "object"
    && environment !== null
    && !nodeUtilTypes.isProxy(environment)
  )
    ? Object.getOwnPropertyDescriptor(environment, FIXTURE_ENVIRONMENT_KEY)
    : undefined;
  const value = descriptor !== undefined && "value" in descriptor
    ? descriptor.value
    : undefined;

  return value === FIXTURE_TOKEN
    ? Object.freeze({
        enabled: true,
        status: "command-center-fixture-enabled",
      })
    : Object.freeze({
        enabled: false,
        status: "command-center-fixture-unavailable",
      });
}
