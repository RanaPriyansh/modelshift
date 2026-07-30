import type { Metadata } from "next";

import { ForgeProjects } from "@/src/components/forge/ForgeAppStaticPages";
import { ForgeShell } from "@/src/components/forge/ForgeShell";

export const metadata: Metadata = {
  title: "Projects — FORGE",
  description: "Practical FORGE project contracts, a working source-verification fixture, and explicit publication gaps.",
};

export default function ForgeProjectsPage() {
  return <ForgeShell active="projects" surface="app"><ForgeProjects /></ForgeShell>;
}
