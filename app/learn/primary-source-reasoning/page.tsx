import type { Metadata } from "next";

import { ForgeWorldFrame } from "@/src/components/forge/ForgeShell";
import { PrimarySourceReasoningWorld } from "@/src/components/worlds/primary-source-reasoning";

export const metadata: Metadata = {
  title: "Primary source reasoning — FORGE",
  description:
    "Separate visible observation, catalog metadata, inference, and open questions in historical photographs.",
};

export default function PrimarySourceReasoningPage() {
  return (
    <ForgeWorldFrame worldLabel="Primary source reasoning">
      <PrimarySourceReasoningWorld />
    </ForgeWorldFrame>
  );
}
