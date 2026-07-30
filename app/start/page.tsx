import type { Metadata } from "next";

import { ForgeShell } from "@/src/components/forge/ForgeShell";
import { ForgeStart } from "@/src/components/forge/ForgeStart";

export const metadata: Metadata = {
  title: "Start a learning path — FORGE",
  description: "Turn a learner-owned goal into an inspectable reviewed route or an honest coverage gap.",
};

export default function StartPage() {
  return (
    <ForgeShell active="start" surface="public">
      <ForgeStart />
    </ForgeShell>
  );
}
