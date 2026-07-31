import type { Metadata } from "next";

import { ForgeShell } from "@/src/components/forge/ForgeShell";
import {
  UniversityCommandCenterUnavailable,
} from "@/src/components/forge/university-command-center/UniversityCommandCenterUnavailable";

export const metadata: Metadata = {
  title: "Internal university workspace map | FORGE",
  description:
    "A fail-closed directory of bounded internal university workspaces.",
};

export default async function InternalUniversityCommandCenterPage() {
  const DevelopmentSurface = process.env.NODE_ENV === "development"
    ? (
        await import("./development-surface.server")
      ).UniversityCommandCenterDevelopmentSurface
    : null;

  return (
    <ForgeShell active={null} mobileNavigation={false} surface="author">
      <main id="forge-main" tabIndex={-1}>
        {DevelopmentSurface
          ? <DevelopmentSurface />
          : <UniversityCommandCenterUnavailable />}
      </main>
    </ForgeShell>
  );
}
