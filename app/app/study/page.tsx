import type { Metadata } from "next";

import { ForgeStudy } from "@/src/components/forge/ForgeLearnerWorkspace";
import { ForgeShell } from "@/src/components/forge/ForgeShell";

export const metadata: Metadata = {
  title: "Action brief — FORGE",
  description: "Open the exact reviewed activity bound to the next node of an accepted local path.",
};

export default function ForgeStudyPage() {
  return <ForgeShell active="today" surface="app"><ForgeStudy /></ForgeShell>;
}
