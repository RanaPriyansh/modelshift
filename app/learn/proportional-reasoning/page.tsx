import type { Metadata } from "next";

import { ForgeWorldFrame } from "@/src/components/forge/ForgeShell";
import {
  resolveWorldRouteAccess,
  type WorldEntrySearchParams,
} from "@/src/lib/forge-auth/world-age-policy.server";

import { WorldEntryRoute } from "../WorldEntryRoute";

export const metadata: Metadata = {
  title: "Proportional reasoning — FORGE",
  description: "An exact arithmetic Learning World for comparing and scaling proportional relationships.",
};

export default async function ProportionalReasoningPage({
  searchParams,
}: {
  searchParams: Promise<WorldEntrySearchParams>;
}) {
  const access = resolveWorldRouteAccess("/learn/proportional-reasoning", await searchParams);

  return (
    <ForgeWorldFrame worldLabel="Proportional reasoning">
      <WorldEntryRoute
        policy={access.policy}
        suggestedAudience={access.suggestedAudience}
      />
    </ForgeWorldFrame>
  );
}
