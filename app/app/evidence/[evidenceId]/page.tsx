import type { Metadata } from "next";

import { ForgeEvidenceRecord } from "@/src/components/forge/ForgeEvidenceRecord";
import { ForgeShell } from "@/src/components/forge/ForgeShell";

export const metadata: Metadata = {
  title: "Evidence record — FORGE",
  description: "One exact browser-local FORGE evidence record and its bounded claim conditions.",
};

export default async function ForgeEvidenceRecordPage({
  params,
}: {
  params: Promise<{ evidenceId: string }>;
}) {
  const { evidenceId } = await params;
  return <ForgeShell active="evidence" surface="app"><ForgeEvidenceRecord evidenceId={evidenceId} /></ForgeShell>;
}
