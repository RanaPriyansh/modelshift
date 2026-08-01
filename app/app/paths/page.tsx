import type { Metadata } from "next";

import { ForgePathWorkspace } from "@/src/components/forge/ForgeLearnerWorkspace";
import { ForgeShell } from "@/src/components/forge/ForgeShell";

export const metadata: Metadata = {
  title: "My paths — FORGE",
  description:
    "Inspect accepted immutable path revisions, open coverage gaps, and device-local activity progress.",
};

export default function ForgePathsPage() {
  return (
    <ForgeShell active="paths" surface="app">
      <ForgePathWorkspace />
    </ForgeShell>
  );
}
