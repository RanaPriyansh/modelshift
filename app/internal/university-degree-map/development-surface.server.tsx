import "server-only";

import {
  UniversityDegreeMapUnavailable,
} from "@/src/components/forge/university-degree-map/UniversityDegreeMapUnavailable";
import {
  UniversityDegreeMapWorkspace,
} from "@/src/components/forge/university-degree-map/UniversityDegreeMapWorkspace";

import { universityDegreeMapPresentation } from "./degree-map-fixture.server";
import { readUniversityDegreeMapGate } from "./fixture-gate.server";

export function UniversityDegreeMapDevelopmentSurface() {
  const gate = readUniversityDegreeMapGate();
  if (!gate.enabled) return <UniversityDegreeMapUnavailable />;

  let presentation: ReturnType<typeof universityDegreeMapPresentation>;
  try {
    presentation = universityDegreeMapPresentation();
  } catch {
    return <UniversityDegreeMapUnavailable />;
  }

  return <UniversityDegreeMapWorkspace presentation={presentation} />;
}
