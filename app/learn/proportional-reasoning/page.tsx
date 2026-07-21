import type { Metadata } from "next";

import { ForgeWorldFrame } from "@/src/components/forge/ForgeShell";
import { ProportionalWorldRoute } from "@/src/components/forge/ProportionalWorldRoute";
import type { RatioAudience } from "@/src/worlds/proportional-reasoning";

export const metadata: Metadata = {
  title: "Proportional reasoning — FORGE",
  description: "An exact arithmetic Learning World for comparing and scaling proportional relationships.",
};

const AUDIENCES = new Set<RatioAudience>(["child_with_grown_up", "teen", "adult"]);

export default async function ProportionalReasoningPage({
  searchParams,
}: {
  searchParams: Promise<{ audience?: string }>;
}) {
  const requested = (await searchParams).audience;
  const audience: RatioAudience = requested && AUDIENCES.has(requested as RatioAudience)
    ? (requested as RatioAudience)
    : "teen";

  return (
    <ForgeWorldFrame worldLabel="Proportional reasoning">
      <ProportionalWorldRoute audience={audience} />
    </ForgeWorldFrame>
  );
}
