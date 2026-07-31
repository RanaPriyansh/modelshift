import "server-only";

import { types as nodeUtilTypes } from "node:util";

const FIXTURE_ENVIRONMENT_KEY = "FORGE_UNIVERSITY_DEGREE_MAP_FIXTURE";
const FIXTURE_TOKEN = "forge-university-degree-map.v1";

export type UniversityDegreeMapEnvironment = Readonly<
  Record<string, string | undefined>
>;

export type UniversityDegreeMapGate =
  | Readonly<{ enabled: true; status: "degree-map-fixture-enabled" }>
  | Readonly<{ enabled: false; status: "degree-map-fixture-unavailable" }>;

export function readUniversityDegreeMapGate(
  environment: UniversityDegreeMapEnvironment = process.env,
): UniversityDegreeMapGate {
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
        status: "degree-map-fixture-enabled",
      })
    : Object.freeze({
        enabled: false,
        status: "degree-map-fixture-unavailable",
      });
}
