import type { Metadata } from "next";

import { SourceCorroborationPath } from "@/src/components/forge/SourceCorroborationPath";
import { ForgeShell } from "@/src/components/forge/ForgeShell";
import { SOURCE_CORROBORATION_PATH_PREVIEW } from "@/src/forge/paths/source-corroboration-preview";

export const metadata: Metadata = {
  title: "Verify before you trust — FORGE",
  description: "A fixture-only presentation path for source corroboration with explicit availability limits.",
};

export default function SourceCorroborationPathPage() {
  return (
    <ForgeShell active="learn">
      <SourceCorroborationPath preview={SOURCE_CORROBORATION_PATH_PREVIEW} />
    </ForgeShell>
  );
}
