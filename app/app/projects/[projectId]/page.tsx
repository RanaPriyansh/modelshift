import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ForgeProjectFixtureDetail } from "@/src/components/forge/ForgeAppStaticPages";
import { ForgeShell } from "@/src/components/forge/ForgeShell";
import { FIRST_PILOT_PROJECT_TEMPLATE } from "@/src/forge/projects/contracts";

export const metadata: Metadata = {
  title: "Project contract — FORGE",
  description: "One immutable authored project fixture and its explicit publication boundary.",
};

export default async function ForgeProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  if (projectId !== FIRST_PILOT_PROJECT_TEMPLATE.projectId) notFound();
  return <ForgeShell active="projects" surface="app"><ForgeProjectFixtureDetail /></ForgeShell>;
}
