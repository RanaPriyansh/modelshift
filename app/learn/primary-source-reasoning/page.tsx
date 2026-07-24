import type { Metadata } from "next";

import { ForgeWorldFrame } from "@/src/components/forge/ForgeShell";
import {
  resolveWorldRouteAccess,
  type WorldEntrySearchParams,
} from "@/src/lib/forge-auth/world-age-policy.server";

import { WorldEntryRoute } from "../WorldEntryRoute";

export const metadata: Metadata = {
  title: "Primary source reasoning — FORGE",
  description:
    "Separate visible observation, catalog metadata, inference, and open questions in historical photographs.",
};

export default async function PrimarySourceReasoningPage({
  searchParams,
}: {
  searchParams: Promise<WorldEntrySearchParams>;
}) {
  const access = resolveWorldRouteAccess("/learn/primary-source-reasoning", await searchParams);
  return (
    <ForgeWorldFrame worldLabel="Primary source reasoning">
      <WorldEntryRoute
        policy={access.policy}
        suggestedAudience={access.suggestedAudience}
      />
    </ForgeWorldFrame>
  );
}
