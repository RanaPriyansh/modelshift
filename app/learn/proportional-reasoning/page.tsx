import type { Metadata } from "next";

import { ForgeWorldFrame } from "@/src/components/forge/ForgeShell";
import { ProportionalWorldRoute } from "@/src/components/forge/ProportionalWorldRoute";
import { resolveChildCapableWorldRouteAccess } from "@/src/lib/forge-auth/world-age-policy.server";

import { LocalGrownUpConfirmation, WorldAgeRouteGate } from "../WorldAgeRouteGate";

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
      {access.status !== "allowed" ? <WorldAgeRouteGate worldPath="/learn/proportional-reasoning" worldTitle="Proportional reasoning" access={access} /> : null}
      {access.status === "allowed" && access.audience !== "child_with_grown_up" ? <ProportionalWorldRoute audience={access.audience} /> : null}
      {access.status === "allowed" && access.audience === "child_with_grown_up" ? (
        <LocalGrownUpConfirmation worldTitle="Proportional reasoning">
          <ProportionalWorldRoute audience={access.audience} />
        </LocalGrownUpConfirmation>
      ) : null}
    </ForgeWorldFrame>
  );
}
