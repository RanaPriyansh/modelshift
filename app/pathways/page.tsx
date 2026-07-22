import type { Metadata } from "next";

import { PathwayAvailabilityMap } from "@/src/components/forge/PathwayAvailabilityMap";
import { ForgeShell } from "@/src/components/forge/ForgeShell";
import { getCurrentPathwayAvailability } from "@/src/forge/pathways/public-availability";

export const metadata: Metadata = {
  title: "Current availability — FORGE",
  description: "A read-only map of current released FORGE capabilities and explicit entitlement gaps.",
};

export default function PathwaysPage() {
  return (
    <ForgeShell active="learn">
      <PathwayAvailabilityMap availability={getCurrentPathwayAvailability()} />
    </ForgeShell>
  );
}
