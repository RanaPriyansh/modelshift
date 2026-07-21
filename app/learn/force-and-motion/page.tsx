import type { Metadata } from "next";

import { ModelShiftExperience } from "@/src/components/experience/ModelShiftExperience";
import { ForgeWorldFrame } from "@/src/components/forge/ForgeShell";

export const metadata: Metadata = {
  title: "Force & motion — FORGE",
  description: "A deterministic learning world with prediction, experiment, reconstruction, and proof after help.",
};

export default function ForceAndMotionPage() {
  return (
    <ForgeWorldFrame worldLabel="Force & motion">
      <ModelShiftExperience />
    </ForgeWorldFrame>
  );
}
