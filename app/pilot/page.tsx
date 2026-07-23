import type { Metadata } from "next";

import { ForgeShell } from "@/src/components/forge/ForgeShell";
import { AdultPilotExperience } from "@/src/components/forge/pilot/AdultPilotExperience";
import { AdultPilotRouteUnavailable } from "@/src/components/forge/pilot/AdultPilotRouteUnavailable";

import { readAdultPilotReviewGate } from "./fixture-gate.server";
import { reviewedAdultPilotProjection } from "./review-fixture.server";

export const metadata: Metadata = {
  title: "Adult pilot route · FORGE",
  description: "A server-gated reviewed-fixture inspection route for the FORGE adult pilot shell.",
};

export default function AdultPilotRoutePage() {
  const gate = readAdultPilotReviewGate();

  return (
    <ForgeShell active="learn">
      <main id="forge-main" tabIndex={-1}>
        {gate.enabled
          ? <AdultPilotExperience projection={reviewedAdultPilotProjection()} />
          : <AdultPilotRouteUnavailable />}
      </main>
    </ForgeShell>
  );
}
