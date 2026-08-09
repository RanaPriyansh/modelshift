import "server-only";

import {
  projectUniversityProtectedStudy,
  type UniversityProtectedStudyProjectionV1,
  type UniversityProtectedStudyRequestV1,
} from "@/src/forge/university-protected-study";
import { SOURCE_CORROBORATION_WORLD } from "@/src/forge/worlds";

import { universityTodayFixtureRequest } from "../university-today/today-fixture.server";

function exactWorldPack() {
  return SOURCE_CORROBORATION_WORLD;
}

async function request(
  scenario: "ready" | "source-blocked" | "world-changed" | "world-paused",
): Promise<UniversityProtectedStudyRequestV1> {
  const pack = exactWorldPack();
  const todayRequest = await universityTodayFixtureRequest(
    scenario === "source-blocked" ? "source-review" : "ready",
  );
  if (scenario === "world-changed") {
    return {
      schemaVersion: "university-protected-study-request.v1",
      todayRequest,
      worldPack: {
        ...pack,
        manifest: {
          ...pack.manifest,
          version: "1.0.2",
        },
      },
    };
  }
  if (scenario === "world-paused") {
    return {
      schemaVersion: "university-protected-study-request.v1",
      todayRequest,
      worldPack: {
        ...pack,
        manifest: {
          ...pack.manifest,
          availability: {
            status: "unavailable",
            reason: "Synthetic pause used to test the fail-closed entry state.",
          },
        },
      },
    };
  }
  return {
    schemaVersion: "university-protected-study-request.v1",
    todayRequest,
    worldPack: pack,
  };
}

export type UniversityProtectedStudyFixtureScenario = Readonly<{
  id: "ready" | "source-blocked" | "world-changed" | "world-paused";
  label: string;
  projection: Readonly<UniversityProtectedStudyProjectionV1>;
}>;

export async function universityProtectedStudyFixtureScenarios(): Promise<
  readonly UniversityProtectedStudyFixtureScenario[]
> {
  const [ready, sourceBlocked, worldChanged, worldPaused] = await Promise.all([
    projectUniversityProtectedStudy(await request("ready")),
    projectUniversityProtectedStudy(await request("source-blocked")),
    projectUniversityProtectedStudy(await request("world-changed")),
    projectUniversityProtectedStudy(await request("world-paused")),
  ]);
  return Object.freeze([
    Object.freeze({ id: "ready", label: "Ready brief", projection: ready }),
    Object.freeze({
      id: "source-blocked",
      label: "Source blocked",
      projection: sourceBlocked,
    }),
    Object.freeze({
      id: "world-changed",
      label: "World changed",
      projection: worldChanged,
    }),
    Object.freeze({
      id: "world-paused",
      label: "World paused",
      projection: worldPaused,
    }),
  ]);
}
