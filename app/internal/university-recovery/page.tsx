import type { Metadata } from "next";

import { ForgeShell } from "@/src/components/forge/ForgeShell";
import { UniversityRecoveryWorkspaceUnavailable } from "@/src/components/forge/university/UniversityRecoveryWorkspaceUnavailable";

export const metadata: Metadata = {
  title: "Internal university recovery research | FORGE",
  description: "A fail-closed synthetic workspace for testing a transparent falling-behind recovery draft.",
};

export default async function InternalUniversityRecoveryPage() {
  const developmentSurface = process.env.NODE_ENV === "development"
    ? (
        await import("./recovery-development-surface.server")
      ).UniversityRecoveryDevelopmentSurface
    : null;

  return (
    <ForgeShell active={null} surface="author">
      <main id="forge-main" tabIndex={-1}>
        {developmentSurface
          ? await developmentSurface()
          : <UniversityRecoveryWorkspaceUnavailable />}
      </main>
    </ForgeShell>
  );
}
