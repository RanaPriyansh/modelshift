import type { Metadata } from "next";

import { ForgeTrust } from "@/src/components/forge/ForgeMethodPages";
import { ForgeShell } from "@/src/components/forge/ForgeShell";

export const metadata: Metadata = {
  title: "Evidence semantics — FORGE",
  description: "How FORGE separates progress, support, task evidence, capability claims, and what remains untested.",
};

export default function TrustEvidencePage() {
  return <ForgeShell active="trust" surface="public"><ForgeTrust /></ForgeShell>;
}
