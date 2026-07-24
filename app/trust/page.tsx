import type { Metadata } from "next";

import { ForgeTrust } from "@/src/components/forge/ForgeMethodPages";
import { ForgeShell } from "@/src/components/forge/ForgeShell";

export const metadata: Metadata = {
  title: "Evidence and trust — FORGE",
  description: "FORGE authority, privacy, age, evidence, accessibility, AI, and current deployment boundaries.",
};

export default function TrustPage() {
  return <ForgeShell active="trust" surface="public"><ForgeTrust /></ForgeShell>;
}
