import "server-only";

import { types as nodeUtilTypes } from "node:util";

import type { UniversityResearchCandidatePackId } from "@/src/forge/university-research-artifacts/candidate-contracts";

const SEMESTER_LOOP_FIXTURE_ENVIRONMENT_KEY =
  "FORGE_UNIVERSITY_SEMESTER_LOOP_FIXTURE";
const SEMESTER_LOOP_FIXTURE_TOKENS = Object.freeze({
  "forge-university-semester-loop.v1": {
    mode: "legacy" as const,
    packId: null,
  },
  "forge-university-semester-sandbox.v1": {
    mode: "semester_sandbox" as const,
    packId: null,
  },
  "forge-university-research-candidate.pack-p.v1": {
    mode: "research_candidate" as const,
    packId: "pack-p" as const,
  },
  "forge-university-research-candidate.pack-q.v1": {
    mode: "research_candidate" as const,
    packId: "pack-q" as const,
  },
});

export type UniversitySemesterLoopEnvironment = Readonly<
  Record<string, string | undefined>
>;

export type UniversitySemesterLoopGate =
  | Readonly<{
      enabled: true;
      status: "semester-loop-fixture-enabled";
      mode: "legacy";
      packId: null;
    }>
  | Readonly<{
      enabled: true;
      status: "semester-loop-sandbox-enabled";
      mode: "semester_sandbox";
      packId: null;
    }>
  | Readonly<{
      enabled: true;
      status: "semester-loop-research-candidate-enabled";
      mode: "research_candidate";
      packId: UniversityResearchCandidatePackId;
    }>
  | Readonly<{
      enabled: false;
      status: "semester-loop-fixture-unavailable";
      mode: null;
      packId: null;
    }>;

/**
 * This exact server-owned switch admits one transient synthetic composition
 * only. It establishes no learner, course, institutional, persistence,
 * session, evidence, or production authority.
 */
export function readUniversitySemesterLoopGate(
  environment: UniversitySemesterLoopEnvironment = process.env,
): UniversitySemesterLoopGate {
  const descriptor = (
    typeof environment === "object"
    && environment !== null
    && !nodeUtilTypes.isProxy(environment)
  )
    ? Object.getOwnPropertyDescriptor(
        environment,
        SEMESTER_LOOP_FIXTURE_ENVIRONMENT_KEY,
      )
    : undefined;
  const value = descriptor && "value" in descriptor
    ? descriptor.value
    : undefined;
  const selection = typeof value === "string"
    && Object.hasOwn(SEMESTER_LOOP_FIXTURE_TOKENS, value)
    ? SEMESTER_LOOP_FIXTURE_TOKENS[
        value as keyof typeof SEMESTER_LOOP_FIXTURE_TOKENS
      ]
    : undefined;

  if (!selection) {
    return Object.freeze({
      enabled: false,
      status: "semester-loop-fixture-unavailable",
      mode: null,
      packId: null,
    });
  }
  if (selection.mode === "legacy") {
    return Object.freeze({
      enabled: true,
      status: "semester-loop-fixture-enabled",
      mode: "legacy",
      packId: null,
    });
  }
  if (selection.mode === "semester_sandbox") {
    return Object.freeze({
      enabled: true,
      status: "semester-loop-sandbox-enabled",
      mode: "semester_sandbox",
      packId: null,
    });
  }
  return Object.freeze({
    enabled: true,
    status: "semester-loop-research-candidate-enabled",
    mode: "research_candidate",
    packId: selection.packId,
  });
}
