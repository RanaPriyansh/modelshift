import type { Metadata } from "next";

import { ForgeGoals } from "@/src/components/forge/ForgeGoals";
import { ForgeShell } from "@/src/components/forge/ForgeShell";

export const metadata: Metadata = {
  title: "My goals — FORGE",
  description: "Learner-owned device-local goals, accepted paths, and unsaved tab drafts.",
};

export default function ForgeGoalsPage() {
  return <ForgeShell active="paths" surface="app"><ForgeGoals /></ForgeShell>;
}
