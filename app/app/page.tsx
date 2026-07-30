import type { Metadata } from "next";

import { ForgeToday } from "@/src/components/forge/ForgeLearnerWorkspace";
import { ForgeShell } from "@/src/components/forge/ForgeShell";

export const metadata: Metadata = {
  title: "Today — FORGE",
  description: "One deterministic next meaningful action from a learner-accepted device-local path.",
};

export default function ForgeAppPage() {
  return <ForgeShell active="today" surface="app"><ForgeToday /></ForgeShell>;
}
