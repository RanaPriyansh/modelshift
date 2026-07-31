import type { UniversitySemesterLoopProjectionV1 } from "../university-semester-loop";
import type { UniversityResearchScenarioPackV1 } from "./contracts";

export const UNIVERSITY_RESEARCH_CANDIDATE_COMPILATION_SCHEMA_VERSION =
  "university-research-candidate-compilation.v1" as const;
export const UNIVERSITY_RESEARCH_CANDIDATE_COMPILER_ID =
  "university-research-candidate-compiler.v1" as const;

export const UNIVERSITY_RESEARCH_CANDIDATE_COMPILATION_ISSUE_CODES =
  Object.freeze([
    "pack.unknown",
    "scenario.unknown",
    "scenario.semantic_drift",
    "projection.invalid",
    "projection.status_mismatch",
    "projection.semantic_mismatch",
    "projection.authority_mismatch",
  ] as const);

export type UniversityResearchCandidateCompilationIssueCode =
  (typeof UNIVERSITY_RESEARCH_CANDIDATE_COMPILATION_ISSUE_CODES)[number];

export type UniversityResearchCandidatePackId =
  UniversityResearchScenarioPackV1["packId"];
export type UniversityResearchCandidateScenario =
  UniversityResearchScenarioPackV1["scenarios"][number];
export type UniversityResearchCandidateScenarioId =
  UniversityResearchCandidateScenario["scenarioId"];

export interface UniversityResearchCandidateCompilationDigestsV1 {
  readonly compilerDigest: string;
  readonly packDigest: string;
  readonly scenarioDigest: string;
  readonly rawFixtureDigest: string;
  readonly projectionDigest: string;
  readonly bindingDigest: string;
}

export interface UniversityResearchCandidateCompilationAuthorityV1 {
  readonly inputAuthority: "frozen_authored_pack_and_scenario_ids_only";
  readonly factAuthority: "canonical_synthetic_scenario_record";
  readonly expectedStatusAuthority: "postcondition_only";
  readonly rawFixtureDisclosure: "digest_only";
  readonly institutionalTruthEstablished: false;
  readonly persistenceAllowed: false;
  readonly eventEmissionAllowed: false;
  readonly messageSendAllowed: false;
  readonly sessionStartAllowed: false;
  readonly externalEffectsAllowed: false;
}

export interface UniversityResearchCandidateCompilationV1 {
  readonly schemaVersion:
    typeof UNIVERSITY_RESEARCH_CANDIDATE_COMPILATION_SCHEMA_VERSION;
  readonly compilerId: typeof UNIVERSITY_RESEARCH_CANDIDATE_COMPILER_ID;
  readonly packId: UniversityResearchCandidatePackId;
  readonly scenarioId: UniversityResearchCandidateScenarioId;
  readonly scenario: UniversityResearchCandidateScenario;
  readonly projection: Readonly<UniversitySemesterLoopProjectionV1>;
  readonly digests: UniversityResearchCandidateCompilationDigestsV1;
  readonly authority: UniversityResearchCandidateCompilationAuthorityV1;
}

export class UniversityResearchCandidateCompilationError extends Error {
  readonly code: UniversityResearchCandidateCompilationIssueCode;

  constructor(code: UniversityResearchCandidateCompilationIssueCode) {
    super(`University research candidate compilation failed closed: ${code}.`);
    this.name = "UniversityResearchCandidateCompilationError";
    this.code = code;
  }
}
