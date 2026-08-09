import type { Metadata } from "next";

import { ForgeShell } from "@/src/components/forge/ForgeShell";
import { UniversityTodayWorkspaceUnavailable } from "@/src/components/forge/university/UniversityTodayWorkspaceUnavailable";

export const metadata: Metadata = {
  title: "Internal university Today research · FORGE",
  description: "A fail-closed sample workspace for testing one university learning action with visible source and capacity boundaries.",
};

export default async function InternalUniversityTodayPage() {
  const developmentSurface = process.env.NODE_ENV === "development"
    ? (
        await import("./development-surface.server")
      ).UniversityTodayDevelopmentSurface
    : null;

  return (
    <ForgeShell
      active={null}
      navigationPrefetch={false}
      surface="author"
    >
      <main id="forge-main" tabIndex={-1}>
        {developmentSurface
          ? await developmentSurface()
          : <UniversityTodayWorkspaceUnavailable />}
      </main>
    </ForgeShell>
  );
}
