import type { Metadata } from "next";

import { ForgeWorldFrame } from "@/src/components/forge/ForgeShell";
import { resolveChildCapableWorldRouteAccess } from "@/src/lib/forge-auth/world-age-policy.server";

import { ChildCapableWorldRoute } from "../ChildCapableWorldRoute";

export const metadata: Metadata = {
  title: "Proportional reasoning — FORGE",
  description: "An exact arithmetic Learning World for comparing and scaling proportional relationships.",
};

export default async function ProportionalReasoningPage({
  searchParams,
}: {
  searchParams: Promise<{ audience?: string; guardianManaged?: string }>;
}) {
  const access = resolveChildCapableWorldRouteAccess(await searchParams);

  return (
    <ForgeWorldFrame worldLabel="Proportional reasoning">
      <ChildCapableWorldRoute
        suggestedAudience={access.suggestedAudience}
        world="proportional_reasoning"
        worldTitle="Proportional reasoning"
      />
    </ForgeWorldFrame>
  );
}
