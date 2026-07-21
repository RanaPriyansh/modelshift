import type { Metadata } from "next";

import { ForgeWorldFrame } from "@/src/components/forge/ForgeShell";
import { EvidenceLearningWorld } from "@/src/components/worlds/ai-learning";

export const metadata: Metadata = {
  title: "AI & learning — FORGE",
  description: "A FORGE integration point for investigating what remains after AI assistance.",
};

export default function AiAndLearningPage() {
  return (
    <ForgeWorldFrame worldLabel="AI & learning">
      <EvidenceLearningWorld />
    </ForgeWorldFrame>
  );
}
