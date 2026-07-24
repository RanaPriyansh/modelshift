import type { Metadata } from "next";

import { ForgeShell } from "@/src/components/forge/ForgeShell";
import { AdultPilotExperience } from "@/src/components/forge/pilot/AdultPilotExperience";
import { AdultPilotRouteUnavailable } from "@/src/components/forge/pilot/AdultPilotRouteUnavailable";

import { readAdultPilotReviewGate } from "../../pilot/fixture-gate.server";
import { reviewedAdultPilotProjection } from "../../pilot/review-fixture.server";

export const metadata: Metadata = {
  title: "Internal adult pilot route · FORGE",
  description: "A server-gated reviewed-fixture inspection route for internal FORGE evaluation.",
};

export default function InternalAdultPilotRoutePage() {
  // The review token is a local fixture switch, never user or reviewer
  // authorization. Production-like builds keep this route fail-closed until a
  // real server-issued reviewer entitlement exists.
  const gate = process.env.NODE_ENV === "development"
    ? readAdultPilotReviewGate()
    : { enabled: false as const, reason: "disabled" as const };
  return (
    <ForgeShell active="learn" surface="author">
      <main id="forge-main" tabIndex={-1}>
        {gate.enabled
          ? <AdultPilotExperience projection={reviewedAdultPilotProjection()} />
          : <AdultPilotRouteUnavailable />}
      </main>
    </ForgeShell>
  );
}
