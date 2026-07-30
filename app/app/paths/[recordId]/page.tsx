import type { Metadata } from "next";

import { ForgePathRecord } from "@/src/components/forge/ForgePathRecord";
import { ForgeShell } from "@/src/components/forge/ForgeShell";

export const metadata: Metadata = {
  title: "Path detail — FORGE",
  description:
    "Inspect one exact learner-owned path revision, activity state, and local study-session binding.",
};

export default async function ForgePathRecordPage({
  params,
}: {
  readonly params: Promise<{ recordId: string }>;
}) {
  const { recordId } = await params;
  return (
    <ForgeShell active="paths" surface="app">
      <ForgePathRecord recordId={recordId} />
    </ForgeShell>
  );
}
