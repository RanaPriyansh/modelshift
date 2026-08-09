import { describe, expect, it } from "vitest";

import { canonicalJson, sha256Digest } from "../events";
import {
  AUTHORED_UNIVERSITY_RESEARCH_PACK_P,
  AUTHORED_UNIVERSITY_RESEARCH_PACK_Q,
} from "./authored";
import {
  compileUniversityResearchCandidateScenario,
  UNIVERSITY_RESEARCH_CANDIDATE_COMPILER_DESCRIPTOR,
} from "./candidate-adapter";
import {
  UNIVERSITY_RESEARCH_CANDIDATE_COMPILATION_SCHEMA_VERSION,
  UNIVERSITY_RESEARCH_CANDIDATE_COMPILER_ID,
  UniversityResearchCandidateCompilationError,
  type UniversityResearchCandidatePackId,
  type UniversityResearchCandidateScenarioId,
} from "./candidate-contracts";
import { UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS } from "./contracts";

const CASES = [
  ["pack-p", "ready", "protected_study_ready"],
  ["pack-p", "source-review", "source_review_required"],
  ["pack-p", "capacity-break", "recovery_required"],
  ["pack-p", "tight-window", "learner_choice_required"],
  ["pack-p", "world-changed", "world_review_required"],
  ["pack-p", "path-complete", "path_complete"],
  ["pack-p", "path-blocked", "path_blocked"],
  ["pack-q", "ready", "protected_study_ready"],
  ["pack-q", "source-review", "source_review_required"],
  ["pack-q", "capacity-break", "recovery_required"],
  ["pack-q", "tight-window", "learner_choice_required"],
  ["pack-q", "world-changed", "world_review_required"],
  ["pack-q", "path-complete", "path_complete"],
  ["pack-q", "path-blocked", "path_blocked"],
] as const satisfies readonly (
  readonly [
    UniversityResearchCandidatePackId,
    UniversityResearchCandidateScenarioId,
    string,
  ]
)[];

const DIGEST = /^sha256:[a-f0-9]{64}$/;

async function domainDigest(domain: string, value: unknown): Promise<string> {
  return sha256Digest(canonicalJson({ digestDomain: domain, value }));
}

function authoredPack(packId: UniversityResearchCandidatePackId) {
  return packId === "pack-p"
    ? AUTHORED_UNIVERSITY_RESEARCH_PACK_P
    : AUTHORED_UNIVERSITY_RESEARCH_PACK_Q;
}

function expectFrozenGraph(value: unknown, seen = new WeakSet<object>()): void {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  Object.values(value).forEach((child) => expectFrozenGraph(child, seen));
}

function objectKeys(
  value: unknown,
  seen = new WeakSet<object>(),
): string[] {
  if (value === null || typeof value !== "object" || seen.has(value)) {
    return [];
  }
  seen.add(value);
  return Object.entries(value).flatMap(([key, child]) => [
    key,
    ...objectKeys(child, seen),
  ]);
}

describe("university research candidate compiler", () => {
  it.each(CASES)(
    "compiles %s/%s through the raw semester loop as %s",
    async (packId, scenarioId, expectedStatus) => {
      const pack = authoredPack(packId);
      const canonicalScenario = pack.scenarios.find(
        (scenario) => scenario.scenarioId === scenarioId,
      )!;
      const counterpartPackId = packId === "pack-p" ? "pack-q" : "pack-p";
      const [result, repeated, counterpart, expectedPackDigest, expectedScenarioDigest] =
        await Promise.all([
          compileUniversityResearchCandidateScenario(packId, scenarioId),
          compileUniversityResearchCandidateScenario(packId, scenarioId),
          compileUniversityResearchCandidateScenario(
            counterpartPackId,
            scenarioId,
          ),
          domainDigest(
            UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS.scenarioPack,
            pack,
          ),
          domainDigest(
            UNIVERSITY_RESEARCH_ARTIFACT_DIGEST_DOMAINS.scenario,
            canonicalScenario,
          ),
        ]);

      expect(result).toEqual(repeated);
      expect(result).toMatchObject({
        schemaVersion:
          UNIVERSITY_RESEARCH_CANDIDATE_COMPILATION_SCHEMA_VERSION,
        compilerId: UNIVERSITY_RESEARCH_CANDIDATE_COMPILER_ID,
        packId,
        scenarioId,
        scenario: canonicalScenario,
        projection: {
          status: expectedStatus,
          projectionDigest: result.digests.projectionDigest,
        },
        authority: {
          inputAuthority: "frozen_authored_pack_and_scenario_ids_only",
          factAuthority: "canonical_synthetic_scenario_record",
          expectedStatusAuthority: "postcondition_only",
          rawFixtureDisclosure: "digest_only",
          institutionalTruthEstablished: false,
          persistenceAllowed: false,
          eventEmissionAllowed: false,
          messageSendAllowed: false,
          sessionStartAllowed: false,
          externalEffectsAllowed: false,
        },
      });
      expect(result.scenario).toBe(canonicalScenario);
      expect(result.projection.status).toBe(result.scenario.expectedStatus);
      expect(UNIVERSITY_RESEARCH_CANDIDATE_COMPILER_DESCRIPTOR)
        .toMatchObject({
          expectedStatusUse: "postcondition_only",
          returnedRawRequest: false,
          externalEffectsAllowed: false,
        });

      expect(Object.keys(result).sort()).toEqual([
        "authority",
        "compilerId",
        "digests",
        "packId",
        "projection",
        "scenario",
        "scenarioId",
        "schemaVersion",
      ]);
      expect(objectKeys(result)).not.toEqual(expect.arrayContaining([
        "todayRequest",
        "recoveryRequest",
        "worldPack",
        "reconciliationRequest",
      ]));
      expectFrozenGraph(result);

      const digests = Object.values(result.digests);
      expect(digests).toHaveLength(6);
      expect(digests.every((digest) => DIGEST.test(digest))).toBe(true);
      expect(new Set(digests).size).toBe(digests.length);
      expect(result.digests.packDigest).toBe(expectedPackDigest);
      expect(result.digests.scenarioDigest).toBe(expectedScenarioDigest);
      expect(result.digests).toEqual(repeated.digests);
      expect(result.digests.compilerDigest).toBe(
        counterpart.digests.compilerDigest,
      );
      expect(result.digests.packDigest).not.toBe(
        counterpart.digests.packDigest,
      );
      expect(result.digests.scenarioDigest).not.toBe(
        counterpart.digests.scenarioDigest,
      );
      expect(result.digests.rawFixtureDigest).not.toBe(
        counterpart.digests.rawFixtureDigest,
      );
      expect(result.digests.projectionDigest).not.toBe(
        counterpart.digests.projectionDigest,
      );
      expect(result.digests.bindingDigest).not.toBe(
        counterpart.digests.bindingDigest,
      );

      expect(result.projection).toMatchObject({
        scope: {
          termId: canonicalScenario.context.termRef,
          courseId: canonicalScenario.context.courseRef,
        },
        asOf: canonicalScenario.context.asOf,
        termLabel: canonicalScenario.context.termLabel,
        courseLabel: canonicalScenario.context.courseLabel,
        timeZone: canonicalScenario.context.timeZone,
        authority: {
          sourceFactsMaySelectAction: false,
          recommendationAllowed: false,
          sessionStartAllowed: false,
          persistenceAllowed: false,
          evidenceClaimAllowed: false,
          messageSendAllowed: false,
          eventEmissionAllowed: false,
          externalSideEffectsAllowed: false,
        },
        today: {
          source: {
            unresolvedConflictCount:
              canonicalScenario.source.conflictCount,
          },
          capacity: {
            availableMinutes:
              canonicalScenario.capacity.availableMinutes,
            effortMinutesLow:
              canonicalScenario.capacity.effortMinutesLow,
            effortMinutesHigh:
              canonicalScenario.capacity.effortMinutesHigh,
          },
          pathState: {
            pathId: canonicalScenario.path.pathRef,
          },
        },
      });

      if (canonicalScenario.path.state === "accepted_active") {
        if (canonicalScenario.source.state === "copy_review_required") {
          expect(result.projection.today?.action).toBeNull();
        } else {
          expect(result.projection.today?.action).toMatchObject({
            title: canonicalScenario.path.actionTitle,
            selectedFromCourseSourceFacts: false,
            startAllowedFromThisProjection: false,
          });
        }
      } else {
        expect(result.projection.today?.action).toBeNull();
      }
      const compiledDeadline = result.projection.today?.source?.facts.find(
        (entry) => entry.fact.kind === "deadline",
      )?.fact;
      if (compiledDeadline?.kind === "deadline") {
        expect(compiledDeadline.consequenceClass).toBe("unknown");
      }

      if (canonicalScenario.world.state === "exact_binding") {
        expect(result.projection.protectedStudy).toMatchObject({
          status: "ready",
          world: { id: canonicalScenario.world.suppliedWorldRef },
        });
      } else if (canonicalScenario.world.state === "binding_changed") {
        expect(result.projection.protectedStudy).toMatchObject({
          status: "world_mismatch",
        });
      } else {
        expect(result.projection.protectedStudy).toBeNull();
      }

      if (packId === "pack-p" && scenarioId === "ready") {
        await expect(
          compileUniversityResearchCandidateScenario("pack-r", "ready"),
        ).rejects.toMatchObject({
          name: "UniversityResearchCandidateCompilationError",
          code: "pack.unknown",
        } satisfies Partial<UniversityResearchCandidateCompilationError>);
        await expect(
          compileUniversityResearchCandidateScenario("pack-p", "unknown"),
        ).rejects.toMatchObject({
          name: "UniversityResearchCandidateCompilationError",
          code: "scenario.unknown",
        } satisfies Partial<UniversityResearchCandidateCompilationError>);
        await expect(
          compileUniversityResearchCandidateScenario(
            new String("pack-p"),
            "ready",
          ),
        ).rejects.toMatchObject({ code: "pack.unknown" });
      }
    },
  );
});
