import type { Metadata } from "next";

import { ForgeShell } from "@/src/components/forge/ForgeShell";
import { PublicPaths } from "@/src/components/forge/PublicPaths";

export const metadata: Metadata = {
  title: "Learning paths and goal directions — FORGE",
  description:
    "Reviewed FORGE learning activities, broader goal directions, and the exact gaps that prevent unpublished outlines from masquerading as complete courses.",
};

export default function PathsPage() {
  return (
    <ForgeShell active="learn" surface="public">
      <PublicPaths />
    </ForgeShell>
  );
}
