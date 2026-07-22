import type { Metadata } from "next";

import { ForgeWorldFrame } from "@/src/components/forge/ForgeShell";
import { resolveChildCapableWorldRouteAccess } from "@/src/lib/forge-auth/world-age-policy.server";

import { ChildCapableWorldRoute } from "../ChildCapableWorldRoute";

export const metadata: Metadata = {
  title: "Primary source reasoning — FORGE",
  description:
    "Separate visible observation, catalog metadata, inference, and open questions in historical photographs.",
};

export default async function PrimarySourceReasoningPage({
  searchParams,
}: {
  searchParams: Promise<{ audience?: string; guardianManaged?: string }>;
}) {
  const access = resolveChildCapableWorldRouteAccess(await searchParams);
  return (
    <ForgeWorldFrame worldLabel="Primary source reasoning">
      <ChildCapableWorldRoute
        suggestedAudience={access.suggestedAudience}
        world="primary_source_reasoning"
        worldTitle="Primary source reasoning"
      />
    </ForgeWorldFrame>
  );
}
