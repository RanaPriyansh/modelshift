import type { Metadata } from "next";

import { ForgeWorldFrame } from "@/src/components/forge/ForgeShell";
import {
  resolveWorldRouteAccess,
  type WorldEntrySearchParams,
} from "@/src/lib/forge-auth/world-age-policy.server";

import { WorldEntryRoute } from "../WorldEntryRoute";

export const metadata: Metadata = {
  title: "AI & learning — FORGE",
  description: "A FORGE integration point for investigating what remains after AI assistance.",
};

export default async function AiAndLearningPage({
  searchParams,
}: {
  searchParams: Promise<WorldEntrySearchParams>;
}) {
  const access = resolveWorldRouteAccess("/learn/ai-and-learning", await searchParams);

  return (
    <ForgeWorldFrame worldLabel="AI & learning">
      <WorldEntryRoute
        policy={access.policy}
        suggestedAudience={access.suggestedAudience}
      />
    </ForgeWorldFrame>
  );
}
