import "server-only";

import { types as nodeUtilTypes } from "node:util";

const SEMESTER_DESK_FIXTURE_ENVIRONMENT_KEY =
  "FORGE_UNIVERSITY_SEMESTER_DESK_FIXTURE";
const SEMESTER_DESK_FIXTURE_TOKEN =
  "forge-university-semester-desk.v1";

export type UniversitySemesterDeskEnvironment = Readonly<
  Record<string, string | undefined>
>;

export type UniversitySemesterDeskGate =
  | Readonly<{
      enabled: true;
      status: "semester-desk-fixture-enabled";
    }>
  | Readonly<{
      enabled: false;
      status: "semester-desk-fixture-unavailable";
    }>;

/**
 * Admits one closed synthetic development fixture only. It establishes no
 * identity, course-set, selection, recommendation, continuity, or production
 * authority.
 */
export function readUniversitySemesterDeskGate(
  environment: UniversitySemesterDeskEnvironment = process.env,
): UniversitySemesterDeskGate {
  const descriptor = (
    typeof environment === "object"
    && environment !== null
    && !nodeUtilTypes.isProxy(environment)
  )
    ? Object.getOwnPropertyDescriptor(
        environment,
        SEMESTER_DESK_FIXTURE_ENVIRONMENT_KEY,
      )
    : undefined;
  const value = descriptor !== undefined && "value" in descriptor
    ? descriptor.value
    : undefined;
  return value === SEMESTER_DESK_FIXTURE_TOKEN
    ? Object.freeze({
        enabled: true,
        status: "semester-desk-fixture-enabled",
      })
    : Object.freeze({
        enabled: false,
        status: "semester-desk-fixture-unavailable",
      });
}
