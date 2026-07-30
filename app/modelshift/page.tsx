import type { Metadata } from "next";

import { ModelShiftExplainer } from "@/src/components/forge/ForgeMethodPages";
import { ForgeShell } from "@/src/components/forge/ForgeShell";

export const metadata: Metadata = {
  title: "ModelShift — FORGE",
  description: "FORGE's selective mental-model engine: competing readings, a separating experience, assistance withdrawal, and bounded proof.",
};

export default function ModelShiftPage() {
  return <ForgeShell active="learn" surface="public"><ModelShiftExplainer /></ForgeShell>;
}
