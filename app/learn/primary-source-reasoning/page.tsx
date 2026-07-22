import type { Metadata } from "next";

import { ForgeWorldFrame } from "@/src/components/forge/ForgeShell";
import { PrimarySourceReasoningWorld } from "@/src/components/worlds/primary-source-reasoning";
import { resolveChildCapableWorldRouteAccess } from "@/src/lib/forge-auth/world-age-policy.server";

import { LocalGrownUpConfirmation, WorldAgeRouteGate } from "../WorldAgeRouteGate";

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
      {access.status !== "allowed" ? <WorldAgeRouteGate worldPath="/learn/primary-source-reasoning" worldTitle="Primary source reasoning" access={access} /> : null}
      {access.status === "allowed" && access.audience !== "child_with_grown_up" ? <PrimarySourceReasoningWorld /> : null}
      {access.status === "allowed" && access.audience === "child_with_grown_up" ? (
        <LocalGrownUpConfirmation worldTitle="Primary source reasoning">
          <PrimarySourceReasoningWorld />
        </LocalGrownUpConfirmation>
      ) : null}
    </ForgeWorldFrame>
  );
}
