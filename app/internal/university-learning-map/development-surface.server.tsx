import "server-only";

import { ForgeShell } from "@/src/components/forge/ForgeShell";
import {
  UniversityLearningMapUnavailable,
} from "@/src/components/forge/university-learning-map/UniversityLearningMapUnavailable";
import {
  UniversityLearningMapWorkspace,
} from "@/src/components/forge/university-learning-map/UniversityLearningMapWorkspace";

import { readUniversityLearningMapGate } from "./fixture-gate.server";
import { universityLearningMapFixture } from "./learning-map-fixture.server";

export function UniversityLearningMapDevelopmentSurface() {
  const gate = readUniversityLearningMapGate();
  const presentation = gate.enabled
    ? universityLearningMapFixture()
    : null;

  if (!presentation) return <UniversityLearningMapUnavailable />;

  return (
    <ForgeShell active={null} mobileNavigation={false} surface="author">
      <main id="forge-main" tabIndex={-1}>
        <UniversityLearningMapWorkspace presentation={presentation} />
      </main>
    </ForgeShell>
  );
}
