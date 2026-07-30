import type { Metadata } from "next";

import { ForgeWorldFrame } from "@/src/components/forge/ForgeShell";
import {
  resolveWorldRouteAccess,
  type WorldEntrySearchParams,
} from "@/src/lib/forge-auth/world-age-policy.server";

import { WorldEntryRoute } from "../WorldEntryRoute";

export const metadata: Metadata = {
  title: "Force & motion — FORGE",
  description: "A deterministic learning world with prediction, experiment, reconstruction, and proof after help.",
};

export default async function ForceAndMotionPage({
  searchParams,
}: {
  searchParams: Promise<WorldEntrySearchParams>;
}) {
  const access = resolveWorldRouteAccess("/learn/force-and-motion", await searchParams);

  return (
    <ForgeWorldFrame worldLabel="Force & motion">
      <WorldEntryRoute
        policy={access.policy}
        suggestedAudience={access.suggestedAudience}
      />
    </ForgeWorldFrame>
  );
}
