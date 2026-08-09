import "server-only";

import { types as nodeUtilTypes } from "node:util";

const SEMESTER_OVERVIEW_FIXTURE_ENVIRONMENT_KEY =
  "FORGE_UNIVERSITY_SEMESTER_OVERVIEW_FIXTURE";
const SEMESTER_OVERVIEW_FIXTURE_TOKEN =
  "forge-university-semester-overview.v1";

export type UniversitySemesterOverviewEnvironment = Readonly<
  Record<string, string | undefined>
>;

export type UniversitySemesterOverviewGate =
  | Readonly<{
      enabled: true;
      status: "semester-overview-fixture-enabled";
    }>
  | Readonly<{
      enabled: false;
      status: "semester-overview-fixture-unavailable";
    }>;

/**
 * Admits one closed synthetic development fixture only. It establishes no
 * identity, course-set, ranking, recommendation, continuity, or production
 * authority.
 */
export function readUniversitySemesterOverviewGate(
  environment: UniversitySemesterOverviewEnvironment = process.env,
): UniversitySemesterOverviewGate {
  const descriptor = (
    typeof environment === "object"
    && environment !== null
    && !nodeUtilTypes.isProxy(environment)
  )
    ? Object.getOwnPropertyDescriptor(
        environment,
        SEMESTER_OVERVIEW_FIXTURE_ENVIRONMENT_KEY,
      )
    : undefined;
  const value = descriptor !== undefined && "value" in descriptor
    ? descriptor.value
    : undefined;
  return value === SEMESTER_OVERVIEW_FIXTURE_TOKEN
    ? Object.freeze({
        enabled: true,
        status: "semester-overview-fixture-enabled",
      })
    : Object.freeze({
        enabled: false,
        status: "semester-overview-fixture-unavailable",
      });
}
