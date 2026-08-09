import "server-only";

import { types as nodeUtilTypes } from "node:util";

const LEARNING_MAP_FIXTURE_ENVIRONMENT_KEY =
  "FORGE_UNIVERSITY_LEARNING_MAP_FIXTURE";
const LEARNING_MAP_FIXTURE_TOKEN =
  "forge-university-learning-map.v1";

export type UniversityLearningMapEnvironment = Readonly<
  Record<string, string | undefined>
>;

export type UniversityLearningMapGate =
  | Readonly<{
      enabled: true;
      status: "learning-map-fixture-enabled";
    }>
  | Readonly<{
      enabled: false;
      status: "learning-map-fixture-unavailable";
    }>;

export function readUniversityLearningMapGate(
  environment: UniversityLearningMapEnvironment = process.env,
): UniversityLearningMapGate {
  const descriptor = (
    typeof environment === "object"
    && environment !== null
    && !nodeUtilTypes.isProxy(environment)
  )
    ? Object.getOwnPropertyDescriptor(
        environment,
        LEARNING_MAP_FIXTURE_ENVIRONMENT_KEY,
      )
    : undefined;
  const value = descriptor !== undefined && "value" in descriptor
    ? descriptor.value
    : undefined;

  return value === LEARNING_MAP_FIXTURE_TOKEN
    ? Object.freeze({
        enabled: true,
        status: "learning-map-fixture-enabled",
      })
    : Object.freeze({
        enabled: false,
        status: "learning-map-fixture-unavailable",
      });
}
